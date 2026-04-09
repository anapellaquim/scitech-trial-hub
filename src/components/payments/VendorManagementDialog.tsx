import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

interface VendorManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onVendorsChange: () => void;
}

export function VendorManagementDialog({ 
  open, 
  onOpenChange, 
  projectId,
  onVendorsChange 
}: VendorManagementDialogProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    if (open && projectId) {
      loadVendors();
    }
  }, [open, projectId]);

  const loadVendors = async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("project_id", projectId)
      .order("name");

    if (error) {
      console.error("Error loading vendors:", error);
      return;
    }

    setVendors(data || []);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      document: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
    setEditingVendor(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome do fornecedor é obrigatório");
      return;
    }

    setLoading(true);

    if (editingVendor) {
      const { error } = await supabase
        .from("vendors")
        .update({
          name: formData.name.trim(),
          document: formData.document.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          notes: formData.notes.trim() || null,
        })
        .eq("id", editingVendor.id);

      if (error) {
        toast.error("Erro ao atualizar fornecedor");
        console.error(error);
      } else {
        toast.success("Fornecedor atualizado!");
        resetForm();
        loadVendors();
        onVendorsChange();
      }
    } else {
      const { error } = await supabase
        .from("vendors")
        .insert({
          project_id: projectId,
          name: formData.name.trim(),
          document: formData.document.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          notes: formData.notes.trim() || null,
        });

      if (error) {
        toast.error("Erro ao cadastrar fornecedor");
        console.error(error);
      } else {
        toast.success("Fornecedor cadastrado!");
        resetForm();
        loadVendors();
        onVendorsChange();
      }
    }

    setLoading(false);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      document: vendor.document || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
    });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("vendors")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir fornecedor");
      return;
    }

    toast.success("Fornecedor excluído!");
    loadVendors();
    onVendorsChange();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Fornecedores</DialogTitle>
          <DialogDescription>
            Cadastre e gerencie os fornecedores do projeto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Form */}
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <h4 className="font-medium text-sm">
              {editingVendor ? "Editar Fornecedor" : "Novo Fornecedor"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nome *</label>
                <Input
                  placeholder="Nome do fornecedor"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">CNPJ/CPF</label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={formData.document}
                  onChange={(e) => setFormData(prev => ({ ...prev, document: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Telefone</label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-muted-foreground">Endereço</label>
                <Input
                  placeholder="Endereço completo"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-3">
                <label className="text-xs text-muted-foreground">Observações</label>
                <Textarea
                  placeholder="Observações sobre o fornecedor"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {editingVendor ? "Atualizar" : "Cadastrar"}
              </Button>
              {editingVendor && (
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {vendors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhum fornecedor cadastrado
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.document || "-"}</TableCell>
                      <TableCell>{vendor.email || "-"}</TableCell>
                      <TableCell>{vendor.phone || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(vendor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(vendor.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
