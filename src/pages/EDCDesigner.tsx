import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EDCNav from "@/components/EDCNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CRFFieldEditor from "@/components/edc/CRFFieldEditor";

interface CRFField {
  id?: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: string[];
  validation_rules: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  is_required: boolean;
  help_text: string;
  display_order: number;
}

interface CRFSection {
  id?: string;
  name: string;
  description: string;
  display_order: number;
  fields: CRFField[];
  isExpanded: boolean;
}

interface CRFTemplate {
  id: string;
  name: string;
  version: number;
  status: string;
}

const EDCDesigner = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<CRFTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateStatus, setTemplateStatus] = useState("draft");
  const [sections, setSections] = useState<CRFSection[]>([]);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      // Fetch template
      const { data: templateData, error: templateError } = await supabase
        .from("crf_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);
      setTemplateName(templateData.name);
      setTemplateStatus(templateData.status);

      // Fetch sections with fields
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("crf_sections")
        .select("*")
        .eq("template_id", templateId)
        .order("display_order");

      if (sectionsError) throw sectionsError;

      const sectionsWithFields = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: fieldsData } = await supabase
            .from("crf_fields")
            .select("*")
            .eq("section_id", section.id)
            .order("display_order");

          return {
            id: section.id,
            name: section.name,
            description: section.description || "",
            display_order: section.display_order,
            fields: (fieldsData || []).map((f) => ({
              id: f.id,
              field_name: f.field_name,
              field_label: f.field_label,
              field_type: f.field_type,
              options: Array.isArray(f.options) 
                ? f.options.map((o: unknown) => String(o)) 
                : [],
              validation_rules: typeof f.validation_rules === 'object' && f.validation_rules !== null
                ? f.validation_rules as { min?: number; max?: number; pattern?: string }
                : {},
              is_required: f.is_required,
              help_text: f.help_text || "",
              display_order: f.display_order,
            })),
            isExpanded: true,
          };
        })
      );

      setSections(sectionsWithFields);
    } catch (error) {
      console.error("Error fetching template:", error);
      toast.error("Erro ao carregar template");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = () => {
    const newSection: CRFSection = {
      name: `Seção ${sections.length + 1}`,
      description: "",
      display_order: sections.length,
      fields: [],
      isExpanded: true,
    };
    setSections([...sections, newSection]);
  };

  const handleUpdateSection = (index: number, updates: Partial<CRFSection>) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], ...updates };
    setSections(updated);
  };

  const handleDeleteSection = (index: number) => {
    if (!confirm("Tem certeza que deseja excluir esta seção?")) return;
    setSections(sections.filter((_, i) => i !== index));
  };

  const handleAddField = (sectionIndex: number) => {
    const newField: CRFField = {
      field_name: `campo_${Date.now()}`,
      field_label: "Novo Campo",
      field_type: "text",
      options: [],
      validation_rules: {},
      is_required: false,
      help_text: "",
      display_order: sections[sectionIndex].fields.length,
    };
    const updated = [...sections];
    updated[sectionIndex].fields.push(newField);
    setSections(updated);
  };

  const handleUpdateField = (
    sectionIndex: number,
    fieldIndex: number,
    updates: Partial<CRFField>
  ) => {
    const updated = [...sections];
    updated[sectionIndex].fields[fieldIndex] = {
      ...updated[sectionIndex].fields[fieldIndex],
      ...updates,
    };
    setSections(updated);
  };

  const handleDeleteField = (sectionIndex: number, fieldIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].fields = updated[sectionIndex].fields.filter(
      (_, i) => i !== fieldIndex
    );
    setSections(updated);
  };

  const handleSave = async () => {
    if (!templateId) return;

    setSaving(true);
    try {
      // Update template
      const { error: templateError } = await supabase
        .from("crf_templates")
        .update({
          name: templateName,
          status: templateStatus,
        })
        .eq("id", templateId);

      if (templateError) throw templateError;

      // Delete existing sections and fields
      await supabase.from("crf_sections").delete().eq("template_id", templateId);

      // Insert sections and fields
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const { data: sectionData, error: sectionError } = await supabase
          .from("crf_sections")
          .insert({
            template_id: templateId,
            name: section.name,
            description: section.description,
            display_order: i,
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        // Insert fields
        if (section.fields.length > 0) {
          const fieldsToInsert = section.fields.map((field, j) => ({
            section_id: sectionData.id,
            field_name: field.field_name,
            field_label: field.field_label,
            field_type: field.field_type,
            options: field.options,
            validation_rules: field.validation_rules,
            is_required: field.is_required,
            help_text: field.help_text,
            display_order: j,
          }));

          const { error: fieldsError } = await supabase
            .from("crf_fields")
            .insert(fieldsToInsert);

          if (fieldsError) throw fieldsError;
        }
      }

      toast.success("Template salvo com sucesso");
      fetchTemplate(); // Refresh to get IDs
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EDCNav />
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EDCNav />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/edc")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Designer de CRF
              </h1>
              <p className="text-muted-foreground">
                Configure as seções e campos do formulário
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        {/* Template Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">Nome do Template</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={templateStatus} onValueChange={setTemplateStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Versão</Label>
                <div className="flex items-center h-10">
                  <Badge variant="outline">v{template?.version || 1}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <Card key={sectionIndex}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    <Input
                      value={section.name}
                      onChange={(e) =>
                        handleUpdateSection(sectionIndex, { name: e.target.value })
                      }
                      className="font-semibold max-w-xs"
                    />
                    <Badge variant="secondary">{section.fields.length} campos</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleUpdateSection(sectionIndex, {
                          isExpanded: !section.isExpanded,
                        })
                      }
                    >
                      {section.isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSection(sectionIndex)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {section.isExpanded && (
                <CardContent className="pt-0">
                  <div className="mb-4">
                    <Label htmlFor={`desc-${sectionIndex}`}>Descrição</Label>
                    <Input
                      id={`desc-${sectionIndex}`}
                      value={section.description}
                      onChange={(e) =>
                        handleUpdateSection(sectionIndex, {
                          description: e.target.value,
                        })
                      }
                      placeholder="Descrição opcional da seção"
                    />
                  </div>

                  {/* Fields */}
                  <div className="space-y-3">
                    {section.fields.map((field, fieldIndex) => (
                      <CRFFieldEditor
                        key={fieldIndex}
                        field={field}
                        onChange={(updates) =>
                          handleUpdateField(sectionIndex, fieldIndex, updates)
                        }
                        onDelete={() => handleDeleteField(sectionIndex, fieldIndex)}
                      />
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => handleAddField(sectionIndex)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Campo
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Add Section */}
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={handleAddSection}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Seção
        </Button>
      </div>
    </div>
  );
};

export default EDCDesigner;
