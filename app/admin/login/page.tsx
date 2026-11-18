"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cats } from "@/components/Cats";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
      <Cats size={240} wiggle />
      <h1 className="text-5xl font-black">Administrador</h1>
      <form onSubmit={onSubmit} className="card-sticker flex w-full flex-col gap-3 p-5">
        <input
          type="email"
          required
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
        <input
          type="password"
          required
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
        {error && <p className="text-sm font-bold text-red">{error}</p>}
        <button className="btn" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
