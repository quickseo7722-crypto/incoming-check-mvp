export default function HistoryLoading() {
  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="panel p-4 sm:p-6">
          <div className="space-y-3 sm:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="h-44 animate-pulse rounded-[1.4rem] bg-slate-100" key={index} />
            ))}
          </div>

          <div className="hidden sm:block">
            <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </section>
      </div>
    </main>
  );
}
