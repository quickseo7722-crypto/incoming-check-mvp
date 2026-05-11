export default function PurchaseOrderDetailLoading() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200/70" />

        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 lg:max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="grid gap-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="h-40 animate-pulse rounded-3xl bg-slate-100" key={index} />
            ))}
          </div>

          <div className="grid gap-4">
            <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-56 animate-pulse rounded-3xl bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
