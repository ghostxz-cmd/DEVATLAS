"use client";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Geometric Shapes - Bold & Graphic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Massive White Parallelogram Stack */}
        <div className="absolute -top-20 -right-32 w-[650px] h-[450px] bg-white transform skew-y-[-12deg] opacity-100" />
        <div className="absolute top-40 right-0 w-[620px] h-[420px] bg-white transform skew-y-[-12deg] opacity-95" />
        <div className="absolute top-96 right-32 w-[580px] h-[380px] bg-white transform skew-y-[-12deg] opacity-90" />
        
        {/* Cyan Accent - Bottom Right */}
        <div className="absolute bottom-0 right-0 w-[700px] h-[250px] bg-gradient-to-r from-cyan-400 to-cyan-500 transform skew-y-[-12deg]" />
        
        {/* Left Side Graphic Elements */}
        <div className="absolute top-40 -left-20 w-[300px] h-[300px] bg-cyan-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-10 w-64 h-64 border-4 border-white/10 transform rotate-12" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 backdrop-blur-sm border border-cyan-500/30 rounded-full mb-10">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 font-medium tracking-wide">Învață programare în 2026</span>
          </div>

          {/* Massive Heading */}
          <h1 className="text-[5.5rem] md:text-[7rem] lg:text-[9rem] font-black text-white leading-[0.9] mb-8 tracking-tight">
            Code.<br />
            Build.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500">
              Repeat.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-2xl md:text-3xl text-gray-300 mb-12 leading-relaxed font-light max-w-2xl">
            Platformă românească de învățare programare. 
            <span className="text-white font-medium"> Cursuri video, exerciții practice și proiecte reale.</span>
          </p>

          {/* CTA */}
          <div className="flex flex-wrap gap-5">
            <a
              href="/cursuri"
              className="group px-10 py-5 bg-white text-black font-bold text-lg rounded-2xl transition-all hover:bg-cyan-400 hover:text-black inline-flex items-center gap-3 shadow-2xl hover:shadow-cyan-400/50"
            >
              Începe să înveți
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a
              href="/despre/povestea-noastra"
              className="px-10 py-5 bg-transparent text-white font-bold text-lg rounded-2xl border-2 border-white/20 hover:border-white/40 transition-all backdrop-blur-sm"
            >
              Povestea noastră
            </a>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
        <div className="flex flex-col items-center gap-2 text-white/40 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}
