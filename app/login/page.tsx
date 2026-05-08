import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <section className="rounded-[2rem] border border-white/60 bg-gradient-to-br from-stone-900 via-orange-900 to-amber-700 p-8 text-white shadow-panel">
          <p className="text-sm uppercase tracking-[0.34em] text-orange-100">SDD to MVP</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            把 1688 叫貨截圖
            <br />
            變成可追蹤的清點任務
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-orange-50/90">
            這個 MVP 專注在最短閉環：老闆上傳截圖、AI 轉成品項、人工校正、員工手機清點、結果回看。
          </p>
          <div className="mt-8 grid gap-3 text-sm text-orange-50/90 md:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">手機優先清點卡片介面</div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">分享連結免登入給員工使用</div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">OpenAI Vision 解析供應商截圖</div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4">SQLite + Prisma 快速本機驗證</div>
          </div>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
