import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
  preselectedArtifactId?: string;
}

interface TMFZone {
  id: string;
  zone_number: string;
  zone_name: string;
}

interface TMFSection {
  id: string;
  zone_id: string;
  section_number: string;
  section_name: string;
}

interface TMFArtifact {
  id: string;
  section_id: string;
  artifact_number: string;
  artifact_name: string;
  level: string;
}

interface ResearchCenter {
  id: string;
  code: string;
  name: string;
}

const TMFUploadDialog = ({ open, onOpenChange, projectId, onSuccess, preselectedArtifactId }: Props) => {
  const [zones, setZones] = useState<TMFZone[]>([]);
  const [sections, setSections] = useState<TMFSection[]>([]);
  const [artifacts, setArtifacts] = useState<TMFArtifact[]>([]);
  const [centers, setCenters] = useState<ResearchCenter[]>([]);
  
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedArtifact, setSelectedArtifact] = useState<string>(preselectedArtifactId || "");
  const [selectedCenter, setSelectedCenter] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, projectId]);

  useEffect(() => {
    if (preselectedArtifactId) {
      setSelectedArtifact(preselectedArtifactId);
    }
  }, [preselectedArtifactId]);

  const fetchData = async () => {
    // Fetch zones
    const { data: zonesData } = await supabase
      .from("tmf_zones")
      .select("id, zone_number, zone_name")
      .order("display_order");
    setZones(zonesData || []);

    // Fetch sections
    const { data: sectionsData } = await supabase
      .from("tmf_sections")
      .select("id, zone_id, section_number, section_name")
      .order("display_order");
    setSections(sectionsData || []);

    // Fetch artifacts
    const { data: artifactsData } = await supabase
      .from("tmf_artifacts")
      .select("id, section_id, artifact_number, artifact_name, level")
      .order("display_order");
    setArtifacts(artifactsData || []);

    // Fetch research centers for this project
    const { data: centersData } = await supabase
      .from("research_centers")
      .select("id, code, name")
      .eq("project_id", projectId)
      .order("code");
    setCenters(centersData || []);
  };

  const getFilteredSections = () => {
    if (!selectedZone) return [];
    return sections.filter(s => s.zone_id === selectedZone);
  };

  const getFilteredArtifacts = () => {
    if (!selectedSection) return [];
    return artifacts.filter(a => a.section_id === selectedSection);
  };

  const getSelectedArtifact = () => {
    return artifacts.find(a => a.id === selectedArtifact);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 50MB.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedArtifact || !projectId) {
      toast.error("Selecione um arquivo e um artefato de destino");
      return;
    }

    setUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${selectedArtifact}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("tmf-documents")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Erro ao fazer upload do arquivo");
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("tmf-documents")
        .getPublicUrl(fileName);

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from("tmf_documents")
        .insert({
          artifact_id: selectedArtifact,
          project_id: projectId,
          site_id: selectedCenter || null,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          status: "draft",
          effective_date: effectiveDate || null,
          notes: notes || null,
          uploaded_by: profile?.id || null,
        })
        .select()
        .single();

      if (docError) {
        console.error("Document creation error:", docError);
        toast.error("Erro ao registrar documento");
        return;
      }

      // Create audit log entry
      await supabase.from("tmf_audit_log").insert({
        document_id: docData.id,
        action: "uploaded",
        details: { file_name: file.name, file_size: file.size },
        user_id: profile?.id || null,
      });

      toast.success("Documento enviado com sucesso!");
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar upload");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedZone("");
    setSelectedSection("");
    setSelectedArtifact("");
    setSelectedCenter("");
    setEffectiveDate("");
    setNotes("");
    setFile(null);
  };

  const selectedArtifactData = getSelectedArtifact();
  const showCenterSelect = selectedArtifactData?.level === "site";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Documento TMF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Zone Selection */}
          <div className="space-y-2">
            <Label>Zona</Label>
            <Select value={selectedZone} onValueChange={(v) => {
              setSelectedZone(v);
              setSelectedSection("");
              setSelectedArtifact("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a zona" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    Zone {zone.zone_number}: {zone.zone_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Section Selection */}
          {selectedZone && (
            <div className="space-y-2">
              <Label>Seção</Label>
              <Select value={selectedSection} onValueChange={(v) => {
                setSelectedSection(v);
                setSelectedArtifact("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a seção" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredSections().map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.section_number} - {section.section_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Artifact Selection */}
          {selectedSection && (
            <div className="space-y-2">
              <Label>Artefato</Label>
              <Select value={selectedArtifact} onValueChange={setSelectedArtifact}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o artefato" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredArtifacts().map((artifact) => (
                    <SelectItem key={artifact.id} value={artifact.id}>
                      {artifact.artifact_number} - {artifact.artifact_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Center Selection (for site-level artifacts) */}
          {showCenterSelect && (
            <div className="space-y-2">
              <Label>Centro de Pesquisa</Label>
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o centro" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.code} - {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Effective Date */}
          <div className="space-y-2">
            <Label>Data Efetiva</Label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Arquivo</Label>
            {file ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 text-primary" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique para selecionar ou arraste o arquivo
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, DOC, XLS, PPT, imagens (máx. 50MB)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas ou descrição do documento..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !selectedArtifact || uploading}
            >
              {uploading ? "Enviando..." : "Enviar Documento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TMFUploadDialog;
