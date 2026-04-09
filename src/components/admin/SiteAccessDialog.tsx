import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Building2, Trash2, Plus, Calendar, AlertCircle } from "lucide-react";

interface SiteAccess {
  id: string;
  site_id: string;
  project_id: string | null;
  expires_at: string | null;
  site_name?: string;
  site_code?: string;
  project_title?: string;
}

interface Project { id: string; title: string; }
interface Site { id: string; name: string; site_code: string; project_id: string | null; }

interface SiteAccessDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const SiteAccessDialog = ({ open, onClose, userId, userName }: SiteAccessDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteAccess, setSiteAccess] = useState<SiteAccess[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState<string>("");

  useEffect(() => {
    if (open && userId) fetchData();
  }, [open, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: accessData, error: accessError } = await supabase
        .from("user_site_access").select("*").eq("user_id", userId);
      if (accessError) throw accessError;

      const { data: projectsData } = await supabase.from("projects").select("id, title").order("title");
      setProjects(projectsData || []);

      const { data: sitesData } = await supabase.from("study_sites").select("id, name, site_code, project_id").order("site_code");
      setSites(sitesData || []);

      const enrichedAccess = (accessData || []).map(access => {
        const site = sitesData?.find(s => s.id === access.site_id);
        const project = projectsData?.find(p => p.id === access.project_id);
        return { ...access, site_name: site?.name || "Site not found", site_code: site?.site_code || "-", project_title: project?.title || "All Projects" };
      });
      setSiteAccess(enrichedAccess);
    } catch (error) {
      console.error("Error fetching site access data:", error);
      toast({ title: "Error", description: "Failed to load site access data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = selectedProject ? sites.filter(s => s.project_id === selectedProject) : sites;

  const handleAddAccess = async () => {
    if (!selectedSite) {
      toast({ title: "Error", description: "Please select a site", variant: "destructive" });
      return;
    }
    if (siteAccess.some(a => a.site_id === selectedSite && a.project_id === (selectedProject || null))) {
      toast({ title: "Access exists", description: "This user already has access to this site", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("user_site_access").insert({
        user_id: userId, site_id: selectedSite, project_id: selectedProject || null,
        expires_at: hasExpiration && expirationDate ? expirationDate : null,
      });
      if (error) throw error;
      toast({ title: "Access granted", description: "Site access added successfully" });
      setSelectedSite(""); setSelectedProject(""); setHasExpiration(false); setExpirationDate("");
      fetchData();
    } catch (error) {
      console.error("Error adding site access:", error);
      toast({ title: "Error", description: "Failed to add site access", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAccess = async (accessId: string) => {
    try {
      const { error } = await supabase.from("user_site_access").delete().eq("id", accessId);
      if (error) throw error;
      toast({ title: "Access removed", description: "Site access removed successfully" });
      fetchData();
    } catch (error) {
      console.error("Error removing site access:", error);
      toast({ title: "Error", description: "Failed to remove site access", variant: "destructive" });
    }
  };

  const isExpired = (expiresAt: string | null) => expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Site Access Management
          </DialogTitle>
          <DialogDescription>Manage site access for <strong>{userName}</strong></DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <h4 className="font-medium text-sm">Add New Access</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger><SelectValue placeholder="All Projects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Projects</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Site *</Label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger><SelectValue placeholder="Select a site" /></SelectTrigger>
                  <SelectContent>
                    {filteredSites.map(s => <SelectItem key={s.id} value={s.id}>{s.site_code} - {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="has-expiration" checked={hasExpiration} onCheckedChange={setHasExpiration} />
                <Label htmlFor="has-expiration" className="text-sm">Temporary access</Label>
              </div>
              {hasExpiration && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="w-40" min={new Date().toISOString().split("T")[0]} />
                </div>
              )}
            </div>
            <Button onClick={handleAddAccess} disabled={saving || !selectedSite}>
              <Plus className="h-4 w-4 mr-1" />Add Access
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Current Access</h4>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : siteAccess.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No site access configured</p>
              </div>
            ) : (
              <ScrollArea className="h-[250px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteAccess.map(access => (
                      <TableRow key={access.id} className={isExpired(access.expires_at) ? "opacity-50" : ""}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{access.site_code}</span>
                            <p className="text-xs text-muted-foreground">{access.site_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>{access.project_title || <span className="text-muted-foreground">Global</span>}</TableCell>
                        <TableCell>
                          {access.expires_at ? (
                            isExpired(access.expires_at) ? (
                              <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">{format(new Date(access.expires_at), "MM/dd/yyyy", { locale: enUS })}</Badge>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">Permanent</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveAccess(access.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SiteAccessDialog;
