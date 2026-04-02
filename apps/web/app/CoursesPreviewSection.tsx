  "use client";

import Link from "next/link";

export default function CoursesPreviewSection() {
  return (
    <section className="relative py-32 bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <h2 className="text-5xl font-bold text-white mb-4">
              Cursurile noastre
            </h2>
            <p className="text-xl text-gray-400">
              De la fundamente la nivel avansat
            </p>
          </div>
          <Link 
            href="/cursuri"
            className="px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl hover:bg-white/10 transition-all"
          >
            Vezi toate cursurile →
          </Link>
        </div>

        {/* Courses Grid - Asymmetric */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Large Featured Course */}
          <div className="lg:col-span-8 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-3xl p-10 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <div className="text-yellow-500 text-sm font-medium">Populat</div>
                <h3 className="text-3xl font-bold text-white">JavaScript de la Zero</h3>
              </div>
            </div>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Învață JavaScript de la sintaxa de bază până la concepte avansate: async/await, closures, DOM manipulation. 
              Construiești 5 proiecte reale.
            </p>
            <div className="flex flex-wrap gap-8">
              <div>
                <div className="text-2xl font-bold text-white">42 lecții</div>
                <div className="text-sm text-gray-400">Video + cod</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">8 săptămâni</div>
                <div className="text-sm text-gray-400">În ritmul tău</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">Gratuit</div>
                <div className="text-sm text-gray-400">Pentru început</div>
              </div>
            </div>
          </div>

          {/* Side Stacked Courses */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-transform">
              <div className="text-2xl mb-3">🐍</div>
              <h3 className="text-xl font-bold text-white mb-2">Python Fundamentals</h3>
              <p className="text-gray-400 text-sm mb-4">
                De la &quot;Hello World&quot; la aplicații CLI complexe.
              </p>
              <div className="text-sm text-gray-500">24 lecții • 6 săptămâni</div>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-transform">
              <div className="text-2xl mb-3">🎨</div>
              <h3 className="text-xl font-bold text-white mb-2">Web Design cu CSS</h3>
              <p className="text-gray-400 text-sm mb-4">
                Layouts moderne, animații și responsive design.
              </p>
              <div className="text-sm text-gray-500">18 lecții • 4 săptămâni</div>
            </div>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-transform">
            <div className="text-2xl mb-3">⚛️</div>
            <h3 className="text-xl font-bold text-white mb-2">React pentru Beginneri</h3>
            <p className="text-gray-400 text-sm mb-4">
              Componente, hooks, state management.
            </p>
            <div className="text-sm text-gray-500">32 lecții • 7 săptămâni</div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-transform">
            <div className="text-2xl mb-3">🗄️</div>
            <h3 className="text-xl font-bold text-white mb-2">SQL & Databases</h3>
            <p className="text-gray-400 text-sm mb-4">
              PostgreSQL, queries complexe, indexare.
            </p>
            <div className="text-sm text-gray-500">20 lecții • 5 săptămâni</div>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-6 hover:scale-[1.02] transition-transform">
            <div className="text-2xl mb-3">🚀</div>
            <h3 className="text-xl font-bold text-white mb-2">Git & GitHub</h3>
            <p className="text-gray-400 text-sm mb-4">
              Version control, colaborare, workflows.
            </p>
            <div className="text-sm text-gray-500">12 lecții • 3 săptămâni</div>
          </div>
        </div>

      </div>
    </section>
  );
}
