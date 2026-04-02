"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section className="relative py-24 sm:py-32 md:py-48 bg-gradient-to-br from-black via-gray-950 to-black overflow-hidden">
      {/* Massive Graphic Elements - Responsive */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] md:w-[800px] md:h-[800px] bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-[100px] sm:blur-[150px] md:blur-[200px]" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[600px] md:h-[600px] bg-cyan-500/10 transform -translate-x-1/2 translate-y-1/2 blur-[80px] sm:blur-[120px] md:blur-[150px]" />
      
      {/* Diagonal Lines */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent transform -skew-x-12" />
        <div className="absolute top-0 left-2/4 w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent transform -skew-x-12" />
        <div className="absolute top-0 left-3/4 w-1 h-full bg-gradient-to-b from-transparent via-white to-transparent transform -skew-x-12" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-8">
        <div className="max-w-5xl">
          {/* Super Large Heading - Responsive Typography */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl xl:text-[11rem] font-black text-white leading-[0.85] mb-8 sm:mb-12 tracking-tighter">
            Ready<br />
            to start?
          </h2>
          
          {/* Subtext - Responsive */}
          <p className="text-lg sm:text-xl md:text-3xl lg:text-4xl text-gray-300 mb-12 sm:mb-16 leading-relaxed max-w-3xl font-light">
            Primul curs e <span className="text-white font-bold">gratuit</span>. 
            Fără card, fără bullshit. Doar intri și începi.
          </p>
          
          {/* CTA Buttons - Touch-friendly */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
            <Link
              href="/cursuri"
              className="group px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-6 bg-cyan-400 hover:bg-cyan-500 text-black font-black text-base sm:text-lg md:text-xl rounded-lg sm:rounded-2xl transition-all hover:scale-105 inline-flex items-center justify-center sm:justify-start gap-3 sm:gap-4 shadow-2xl shadow-cyan-400/30 min-h-[44px]"
            >
              Începe acum
              <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            
            <Link
              href="/despre/povestea-noastra"
              className="px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-6 bg-transparent text-white font-bold text-base sm:text-lg md:text-xl rounded-lg sm:rounded-2xl border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all inline-flex items-center justify-center min-h-[44px]"
            >
              Povestea noastră
            </Link>
          </div>

          {/* Social Proof - Hide on mobile, show on sm+ */}
          <div className="mt-12 sm:mt-16 md:mt-20 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8 text-gray-400">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border-2 border-black flex-shrink-0" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-black flex-shrink-0" />
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-black flex-shrink-0" />
            </div>
            <p className="text-base sm:text-lg">
              <span className="text-white font-bold">100+</span> developeri învață pe DevAtlas
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
