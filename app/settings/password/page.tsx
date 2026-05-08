import { AdminShell } from "@/components/admin-shell";
import { ChangePasswordForm } from "@/components/change-password-form";
import { requireAdmin } from "@/lib/auth";

export default async function ChangePasswordPage() {
  const session = await requireAdmin();

  return (
    <AdminShell
      title="帳號安全"
      subtitle="更新目前登入中的 Admin 密碼，沿用既有 cookie session。"
      userName={session.name}
    >
      <ChangePasswordForm />
    </AdminShell>
  );
}
