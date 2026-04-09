import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TMFZone {
  id: string;
  zone_number: string;
  zone_name: string;
  description: string;
  display_order: number;
}

interface TMFSection {
  id: string;
  zone_id: string;
  section_number: string;
  section_name: string;
  description: string;
  display_order: number;
}

interface TMFArtifact {
  id: string;
  section_id: string;
  artifact_number: string;
  artifact_name: string;
  description: string;
  level: string;
  is_required: boolean;
  display_order: number;
  documentCount?: number;
  hasApproved?: boolean;
}

interface TMFDocument {
  id: string;
  artifact_id: string;
  file_name: string;
  status: string;
  version: number;
}

interface Props {
  zones: TMFZone[];
  projectId: string;
  onDocumentClick?: (documentId: string) => void;
}

const TMFZoneTree = ({ zones, projectId, onDocumentClick }: Props) => {
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<string>>(new Set());
  const [sections, setSections] = useState<TMFSection[]>([]);
  const [artifacts, setArtifacts] = useState<TMFArtifact[]>([]);
  const [documents, setDocuments] = useState<TMFDocument[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar estrutura TMF (seções e artefatos) - dados globais
  useEffect(() => {
    fetchStructureData();
  }, []);

  // Carregar documentos quando projectId mudar
  useEffect(() => {
    if (projectId) {
      fetchDocuments();
    } else {
      setDocuments([]);
      // Reset artifact counts when no project
      setArtifacts(prev => prev.map(a => ({ ...a, documentCount: 0, hasApproved: false })));
    }
  }, [projectId]);

  const fetchStructureData = async () => {
    setLoading(true);
    
    // Fetch sections
    const { data: sectionsData } = await supabase
      .from("tmf_sections")
      .select("*")
      .order("display_order");
    
    setSections(sectionsData || []);

    // Fetch artifacts
    const { data: artifactsData } = await supabase
      .from("tmf_artifacts")
      .select("*")
      .order("display_order");

    // Initialize artifacts with zero counts
    const initializedArtifacts = (artifactsData || []).map(artifact => ({
      ...artifact,
      documentCount: 0,
      hasApproved: false
    }));

    setArtifacts(initializedArtifacts);
    setLoading(false);
  };

  const fetchDocuments = async () => {
    const { data: docsData } = await supabase
      .from("tmf_documents")
      .select("id, artifact_id, file_name, status, version")
      .eq("project_id", projectId);

    setDocuments(docsData || []);

    // Update artifacts with document counts
    setArtifacts(prev => prev.map(artifact => {
      const artifactDocs = (docsData || []).filter(d => d.artifact_id === artifact.id);
      return {
        ...artifact,
        documentCount: artifactDocs.length,
        hasApproved: artifactDocs.some(d => d.status === "approved")
      };
    }));
  };

  const toggleZone = (zoneId: string) => {
    const newExpanded = new Set(expandedZones);
    if (newExpanded.has(zoneId)) {
      newExpanded.delete(zoneId);
    } else {
      newExpanded.add(zoneId);
    }
    setExpandedZones(newExpanded);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleArtifact = (artifactId: string) => {
    const newExpanded = new Set(expandedArtifacts);
    if (newExpanded.has(artifactId)) {
      newExpanded.delete(artifactId);
    } else {
      newExpanded.add(artifactId);
    }
    setExpandedArtifacts(newExpanded);
  };

  const getZoneSections = (zoneId: string) => {
    return sections.filter(s => s.zone_id === zoneId);
  };

  const getSectionArtifacts = (sectionId: string) => {
    return artifacts.filter(a => a.section_id === sectionId);
  };

  const getArtifactDocuments = (artifactId: string) => {
    return documents.filter(d => d.artifact_id === artifactId);
  };

  const getZoneCompleteness = (zoneId: string) => {
    const zoneSections = getZoneSections(zoneId);
    let requiredCount = 0;
    let completedCount = 0;

    zoneSections.forEach(section => {
      const sectionArtifacts = getSectionArtifacts(section.id);
      sectionArtifacts.forEach(artifact => {
        if (artifact.is_required) {
          requiredCount++;
          if (artifact.hasApproved) {
            completedCount++;
          }
        }
      });
    });

    if (requiredCount === 0) return null;
    return { required: requiredCount, completed: completedCount };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "text-green-600";
      case "pending_review": return "text-yellow-600";
      case "draft": return "text-muted-foreground";
      default: return "text-red-600";
    }
  };

  const getLevelBadge = (level: string) => {
    const config: Record<string, { label: string; className: string }> = {
      trial: { label: "Trial", className: "bg-blue-100 text-blue-700" },
      country: { label: "País", className: "bg-purple-100 text-purple-700" },
      site: { label: "Centro", className: "bg-orange-100 text-orange-700" },
    };
    const c = config[level] || { label: level, className: "" };
    return <span className={cn("text-xs px-1.5 py-0.5 rounded", c.className)}>{c.label}</span>;
  };

  if (loading) {
    return <div className="text-muted-foreground text-center py-8">Carregando estrutura TMF...</div>;
  }

  return (
    <div className="space-y-1">
      {zones.map((zone) => {
        const isZoneExpanded = expandedZones.has(zone.id);
        const zoneSections = getZoneSections(zone.id);
        const completeness = getZoneCompleteness(zone.id);

        return (
          <div key={zone.id} className="border rounded-lg overflow-hidden">
            {/* Zone Header */}
            <div
              className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => toggleZone(zone.id)}
            >
              {isZoneExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {isZoneExpanded ? (
                <FolderOpen className="h-5 w-5 text-primary" />
              ) : (
                <Folder className="h-5 w-5 text-primary" />
              )}
              <span className="font-medium">
                Zone {zone.zone_number}: {zone.zone_name}
              </span>
              {completeness && (
                <Badge 
                  variant={completeness.completed === completeness.required ? "default" : "secondary"}
                  className="ml-auto"
                >
                  {completeness.completed}/{completeness.required}
                </Badge>
              )}
            </div>

            {/* Sections */}
            {isZoneExpanded && (
              <div className="pl-6 border-t">
                {zoneSections.map((section) => {
                  const isSectionExpanded = expandedSections.has(section.id);
                  const sectionArtifacts = getSectionArtifacts(section.id);

                  return (
                    <div key={section.id}>
                      {/* Section Header */}
                      <div
                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => toggleSection(section.id)}
                      >
                        {isSectionExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {section.section_number} - {section.section_name}
                        </span>
                      </div>

                      {/* Artifacts */}
                      {isSectionExpanded && (
                        <div className="pl-6">
                          {sectionArtifacts.map((artifact) => {
                            const isArtifactExpanded = expandedArtifacts.has(artifact.id);
                            const artifactDocs = getArtifactDocuments(artifact.id);

                            return (
                              <div key={artifact.id}>
                                {/* Artifact Header */}
                                <div
                                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent transition-colors"
                                  onClick={() => toggleArtifact(artifact.id)}
                                >
                                  {artifactDocs.length > 0 ? (
                                    isArtifactExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )
                                  ) : (
                                    <span className="w-4" />
                                  )}
                                  
                                  {artifact.hasApproved ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : artifact.is_required ? (
                                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  
                                  <span className={cn(
                                    "text-sm flex-1",
                                    artifact.is_required && !artifact.hasApproved && "font-medium"
                                  )}>
                                    {artifact.artifact_number} - {artifact.artifact_name}
                                  </span>
                                  
                                  {getLevelBadge(artifact.level)}
                                  
                                  {artifact.documentCount! > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {artifact.documentCount}
                                    </Badge>
                                  )}
                                </div>

                                {/* Documents */}
                                {isArtifactExpanded && artifactDocs.length > 0 && (
                                  <div className="pl-10 space-y-1 pb-2">
                                    {artifactDocs.map((doc) => (
                                      <div
                                        key={doc.id}
                                        className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDocumentClick?.(doc.id);
                                        }}
                                      >
                                        <FileText className={cn("h-4 w-4", getStatusColor(doc.status))} />
                                        <span className="text-sm truncate flex-1">{doc.file_name}</span>
                                        <span className="text-xs text-muted-foreground">v{doc.version}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TMFZoneTree;
