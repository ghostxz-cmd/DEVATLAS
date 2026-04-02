"use client";

import Link from "next/link";

const categories = [
  {
    name: "Web Development",
    description: "HTML, CSS, JavaScript, React, Next.js",
    icon: "🌐",
    courses: 12,
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30"
  },
  {
    name: "Backend & APIs",
    description: "Node.js, Python, Databases, REST",
    icon: "⚙️",
    courses: 8,
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30"
  },
  {
    name: "Mobile Development",
    description: "React Native, Flutter, iOS, Android",
    icon: "📱",
    courses: 6,
    color: "from-green-500/20 to-emerald-500/20",
    borderColor: "border-green-500/30"
  },
  {
    name: "DevOps & Cloud",
    description: "Docker, AWS, CI/CD, Kubernetes",
    icon: "☁️",
    courses: 5,
    color: "from-orange-500/20 to-red-500/20",
    borderColor: "border-orange-500/30"
  }
];

export default function CourseCategoriesSection() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-black via-gray-950 to-black">
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-1 w-12 bg-gradient-to-r from-cyan-500 to-blue-500" />
            <span className="text-cyan-400 font-semibold tracking-wider uppercase text-sm">Cursuri</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Învață ce vrei, <br />când vrei
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl">
            De la frontend la backend, de la mobile la cloud. Alege-ți drumul în tech.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {categories.map((category, index) => (
            <Link
              key={index}
              href={`/cursuri/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
              className={`group relative p-8 bg-gradient-to-br ${category.color} border ${category.borderColor} rounded-3xl overflow-hidden transition-all hover:scale-[1.02]`}
            >
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-32 -translate-y-32 group-hover:translate-x-24 group-hover:-translate-y-24 transition-transform duration-500" />
              
              <div className="relative">
                <div className="text-5xl mb-4">{category.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{category.name}</h3>
                <p className="text-gray-300 mb-4">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{category.courses} cursuri</span>
                  <svg className="w-6 h-6 text-white transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Featured Courses Preview */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-white mb-8">Începe cu acestea</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Course Card 1 */}
            <div className="bg-gray-900/50 border border-white/10 rounded-2xl overflow-hidden group hover:border-cyan-500/30 transition-all">
              <div className="h-48 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <div className="text-6xl">💻</div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-semibold rounded-full">POPULAR</span>
                  <span className="text-gray-500 text-sm">12 ore</span>
                </div>
                <h4 className="text-xl font-bold text-white mb-2">JavaScript de la Zero</h4>
                <p className="text-gray-400 text-sm mb-4">Învață JavaScript modern cu ES6+, async/await și DOM manipulation.</p>
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-semibold">Gratuit</span>
                  <button className="text-white hover:text-cyan-400 transition-colors">
                    Vezi cursul →
                  </button>
                </div>
              </div>
            </div>

            {/* Course Card 2 */}
            <div className="bg-gray-900/50 border border-white/10 rounded-2xl overflow-hidden group hover:border-cyan-500/30 transition-all">
              <div className="h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <div className="text-6xl">⚛️</div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs font-semibold rounded-full">NOU</span>
                  <span className="text-gray-500 text-sm">18 ore</span>
                </div>
                <h4 className="text-xl font-bold text-white mb-2">React & Next.js Complet</h4>
                <p className="text-gray-400 text-sm mb-4">Construiește aplicații web moderne cu React hooks și Next.js 15.</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-semibold">149 RON</span>
                  <button className="text-white hover:text-cyan-400 transition-colors">
                    Vezi cursul →
                  </button>
                </div>
              </div>
            </div>

            {/* Course Card 3 */}
            <div className="bg-gray-900/50 border border-white/10 rounded-2xl overflow-hidden group hover:border-cyan-500/30 transition-all">
              <div className="h-48 bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <div className="text-6xl">🐍</div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full">BEGINNER</span>
                  <span className="text-gray-500 text-sm">15 ore</span>
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Python pentru Începători</h4>
                <p className="text-gray-400 text-sm mb-4">De la sintaxă de bază până la OOP și lucrul cu API-uri.</p>
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-semibold">Gratuit</span>
                  <button className="text-white hover:text-cyan-400 transition-colors">
                    Vezi cursul →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href="/cursuri"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all"
          >
            Vezi toate cursurile
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
