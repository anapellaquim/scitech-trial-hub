import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ETMFNav from "@/components/ETMFNav";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  History,
  User,
  Calendar,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import SignaturePad from "@/components/visits/SignaturePad";

interface TMFDocument {
  id: string;
  artifact_id: string;
  project_id: string;
  site_id: string | null;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  status: string;
  effective_date: string | null;
  expiration_date: string | null;
  version: number;
  uploaded_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tmf_artifacts: {
    artifact_number: string;
    artifact_name: string;
    description: string;
    level: string;
  };
  uploader?: { full_name: string } | null;
  approver?: { full_name: string } | null;
  research_centers?: { code: string; name: string } | null;
}

interface AuditEntry {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user?: { full_name: string } | null;
}

const ETMFDocument = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState<TMFDocument | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [signaturePadOpen, setSignaturePadOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (documentId) {
      fetchDocument();
      fetchAuditLog();
      logView();
    }
  }, [documentId]);

  const fetchDocument = async () => {
    const { data, error } = await supabase
      .from("tmf_documents")
      .select(`
        *,
        tmf_artifacts (
          artifact_number,
          artifact_name,
          description,
          level
        ),
        research_centers (
          code,
          name
        )
      `)
      .eq("id", documentId)
      .maybeSingle();

    if (error || !data) {
      toast.error("Documento não encontrado");
      navigate("/etmf");
      return;
    }

    // Fetch uploader and approver names
    let docWithNames: TMFDocument = data as TMFDocument;
    
    if (data.uploaded_by) {
      const { data: uploader } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.uploaded_by)
        .maybeSingle();
      docWithNames.uploader = uploader;
    }

    if (data.approved_by) {
      const { data: approver } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.approved_by)
        .maybeSingle();
      docWithNames.approver = approver;
    }

    setDocument(docWithNames);
    setLoading(false);
  };

  const fetchAuditLog = async () => {
    const { data, error } = await supabase
      .from("tmf_audit_log")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch user names for audit entries
      const entriesWithNames = await Promise.all(
        data.map(async (entry) => {
          if (entry.user_id) {
            const { data: user } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", entry.user_id)
              .maybeSingle();
            return { ...entry, user };
          }
          return entry;
        })
      );
      setAuditLog(entriesWithNames);
    }
  };

  const logView = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    await supabase.from("tmf_audit_log").insert({
      document_id: documentId,
      action: "viewed",
      user_id: profile?.id || null,
    });
  };

  const handleDownload = async () => {
    if (!document) return;

    // Log download
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      await supabase.from("tmf_audit_log").insert({
        document_id: documentId,
        action: "downloaded",
        user_id: profile?.id || null,
      });
    }

    // Download file
    window.open(document.file_url, "_blank");
  };

  const handleSubmitForReview = async () => {
    if (!document) return;

    setProcessing(true);
    const { error } = await supabase
      .from("tmf_documents")
      .update({ status: "pending_review" })
      .eq("id", document.id);

    if (error) {
      toast.error("Erro ao enviar para revisão");
    } else {
      toast.success("Documento enviado para revisão");
      fetchDocument();
      fetchAuditLog();
    }
    setProcessing(false);
  };

  const handleApprove = async () => {
    if (!document || !signatureData) return;

    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const { error } = await supabase
      .from("tmf_documents")
      .update({
        status: "approved",
        approved_by: profile?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    if (error) {
      toast.error("Erro ao aprovar documento");
    } else {
      await supabase.from("tmf_audit_log").insert({
        document_id: document.id,
        action: "approved",
        details: { signature: signatureData.substring(0, 100) + "..." },
        user_id: profile?.id || null,
      });
      toast.success("Documento aprovado com sucesso");
      setApprovalDialogOpen(false);
      setSignatureData(null);
      fetchDocument();
      fetchAuditLog();
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!document || !rejectionReason) return;

    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const { error } = await supabase
      .from("tmf_documents")
      .update({
        status: "draft",
        rejection_reason: rejectionReason,
      })
      .eq("id", document.id);

    if (error) {
      toast.error("Erro ao rejeitar documento");
    } else {
      await supabase.from("tmf_audit_log").insert({
        document_id: document.id,
        action: "rejected",
        details: { reason: rejectionReason },
        user_id: profile?.id || null,
      });
      toast.success("Documento rejeitado");
      setRejectionDialogOpen(false);
      setRejectionReason("");
      fetchDocument();
      fetchAuditLog();
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
      draft: { label: "Rascunho", variant: "secondary", icon: FileText },
      pending_review: { label: "Aguardando Revisão", variant: "outline", icon: Clock },
      approved: { label: "Aprovado", variant: "default", icon: CheckCircle },
      superseded: { label: "Substituído", variant: "destructive", icon: History },
      obsolete: { label: "Obsoleto", variant: "destructive", icon: XCircle },
    };
    const c = config[status] || { label: status, variant: "secondary" as const, icon: FileText };
    const Icon = c.icon;
    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      uploaded: "Upload realizado",
      viewed: "Visualizado",
      downloaded: "Download realizado",
      approved: "Aprovado",
      rejected: "Rejeitado",
      superseded: "Substituído",
      deleted: "Excluído",
      restored: "Restaurado",
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ETMFNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background">
        <ETMFNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Documento não encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ETMFNav />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/etmf")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{document.file_name}</h1>
            <p className="text-muted-foreground">
              {document.tmf_artifacts?.artifact_number} - {document.tmf_artifacts?.artifact_name}
            </p>
          </div>
          {getStatusBadge(document.status)}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Preview/Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Tipo de Arquivo</Label>
                    <p className="font-medium">{document.file_type || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tamanho</Label>
                    <p className="font-medium">{(document.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Versão</Label>
                    <p className="font-medium">v{document.version}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Nível</Label>
                    <p className="font-medium capitalize">{document.tmf_artifacts?.level || "N/A"}</p>
                  </div>
                  {document.effective_date && (
                    <div>
                      <Label className="text-muted-foreground">Data Efetiva</Label>
                      <p className="font-medium">
                        {new Date(document.effective_date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  )}
                  {document.research_centers && (
                    <div>
                      <Label className="text-muted-foreground">Centro</Label>
                      <p className="font-medium">
                        {document.research_centers.code} - {document.research_centers.name}
                      </p>
                    </div>
                  )}
                </div>

                {document.notes && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="mt-1">{document.notes}</p>
                  </div>
                )}

                {document.rejection_reason && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <Label className="text-destructive">Motivo da Rejeição</Label>
                    <p className="mt-1 text-destructive">{document.rejection_reason}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  
                  {document.status === "draft" && (
                    <Button variant="outline" onClick={handleSubmitForReview} disabled={processing}>
                      <Clock className="h-4 w-4 mr-2" />
                      Enviar para Revisão
                    </Button>
                  )}

                  {document.status === "pending_review" && (
                    <>
                      <Button variant="default" onClick={() => setApprovalDialogOpen(true)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button variant="destructive" onClick={() => setRejectionDialogOpen(true)}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeitar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Artifact Description */}
            <Card>
              <CardHeader>
                <CardTitle>Sobre o Artefato</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {document.tmf_artifacts?.description || "Sem descrição disponível."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Metadados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Enviado por</Label>
                    <p className="text-sm font-medium">{document.uploader?.full_name || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Data de Upload</Label>
                    <p className="text-sm font-medium">
                      {new Date(document.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                {document.approved_by && (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <Label className="text-xs text-muted-foreground">Aprovado por</Label>
                        <p className="text-sm font-medium">{document.approver?.full_name || "N/A"}</p>
                      </div>
                    </div>
                    {document.approved_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs text-muted-foreground">Data de Aprovação</Label>
                          <p className="text-sm font-medium">
                            {new Date(document.approved_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Audit Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico (Audit Trail)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditLog.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum registro encontrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {auditLog.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <p className="font-medium">{getActionLabel(entry.action)}</p>
                          <p className="text-muted-foreground text-xs">
                            {entry.user?.full_name || "Sistema"} • {new Date(entry.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Documento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              Ao aprovar este documento, você confirma que revisou seu conteúdo e 
              que ele atende aos requisitos do TMF.
            </p>
            {signatureData ? (
              <div className="border rounded-lg p-2">
                <img src={signatureData} alt="Assinatura" className="max-h-24 mx-auto" />
                <Button 
                  variant="link" 
                  className="w-full mt-2"
                  onClick={() => setSignatureData(null)}
                >
                  Refazer Assinatura
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setSignaturePadOpen(true)}
              >
                Assinar Eletronicamente
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={!signatureData || processing}
            >
              {processing ? "Aprovando..." : "Confirmar Aprovação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Pad */}
      <SignaturePad
        open={signaturePadOpen}
        onClose={() => setSignaturePadOpen(false)}
        onSave={(data) => {
          setSignatureData(data);
          setSignaturePadOpen(false);
        }}
      />

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Documento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Motivo da Rejeição</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason || processing}
            >
              {processing ? "Rejeitando..." : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ETMFDocument;
