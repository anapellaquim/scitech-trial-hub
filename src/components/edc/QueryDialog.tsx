import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEDCPermission } from "@/hooks/useEDCPermission";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, MessageSquare, Lock } from "lucide-react";

interface QueryDialogProps {
  open: boolean;
  onClose: () => void;
  entryId: string;
  fieldId: string;
  onQueryCreated?: () => void;
}

const QueryDialog = ({
  open,
  onClose,
  entryId,
  fieldId,
  onQueryCreated,
}: QueryDialogProps) => {
  const { toast } = useToast();
  const { canManageQueries, loading: permissionLoading } = useEDCPermission();
  const [loading, setLoading] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [queryType, setQueryType] = useState("manual");

  // Only M1 (CRA/Monitor), D1 (Data Manager), D2 (Data Lead), O1 (Medical Monitor), and Admin can open queries
  const canOpenQuery = canManageQueries();

  const handleSubmit = async () => {
    if (!queryText.trim()) {
      toast({
        title: "Atenção",
        description: "Digite o texto da query",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Create the query
      const { data: query, error: queryError } = await supabase
        .from("data_queries")
        .insert({
          entry_id: entryId,
          field_id: fieldId,
          query_type: queryType,
          priority,
          query_text: queryText.trim(),
          opened_by: userData.user?.id,
          status: "open",
        })
        .select()
        .single();

      if (queryError) throw queryError;

      // Create history entry
      await supabase.from("data_query_history").insert({
        query_id: query.id,
        action: "opened",
        comment: queryText.trim(),
        user_id: userData.user?.id,
      });

      // Update field value query status
      await supabase
        .from("crf_field_values")
        .update({ query_status: "open" })
        .eq("entry_id", entryId)
        .eq("field_id", fieldId);

      toast({
        title: "Sucesso",
        description: "Query criada com sucesso",
      });

      onQueryCreated?.();
      onClose();
    } catch (error) {
      console.error("Error creating query:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a query",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If user doesn't have permission to open queries, show access denied
  if (!canOpenQuery && !permissionLoading) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Acesso Restrito
            </DialogTitle>
            <DialogDescription>
              Você não tem permissão para abrir queries
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Apenas CRA/Monitor (M1), Gerente de Dados (D1), Líder de Dados (D2) e Monitor Médico (O1) 
              podem abrir queries. Se você é um Coordenador de Site (S1) ou Investigador (S2), 
              você pode apenas responder a queries existentes.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-yellow-500" />
            Nova Query
          </DialogTitle>
          <DialogDescription>
            Crie uma query para solicitar esclarecimento ou correção de dados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="query-type">Tipo</Label>
              <Select value={queryType} onValueChange={setQueryType}>
                <SelectTrigger id="query-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="sdv">SDV</SelectItem>
                  <SelectItem value="edit_check">Edit Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="query-text">Descrição da Query</Label>
            <Textarea
              id="query-text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Descreva o problema ou a informação necessária..."
              rows={4}
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              O investigador será notificado sobre esta query e deverá responder
              antes que o campo possa ser considerado verificado.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Criando..." : "Criar Query"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QueryDialog;
