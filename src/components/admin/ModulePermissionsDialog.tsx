import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ShieldCheck, Info, Sparkles } from "lucide-react";
import { MODULE_KEYS, MODULE_LABELS, type ModuleKey, type ModuleAction } from "@/hooks/usePermission";
import { ROLE_TEMPLATES } from "./rolePermissionTemplates";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

interface Profile { id: string; full_name: string; }
interface Project { id: string; title: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile;
  projects: Project[];
  onSuccess?: () => void;
}

const GLOBAL_SCOPE = "__global__";

type PermKey = `${ModuleKey}:${ModuleAction}`;
const keyOf = (m: ModuleKey, a: ModuleAction): PermKey => `${m}:${a}`;

interface PermRow {
  id?: string;
  module: ModuleKey;
  action: ModuleAction;
  project_id: string | null;
}

const ModulePermissionsDialog = ({ open, onOpenChange, user, projects, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<string>(GLOBAL_SCOPE); // GLOBAL_SCOPE or projectId
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  // permissions for selected scope
  const [granted, setGranted] = useState<Set<PermKey>>(new Set());
  // initial snapshot for diffing on save
  const [initial, setInitial] = useState<Set<PermKey>>(new Set());
  // all perms across scopes (for save merge)
  const [allRows, setAllRows] = useState<PermRow[]>([]);

  useEffect(() => {
    if (!open) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user.id]);

  const load = async () => {
    setLoading(true);
    try {
      // Check admin status
      const { data: adminData } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setUserIsAdmin(!!adminData);

      // Load all module permissions for the user
      const { data, error } = await supabase
        .from("user_module_permissions" as any)
        .select("id, module, action, project_id")
        .eq("user_id", user.id);
      if (error) throw error;
      const rows = (data as any as PermRow[]) || [];
      setAllRows(rows);
      applyScope(scope, rows);
    } catch (e: any) {
      toast.error("Error loading permissions: " + (e?.message ?? "unknown"));
    } finally {
      setLoading(false);
    }
  };

  const applyScope = (newScope: string, rows: PermRow[] = allRows) => {
    const projectId = newScope === GLOBAL_SCOPE ? null : newScope;
    const set = new Set<PermKey>();
    rows.forEach((r) => {
      if (r.project_id === projectId) set.add(keyOf(r.module, r.action));
    });
    setGranted(new Set(set));
    setInitial(new Set(set));
  };

  const handleScopeChange = (v: string) => {
    setScope(v);
    applyScope(v);
  };

  const toggle = (module: ModuleKey, action: ModuleAction, value: boolean) => {
    setGranted((prev) => {
      const next = new Set(prev);
      const k = keyOf(module, action);
      if (value) {
        next.add(k);
        if (action === "create") next.add(keyOf(module, "view")); // create implies view
      } else {
        next.delete(k);
        // unchecking view also removes create
        if (action === "view") next.delete(keyOf(module, "create"));
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const projectId = scope === GLOBAL_SCOPE ? null : scope;
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Diff
      const toAdd: PermKey[] = [];
      const toRemove: PermKey[] = [];
      granted.forEach((k) => {
        if (!initial.has(k)) toAdd.push(k);
      });
      initial.forEach((k) => {
        if (!granted.has(k)) toRemove.push(k);
      });

      if (toAdd.length === 0 && toRemove.length === 0) {
        toast.info("No changes to save");
        setSaving(false);
        return;
      }

      // Inserts
      if (toAdd.length > 0) {
        const inserts = toAdd.map((k) => {
          const [module, action] = k.split(":") as [ModuleKey, ModuleAction];
          return {
            user_id: user.id,
            module,
            action,
            project_id: projectId,
            granted_by: currentUser?.id ?? null,
          };
        });
        const { error } = await supabase.from("user_module_permissions" as any).insert(inserts as any);
        if (error) throw error;
      }

      // Deletes (find by id from allRows)
      if (toRemove.length > 0) {
        const idsToRemove: string[] = [];
        toRemove.forEach((k) => {
          const [module, action] = k.split(":") as [ModuleKey, ModuleAction];
          const row = allRows.find(
            (r) => r.module === module && r.action === action && r.project_id === projectId
          );
          if (row?.id) idsToRemove.push(row.id);
        });
        if (idsToRemove.length > 0) {
          const { error } = await supabase
            .from("user_module_permissions" as any)
            .delete()
            .in("id", idsToRemove);
          if (error) throw error;
        }
      }

      toast.success("Permissions updated");
      await load();
      onSuccess?.();
    } catch (e: any) {
      toast.error("Error saving permissions: " + (e?.message ?? "unknown"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Module Permissions
          </DialogTitle>
          <DialogDescription>
            Manage view/create access per module for <strong>{user.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        {userIsAdmin && (
          <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div>
              <Badge variant="secondary" className="mr-2">Administrator</Badge>
              This user already has full access to every module. Module permissions below are
              ignored while the user holds the Administrator role.
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Scope</Label>
          <Select value={scope} onValueChange={handleScopeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GLOBAL_SCOPE}>Global (all studies)</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Global permissions apply across all studies. Study-scoped permissions add access for
            that study only.
          </p>
        </div>

        <ScrollArea className="h-[360px] rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Module</th>
                <th className="px-4 py-2 font-medium w-24 text-center">View</th>
                <th className="px-4 py-2 font-medium w-24 text-center">Create</th>
              </tr>
            </thead>
            <tbody>
              {MODULE_KEYS.map((m) => {
                const viewKey = keyOf(m, "view");
                const createKey = keyOf(m, "create");
                const viewChecked = userIsAdmin || granted.has(viewKey);
                const createChecked = userIsAdmin || granted.has(createKey);
                return (
                  <tr key={m} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-2">{MODULE_LABELS[m]}</td>
                    <td className="px-4 py-2 text-center">
                      <Checkbox
                        checked={viewChecked}
                        disabled={userIsAdmin || loading || saving}
                        onCheckedChange={(v) => toggle(m, "view", v === true)}
                        aria-label={`View ${MODULE_LABELS[m]}`}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Checkbox
                        checked={createChecked}
                        disabled={userIsAdmin || loading || saving}
                        onCheckedChange={(v) => toggle(m, "create", v === true)}
                        aria-label={`Create in ${MODULE_LABELS[m]}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={userIsAdmin || saving || loading}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModulePermissionsDialog;
