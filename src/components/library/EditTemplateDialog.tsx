import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";

interface Category {
  value: string;
  label: string;
}

interface DocumentTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: string | null;
  current_version: number;
}

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate;
  onSuccess: () => void;
  categories: Category[];
}

const EditTemplateDialog = ({
  open,
  onOpenChange,
  template,
  onSuccess,
  categories,
}: EditTemplateDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [createNewVersion, setCreateNewVersion] = useState(false);
  const [changesDescription, setChangesDescription] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "outro",
    content: "",
  });

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title,
        description: template.description || "",
        category: template.category,
        content: template.content || "",
      });
      setCreateNewVersion(false);
      setChangesDescription("");
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    const newVersion = createNewVersion ? template.current_version + 1 : template.current_version;

    const { error } = await supabase
      .from("document_templates")
      .update({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        content: formData.content.trim() || null,
        current_version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id);

    if (error) {
      toast.error("Erro ao atualizar template");
      console.error(error);
    } else {
      // Create version record if new version
      if (createNewVersion) {
        await supabase.from("document_versions").insert({
          template_id: template.id,
          version_number: newVersion,
          content: formData.content.trim() || null,
          changes_description: changesDescription.trim() || `Atualização para versão ${newVersion}`,
          created_by: user?.id,
        });
      }

      toast.success(createNewVersion ? "Nova versão criada com sucesso" : "Template atualizado com sucesso");
      onOpenChange(false);
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Template</DialogTitle>
          <DialogDescription>
            Versão atual: v{template.current_version}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Nome do template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Breve descrição do template"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo do Template</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Digite o conteúdo do template aqui..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="newVersion"
                checked={createNewVersion}
                onCheckedChange={(checked) => setCreateNewVersion(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="newVersion" className="font-medium cursor-pointer">
                  Criar nova versão (v{template.current_version + 1})
                </Label>
                <p className="text-xs text-muted-foreground">
                  Manterá o histórico da versão anterior para referência
                </p>
              </div>
            </div>

            {createNewVersion && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="changes">Descrição das alterações</Label>
                <Input
                  id="changes"
                  value={changesDescription}
                  onChange={(e) => setChangesDescription(e.target.value)}
                  placeholder="Ex: Atualização do cabeçalho, correção de formatação..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {createNewVersion ? "Criar Nova Versão" : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTemplateDialog;