"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("STUDENT");
  const router = useRouter();

  const isAuthenticated = Boolean(userEmail);
  const dashboardPath = userRole === "ADMIN" ? "/dashboad-administrator" : userRole === "INSTRUCTOR" ? "/dashboard-profesor" : "/cursuri";
  const settingsPath = "/cont/setari";
  const profileInitial = (userName?.trim().charAt(0) || userEmail?.charAt(0) || "U").toUpperCase();

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsUserDropdownOpen(false);
    setIsMenuOpen(false);
    router.push("/");
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setUserEmail(user?.email ?? null);
      setUserName((user?.user_metadata?.full_name as string | undefined) ?? null);
      setUserRole(((user?.user_metadata?.role as string | undefined) ?? "STUDENT").toUpperCase());
    };

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setUserEmail(user?.email ?? null);
      setUserName((user?.user_metadata?.full_name as string | undefined) ?? null);
      setUserRole(((user?.user_metadata?.role as string | undefined) ?? "STUDENT").toUpperCase());
    });

    return () => {
      subscription.unsubscribe();
    };
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
          <Link href="/" className="flex items-center group flex-shrink-0">
            <Image
              src="/logos/negru.fara.bg.png"
              alt="DevAtlas Logo"
              width={120}
              height={34}
              className="w-[120px] sm:w-[140px] md:w-[160px] h-auto brightness-0 invert transition-all group-hover:scale-105"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {/* De ce DevAtlas - Dropdown */}
            <div 
              className="relative group"
            >
              <button 
                onMouseEnter={() => setIsDropdownOpen(true)}
                className="px-4 md:px-6 py-2 md:py-3 text-gray-200 hover:text-white font-normal text-sm md:text-[15px] tracking-wide transition-all hover:bg-white/5 rounded-xl flex items-center space-x-2 min-h-[44px]"
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
              className="px-4 md:px-6 py-2 md:py-3 text-gray-200 hover:text-white font-normal text-sm md:text-[15px] tracking-wide transition-all hover:bg-white/5 rounded-xl min-h-[44px] flex items-center"
            >
              Cursuri
            </Link>

            {/* Contact */}
            <Link
              href="/contact"
              className="px-4 md:px-6 py-2 md:py-3 text-gray-200 hover:text-white font-normal text-sm md:text-[15px] tracking-wide transition-all hover:bg-white/5 rounded-xl min-h-[44px] flex items-center"
            >
              Contact
            </Link>
          </div>

          {/* Sign In Button (Desktop) */}
          <div className="hidden md:block">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen((prev) => !prev)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white transition hover:bg-white/10"
                  aria-label="Meniu profil"
                >
                  {profileInitial}
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
                    <div className="border-b border-white/10 px-4 py-3">
                      <p className="text-sm font-semibold text-white">{userName || "Cont DevAtlas"}</p>
                      <p className="mt-1 text-xs text-gray-400">{userEmail}</p>
                    </div>

                    <Link
                      href={dashboardPath}
                      className="block px-4 py-3 text-sm text-gray-200 transition hover:bg-white/10 hover:text-white"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href={settingsPath}
                      className="block px-4 py-3 text-sm text-gray-200 transition hover:bg-white/10 hover:text-white"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      Setări
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/elevi/signin"
                className="px-8 py-3 bg-white text-black font-medium text-[15px] rounded-xl transition-all transform hover:scale-[1.02] hover:bg-gray-100"
              >
                Intră în cont
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
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
          <div className="md:hidden py-4 sm:py-6 border-t border-white/10">
            <div className="flex flex-col space-y-1">
              {/* De ce DevAtlas - Mobile */}
              <div className="px-3 sm:px-4 py-2 text-gray-500 text-xs font-medium uppercase tracking-wider">
                De ce DevAtlas
              </div>
              <Link
                href="/despre/povestea-noastra"
                className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-4 sm:px-6 py-3 sm:py-4 rounded-xl min-h-[48px] flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Povestea Noastră
              </Link>
              <Link
                href="/despre/echipa-noastra"
                className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-4 sm:px-6 py-3 sm:py-4 rounded-xl min-h-[48px] flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Echipa Noastră
              </Link>
              
              {/* Other Links */}
              <Link
                href="/cursuri"
                className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-3 sm:px-4 py-3 sm:py-4 rounded-xl mt-2 min-h-[48px] flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Cursuri
              </Link>

              <Link
                href="/contact"
                className="text-gray-200 hover:text-white hover:bg-white/5 transition-all px-3 sm:px-4 py-3 sm:py-4 rounded-xl min-h-[48px] flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              
              <div className="mt-4 sm:mt-6">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <Link
                      href={dashboardPath}
                      className="block w-full px-4 sm:px-8 py-3 bg-white text-black font-medium text-sm rounded-xl transition-all text-center min-h-[44px]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href={settingsPath}
                      className="block w-full px-4 sm:px-8 py-3 border border-white/15 bg-white/5 text-white font-medium text-sm rounded-xl transition-all text-center min-h-[44px]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Setări
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 sm:px-8 py-3 border border-red-400/30 bg-red-500/10 text-red-200 font-medium text-sm rounded-xl transition-all text-center min-h-[44px]"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/auth/elevi/signin"
                    className="block w-full px-4 sm:px-8 py-3 bg-white text-black font-medium text-sm rounded-xl transition-all text-center min-h-[44px]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Intră în cont
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
