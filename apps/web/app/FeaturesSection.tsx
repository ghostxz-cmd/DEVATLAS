"use client";

export default function FeaturesSection() {
  return (
    <section className="relative py-40 bg-gradient-to-b from-black via-gray-950 to-black overflow-hidden">
      {/* Large Graphic Elements */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-40 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px]" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Massive Title */}
        <div className="mb-28">
          <h2 className="text-7xl md:text-8xl lg:text-9xl font-black text-white/5 leading-none mb-6">
            FEATURES
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold text-white -mt-24 ml-4">
            Tot ce-ți trebuie<br />
            <span className="text-cyan-400">într-un singur loc</span>
          </h3>
        </div>

        {/* Bento Grid Style Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
          
          {/* Large Feature - Spans 8 cols */}
          <div className="md:col-span-6 lg:col-span-8 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-[2.5rem] p-10 border border-cyan-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/20 rounded-2xl mb-6">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">Editor în browser</h3>
              <p className="text-xl text-gray-300 leading-relaxed mb-8">
                Scrii cod, îl testezi instant. Fără să instalezi nimic, fără configurări.
              </p>
              {/* Code Preview */}
              <div className="bg-black/40 rounded-2xl p-5 border border-white/5">
                <pre className="text-cyan-400 font-mono text-sm">
                  <code>{`console.log("Hello DevAtlas!");`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Tall Feature - Spans 4 cols */}
          <div className="md:col-span-6 lg:col-span-4 bg-white/5 rounded-[2.5rem] p-10 border border-white/10 backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">Cursuri video</h3>
            <p className="text-xl text-gray-300 leading-relaxed">
              Lecții în română, pas cu pas. JavaScript, Python, Web Dev.
            </p>
            {/* Visual Element */}
            <div className="mt-10 space-y-3">
              <div className="h-3 bg-white/10 rounded-full w-full" />
              <div className="h-3 bg-cyan-400/30 rounded-full w-3/4" />
              <div className="h-3 bg-white/10 rounded-full w-1/2" />
            </div>
          </div>

          {/* Wide Feature - Spans 7 cols */}
          <div className="md:col-span-6 lg:col-span-7 bg-gradient-to-br from-white/5 to-white/0 rounded-[2.5rem] p-10 border border-white/10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">Progres tracked</h3>
            <p className="text-xl text-gray-300 leading-relaxed mb-8">
              Vezi exact unde ești, ce urmează, unde ai greșit.
            </p>
            <div className="flex gap-4">
              <div className="flex-1 bg-black/20 rounded-2xl p-6 border border-white/5">
                <div className="text-4xl font-black text-cyan-400 mb-2">78%</div>
                <div className="text-sm text-gray-400">Completat</div>
              </div>
              <div className="flex-1 bg-black/20 rounded-2xl p-6 border border-white/5">
                <div className="text-4xl font-black text-white mb-2">24</div>
                <div className="text-sm text-gray-400">Exerciții</div>
              </div>
              <div className="flex-1 bg-black/20 rounded-2xl p-6 border border-white/5">
                <div className="text-4xl font-black text-white mb-2">8</div>
                <div className="text-sm text-gray-400">Badge-uri</div>
              </div>
            </div>
          </div>

          {/* Square Feature - Spans 5 cols */}
          <div className="md:col-span-6 lg:col-span-5 bg-black/40 rounded-[2.5rem] p-10 border border-white/5 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">24/7 disponibil</h3>
              <p className="text-xl text-gray-300 leading-relaxed">
                Învață când vrei. Fără orar fix, fără presiune.
              </p>
            </div>
            <div className="text-7xl font-black text-white/5 text-right">24/7</div>
          </div>

        </div>
      </div>
    </section>
  );
}