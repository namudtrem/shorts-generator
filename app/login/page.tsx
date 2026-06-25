"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = createClient();
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) return setMsg(error.message);
    if (mode === "signup") return setMsg("Hesap oluşturuldu. Şimdi giriş yapabilirsin.");
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Shorts Generator</h1>
      <p className="text-sm text-zinc-400">
        {mode === "signin" ? "Giriş yap" : "Hesap oluştur"}
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          className="rounded bg-zinc-900 p-3 outline-none ring-1 ring-zinc-800"
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded bg-zinc-900 p-3 outline-none ring-1 ring-zinc-800"
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          disabled={loading}
          className="rounded bg-indigo-600 p-3 font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "..." : mode === "signin" ? "Giriş yap" : "Kayıt ol"}
        </button>
      </form>
      {msg && <p className="text-sm text-amber-400">{msg}</p>}
      <button
        className="text-sm text-zinc-400 underline"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
      </button>
    </main>
  );
}
