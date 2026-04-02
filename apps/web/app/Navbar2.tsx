"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 ${
      isScrolled 
        ? 'bg-black/60 backdrop-blur-xl' 
        : 'bg-black'
    }`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 lg:h-24 max-w-7xl mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center group flex-shrink-0">
            <Image
              src="/logos/negru.fara.bg.png"
              alt="DevAtlas Logo"
              width={120}
              height={32}
              className="brightness-0 invert transition-all group-hover:scale-105 w-20 sm:w-28 lg:w-40 h-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 lg:gap-4">
            {/* De ce DevAtlas - Dropdown */}
            <div className="relative group">
              <button 
                onMouseEnter={() => setIsDropdownOpen(true)}
                className="px-3 lg:px-6 py-2 lg:py-3 text-gray-200 hover:text-white font-normal text-xs lg:text-[15px] tracking-wide transition-all hover:bg-white/5 rounded-lg lg:rounded-xl flex items-center gap-1 lg:gap-2 whitespace-nowrap"
              >
                <span>De ce DevAtlas</span>
                <svg 
                  className={`w-3 h-3 lg:w-3.5 lg:h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div 
                  className="absolute top-full left-0 mt-2 lg:mt-3 w-48 lg:w-64 bg-gray-900 border border-white/10 rounded-lg lg:rounded-2xl shadow-2xl overflow-hidden"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <Link 
                    href="/despre/povestea-noastra"
                    className="block px-4 lg:px-6 py-2 lg:py-4 text-gray-200 hover:text-white hover:bg-white/10 transition-all border-b border-white/5 text-xs lg:text-[15px]"
                  >
                    <div className="font-medium">Povestea Noastră</div>
                    <div className="text-xs text-gray-400 mt-0.5">Cum a început totul</div>
                  </Link>
                  <Link 
                    href="/despre/echipa-noastra"
                    className="block px-4 lg:px-6 py-2 lg:py-4 text-gray-200 hover:text-white hover:bg-white/10 transition-all text-xs lg:text-[15px]"
                  >
                    <div className="font-medium">Echipa Noastră</div>
                    <div className="text-xs text-gray-400 mt-0.5">Oamenii din spatele proiectului</div>
                  </Link>
                </div>
              )}
            </div>

            {/* Cursurile Noastre */}
            <Link
              href="/cursuri"
              className="px-3 lg:px-6 py-2 lg:py-3 text-gray-200 hover:text-white font-normal text-xs lg:text-[15px] tracking-wide transition-all hover:bg-white/5 rounded-lg lg:rounded-xl whitespace-nowrap"
            >
              Cursurile Noastre
            </Link>

            {/* Contact */}
            <Link
              href="/contact"
              className="px-3 lg:px-6 py-2 lg:py-3 text-gray-200 hover:text-white font-normal text-xs lg:text-[15px] tracking-wide transition-all hover:bg-white/5 rounded-lg lg:rounded-xl whitespace-nowrap"
            >
              Contact
            </Link>
          </div>

          {/* Sign In Button (Desktop) */}
          <div className="hidden md:block">
            <Link
              href="/auth/signin"
              className="px-4 lg:px-8 py-2 lg:py-3 bg-white text-black font-medium text-xs lg:text-[15px] rounded-lg lg:rounded-xl transition-all hover:bg-gray-100 whitespace-nowrap"
            >
              Intră în cont
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col space-y-1 max-w-7xl mx-auto">
              <div className="px-4 py-2 text-gray-500 text-xs font-medium uppercase tracking-wider">De ce DevAtlas</div>
              <Link href="/despre/povestea-noastra" className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-4 py-3 rounded-lg text-sm" onClick={() => setIsMenuOpen(false)}>Povestea Noastră</Link>
              <Link href="/despre/echipa-noastra" className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-4 py-3 rounded-lg text-sm" onClick={() => setIsMenuOpen(false)}>Echipa Noastră</Link>
              <Link href="/cursuri" className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-4 py-3 rounded-lg text-sm mt-2" onClick={() => setIsMenuOpen(false)}>Cursurile Noastre</Link>
              <Link href="/contact" className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-4 py-3 rounded-lg text-sm" onClick={() => setIsMenuOpen(false)}>Contact</Link>
              <Link href="/auth/signin" className="mx-2 mt-4 px-6 py-3 bg-white text-black font-medium rounded-lg transition-all text-center text-sm" onClick={() => setIsMenuOpen(false)}>Intră în cont</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
