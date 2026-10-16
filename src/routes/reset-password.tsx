import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/agency/dashboard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha | LAUX AGÊNCIA" },
      { name: "description", content: "Defina uma nova senha para a área restrita da LAUX AGÊNCIA." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Nova senha | LAUX AGÊNCIA" },
      { property: "og:description", content: "Redefinição de senha da área restrita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("Link inválido ou expirado. Solicite um novo link na tela de acesso.");
      return;
    }
    void navigate({ to: "/admin", replace: true });
  }

  return (
    <main className="admin-shell">
      <form className="admin-card admin-login" onSubmit={save}>
        <Brand />
        <h1>
          <Lock size={18} /> Nova senha
        </h1>
        <label>
          Nova senha
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </label>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" variant="premium" disabled={loading}>
          {loading ? "Salvando..." : "Salvar e entrar"}
        </Button>
      </form>
    </main>
  );
}
