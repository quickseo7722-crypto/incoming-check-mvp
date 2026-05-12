"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VoidSaleButton({
  saleId,
  saleNo,
  voidBy,
  disabled = false,
}: {
  saleId: string;
  saleNo: string;
  voidBy: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="btn-danger"
      disabled={disabled || busy}
      type="button"
      onClick={async () => {
        const reason = window.prompt(`請輸入 ${saleNo} 的作廢原因`);
        if (reason === null) return;
        if (!reason.trim()) {
          window.alert("請輸入作廢原因");
          return;
        }

        const confirmed = window.confirm(`確認將 ${saleNo} 作廢？`);
        if (!confirmed) return;

        setBusy(true);

        try {
          const response = await fetch(`/api/sales/${saleId}/void`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              void_reason: reason,
              void_by: voidBy,
            }),
          });
          const payload = await response.json();

          if (!response.ok) {
            window.alert(payload.error || "作廢交易失敗");
            return;
          }

          window.alert(payload.message || "交易已作廢");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "作廢中..." : "作廢"}
    </button>
  );
}
