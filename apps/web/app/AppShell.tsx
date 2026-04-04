"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

type AppShellProps = {
  children: React.ReactNode;
};

const dashboardPrefixes = ["/dashboad-administrator", "/dashboard-profesor"];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const showNavbar = !dashboardPrefixes.some((prefix) => pathname.startsWith(prefix));

  return (
    <>
      {showNavbar ? <Navbar /> : null}
      <div className={showNavbar ? "pt-24 sm:pt-28" : ""}>{children}</div>
    </>
  );
}
