import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, GripVertical, Trash2, Settings } from "lucide-react";

interface CRFField {
  field_name: string;
  field_label: string;
  field_type: string;
  options: string[];
  validation_rules: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  is_required: boolean;
  help_text: string;
  display_order: number;
}

interface CRFFieldEditorProps {
  field: CRFField;
  onChange: (updates: Partial<CRFField>) => void;
  onDelete: () => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "textarea", label: "Texto Longo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "select", label: "Seleção" },
  { value: "radio", label: "Escolha Única" },
  { value: "checkbox", label: "Múltipla Escolha" },
];

const CRFFieldEditor = ({ field, onChange, onDelete }: CRFFieldEditorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [optionsText, setOptionsText] = useState(field.options.join("\n"));

  const handleOptionsChange = (text: string) => {
    setOptionsText(text);
    const options = text
      .split("\n")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    onChange({ options });
  };

  const needsOptions = ["select", "radio", "checkbox"].includes(field.field_type);

  return (
    <Card className="border-l-4 border-l-primary/30">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2 p-3">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              value={field.field_label}
              onChange={(e) => onChange({ field_label: e.target.value })}
              placeholder="Label do campo"
              className="font-medium"
            />
            <Select
              value={field.field_type}
              onValueChange={(value) => onChange({ field_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`req-${field.field_name}`}
                checked={field.is_required}
                onCheckedChange={(checked) =>
                  onChange({ is_required: checked as boolean })
                }
              />
              <Label htmlFor={`req-${field.field_name}`} className="text-sm">
                Obrigatório
              </Label>
            </div>
          </div>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Nome do Campo (ID)</Label>
                <Input
                  value={field.field_name}
                  onChange={(e) =>
                    onChange({
                      field_name: e.target.value.replace(/\s+/g, "_").toLowerCase(),
                    })
                  }
                  placeholder="nome_do_campo"
                />
              </div>
              <div className="space-y-2">
                <Label>Texto de Ajuda</Label>
                <Input
                  value={field.help_text}
                  onChange={(e) => onChange({ help_text: e.target.value })}
                  placeholder="Instruções para o usuário"
                />
              </div>
            </div>

            {needsOptions && (
              <div className="mt-4 space-y-2">
                <Label>Opções (uma por linha)</Label>
                <Textarea
                  value={optionsText}
                  onChange={(e) => handleOptionsChange(e.target.value)}
                  placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                  rows={4}
                />
              </div>
            )}

            {field.field_type === "number" && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Mínimo</Label>
                  <Input
                    type="number"
                    value={field.validation_rules.min ?? ""}
                    onChange={(e) =>
                      onChange({
                        validation_rules: {
                          ...field.validation_rules,
                          min: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Máximo</Label>
                  <Input
                    type="number"
                    value={field.validation_rules.max ?? ""}
                    onChange={(e) =>
                      onChange({
                        validation_rules: {
                          ...field.validation_rules,
                          max: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {field.field_type === "text" && (
              <div className="mt-4 space-y-2">
                <Label>Padrão (Regex)</Label>
                <Input
                  value={field.validation_rules.pattern ?? ""}
                  onChange={(e) =>
                    onChange({
                      validation_rules: {
                        ...field.validation_rules,
                        pattern: e.target.value || undefined,
                      },
                    })
                  }
                  placeholder="Ex: ^[A-Z]{2}[0-9]{3}$"
                />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default CRFFieldEditor;
