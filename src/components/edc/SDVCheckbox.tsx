import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEDCPermission } from "@/hooks/useEDCPermission";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle, Shield, Lock } from "lucide-react";
import { format } from "date-fns";

interface SDVCheckboxProps {
  entryId: string;
  fieldId: string;
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  onVerificationChange?: (verified: boolean) => void;
  disabled?: boolean;
}

const SDVCheckbox = ({
  entryId,
  fieldId,
  isVerified,
  verifiedAt,
  verifiedBy,
  onVerificationChange,
  disabled = false,
}: SDVCheckboxProps) => {
  const { toast } = useToast();
  const { canPerformSDV, loading: permissionLoading } = useEDCPermission();
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(isVerified);

  // Only CRA/Monitor (M1) and Admin can perform SDV
  const canSDV = canPerformSDV();

  const handleChange = async (value: boolean) => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const updateData = value
        ? {
            sdv_status: "verified",
            sdv_verified_at: new Date().toISOString(),
            sdv_verified_by: userData.user?.id,
          }
        : {
            sdv_status: "pending",
            sdv_verified_at: null,
            sdv_verified_by: null,
          };

      const { error } = await supabase
        .from("crf_field_values")
        .update(updateData)
        .eq("entry_id", entryId)
        .eq("field_id", fieldId);

      if (error) throw error;

      setChecked(value);
      onVerificationChange?.(value);

      toast({
        title: value ? "Verified" : "Verification Removed",
        description: value
          ? "Field marked as source data verified"
          : "SDV status cleared",
      });
    } catch (error) {
      console.error("Error updating SDV:", error);
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If user doesn't have SDV permission, show read-only status
  if (!canSDV && !permissionLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                {checked ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">SDV</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {checked && verifiedAt ? (
              <div className="text-xs">
                <p>Verificado: {format(new Date(verifiedAt), "dd/MM/yyyy HH:mm")}</p>
                {verifiedBy && <p>Por: {verifiedBy}</p>}
              </div>
            ) : (
              <p className="text-xs">Apenas CRA/Monitor pode realizar SDV</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={`sdv-${fieldId}`}
              checked={checked}
              onCheckedChange={(value) => handleChange(value as boolean)}
              disabled={disabled || loading || permissionLoading}
              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
            />
            <Label
              htmlFor={`sdv-${fieldId}`}
              className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
            >
              <Shield className="h-3 w-3" />
              SDV
            </Label>
            {checked && (
              <CheckCircle className="h-3 w-3 text-green-600" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {checked && verifiedAt ? (
            <div className="text-xs">
              <p>Verificado: {format(new Date(verifiedAt), "dd/MM/yyyy HH:mm")}</p>
              {verifiedBy && <p>Por: {verifiedBy}</p>}
            </div>
          ) : (
            <p className="text-xs">Clique para verificar dados fonte</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SDVCheckbox;
