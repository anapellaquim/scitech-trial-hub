import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Shield, ShieldCheck, Eye } from "lucide-react";

interface Profile { id: string; full_name: string; }
interface Project { id: string; title: string; }
interface Study { id: string; title: string; }

interface UserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile;
  projects: Project[];
  studies: Study[];
  onSuccess: () => void;
}

const roles = [
  { value: "admin", label: "Administrator", icon: ShieldCheck, description: "Full system access" },
  { value: "collaborator", label: "Collaborator", icon: Eye, description: "Custom per-module access (set via Permissions)" },
];

const UserRoleDialog = ({ open, onOpenChange, user, projects, studies, onSuccess }: UserRoleDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ role: "", scope: "global", projectId: "", expiresAt: "", notes: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role) { toast.error("Please select a role"); return; }

    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const roleData: any = {
      user_id: user.id, role: formData.role, granted_by: currentUser?.id, notes: formData.notes || null,
    };
    if (formData.scope === "project" && formData.projectId) roleData.project_id = formData.projectId;
    if (formData.expiresAt) roleData.expires_at = new Date(formData.expiresAt).toISOString();

    const { error } = await supabase.from("user_roles").insert(roleData);
    setLoading(false);

    if (error) {
      if (error.code === "23505") toast.error("This user already has this role in this scope");
      else toast.error("Error assigning role: " + error.message);
      return;
    }

    toast.success("Role assigned successfully");
    setFormData({ role: "", scope: "global", projectId: "", expiresAt: "", notes: "" });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Assign Role
          </DialogTitle>
          <DialogDescription>Assign a new role to <strong>{user.full_name}</strong></DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      <role.icon className="h-4 w-4" />
                      <span>{role.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">({role.description})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Scope</Label>
            <Select value={formData.scope} onValueChange={(value) => setFormData({ ...formData, scope: value, projectId: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (all projects)</SelectItem>
                <SelectItem value="project">Specific project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.scope === "project" && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={formData.projectId} onValueChange={(value) => setFormData({ ...formData, projectId: value })}>
                <SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Expiration Date (optional)</Label>
            <Input type="date" value={formData.expiresAt} onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })} min={new Date().toISOString().split("T")[0]} />
            <p className="text-xs text-muted-foreground">Leave blank for permanent role</p>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Reason for assigning the role..." rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Assign Role"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserRoleDialog;
