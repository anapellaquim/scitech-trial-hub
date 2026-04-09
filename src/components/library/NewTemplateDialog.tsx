import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Category {
  value: string;
  label: string;
}

interface NewTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories: Category[];
}

const NewTemplateDialog = ({
  open,
  onOpenChange,
  onSuccess,
  categories,
}: NewTemplateDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "outro",
    content: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { data: template, error } = await supabase
      .from("document_templates")
      .insert({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        content: formData.content.trim() || null,
        created_by: user?.id,
        current_version: 1,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar template");
      console.error(error);
    } else {
      // Create initial version record
      await supabase.from("document_versions").insert({
        template_id: template.id,
        version_number: 1,
        content: formData.content.trim() || null,
        changes_description: "Versão inicial",
        created_by: user?.id,
      });

      toast.success("Template criado com sucesso");
      setFormData({
        title: "",
        description: "",
        category: "outro",
        content: "",
      });
      onOpenChange(false);
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Template</DialogTitle>
          <DialogDescription>
            Crie um novo documento modelo para sua biblioteca
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
              Criar Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTemplateDialog;