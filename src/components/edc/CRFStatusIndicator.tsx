import { Badge } from "@/components/ui/badge";
import { 
  FileEdit, 
  CheckCircle2, 
  Lock, 
  FileCheck, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CRFStatus = "draft" | "in_progress" | "completed" | "signed" | "locked" | "verified";

interface CRFStatusIndicatorProps {
  status: CRFStatus;
  isLocked?: boolean;
  isVerified?: boolean;
  isSigned?: boolean;
  queriesCount?: number;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<CRFStatus, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ElementType;
  color: string;
}> = {
  draft: {
    label: "Rascunho",
    variant: "secondary",
    icon: FileEdit,
    color: "text-muted-foreground",
  },
  in_progress: {
    label: "Em Preenchimento",
    variant: "outline",
    icon: Loader2,
    color: "text-blue-500",
  },
  completed: {
    label: "Completo",
    variant: "default",
    icon: CheckCircle2,
    color: "text-green-500",
  },
  signed: {
    label: "Assinado",
    variant: "default",
    icon: FileCheck,
    color: "text-primary",
  },
  locked: {
    label: "Bloqueado",
    variant: "destructive",
    icon: Lock,
    color: "text-destructive",
  },
  verified: {
    label: "Verificado",
    variant: "default",
    icon: CheckCircle2,
    color: "text-green-600",
  },
};

const CRFStatusIndicator = ({
  status,
  isLocked = false,
  isVerified = false,
  isSigned = false,
  queriesCount = 0,
  className,
  showLabel = true,
}: CRFStatusIndicatorProps) => {
  // Determine the effective status based on flags
  let effectiveStatus = status;
  if (isLocked) effectiveStatus = "locked";
  else if (isVerified) effectiveStatus = "verified";
  else if (isSigned) effectiveStatus = "signed";

  const config = statusConfig[effectiveStatus];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={cn("h-3 w-3", effectiveStatus === "in_progress" && "animate-spin")} />
        {showLabel && <span>{config.label}</span>}
      </Badge>

      {queriesCount > 0 && (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          {queriesCount} {queriesCount === 1 ? "Query" : "Queries"}
        </Badge>
      )}

      {isLocked && effectiveStatus !== "locked" && (
        <Lock className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
};

export default CRFStatusIndicator;
