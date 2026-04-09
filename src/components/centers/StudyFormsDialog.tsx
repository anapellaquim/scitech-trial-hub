import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, FileText } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface StudyForm {
  id: string;
  project_id: string | null;
  form_name: string;
}

interface Project {
  id: string;
  title: string;
  protocol_number: string | null;
}

interface StudyFormsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StudyFormsDialog = ({ open, onOpenChange }: StudyFormsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState<StudyForm[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [formName, setFormName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<StudyForm | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [formsRes, projectsRes] = await Promise.all([
        supabase.from("study_forms").select("id, project_id, form_name").order("form_name"),
        supabase.from("projects").select("id, title, protocol_number").order("title")
      ]);

      if (formsRes.error) throw formsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setForms(formsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddForm = async () => {
    if (!selectedProjectId || !formName.trim()) {
      toast.error("Selecione um projeto e informe o nome do formulário");
      return;
    }

    setLoading(true);
    try {
      const insertData = {
        form_name: formName.trim(),
        project_id: selectedProjectId
      };

      const { error } = await supabase.from("study_forms").insert(insertData);
      if (error) throw error;

      toast.success("Formulário adicionado com sucesso");
      setFormName("");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao adicionar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (form: StudyForm) => {
    setFormToDelete(form);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!formToDelete) return;
    
    try {
      const { error } = await supabase
        .from("study_forms")
        .delete()
        .eq("id", formToDelete.id);
      
      if (error) throw error;
      toast.success("Formulário excluído com sucesso");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
      setFormToDelete(null);
    }
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "-";
    const project = projects.find(p => p.id === projectId);
    return project ? (project.protocol_number ? `${project.protocol_number} - ${project.title}` : project.title) : "Projeto não encontrado";
  };

  const filteredForms = selectedProjectId 
    ? forms.filter(f => f.project_id === selectedProjectId)
    : forms;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Configurar Formulários
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Add Form Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Adicionar Formulário</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Projeto</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.protocol_number ? `${project.protocol_number} - ${project.title}` : project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nome do Formulário</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Termo de Consentimento, Ficha de Elegibilidade..."
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAddForm} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span className="ml-2">Adicionar</span>
                </Button>
              </div>
            </div>

            {/* Forms Table */}
            <div>
              <h3 className="font-medium mb-3">Formulários Cadastrados ({filteredForms.length})</h3>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum formulário cadastrado
                  {selectedProjectId && " para este projeto"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Formulário</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredForms.map((form) => (
                      <TableRow key={form.id}>
                        <TableCell className="text-muted-foreground">
                          {getProjectName(form.project_id)}
                        </TableCell>
                        <TableCell className="font-medium">{form.form_name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(form)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Formulário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o formulário "{formToDelete?.form_name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StudyFormsDialog;
