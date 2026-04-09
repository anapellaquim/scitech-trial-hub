import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import CRFFieldRenderer, { CRFFieldData } from "./CRFFieldRenderer";

interface CRFSectionProps {
  id: string;
  name: string;
  description?: string;
  fields: CRFFieldData[];
  values: Record<string, string>;
  onFieldChange: (fieldId: string, value: string) => void;
  onFieldBlur?: (fieldId: string) => void;
  disabled?: boolean;
  fieldQueries?: Record<string, boolean>;
  fieldVerified?: Record<string, boolean>;
  onOpenQuery?: (fieldId: string) => void;
  onShowHistory?: (fieldId: string) => void;
  isActive?: boolean;
  onClick?: () => void;
}

const CRFSection = ({
  id,
  name,
  description,
  fields,
  values,
  onFieldChange,
  onFieldBlur,
  disabled = false,
  fieldQueries = {},
  fieldVerified = {},
  onOpenQuery,
  onShowHistory,
  isActive = false,
  onClick,
}: CRFSectionProps) => {
  const sortedFields = [...fields].sort((a, b) => a.display_order - b.display_order);

  // Calculate completion
  const requiredFields = sortedFields.filter((f) => f.is_required);
  const completedRequired = requiredFields.filter((f) => {
    const value = values[f.id];
    return value && value.trim() !== "";
  }).length;

  const completionPercent = requiredFields.length > 0
    ? Math.round((completedRequired / requiredFields.length) * 100)
    : 100;

  const isComplete = completionPercent === 100;
  const hasQueries = Object.values(fieldQueries).some(Boolean);

  return (
    <Card
      id={`section-${id}`}
      className={cn(
        "transition-all",
        isActive && "ring-2 ring-primary",
        onClick && "cursor-pointer hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{name}</CardTitle>
            {isComplete && !hasQueries && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {hasQueries && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                {Object.values(fieldQueries).filter(Boolean).length} Queries
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {completedRequired}/{requiredFields.length} obrigatórios
            </span>
            <Badge variant={isComplete ? "default" : "secondary"}>
              {completionPercent}%
            </Badge>
          </div>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        <Progress value={completionPercent} className="h-1 mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedFields.map((field) => (
          <CRFFieldRenderer
            key={field.id}
            field={field}
            value={values[field.id] || ""}
            onChange={(value) => onFieldChange(field.id, value)}
            onBlur={() => onFieldBlur?.(field.id)}
            disabled={disabled}
            hasQuery={fieldQueries[field.id]}
            isVerified={fieldVerified[field.id]}
            onOpenQuery={onOpenQuery ? () => onOpenQuery(field.id) : undefined}
            onShowHistory={onShowHistory ? () => onShowHistory(field.id) : undefined}
            allFieldValues={values}
          />
        ))}
        {sortedFields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum campo nesta seção</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CRFSection;
