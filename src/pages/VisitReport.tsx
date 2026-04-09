import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EDCNav from "@/components/EDCNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle2, AlertTriangle, Plus, FileSignature, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import SignaturePad from "@/components/visits/SignaturePad";

interface Visit {
  id: string;
  visit_type: string;
  visit_number: number | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  notes: string | null;
  report_notes: string | null;
  signature_data: string | null;
  signed_at: string | null;
  project: { id: string; title: string; protocol_number: string | null } | null;
  site: { id: string; site_code: string; name: string; pi_name: string | null } | null;
}

interface ChecklistItem {
  id: string;
  item_text: string;
  item_order: number;
  is_required: boolean;
  completed: boolean;
  notes: string | null;
}

interface Finding {
  id: string;
  description: string;
  severity: string;
  status: string;
  due_date: string | null;
  resolution: string | null;
}

const visitTypeColors: Record<string, string> = {
  SQV: "bg-info/20 text-info",
  SIV: "bg-success/20 text-success",
  IMV: "bg-primary/20 text-primary",
  COV: "bg-warning/20 text-warning",
};

const severityColors: Record<string, string> = {
  minor: "bg-muted text-muted-foreground",
  major: "bg-warning/20 text-warning",
  critical: "bg-destructive/20 text-destructive",
};

