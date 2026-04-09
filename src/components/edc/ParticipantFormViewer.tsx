import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { FileText, Edit, CheckCircle, Clock, AlertCircle, MessageSquare, Eye, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import QueryDialog from "./QueryDialog";
import { useEDCPermission } from "@/hooks/useEDCPermission";
import { useLanguage } from "@/hooks/useLanguage";

interface FieldValue {
  id: string;
  field_id: string;
  value: string | null;
  sdv_status: string | null;
  query_status: string | null;
}

interface QueryData {
  id: string;
  field_id: string | null;
  status: string;
  priority: string;
  query_text: string;
}

interface Field {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: string[] | null;
  display_order: number;
  is_required: boolean;
}

interface Section {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  fields: Field[];
}

interface CRFEntry {
  id: string;
  status: string;
  signed_at: string | null;
  created_at: string;
  template_id: string;
  template: {
    id: string;
    name: string;
  };
}

interface ParticipantFormViewerProps {
  entries: CRFEntry[];
  participantId: string;
  siteId?: string;
}

const ParticipantFormViewer = ({ entries, participantId, siteId }: ParticipantFormViewerProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation(["edc", "common"]);
  const { currentLanguage } = useLanguage();
  const dateLocale = currentLanguage === "pt-BR" ? ptBR : enUS;
  const { canEnterData, canManageQueries, isOversightRole, loading: permissionLoading } = useEDCPermission();
  const [loading, setLoading] = useState(true);
  
  // Role-based permissions
  const canEdit = siteId ? canEnterData(siteId) : canEnterData();
  const canOpenQueries = canManageQueries();
  const isViewOnly = isOversightRole() && !canEdit;
  const [sectionsMap, setSectionsMap] = useState<Record<string, Section[]>>({});
  const [valuesMap, setValuesMap] = useState<Record<string, Record<string, FieldValue>>>({});
  const [queriesMap, setQueriesMap] = useState<Record<string, QueryData[]>>({});
  const [expandedEntries, setExpandedEntries] = useState<string[]>(entries.map(e => e.id));
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<{ entryId: string; fieldId: string } | null>(null);

  useEffect(() => {
    if (entries.length > 0) {
      fetchFormData();
    } else {
      setLoading(false);
    }
  }, [entries]);

  const fetchFormData = async () => {
    setLoading(true);
    try {
      const templateIds = [...new Set(entries.map(e => e.template_id))];
      const entryIds = entries.map(e => e.id);
      
      // Fetch all sections for templates
      const { data: sectionsData } = await supabase
        .from("crf_sections")
        .select("*")
        .in("template_id", templateIds)
        .order("display_order");

      if (!sectionsData) {
        setLoading(false);
        return;
      }

      // Fetch all fields
      const sectionIds = sectionsData.map(s => s.id);
      const { data: fieldsData } = await supabase
        .from("crf_fields")
        .select("*")
        .in("section_id", sectionIds)
        .order("display_order");

      // Group sections by template with their fields
      const tempSectionsMap: Record<string, Section[]> = {};
      sectionsData.forEach(section => {
        if (!tempSectionsMap[section.template_id]) {
          tempSectionsMap[section.template_id] = [];
        }
        const sectionFields = (fieldsData || [])
          .filter(f => f.section_id === section.id)
          .map(f => ({
            id: f.id,
            field_name: f.field_name,
            field_label: f.field_label,
            field_type: f.field_type,
            options: Array.isArray(f.options) ? f.options as string[] : null,
            display_order: f.display_order,
            is_required: f.is_required,
          }));
        
        tempSectionsMap[section.template_id].push({
          id: section.id,
          name: section.name,
          description: section.description,
          display_order: section.display_order,
          fields: sectionFields,
        });
      });
      setSectionsMap(tempSectionsMap);

      // Fetch all field values for entries
      const { data: valuesData } = await supabase
        .from("crf_field_values")
        .select("*")
        .in("entry_id", entryIds);

      // Group values by entry and field
      const tempValuesMap: Record<string, Record<string, FieldValue>> = {};
      (valuesData || []).forEach(v => {
        if (!tempValuesMap[v.entry_id]) {
          tempValuesMap[v.entry_id] = {};
        }
        tempValuesMap[v.entry_id][v.field_id] = {
          id: v.id,
          field_id: v.field_id,
          value: v.value,
          sdv_status: v.sdv_status,
          query_status: v.query_status,
        };
      });
      setValuesMap(tempValuesMap);

      // Fetch all queries for entries
      const { data: queriesData } = await supabase
        .from("data_queries")
        .select("id, field_id, status, priority, query_text")
        .in("entry_id", entryIds);

      // Group queries by entry_id + field_id
      const tempQueriesMap: Record<string, QueryData[]> = {};
      (queriesData || []).forEach(q => {
        const key = q.field_id || "";
        if (!tempQueriesMap[key]) {
          tempQueriesMap[key] = [];
        }
        tempQueriesMap[key].push(q);
      });
      setQueriesMap(tempQueriesMap);
    } catch (error) {
      console.error("Error fetching form data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (field: Field, value: string | null | undefined): string => {
    if (!value || value === "") return "—";
    
    switch (field.field_type) {
      case "date":
        try {
          return format(new Date(value), "dd/MM/yyyy", { locale: dateLocale });
        } catch {
          return value;
        }
      case "checkbox":
        return value.split(",").join(", ") || "—";
      default:
        return value;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      in_progress: "secondary",
      draft: "outline",
    };
    const labels: Record<string, string> = {
      completed: t("edc:status.completed"),
      in_progress: t("edc:status.in_progress"),
      draft: t("edc:status.draft"),
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const getQueryStatusInfo = (fieldId: string) => {
    const queries = queriesMap[fieldId] || [];
    if (queries.length === 0) {
      return { hasQuery: false, status: null, count: 0, latestQuery: null };
    }

    const openQueries = queries.filter(q => q.status === "open");
    const answeredQueries = queries.filter(q => q.status === "answered");
    const closedQueries = queries.filter(q => q.status === "closed");

    let status: "open" | "answered" | "closed" = "closed";
    if (openQueries.length > 0) {
      status = "open";
    } else if (answeredQueries.length > 0) {
      status = "answered";
    }

    return {
      hasQuery: true,
      status,
      count: queries.length,
      openCount: openQueries.length,
      answeredCount: answeredQueries.length,
      closedCount: closedQueries.length,
      latestQuery: queries[0],
    };
  };

  const getQueryIconColor = (status: "open" | "answered" | "closed" | null) => {
    switch (status) {
      case "open":
        return "text-destructive hover:text-destructive/80";
      case "answered":
        return "text-amber-500 hover:text-amber-600";
      case "closed":
        return "text-emerald-500 hover:text-emerald-600";
      default:
        return "text-muted-foreground/50 hover:text-muted-foreground";
    }
  };

  const getQueryTooltip = (queryInfo: ReturnType<typeof getQueryStatusInfo>) => {
    if (!queryInfo.hasQuery) {
      return t("edc:queries.createQuery");
    }
    
    const parts: string[] = [];
    if (queryInfo.openCount && queryInfo.openCount > 0) {
      parts.push(`${queryInfo.openCount} ${t("edc:formViewer.openCount")}`);
    }
    if (queryInfo.answeredCount && queryInfo.answeredCount > 0) {
      parts.push(`${queryInfo.answeredCount} ${t("edc:formViewer.answeredCount")}`);
    }
    if (queryInfo.closedCount && queryInfo.closedCount > 0) {
      parts.push(`${queryInfo.closedCount} ${t("edc:formViewer.closedCount")}`);
    }
    
    return `${t("edc:queries.title")}: ${parts.join(", ")}`;
  };

  const handleOpenQueryDialog = (entryId: string, fieldId: string) => {
    setSelectedField({ entryId, fieldId });
    setQueryDialogOpen(true);
  };

  const handleQueryCreated = () => {
    setQueryDialogOpen(false);
    setSelectedField(null);
    fetchFormData(); // Refresh data
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p>{t("edc:participantForms.noForms")}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Accordion 
          type="multiple" 
          value={expandedEntries}
          onValueChange={setExpandedEntries}
          className="space-y-4"
        >
          {entries.map((entry) => {
            const sections = sectionsMap[entry.template_id] || [];
            const entryValues = valuesMap[entry.id] || {};
            
            return (
              <AccordionItem 
                key={entry.id} 
                value={entry.id}
                className="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(entry.status)}
                      <span className="font-medium">{entry.template.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(entry.status)}
                      {entry.signed_at && (
                        <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500">
                          {t("edc:status.signed")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="border-t">
                    {sections.map((section, sectionIdx) => (
                      <div key={section.id} className={cn(sectionIdx > 0 && "border-t")}>
                        <div className="bg-muted/30 px-4 py-2">
                          <h4 className="font-medium text-sm">{section.name}</h4>
                          {section.description && (
                            <p className="text-xs text-muted-foreground">{section.description}</p>
                          )}
                        </div>
                        <div className="divide-y">
                          {section.fields.map((field) => {
                            const fieldValue = entryValues[field.id];
                            const queryInfo = getQueryStatusInfo(field.id);
                            const isVerified = fieldValue?.sdv_status === "verified";
                            
                            return (
                              <div 
                                key={field.id} 
                                className={cn(
                                  "px-4 py-3 grid grid-cols-[1fr,1fr,auto] gap-4 items-center",
                                  queryInfo.status === "open" && "bg-destructive/5",
                                  queryInfo.status === "answered" && "bg-amber-50 dark:bg-amber-950/20"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-sm",
                                    field.is_required && "font-medium"
                                  )}>
                                    {field.field_label}
                                    {field.is_required && <span className="text-destructive ml-0.5">*</span>}
                                  </span>
                                  {isVerified && (
                                    <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                </div>
                                
                                {/* Value in the middle */}
                                <div className="text-sm text-center">
                                  {formatValue(field, fieldValue?.value)}
                                </div>
                                
                                {/* Query Icon Button on the right - only show if can manage queries */}
                                <div className="flex items-center justify-end">
                                  {canOpenQueries ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => handleOpenQueryDialog(entry.id, field.id)}
                                          className={cn(
                                            "p-1.5 rounded-md transition-colors relative",
                                            getQueryIconColor(queryInfo.status),
                                            "hover:bg-muted"
                                          )}
                                        >
                                          <MessageSquare className="h-4 w-4" />
                                          {queryInfo.hasQuery && queryInfo.openCount && queryInfo.openCount > 0 && (
                                            <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                                              {queryInfo.openCount}
                                            </span>
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p>{getQueryTooltip(queryInfo)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : queryInfo.hasQuery ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className={cn("p-1.5", getQueryIconColor(queryInfo.status))}>
                                          <MessageSquare className="h-4 w-4" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p>{getQueryTooltip(queryInfo)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {/* Footer with actions */}
                    <div className="bg-muted/20 px-4 py-3 flex items-center justify-between border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {t("edc:formViewer.createdAt")} {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                        </span>
                        {isViewOnly && (
                          <Badge variant="outline" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            {t("edc:formViewer.readOnly")}
                          </Badge>
                        )}
                      </div>
                      {canEdit ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/edc/entry/${entry.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {t("common:actions.edit")}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/edc/entry/${entry.id}?view=true`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t("common:actions.view")}
                        </Button>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Query Dialog */}
        {selectedField && (
          <QueryDialog
            open={queryDialogOpen}
            onClose={() => {
              setQueryDialogOpen(false);
              setSelectedField(null);
            }}
            entryId={selectedField.entryId}
            fieldId={selectedField.fieldId}
            onQueryCreated={handleQueryCreated}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default ParticipantFormViewer;
