import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, AlertCircle, CheckCircle2, MessageSquare, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface CRFFieldData {
  id: string;
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
  skip_logic?: {
    condition?: string;
    depends_on_field?: string;
    show_when_value?: string;
  };
  edit_checks?: Array<{
    type: string;
    message: string;
    condition: string;
  }>;
  min_value?: number;
  max_value?: number;
}

interface CRFFieldRendererProps {
  field: CRFFieldData;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
  hasQuery?: boolean;
  isVerified?: boolean;
  onOpenQuery?: () => void;
  onShowHistory?: () => void;
  allFieldValues?: Record<string, string>;
}

const CRFFieldRenderer = ({
  field,
  value,
  onChange,
  onBlur,
  disabled = false,
  error,
  hasQuery = false,
  isVerified = false,
  onOpenQuery,
  onShowHistory,
  allFieldValues,
}: CRFFieldRendererProps) => {
  const { t } = useTranslation("edc");
  const [dateOpen, setDateOpen] = useState(false);

  const validateField = (): string | null => {
    if (field.is_required && !value) {
      return "Campo obrigatório";
    }

    if (field.field_type === "number" && value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return "Valor numérico inválido";
      }
      if (field.min_value !== undefined && numValue < field.min_value) {
        return `Valor mínimo: ${field.min_value}`;
      }
      if (field.max_value !== undefined && numValue > field.max_value) {
        return `Valor máximo: ${field.max_value}`;
      }
      if (field.validation_rules?.min !== undefined && numValue < field.validation_rules.min) {
        return `Valor mínimo: ${field.validation_rules.min}`;
      }
      if (field.validation_rules?.max !== undefined && numValue > field.validation_rules.max) {
        return `Valor máximo: ${field.validation_rules.max}`;
      }
    }

    if (field.field_type === "text" && field.validation_rules?.pattern && value) {
      try {
        const regex = new RegExp(field.validation_rules.pattern);
        if (!regex.test(value)) {
          return "Formato inválido";
        }
      } catch {
        // Invalid regex, skip validation
      }
    }

    return null;
  };

  const validationError = error || validateField();

  const renderFieldInput = () => {
    switch (field.field_type) {
      case "text":
        return (
          <Input
            id={field.field_name}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            placeholder={field.help_text || undefined}
            className={cn(
              validationError && "border-destructive",
              hasQuery && "border-yellow-500"
            )}
          />
        );

      case "textarea":
        return (
          <Textarea
            id={field.field_name}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            placeholder={field.help_text || undefined}
            rows={4}
            className={cn(
              validationError && "border-destructive",
              hasQuery && "border-yellow-500"
            )}
          />
        );

      case "number":
        return (
          <Input
            id={field.field_name}
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            min={field.min_value ?? field.validation_rules?.min}
            max={field.max_value ?? field.validation_rules?.max}
            className={cn(
              validationError && "border-destructive",
              hasQuery && "border-yellow-500"
            )}
          />
        );

      case "date":
        const dateValue = value ? new Date(value) : undefined;
        return (
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                id={field.field_name}
                variant="outline"
                disabled={disabled}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground",
                  validationError && "border-destructive",
                  hasQuery && "border-yellow-500"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => {
                  onChange(date ? format(date, "yyyy-MM-dd") : "");
                  setDateOpen(false);
                  onBlur?.();
                }}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        );

      case "select":
        return (
          <Select
            value={value || ""}
            onValueChange={(val) => {
              onChange(val);
              onBlur?.();
            }}
            disabled={disabled}
          >
            <SelectTrigger
              id={field.field_name}
              className={cn(
                validationError && "border-destructive",
                hasQuery && "border-yellow-500"
              )}
            >
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, idx) => (
                <SelectItem key={idx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "radio":
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(val) => {
              onChange(val);
              onBlur?.();
            }}
            disabled={disabled}
            className="space-y-2"
          >
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.field_name}-${idx}`} />
                <Label htmlFor={`${field.field_name}-${idx}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkbox":
        const selectedValues = value ? value.split(",").filter(Boolean) : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.field_name}-${idx}`}
                  checked={selectedValues.includes(option)}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v) => v !== option);
                    onChange(newValues.join(","));
                    onBlur?.();
                  }}
                />
                <Label htmlFor={`${field.field_name}-${idx}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <Input
            id={field.field_name}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={field.field_name}
            className={cn(
              "font-medium",
              field.is_required && "after:content-['*'] after:ml-0.5 after:text-destructive"
            )}
          >
            {field.field_label}
          </Label>
          {isVerified && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {hasQuery && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">
              Query
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onOpenQuery && !disabled && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onOpenQuery}
              title="Abrir Query"
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
          )}
          {onShowHistory && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onShowHistory}
              title="Ver Histórico"
            >
              <History className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {renderFieldInput()}

      {field.help_text && field.field_type !== "text" && field.field_type !== "textarea" && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}

      {validationError && (
        <div className="flex items-center gap-1 text-destructive text-sm">
          <AlertCircle className="h-3 w-3" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};

export default CRFFieldRenderer;
