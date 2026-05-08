"use client";

import { useState } from "react";

const initialState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ChangePasswordForm() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "修改密碼失敗");
        return;
      }

      setForm(initialState);
      setSuccess("密碼已更新，下次請使用新密碼登入。");
    } catch {
      setError("目前無法修改密碼，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel max-w-2xl p-6" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">修改 Admin 密碼</h2>
        <p className="mt-2 text-sm text-slate-600">
          只會更新目前登入中的管理者帳號，不會影響其他使用者。
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          目前密碼
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, currentPassword: event.target.value }))
            }
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          新密碼
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, newPassword: event.target.value }))
            }
          />
          <span className="text-xs text-slate-500">至少 8 碼。</span>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          確認新密碼
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((current) => ({ ...current, confirmPassword: event.target.value }))
            }
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      ) : null}

      <div className="mt-6 flex gap-3">
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "更新中..." : "更新密碼"}
        </button>
      </div>
    </form>
  );
}
