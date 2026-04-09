import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Signature, User, Calendar, Shield, FileText } from "lucide-react";

interface SignatureRecord {
  id: string;
  signer_name: string;
  signer_role: string;
  meaning: string;
  signature_type: string;
  authenticated_at: string;
  authentication_method: string | null;
}

interface SignatureHistoryProps {
  entityType: string;
  entityId: string;
}

const SignatureHistory = ({ entityType, entityId }: SignatureHistoryProps) => {
  const [loading, setLoading] = useState(true);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

  useEffect(() => {
    fetchSignatures();
  }, [entityType, entityId]);

  const fetchSignatures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("electronic_signatures")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("authenticated_at", { ascending: false });

      if (error) throw error;
      setSignatures(data || []);
    } catch (error) {
      console.error("Error fetching signatures:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMeaningLabel = (meaning: string) => {
    const labels: Record<string, string> = {
      authorship: "Authorship",
      review: "Review",
      approval: "Approval",
      responsibility: "Responsibility",
    };
    return labels[meaning] || meaning;
  };

  const getMeaningColor = (meaning: string) => {
    const colors: Record<string, string> = {
      authorship: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      approval: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      responsibility: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return colors[meaning] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Signature className="h-4 w-4" />
            Signature History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Signature className="h-4 w-4" />
          Signature History
          {signatures.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {signatures.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {signatures.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Signature className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No signatures recorded</p>
          </div>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="space-y-3">
              {signatures.map((sig) => (
                <div
                  key={sig.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{sig.signer_name}</p>
                        <p className="text-sm text-muted-foreground">{sig.signer_role}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMeaningColor(sig.meaning)}`}>
                            {getMeaningLabel(sig.meaning)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            {sig.signature_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 justify-end">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(sig.authenticated_at), "dd/MM/yyyy")}
                      </div>
                      <div>{format(new Date(sig.authenticated_at), "HH:mm:ss")}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SignatureHistory;
