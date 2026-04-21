"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import { useTheme } from "./ThemeProvider";

type AppShellProps = {
  children: React.ReactNode;
};

const dashboardPrefixes = ["/dashboad-administrator", "/dashboard-profesor", "/dashboard-elev", "/dashboard-profesor-management", "/dashboard-elev-management"];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { preferences } = useTheme();
  const showNavbar = !dashboardPrefixes.some((prefix) => pathname.startsWith(prefix));
  const contentPaddingClass = preferences.density === "compact" ? "pt-20 sm:pt-24" : preferences.density === "spacious" ? "pt-28 sm:pt-32" : "pt-24 sm:pt-28";

  return (
    <>
      {showNavbar ? <Navbar /> : null}
      <div className={showNavbar ? contentPaddingClass : ""}>{children}</div>
    </>
  );
}
