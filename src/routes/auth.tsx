import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/agency/dashboard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso restrito | LAUX AGÊNCIA" },
      { name: "description", content: "Área privada da LAUX AGÊNCIA para acompanhar os formulários recebidos pelo site." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Acesso restrito | LAUX AGÊNCIA" },
      { property: "og:description", content: "Painel privado de formulários da LAUX AGÊNCIA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/admin/dashboard", search: { period: 'month', from: '', to: '', seller: '' }, replace: true });
    });
  }, [navigate]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    void navigate({ to: "/admin/dashboard", search: { period: 'month', from: '', to: '', seller: '' }, replace: true });
  }

  async function forgot() {
    setError("");
    if (!email.trim()) {
      setError("Digite seu e-mail acima para receber o link.");
      return;
    }
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setInfo("Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
  }

  return (
    <main className="admin-shell">
      <form className="admin-card admin-login" onSubmit={signIn}>
        <Brand />
        <h1>
          <Lock size={18} /> Acesso restrito
        </h1>
        <p>Área privada para acompanhar os formulários recebidos pelo site.</p>
        <label>
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          Senha
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {info && <p role="status">{info}</p>}
        <Button type="submit" variant="premium" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
          <LogIn />
        </Button>
        <button type="button" className="text-sm underline" onClick={forgot}>
          Esqueci minha senha
        </button>
      </form>
    </main>
  );
}
