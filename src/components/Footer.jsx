import React from "react";
import { Clock3 } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-center sm:px-6 md:flex-row md:items-center md:justify-between md:text-left lg:px-8">
        <div className="flex items-center justify-center gap-2 md:justify-start">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10">
            <Clock3 className="h-4 w-4 text-emerald-300" />
          </div>

          <div>
            <p className="text-xs font-semibold text-white">
              WMIBC Punch
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
              Staff Attendance System
            </p>
          </div>
        </div>

        <p className="text-xs text-white/35">
          © {year} WMIBC. Internal staff use only.
        </p>
      </div>
    </footer>
  );
}
