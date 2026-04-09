import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SDVProgressProps {
  verified: number;
  total: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const SDVProgress = ({
  verified,
  total,
  showLabel = true,
  size = "md",
}: SDVProgressProps) => {
  const percentage = total > 0 ? Math.round((verified / total) * 100) : 0;
  const isComplete = percentage === 100;

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div className="flex items-center gap-2">
      {isComplete ? (
        <CheckCircle className={cn(iconSizes[size], "text-green-600")} />
      ) : (
        <Shield className={cn(iconSizes[size], "text-muted-foreground")} />
      )}
      <div className="flex-1 min-w-0">
        <Progress
          value={percentage}
          className={cn(
            sizeClasses[size],
            isComplete && "[&>div]:bg-green-600"
          )}
        />
      </div>
      {showLabel && (
        <span
          className={cn(
            "text-xs font-medium",
            isComplete ? "text-green-600" : "text-muted-foreground"
          )}
        >
          {verified}/{total} ({percentage}%)
        </span>
      )}
    </div>
  );
};

export default SDVProgress;
