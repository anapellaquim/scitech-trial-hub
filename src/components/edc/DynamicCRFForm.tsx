import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CRFSection from "./CRFSection";
import CRFStatusIndicator, { CRFStatus } from "./CRFStatusIndicator";
import QueryDialog from "./QueryDialog";
import FieldAuditDialog from "./FieldAuditDialog";
import QueryList from "./QueryList";
import SignatureHistory from "./SignatureHistory";
import ElectronicSignature from "./ElectronicSignature";
import SDVProgress from "./SDVProgress";
import { Save, CheckCircle, Lock, Signature, MessageSquare, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRFFieldData } from "./CRFFieldRenderer";

interface CRFFormSection {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  fields: CRFFieldData[];
}

interface DynamicCRFFormProps {
  entryId: string;
  templateId: string;
  participantId: string;
  visitId?: string;
  readOnly?: boolean;
  onStatusChange?: (status: CRFStatus) => void;
  onComplete?: () => void;
}

const AUTO_SAVE_DELAY = 30000; // 30 seconds

const DynamicCRFForm = ({
  entryId,
  templateId,
  participantId,
  visitId,
  readOnly = false,
  onStatusChange,
  onComplete,
}: DynamicCRFFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<CRFFormSection[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<CRFStatus>("draft");
  const [isLocked, setIsLocked] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [fieldQueries, setFieldQueries] = useState<Record<string, boolean>>({});
  const [fieldVerified, setFieldVerified] = useState<Record<string, boolean>>({});
  const [queryDialogField, setQueryDialogField] = useState<string | null>(null);
  const [auditDialogField, setAuditDialogField] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("form");
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch template structure and entry data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch sections and fields
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("crf_sections")
        .select("*")
        .eq("template_id", templateId)
        .order("display_order");

      if (sectionsError) throw sectionsError;

      // Fetch fields for all sections
      const sectionIds = sectionsData?.map((s) => s.id) || [];
      const { data: fieldsData, error: fieldsError } = await supabase
        .from("crf_fields")
        .select("*")
        .in("section_id", sectionIds)
        .order("display_order");

      if (fieldsError) throw fieldsError;

      // Combine sections with their fields
      const sectionsWithFields: CRFFormSection[] = (sectionsData || []).map((section) => ({
        id: section.id,
        name: section.name,
        description: section.description,
        display_order: section.display_order,
        fields: (fieldsData || [])
          .filter((f) => f.section_id === section.id)
          .map((f) => ({
            id: f.id,
            field_name: f.field_name,
            field_label: f.field_label,
            field_type: f.field_type,
            options: Array.isArray(f.options) ? (f.options as string[]) : [],
            validation_rules: (f.validation_rules as { min?: number; max?: number; pattern?: string }) || {},
            is_required: f.is_required,
            help_text: f.help_text || "",
            display_order: f.display_order,
            skip_logic: (f.skip_logic as any) || {},
            edit_checks: Array.isArray(f.edit_checks) ? (f.edit_checks as any[]) : [],
            min_value: f.min_value ?? undefined,
            max_value: f.max_value ?? undefined,
          })),
      }));

      setSections(sectionsWithFields);
      if (sectionsWithFields.length > 0) {
        setActiveSection(sectionsWithFields[0].id);
      }

      // Fetch entry data
      const { data: entryData, error: entryError } = await supabase
        .from("crf_entries")
        .select("*")
        .eq("id", entryId)
        .single();

      if (entryError && entryError.code !== "PGRST116") throw entryError;

      if (entryData) {
        setStatus(entryData.status as CRFStatus);
        setIsLocked(entryData.is_locked || false);
        setIsVerified(entryData.is_verified || false);
        setIsSigned(!!entryData.signed_at);
      }

      // Fetch field values
      const { data: valuesData, error: valuesError } = await supabase
        .from("crf_field_values")
        .select("*")
        .eq("entry_id", entryId);

      if (valuesError) throw valuesError;

      const valuesMap: Record<string, string> = {};
      const verifiedMap: Record<string, boolean> = {};
      const queriesMap: Record<string, boolean> = {};

      (valuesData || []).forEach((v) => {
        valuesMap[v.field_id] = v.value || "";
        verifiedMap[v.field_id] = v.sdv_status === "verified";
        queriesMap[v.field_id] = v.query_status === "open";
      });

      setValues(valuesMap);
      setOriginalValues(valuesMap);
      setFieldVerified(verifiedMap);
      setFieldQueries(queriesMap);
    } catch (error) {
      console.error("Error fetching CRF data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o formulário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [entryId, templateId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges && !readOnly && !isLocked) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      autoSaveTimer.current = setTimeout(() => {
        handleSave(true);
      }, AUTO_SAVE_DELAY);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [hasUnsavedChanges, values, readOnly, isLocked]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setHasUnsavedChanges(true);
  };

  const handleFieldBlur = async (fieldId: string) => {
    // Save individual field value on blur
    if (readOnly || isLocked) return;

    const value = values[fieldId];
    const originalValue = originalValues[fieldId];

    if (value === originalValue) return;

    try {
      const { data: existingValue } = await supabase
        .from("crf_field_values")
        .select("id")
        .eq("entry_id", entryId)
        .eq("field_id", fieldId)
        .single();

      if (existingValue) {
        await supabase
          .from("crf_field_values")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("id", existingValue.id);
      } else {
        await supabase.from("crf_field_values").insert({
          entry_id: entryId,
          field_id: fieldId,
          value,
        });
      }

      // Log to audit trail
      await supabase.from("crf_audit_log").insert({
        entry_id: entryId,
        field_id: fieldId,
        action: originalValue ? "update" : "create",
        old_value: originalValue || null,
        new_value: value,
      });

      setOriginalValues((prev) => ({ ...prev, [fieldId]: value }));
    } catch (error) {
      console.error("Error saving field:", error);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (readOnly || isLocked) return;

    setSaving(true);
    try {
      // Update entry status
      const newStatus = calculateStatus();
      await supabase
        .from("crf_entries")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      // Save all changed values
      const changedFields = Object.entries(values).filter(
        ([fieldId, value]) => value !== originalValues[fieldId]
      );

      for (const [fieldId, value] of changedFields) {
        const { data: existingValue } = await supabase
          .from("crf_field_values")
          .select("id")
          .eq("entry_id", entryId)
          .eq("field_id", fieldId)
          .single();

        if (existingValue) {
          await supabase
            .from("crf_field_values")
            .update({ value, updated_at: new Date().toISOString() })
            .eq("id", existingValue.id);
        } else {
          await supabase.from("crf_field_values").insert({
            entry_id: entryId,
            field_id: fieldId,
            value,
          });
        }
      }

      setOriginalValues({ ...values });
      setHasUnsavedChanges(false);
      setStatus(newStatus);
      onStatusChange?.(newStatus);

      if (!isAutoSave) {
        toast({
          title: "Salvo",
          description: "Dados salvos com sucesso",
        });
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateStatus = (): CRFStatus => {
    const allFields = sections.flatMap((s) => s.fields);
    const requiredFields = allFields.filter((f) => f.is_required);
    const allRequiredFilled = requiredFields.every((f) => {
      const value = values[f.id];
      return value && value.trim() !== "";
    });

    if (allRequiredFilled) {
      return "completed";
    } else if (Object.keys(values).length > 0) {
      return "in_progress";
    }
    return "draft";
  };

  const handleComplete = async () => {
    const currentStatus = calculateStatus();
    if (currentStatus !== "completed") {
      toast({
        title: "Atenção",
        description: "Preencha todos os campos obrigatórios antes de completar",
        variant: "destructive",
      });
      return;
    }

    await handleSave();
    onComplete?.();
  };

  // Calculate overall completion
  const allFields = sections.flatMap((s) => s.fields);
  const requiredFields = allFields.filter((f) => f.is_required);
  const completedRequired = requiredFields.filter((f) => {
    const value = values[f.id];
    return value && value.trim() !== "";
  }).length;
  const overallCompletion = requiredFields.length > 0
    ? Math.round((completedRequired / requiredFields.length) * 100)
    : 100;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <CRFStatusIndicator
            status={status}
            isLocked={isLocked}
            isVerified={isVerified}
            isSigned={isSigned}
            queriesCount={Object.values(fieldQueries).filter(Boolean).length}
          />
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm text-muted-foreground">
            {overallCompletion}% completo ({completedRequired}/{requiredFields.length} campos obrigatórios)
          </span>
          {hasUnsavedChanges && (
            <span className="text-xs text-yellow-600">Alterações não salvas</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && !isLocked && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave()}
                disabled={saving || !hasUnsavedChanges}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              {status === "completed" && !isSigned && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSignatureDialog(true)}
                >
                  <Signature className="h-4 w-4 mr-1" />
                  Assinar
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={saving || overallCompletion < 100}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Completar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="form" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Formulário
            </TabsTrigger>
            <TabsTrigger value="queries" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Queries
              {Object.values(fieldQueries).filter(Boolean).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                  {Object.values(fieldQueries).filter(Boolean).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="signatures" className="gap-2">
              <Signature className="h-4 w-4" />
              Assinaturas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="form" className="flex-1 flex overflow-hidden m-0">
          {/* Section Navigation */}
          <aside className="w-64 border-r bg-muted/20 overflow-auto hidden lg:block">
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">SDV Progress</h3>
                <SDVProgress
                  verified={Object.values(fieldVerified).filter(Boolean).length}
                  total={allFields.length}
                  size="sm"
                />
              </div>
              <Separator />
              <h3 className="font-medium text-sm text-muted-foreground">Seções</h3>
              {sections.map((section) => {
                const sectionFields = section.fields;
                const sectionRequired = sectionFields.filter((f) => f.is_required);
                const sectionCompleted = sectionRequired.filter((f) => {
                  const value = values[f.id];
                  return value && value.trim() !== "";
                }).length;
                const sectionPercent = sectionRequired.length > 0
                  ? Math.round((sectionCompleted / sectionRequired.length) * 100)
                  : 100;

                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      document.getElementById(`section-${section.id}`)?.scrollIntoView({
                        behavior: "smooth",
                      });
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors",
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{section.name}</span>
                      <span className={cn(
                        "text-xs",
                        activeSection === section.id ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {sectionPercent}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Form */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
              {sections.map((section) => (
                <CRFSection
                  key={section.id}
                  id={section.id}
                  name={section.name}
                  description={section.description || undefined}
                  fields={section.fields}
                  values={values}
                  onFieldChange={handleFieldChange}
                  onFieldBlur={handleFieldBlur}
                  disabled={readOnly || isLocked}
                  fieldQueries={Object.fromEntries(
                    section.fields.map((f) => [f.id, fieldQueries[f.id] || false])
                  )}
                  fieldVerified={Object.fromEntries(
                    section.fields.map((f) => [f.id, fieldVerified[f.id] || false])
                  )}
                  onOpenQuery={(fieldId) => setQueryDialogField(fieldId)}
                  onShowHistory={(fieldId) => setAuditDialogField(fieldId)}
                  isActive={activeSection === section.id}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="queries" className="flex-1 overflow-auto m-0 p-6">
          <div className="max-w-4xl mx-auto">
            <QueryList entryId={entryId} onQueryUpdate={fetchData} />
          </div>
        </TabsContent>

        <TabsContent value="signatures" className="flex-1 overflow-auto m-0 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <SignatureHistory entityType="crf_entry" entityId={entryId} />
            {status === "completed" && !isSigned && !readOnly && (
              <div className="flex justify-center">
                <Button onClick={() => setShowSignatureDialog(true)}>
                  <Signature className="h-4 w-4 mr-2" />
                  Apply Electronic Signature
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Query Dialog */}
      {queryDialogField && (
        <QueryDialog
          open={!!queryDialogField}
          onClose={() => setQueryDialogField(null)}
          entryId={entryId}
          fieldId={queryDialogField}
          onQueryCreated={() => {
            setFieldQueries((prev) => ({ ...prev, [queryDialogField]: true }));
            setQueryDialogField(null);
          }}
        />
      )}

      {/* Audit Dialog */}
      {auditDialogField && (
        <FieldAuditDialog
          open={!!auditDialogField}
          onClose={() => setAuditDialogField(null)}
          entryId={entryId}
          fieldId={auditDialogField}
        />
      )}

      {/* Signature Dialog */}
      <ElectronicSignature
        open={showSignatureDialog}
        onClose={() => setShowSignatureDialog(false)}
        entityType="crf_entry"
        entityId={entryId}
        signerRole="Investigator"
        onSignatureComplete={() => {
          setIsSigned(true);
          setStatus("signed");
          onStatusChange?.("signed");
          setShowSignatureDialog(false);
        }}
      />
    </div>
  );
};

export default DynamicCRFForm;
