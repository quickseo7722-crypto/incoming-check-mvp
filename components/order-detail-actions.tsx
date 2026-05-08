"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderDetailActions({ orderId, shareToken, isClosed }: { orderId: string; shareToken: string; isClosed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const sharePath = `/share/${shareToken}`;

  async function copyShareLink() {
    if (typeof window === "undefined") return;
    const fullUrl = `${window.location.origin}${sharePath}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      // Older browsers / non-secure context — silently no-op; the relative path
      // is still visible on the page.
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button className="btn-secondary" type="button" onClick={copyShareLink}>
        複製分享連結
      </button>
      <button className="btn-secondary" type="button" onClick={() => router.push(`/purchase-orders/${orderId}/edit`)}>
        回到編輯頁
      </button>
      <button className="btn-secondary" type="button" onClick={() => window.open(sharePath, "_blank")}>
        開啟員工清點頁
      </button>
      {!isClosed ? (
        <button
          className="btn-primary"
          disabled={busy}
          type="button"
          onClick={async () => {
            setBusy(true);
            await fetch(`/api/purchase-orders/${orderId}/close`, { method: "POST" });
            router.refresh();
          }}
        >
          {busy ? "結案中..." : "結案"}
        </button>
      ) : null}
    </div>
  );
}
