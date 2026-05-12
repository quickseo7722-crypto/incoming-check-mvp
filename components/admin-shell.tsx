import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

type AdminShellProps = {
  title: string;
  subtitle: string;
  userName: string;
  children: React.ReactNode;
};

const navigationItems = [
  { href: "/dashboard", label: "首頁總覽" },
  { href: "/purchase-orders/new", label: "新增叫貨單" },
  { href: "/history", label: "清點歷史" },
  { href: "/pos", label: "POS 結帳" },
  { href: "/sales", label: "銷售紀錄" },
  { href: "/reports/daily", label: "今日統計" },
  { href: "/settings/password", label: "修改密碼" },
];

export function AdminShell({ title, subtitle, userName, children }: AdminShellProps) {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="panel overflow-hidden">
          <div className="grid gap-5 bg-gradient-to-r from-stone-900 via-orange-900 to-amber-700 px-6 py-6 text-white md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-orange-100">Incoming Check MVP</p>
              <h1 className="mt-3 text-3xl font-semibold md:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-orange-50/90 md:text-base">{subtitle}</p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-orange-50">
                目前登入：{userName}
              </div>
              <LogoutButton />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-white/40 bg-white/70 px-6 py-4 text-sm">
            {navigationItems.map((item) => (
              <Link className="btn-secondary" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}
