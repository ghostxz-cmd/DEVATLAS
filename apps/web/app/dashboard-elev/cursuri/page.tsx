export default function StudentDashboardCoursesPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[#070b14]/95 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Cursuri</div>
            <h2 className="mt-2 text-2xl font-bold text-white">Catalog cursuri publicate</h2>
          </div>
          <div className="text-xs text-slate-400">Search + filtre pregătite pentru integrare</div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <input
            placeholder="Caută după nume curs..."
            className="h-11 rounded-xl border border-white/10 bg-[#050814]/95 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/40"
          />
          <select className="h-11 rounded-xl border border-white/10 bg-[#050814]/95 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/40">
            <option>Toate categoriile</option>
            <option>Frontend</option>
            <option>Backend</option>
            <option>Data</option>
          </select>
          <select className="h-11 rounded-xl border border-white/10 bg-[#050814]/95 px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/40">
            <option>Orice nivel</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#070b14]/95 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="text-sm text-slate-300">
          Când profesorii publică cursuri din dashboard-ul lor, vor apărea aici în listă cu detalii, progres și acțiuni de enrol.
        </div>
      </div>
    </section>
  );
}
