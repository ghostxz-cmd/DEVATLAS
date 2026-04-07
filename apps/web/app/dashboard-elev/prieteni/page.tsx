export default function StudentDashboardFriendsPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[#070b14]/95 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Prieteni</div>
        <h2 className="mt-2 text-2xl font-bold text-white">Rețea elevi</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Aici va apărea sistemul de prieteni, invitații, activitate comună și recomandări sociale.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#070b14]/95 p-5">
          <div className="text-sm font-semibold text-white">Prieteni activi</div>
          <div className="mt-2 text-sm text-slate-400">Secțiune pregătită pentru lista reală de prieteni online.</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#070b14]/95 p-5">
          <div className="text-sm font-semibold text-white">Invitații</div>
          <div className="mt-2 text-sm text-slate-400">Secțiune pregătită pentru cereri trimise/primite.</div>
        </div>
      </div>
    </section>
  );
}
