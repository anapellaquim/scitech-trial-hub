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
import { enUS, ptBR } from "date-fns/locale";
import { Building2, Trash2, Plus, Calendar, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";

interface SiteAccess {
  id: string;
  site_id: string;
  project_id: string | null;
  expires_at: string | null;
  site_name?: string;
  site_code?: string;
  project_title?: string;
}

interface Project {
  id: string;
  title: string;
}

interface Site {
  id: string;
  name: string;
  site_code: string;
  project_id: string | null;
}

interface SiteAccessDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const SiteAccessDialog = ({ open, onClose, userId, userName }: SiteAccessDialogProps) => {
  const { t } = useTranslation(["admin", "common"]);
  const { currentLanguage } = useLanguage();
  const dateLocale = currentLanguage === "pt-BR" ? ptBR : enUS;
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
    if (open && userId) {
      fetchData();
    }
  }, [open, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user's current site access
      const { data: accessData, error: accessError } = await supabase
        .from("user_site_access")
        .select("*")
        .eq("user_id", userId);

      if (accessError) throw accessError;

      // Fetch all projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, title")
        .order("title");

      setProjects(projectsData || []);

      // Fetch all study sites
      const { data: sitesData } = await supabase
        .from("study_sites")
        .select("id, name, site_code, project_id")
        .order("site_code");

      setSites(sitesData || []);

      // Enrich site access with names
      const enrichedAccess = (accessData || []).map(access => {
        const site = sitesData?.find(s => s.id === access.site_id);
        const project = projectsData?.find(p => p.id === access.project_id);
        return {
          ...access,
          site_name: site?.name || t("admin:siteAccess.siteNotFound"),
          site_code: site?.site_code || "-",
          project_title: project?.title || t("admin:siteAccess.allProjects"),
        };
      });

      setSiteAccess(enrichedAccess);
    } catch (error) {
      console.error("Error fetching site access data:", error);
      toast({
        title: t("common:messages.error"),
        description: t("admin:siteAccess.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = selectedProject
    ? sites.filter(s => s.project_id === selectedProject)
    : sites;

  const handleAddAccess = async () => {
    if (!selectedSite) {
      toast({
        title: t("common:messages.error"),
        description: t("admin:siteAccess.selectSiteError"),
        variant: "destructive",
      });
      return;
    }

    // Check if already exists
    const exists = siteAccess.some(
      a => a.site_id === selectedSite && a.project_id === (selectedProject || null)
    );

    if (exists) {
      toast({
        title: t("admin:siteAccess.accessExists"),
        description: t("admin:siteAccess.accessExistsDesc"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_site_access")
        .insert({
          user_id: userId,
          site_id: selectedSite,
          project_id: selectedProject || null,
          expires_at: hasExpiration && expirationDate ? expirationDate : null,
        });

      if (error) throw error;

      toast({
        title: t("admin:siteAccess.accessAdded"),
        description: t("admin:siteAccess.accessAddedDesc"),
      });

      // Reset form
      setSelectedSite("");
      setSelectedProject("");
      setHasExpiration(false);
      setExpirationDate("");

      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error adding site access:", error);
      toast({
        title: t("common:messages.error"),
        description: t("admin:siteAccess.addError"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from("user_site_access")
        .delete()
        .eq("id", accessId);

      if (error) throw error;

      toast({
        title: t("admin:siteAccess.accessRemoved"),
        description: t("admin:siteAccess.accessRemovedDesc"),
      });

      fetchData();
    } catch (error) {
      console.error("Error removing site access:", error);
      toast({
        title: t("common:messages.error"),
        description: t("admin:siteAccess.removeError"),
        variant: "destructive",
      });
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("admin:siteAccess.title")}
          </DialogTitle>
          <DialogDescription>
            {t("admin:siteAccess.description")} <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new access form */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <h4 className="font-medium text-sm">{t("admin:siteAccess.addNew")}</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("admin:siteAccess.projectOptional")}</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin:siteAccess.allProjects")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("admin:siteAccess.allProjects")}</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("admin:siteAccess.siteRequired")}</Label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin:siteAccess.selectSite")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSites.map(site => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.site_code} - {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="has-expiration"
                  checked={hasExpiration}
                  onCheckedChange={setHasExpiration}
                />
                <Label htmlFor="has-expiration" className="text-sm">
                  {t("admin:siteAccess.temporaryAccess")}
                </Label>
              </div>

              {hasExpiration && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={e => setExpirationDate(e.target.value)}
                    className="w-40"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              )}
            </div>

            <Button onClick={handleAddAccess} disabled={saving || !selectedSite}>
              <Plus className="h-4 w-4 mr-1" />
              {t("admin:siteAccess.addAccess")}
            </Button>
          </div>

          {/* Current access list */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{t("admin:siteAccess.currentAccess")}</h4>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("common:loading")}
              </div>
            ) : siteAccess.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("admin:siteAccess.noAccess")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[250px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin:siteAccess.site")}</TableHead>
                      <TableHead>{t("admin:siteAccess.project")}</TableHead>
                      <TableHead>{t("admin:siteAccess.expiration")}</TableHead>
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
                        <TableCell>
                          {access.project_title || (
                            <span className="text-muted-foreground">{t("admin:siteAccess.global")}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {access.expires_at ? (
                            <div className="flex items-center gap-1">
                              {isExpired(access.expires_at) ? (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {t("admin:siteAccess.expired")}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  {format(new Date(access.expires_at), "dd/MM/yyyy", { locale: dateLocale })}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t("admin:siteAccess.permanent")}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAccess(access.id)}
                            className="text-destructive hover:text-destructive"
                          >
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
          <Button variant="outline" onClick={onClose}>
            {t("common:actions.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SiteAccessDialog;
