import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getDailyReport } from "@/lib/sales";

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const report = await getDailyReport(readSearchParam(params.date));

  return (
    <AdminShell
      title="今日統計"
      subtitle="查看指定日期的有效交易總額、付款方式分布、熱銷品項與經手人統計。"
      userName={session.name}
    >
      <section className="panel p-5 sm:p-6">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="flex min-w-60 flex-col gap-2 text-sm font-medium text-slate-700">
            日期
            <input className="field" defaultValue={report.date} name="date" type="date" />
          </label>
          <button className="btn-primary" type="submit">
            查詢
          </button>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.5rem] bg-gradient-to-br from-orange-500 to-amber-400 p-5 text-white shadow-panel">
          <p className="text-sm text-white/85">有效交易總額</p>
          <p className="mt-3 text-3xl font-semibold">$ {formatMoney(report.totalAmount)}</p>
        </article>
        <article className="rounded-[1.5rem] bg-gradient-to-br from-sky-500 to-cyan-400 p-5 text-white shadow-panel">
          <p className="text-sm text-white/85">有效交易筆數</p>
          <p className="mt-3 text-3xl font-semibold">{report.transactionCount}</p>
        </article>
        <article className="rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-teal-400 p-5 text-white shadow-panel">
          <p className="text-sm text-white/85">付款方式數</p>
          <p className="mt-3 text-3xl font-semibold">{report.paymentSummary.length}</p>
        </article>
        <article className="rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-red-400 p-5 text-white shadow-panel">
          <p className="text-sm text-white/85">熱銷品項數</p>
          <p className="mt-3 text-3xl font-semibold">{report.itemSummary.length}</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="panel overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">付款方式統計</h2>
          </div>
          {report.paymentSummary.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">付款方式</th>
                    <th className="px-5 py-3 font-medium">金額</th>
                    <th className="px-5 py-3 font-medium">筆數</th>
                  </tr>
                </thead>
                <tbody>
                  {report.paymentSummary.map((entry) => (
                    <tr className="border-t border-slate-100" key={entry.payment_method}>
                      <td className="px-5 py-4 text-slate-900">{entry.payment_method}</td>
                      <td className="px-5 py-4 text-slate-600">$ {formatMoney(entry.amount)}</td>
                      <td className="px-5 py-4 text-slate-600">{entry.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-500">這一天還沒有有效交易資料。</div>
          )}
        </article>

        <article className="panel overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">品項銷售排行</h2>
          </div>
          {report.itemSummary.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">品項</th>
                    <th className="px-5 py-3 font-medium">數量</th>
                    <th className="px-5 py-3 font-medium">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {report.itemSummary.map((entry) => (
                    <tr className="border-t border-slate-100" key={entry.item_name}>
                      <td className="px-5 py-4 text-slate-900">{entry.item_name}</td>
                      <td className="px-5 py-4 text-slate-600">{formatMoney(entry.quantity)}</td>
                      <td className="px-5 py-4 text-slate-600">$ {formatMoney(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-500">這一天還沒有品項銷售排行。</div>
          )}
        </article>

        <article className="panel overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">經手人統計</h2>
          </div>
          {report.cashierSummary.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">經手人</th>
                    <th className="px-5 py-3 font-medium">筆數</th>
                    <th className="px-5 py-3 font-medium">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {report.cashierSummary.map((entry) => (
                    <tr className="border-t border-slate-100" key={entry.cashier}>
                      <td className="px-5 py-4 text-slate-900">{entry.cashier}</td>
                      <td className="px-5 py-4 text-slate-600">{entry.transaction_count}</td>
                      <td className="px-5 py-4 text-slate-600">$ {formatMoney(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-500">這一天還沒有經手人統計。</div>
          )}
        </article>
      </section>
    </AdminShell>
  );
}
