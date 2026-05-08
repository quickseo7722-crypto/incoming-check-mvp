import { AdminShell } from "@/components/admin-shell";
import { OrderCreateForm } from "@/components/order-create-form";
import { requireAdmin } from "@/lib/auth";

export default async function NewPurchaseOrderPage() {
  const session = await requireAdmin();

  return (
    <AdminShell
      title="新增叫貨單"
      subtitle="先建立一張草稿，再上傳截圖並啟動 AI 解析。"
      userName={session.name}
    >
      <OrderCreateForm />
    </AdminShell>
  );
}
