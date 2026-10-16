import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

type LinkState = "checking" | "ready" | "invalid";

function translateError(message: string, code?: string): string {
  const m = message.toLowerCase();
  if (code === "weak_password" || m.includes("weak") || m.includes("pwned") || m.includes("easy to guess")) {
    return "Essa senha é fraca ou já apareceu em vazamentos conhecidos. Escolha outra, mais longa e única (ex.: uma frase com números e símbolos).";
  }
  if (code === "same_password" || m.includes("different from the old")) {
    return "A nova senha precisa ser diferente da anterior.";
  }
  if (m.includes("session") || m.includes("jwt") || m.includes("expired") || m.includes("invalid")) {
    return "Link inválido ou expirado. Solicite um novo link na tela de acesso.";
  }
  return "Não foi possível salvar a senha. Tente novamente.";
}

function ResetPage() {
  const navigate = useNavigate();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const urlError = hash.get("error_description") || query.get("error_description");

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setLinkState("ready");
      }
    });

    (async () => {
      if (urlError) {
        setLinkState("invalid");
        return;
      }
      const code = query.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (exchangeError) {
          const { data } = await supabase.auth.getSession();
          setLinkState(data.session ? "ready" : "invalid");
          return;
        }
        setLinkState("ready");
        return;
      }
      // Implicit flow: the client reads the tokens from the URL hash on load.
      for (let i = 0; i < 10 && active; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setLinkState("ready");
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (active) setLinkState((s) => (s === "ready" ? s : "invalid"));
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
      setError(translateError(updateError.message, (updateError as { code?: string }).code));
      return;
    }
    setDone(true);
    setTimeout(() => void navigate({ to: "/admin", replace: true }), 1500);
  }

  return (
    <main className="admin-shell">
      <form className="admin-card admin-login" onSubmit={save}>
        <Brand />
        <h1>
          <Lock size={18} /> Nova senha
        </h1>
        {linkState === "checking" && <p role="status">Verificando o link...</p>}
        {linkState === "invalid" && (
          <>
            <p role="alert" className="text-destructive">
              Link inválido ou expirado. Solicite um novo link na tela de acesso.
            </p>
            <Link to="/auth" className="text-sm underline">
              Voltar ao acesso e pedir novo link
            </Link>
          </>
        )}
        {linkState === "ready" && done && <p role="status">Senha alterada com sucesso! Abrindo o painel...</p>}
        {linkState === "ready" && !done && (
          <>
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
          </>
        )}
      </form>
    </main>
  );
}
