export default function DashboardLoading() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-28 animate-pulse rounded-[1.5rem] bg-slate-200/70" key={index} />
          ))}
        </section>

        <section className="panel p-4 sm:p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="h-36 animate-pulse rounded-[1.4rem] bg-slate-100" key={index} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
