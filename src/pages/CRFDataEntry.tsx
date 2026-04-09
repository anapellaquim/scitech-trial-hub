import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EDCNav from "@/components/EDCNav";
import DynamicCRFForm from "@/components/edc/DynamicCRFForm";
import { ArrowLeft, FileText } from "lucide-react";

interface EntryInfo {
  id: string;
  template_id: string;
  participant_id: string;
  visit_id: string | null;
  status: string;
  template_name: string;
  participant_code: string;
  project_title: string;
}

const CRFDataEntry = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [entryInfo, setEntryInfo] = useState<EntryInfo | null>(null);

  // Check if we need to create a new entry
  const templateId = searchParams.get("template");
  const participantId = searchParams.get("participant");
  const visitId = searchParams.get("visit");

  useEffect(() => {
    if (entryId === "new" && templateId && participantId) {
      createNewEntry();
    } else if (entryId && entryId !== "new") {
      fetchEntryInfo();
    } else {
      toast({
        title: "Erro",
        description: "Parâmetros inválidos",
        variant: "destructive",
      });
      navigate("/edc");
    }
  }, [entryId, templateId, participantId]);

  const createNewEntry = async () => {
    if (!templateId || !participantId) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data: newEntry, error } = await supabase
        .from("crf_entries")
        .insert({
          template_id: templateId,
          participant_id: participantId,
          visit_id: visitId || null,
          status: "draft",
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the new entry
      navigate(`/edc/entry/${newEntry.id}`, { replace: true });
    } catch (error) {
      console.error("Error creating entry:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o formulário",
        variant: "destructive",
      });
      navigate("/edc");
    }
  };

  const fetchEntryInfo = async () => {
    if (!entryId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("crf_entries")
        .select(`
          id,
          template_id,
          participant_id,
          visit_id,
          status,
          crf_templates (
            name,
            project_id,
            projects (
              title
            )
          ),
          participants (
            participant_code
          )
        `)
        .eq("id", entryId)
        .single();

      if (error) throw error;

      setEntryInfo({
        id: data.id,
        template_id: data.template_id,
        participant_id: data.participant_id,
        visit_id: data.visit_id,
        status: data.status,
        template_name: (data.crf_templates as any)?.name || "Template",
        participant_code: (data.participants as any)?.participant_code || "Participante",
        project_title: (data.crf_templates as any)?.projects?.title || "Projeto",
      });
    } catch (error) {
      console.error("Error fetching entry:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o formulário",
        variant: "destructive",
      });
      navigate("/edc");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !entryInfo) {
    return (
      <div className="min-h-screen bg-background">
        <EDCNav />
        <main className="container mx-auto p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-[600px] w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EDCNav />
      <main className="flex-1 flex flex-col">
        {/* Page Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/edc")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-lg font-semibold">{entryInfo.template_name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {entryInfo.project_title} • Participante: {entryInfo.participant_code}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CRF Form */}
        <div className="flex-1">
          <DynamicCRFForm
            entryId={entryInfo.id}
            templateId={entryInfo.template_id}
            participantId={entryInfo.participant_id}
            visitId={entryInfo.visit_id || undefined}
            onComplete={() => {
              toast({
                title: "Sucesso",
                description: "Formulário completado com sucesso",
              });
              navigate("/edc");
            }}
          />
        </div>
      </main>
    </div>
  );
};

export default CRFDataEntry;
