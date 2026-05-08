"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error || "登入失敗");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="panel mx-auto flex w-full max-w-md flex-col gap-4 p-6" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Admin Login</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">進貨清點後台</h2>
        <p className="mt-2 text-sm text-slate-600">預設帳號會在資料庫 seed 時建立，方便先把整套流程跑起來。</p>
      </div>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Email
        <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        密碼
        <input
          className="field"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <button className="btn-primary" disabled={loading} type="submit">
        {loading ? "登入中..." : "登入"}
      </button>
    </form>
  );
}
