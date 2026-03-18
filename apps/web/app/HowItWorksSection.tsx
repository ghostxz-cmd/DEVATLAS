"use client";

import Link from "next/link";

export default function HowItWorksSection() {
  return (
    <section className="relative py-48 bg-black overflow-hidden">
      {/* Massive Background Text */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.02]">
        <div className="text-[20rem] font-black text-white whitespace-nowrap transform -rotate-12">
          CODE CODE CODE
        </div>
      </div>

      {/* Geometric Accent */}
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-gradient-to-br from-cyan-500 to-blue-500 transform skew-y-12 opacity-10 blur-3xl" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Title Section */}
        <div className="mb-24">
          <div className="inline-block px-6 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
            <span className="text-cyan-400 font-medium tracking-wide">HOW IT WORKS</span>
          </div>
          <h2 className="text-6xl md:text-7xl font-black text-white leading-tight max-w-3xl">
            Învețezi făcând,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              nu uitând
            </span>
          </h2>
        </div>

        {/* Steps - Diagonal Layout */}
        <div className="space-y-24">
          
          {/* Step 1 - Left Aligned */}
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-20">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/50 transform rotate-3">
                <span className="text-6xl font-black text-black">1</span>
              </div>
            </div>
            <div className="max-w-2xl">
              <h3 className="text-4xl font-bold text-white mb-6">Alegi ce vrei să înveți</h3>
              <p className="text-2xl text-gray-400 leading-relaxed">
                JavaScript pentru web apps, Python pentru data science, sau orice altceva. 
                Fiecare curs începe de la zero, fără bullshit.
              </p>
            </div>
          </div>

          {/* Step 2 - Right Aligned */}
          <div className="flex flex-col lg:flex-row-reverse items-start gap-12 lg:gap-20 lg:ml-auto lg:max-w-5xl">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl transform -rotate-3">
                <span className="text-6xl font-black text-black">2</span>
              </div>
            </div>
            <div className="max-w-2xl">
              <h3 className="text-4xl font-bold text-white mb-6">Scrii cod, primești feedback</h3>
              <p className="text-2xl text-gray-400 leading-relaxed mb-8">
                Editorul din browser îți arată instant dacă e corect. 
                Fără să instalezi nimic, fără configurări.
              </p>
              {/* Code Block Visual */}
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <pre className="text-cyan-400 font-mono text-base">
                  <code>{`function salut(nume) {
  return \`Salut, \${nume}!\`;
}

salut("Developer"); // ✓ Corect!`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Step 3 - Left Aligned */}
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-20">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50 transform rotate-6">
                <span className="text-6xl font-black text-white">3</span>
              </div>
            </div>
            <div className="max-w-2xl">
              <h3 className="text-4xl font-bold text-white mb-6">Construiești proiecte reale</h3>
              <p className="text-2xl text-gray-400 leading-relaxed mb-8">
                To-do app, weather app, chat app. Proiecte pe care le pui în portofoliu 
                și le arăți la interviuri.
              </p>
              <Link 
                href="/cursuri"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-bold text-lg rounded-2xl hover:bg-cyan-400 transition-all"
              >
                Începe acum
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
