import Navbar from "../Navbar";

export default function CursuriPage() {
  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-40 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-8 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Cursurile vin curând
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Lucrăm din greu la conținut. Primul curs va fi disponibil în câteva săptămâni.
          </p>

          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300 font-medium">În dezvoltare</span>
          </div>
        </div>
      </div>
    </main>
  );
}