export default function VisitReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportNotes, setReportNotes] = useState("");
  const [showSignature, setShowSignature] = useState(false);
  
  // New finding form
  const [newFinding, setNewFinding] = useState({
    description: "",
    severity: "minor",
    due_date: "",
  });

  useEffect(() => {
    if (id) fetchVisitData();
  }, [id]);

  const fetchVisitData = async () => {
    setLoading(true);
    try {
      const [visitRes, checklistRes, findingsRes] = await Promise.all([
        supabase
          .from("study_visits")
          .select("*, project:projects(id, title, protocol_number), site:study_sites(id, site_code, name, pi_name)")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("visit_checklist_items")
          .select("*")
          .eq("visit_id", id)
          .order("item_order"),
        supabase
          .from("visit_findings")
          .select("*")
          .eq("visit_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (visitRes.error) throw visitRes.error;
      if (!visitRes.data) {
        toast.error("Visita não encontrada");
        navigate("/visit-agenda");
        return;
      }

      setVisit(visitRes.data as Visit);
      setReportNotes(visitRes.data.report_notes || "");
      setChecklistItems(checklistRes.data || []);
      setFindings(findingsRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar visita: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistToggle = async (itemId: string, completed: boolean) => {
    // Optimistic update
    setChecklistItems(prev => 
      prev.map(item => item.id === itemId ? { ...item, completed } : item)
    );

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("visit_checklist_items")
        .update({ 
          completed, 
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null
        })
        .eq("id", itemId);

      if (error) throw error;
    } catch (error: any) {
      toast.error("Erro ao atualizar checklist");
      fetchVisitData();
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("study_visits")
        .update({ report_notes: reportNotes })
        .eq("id", id);

      if (error) throw error;
      toast.success("Notas salvas!");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFinding = async () => {
    if (!newFinding.description.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("visit_findings").insert({
        visit_id: id,
        description: newFinding.description,
        severity: newFinding.severity,
        due_date: newFinding.due_date || null,
        created_by: user?.id,
      });

      if (error) throw error;
      
      toast.success("Achado registrado!");
      setNewFinding({ description: "", severity: "minor", due_date: "" });
      fetchVisitData();
    } catch (error: any) {
      toast.error("Erro ao adicionar achado: " + error.message);
    }
  };

  const handleDeleteFinding = async (findingId: string) => {
    try {
      const { error } = await supabase
        .from("visit_findings")
        .delete()
        .eq("id", findingId);

      if (error) throw error;
      toast.success("Achado removido");
      setFindings(prev => prev.filter(f => f.id !== findingId));
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const handleSignature = async (signatureData: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("study_visits")
        .update({
          signature_data: signatureData,
          signed_by: user?.id,
          signed_at: new Date().toISOString(),
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Relatório assinado e visita concluída!");
      setShowSignature(false);
      fetchVisitData();
    } catch (error: any) {
      toast.error("Erro ao assinar: " + error.message);
    }
  };

  const handleStartVisit = async () => {
    try {
      const { error } = await supabase
        .from("study_visits")
        .update({ status: "in_progress" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Visita iniciada!");
      fetchVisitData();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const completedRequired = checklistItems.filter(i => i.is_required && i.completed).length;
  const totalRequired = checklistItems.filter(i => i.is_required).length;
  const canSign = totalRequired === 0 || completedRequired === totalRequired;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EDCNav />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!visit) return null;

  return (
    <div className="min-h-screen bg-background">
      <EDCNav />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/visit-agenda")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className={visitTypeColors[visit.visit_type] || "bg-muted"}>
                  {visit.visit_type}
                  {visit.visit_number && ` #${visit.visit_number}`}
                </Badge>
                <Badge variant={visit.status === "completed" ? "default" : "secondary"}>
                  {visit.status === "scheduled" && "Agendada"}
                  {visit.status === "in_progress" && "Em Andamento"}
                  {visit.status === "completed" && "Concluída"}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Relatório de Visita - {visit.site?.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(visit.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                {visit.scheduled_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {visit.scheduled_time.slice(0, 5)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {visit.site?.site_code}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {visit.status === "scheduled" && (
                <Button onClick={handleStartVisit}>Iniciar Visita</Button>
              )}
              {visit.status === "in_progress" && !visit.signature_data && (
                <Button 
                  onClick={() => setShowSignature(true)}
                  disabled={!canSign}
                  className="gap-2"
                >
                  <FileSignature className="h-4 w-4" />
                  Assinar e Concluir
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="checklist" className="space-y-6">
          <TabsList>
            <TabsTrigger value="checklist">
              Checklist ({completedRequired}/{totalRequired} obrigatórios)
            </TabsTrigger>
            <TabsTrigger value="findings">
              Achados ({findings.length})
            </TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
            {visit.signature_data && <TabsTrigger value="signature">Assinatura</TabsTrigger>}
          </TabsList>

          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Checklist da Visita</CardTitle>
                <CardDescription>
                  {totalRequired > 0 && (
                    <span className={completedRequired === totalRequired ? "text-success" : "text-warning"}>
                      {completedRequired} de {totalRequired} itens obrigatórios concluídos
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {checklistItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum item de checklist para esta visita
                  </p>
                ) : (
                  <div className="space-y-3">
                    {checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          item.completed ? "bg-success/5 border-success/20" : "border-border"
                        }`}
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={(checked) => handleChecklistToggle(item.id, !!checked)}
                          disabled={visit.status === "completed"}
                        />
                        <div className="flex-1">
                          <p className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                            {item.item_text}
                          </p>
                          {item.is_required && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        {item.completed && (
                          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="findings">
            <div className="space-y-4">
              {/* Add Finding Form */}
              {visit.status !== "completed" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Registrar Achado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Descrição do Achado</Label>
                      <Textarea
                        value={newFinding.description}
                        onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                        placeholder="Descreva o achado encontrado durante a visita..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Severidade</Label>
                        <Select
                          value={newFinding.severity}
                          onValueChange={(v) => setNewFinding({ ...newFinding, severity: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minor">Menor</SelectItem>
                            <SelectItem value="major">Maior</SelectItem>
                            <SelectItem value="critical">Crítico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Data Limite para Resolução</Label>
                        <Input
                          type="date"
                          value={newFinding.due_date}
                          onChange={(e) => setNewFinding({ ...newFinding, due_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddFinding} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Achado
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Findings List */}
              <Card>
                <CardHeader>
                  <CardTitle>Achados Registrados</CardTitle>
                </CardHeader>
                <CardContent>
                  {findings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum achado registrado
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {findings.map((finding) => (
                        <div
                          key={finding.id}
                          className="flex items-start justify-between p-4 rounded-lg border"
                        >
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                              finding.severity === "critical" ? "text-destructive" :
                              finding.severity === "major" ? "text-warning" : "text-muted-foreground"
                            }`} />
                            <div>
                              <p className="text-sm">{finding.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={severityColors[finding.severity]}>
                                  {finding.severity === "minor" && "Menor"}
                                  {finding.severity === "major" && "Maior"}
                                  {finding.severity === "critical" && "Crítico"}
                                </Badge>
                                <Badge variant={finding.status === "open" ? "destructive" : "default"}>
                                  {finding.status === "open" ? "Aberto" : "Resolvido"}
                                </Badge>
                                {finding.due_date && (
                                  <span className="text-xs text-muted-foreground">
                                    Prazo: {format(new Date(finding.due_date), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {visit.status !== "completed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFinding(finding.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Notas do Relatório</CardTitle>
                <CardDescription>
                  Adicione observações gerais sobre a visita
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Adicione suas notas sobre a visita..."
                  rows={10}
                  disabled={visit.status === "completed"}
                />
                {visit.status !== "completed" && (
                  <Button onClick={handleSaveNotes} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar Notas"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {visit.signature_data && (
            <TabsContent value="signature">
              <Card>
                <CardHeader>
                  <CardTitle>Assinatura do Relatório</CardTitle>
                  <CardDescription>
                    {visit.signed_at && (
                      <span>
                        Assinado em {format(new Date(visit.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <img 
                      src={visit.signature_data} 
                      alt="Assinatura" 
                      className="max-w-full h-auto mx-auto"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Signature Modal */}
        {showSignature && (
          <SignaturePad
            open={showSignature}
            onClose={() => setShowSignature(false)}
            onSave={handleSignature}
          />
        )}
      </main>
    </div>
  );
}
