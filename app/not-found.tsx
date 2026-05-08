import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-lg p-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Not Found</p>
        <h1 className="mt-3 text-3xl font-semibold">找不到這筆叫貨單或分享連結</h1>
        <p className="mt-3 text-sm text-slate-600">可能是連結失效、ID 不存在，或你尚未登入後台。</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link className="btn-secondary" href="/login">
            回登入頁
          </Link>
          <Link className="btn-primary" href="/dashboard">
            回儀表板
          </Link>
        </div>
      </div>
    </main>
  );
}
