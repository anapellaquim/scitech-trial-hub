import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Shield, Signature } from "lucide-react";

interface ElectronicSignatureProps {
  open: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  signerRole: string;
  onSignatureComplete?: () => void;
}

const SIGNATURE_MEANINGS = [
  {
    value: "authorship",
    label: "Authorship",
    description: "I am the author of this document/data",
  },
  {
    value: "review",
    label: "Review",
    description: "I have reviewed and verified this document/data",
  },
  {
    value: "approval",
    label: "Approval",
    description: "I approve this document/data for use",
  },
  {
    value: "responsibility",
    label: "Responsibility",
    description: "I take responsibility for the accuracy of this data",
  },
];

const ElectronicSignature = ({
  open,
  onClose,
  entityType,
  entityId,
  signerRole,
  onSignatureComplete,
}: ElectronicSignatureProps) => {
  const { t } = useTranslation("edc");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [meaning, setMeaning] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const handleSign = async () => {
    if (!password || !meaning || !confirmed) {
      setError("Please fill all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Re-authenticate user with password
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.email) throw new Error("User not found");

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password,
      });

      if (authError) {
        setError("Invalid password. Please try again.");
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userData.user.id)
        .single();

      // Create electronic signature record
      const { error: signError } = await supabase
        .from("electronic_signatures")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          signer_id: userData.user.id,
          signer_name: profile?.full_name || userData.user.email,
          signer_role: signerRole,
          meaning,
          signature_type: "password",
          authentication_method: "password",
        });

      if (signError) throw signError;

      // Update CRF entry if signing a CRF
      if (entityType === "crf_entry") {
        await supabase
          .from("crf_entries")
          .update({
            signed_by: userData.user.id,
            signed_at: new Date().toISOString(),
            signature_meaning: meaning,
            status: "signed",
          })
          .eq("id", entityId);
      }

      toast({
        title: "Signature Complete",
        description: "Electronic signature applied successfully",
      });

      onSignatureComplete?.();
      onClose();
    } catch (error) {
      console.error("Error signing:", error);
      setError("Failed to apply signature. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedMeaning = SIGNATURE_MEANINGS.find((m) => m.value === meaning);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Signature className="h-5 w-5 text-primary" />
            Electronic Signature
          </DialogTitle>
          <DialogDescription>
            21 CFR Part 11 compliant electronic signature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Secure Signature Process</p>
                <p className="text-muted-foreground">
                  Your password will be used to authenticate your identity. This
                  signature is legally binding and will be recorded in the audit
                  trail.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meaning">Signature Meaning *</Label>
            <Select value={meaning} onValueChange={setMeaning}>
              <SelectTrigger id="meaning">
                <SelectValue placeholder="Select the meaning of your signature" />
              </SelectTrigger>
              <SelectContent>
                {SIGNATURE_MEANINGS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMeaning && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedMeaning.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password to confirm"
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(value) => setConfirmed(value as boolean)}
            />
            <Label htmlFor="confirm" className="text-sm leading-relaxed">
              I understand that this electronic signature is legally binding and
              equivalent to a handwritten signature. I confirm that the
              information I am signing is accurate and complete.
            </Label>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={loading || !password || !meaning || !confirmed}
          >
            <Signature className="h-4 w-4 mr-1" />
            {loading ? "Signing..." : "Apply Signature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ElectronicSignature;
