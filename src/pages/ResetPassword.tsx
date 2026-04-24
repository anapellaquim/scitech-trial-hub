import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Supabase coloca o token de recovery no hash da URL e cria sessão temporária
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && window.location.hash.includes("type=recovery"))) {
        setValidSession(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso");
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-elevated">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">CTMS</h1>
          <p className="text-muted-foreground">Definir nova senha</p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Nova senha</CardTitle>
            <CardDescription>
              {validSession
                ? "Escolha uma nova senha para acessar a plataforma."
                : "Link inválido ou expirado. Solicite um novo link de recuperação."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {validSession ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar senha</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Atualizando..." : "Atualizar senha"}
                </Button>
              </form>
            ) : (
              <Button className="w-full" onClick={() => navigate("/forgot-password")}>
                Solicitar novo link
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
