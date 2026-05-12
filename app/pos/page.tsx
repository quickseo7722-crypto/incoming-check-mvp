import { AdminShell } from "@/components/admin-shell";
import { PosCheckoutForm } from "@/components/pos-checkout-form";
import { requireAdmin } from "@/lib/auth";

export default async function PosPage() {
  const session = await requireAdmin();

  return (
    <AdminShell
      title="POS 結帳"
      subtitle="提供現場快速手動輸入包材品項、即時計算金額並完成結帳。"
      userName={session.name}
    >
      <PosCheckoutForm defaultCashier={session.name} />
    </AdminShell>
  );
}
