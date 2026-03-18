"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "./ThemeProvider";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/logos/negru.fara.bg.png"
              alt="DevAtlas Logo"
              width={160}
              height={45}
              className="brightness-0 invert transition-all group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {/* De ce DevAtlas - Dropdown */}
            <div 
              className="relative group"
            >
              <button 
                onMouseEnter={() => setIsDropdownOpen(true)}
                className="px-6 py-3 text-gray-200 hover:text-white font-normal text-[15px] tracking-wide transition-all hover:bg-white/5 rounded-xl flex items-center space-x-2"
              >
                <span>De ce DevAtlas</span>
                <svg 
                  className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
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
                  className="absolute top-full left-0 mt-3 w-64 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <Link 
                    href="/despre/povestea-noastra"
                    className="block px-6 py-4 text-gray-200 hover:text-white hover:bg-white/10 transition-all border-b border-white/5"
                  >
                    <div className="font-medium text-[15px]">Povestea Noastră</div>
                    <div className="text-xs text-gray-400 mt-1">Cum a început totul</div>
                  </Link>
                  <Link 
                    href="/despre/echipa-noastra"
                    className="block px-6 py-4 text-gray-200 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <div className="font-medium text-[15px]">Echipa Noastră</div>
                    <div className="text-xs text-gray-400 mt-1">Oamenii din spatele proiectului</div>
                  </Link>
                </div>
              )}
            </div>

            {/* Cursuri */}
            <Link
              href="/cursuri"
              className="px-6 py-3 text-gray-200 hover:text-white font-normal text-[15px] tracking-wide transition-all hover:bg-white/5 rounded-xl"
            >
              Cursuri
            </Link>

            {/* Contact */}
            <Link
              href="/contact"
              className="px-6 py-3 text-gray-200 hover:text-white font-normal text-[15px] tracking-wide transition-all hover:bg-white/5 rounded-xl"
            >
              Contact
            </Link>
          </div>

          {/* Sign In Button (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl hover:bg-white/5 transition-all"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            <Link
              href="/auth/signin"
              className="px-8 py-3 bg-white text-black font-medium text-[15px] rounded-xl transition-all transform hover:scale-[1.02] hover:bg-gray-100"
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-white/10">
            <div className="flex flex-col space-y-1">
              {/* De ce DevAtlas - Mobile */}
              <div className="px-4 py-2 text-gray-500 text-xs font-medium uppercase tracking-wider">
                De ce DevAtlas
              </div>
              <Link
                href="/despre/povestea-noastra"
                className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-6 py-3 rounded-xl"
                onClick={() => setIsMenuOpen(false)}
              >
                Povestea Noastră
              </Link>
              <Link
                href="/despre/echipa-noastra"
                className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-6 py-3 rounded-xl"
                onClick={() => setIsMenuOpen(false)}
              >
                Echipa Noastră
              </Link>
              
              {/* Other Links */}
              <Link
                href="/cursuri"
                className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-4 py-3 rounded-xl mt-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Cursuri
              </Link>
              <Link
                href="/contact"
                className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-4 py-3 rounded-xl"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              
              <Link
                href="/auth/signin"
                className="mx-4 mt-4 px-8 py-3 bg-white text-black font-medium rounded-xl transition-all text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Intră în cont
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
