import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Clock3,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

function readAttendanceUser() {
  try {
    return JSON.parse(localStorage.getItem("attendanceUser") || "{}");
  } catch {
    return {};
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(readAttendanceUser());

  useEffect(() => {
    const handleStorage = () => {
      setUser(readAttendanceUser());
    };

    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const navItems = useMemo(() => {
    if (!isAdmin) {
      return [
        {
          label: "Punch Status",
          to: "/punch-status",
        },
      ];
    }

    return [
      {
        label: "Punch",
        to: "/punch",
      },
      {
        label: "Punch Status",
        to: "/punch-status",
      },
      {
        label: "Edit Attendance",
        to: "/admin/attendance/edit",
      },
      {
        label: "Reports",
        to: "/attendance/report",
      },
    ];
  }, [isAdmin]);

  const handleLogout = () => {
    localStorage.removeItem("attendanceToken");
    localStorage.removeItem("attendanceUser");
    setMobileOpen(false);
    navigate("/", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    [
      "rounded-xl px-3 py-2 text-sm font-medium transition",
      isActive
        ? "bg-emerald-400/15 text-emerald-300"
        : "text-white/65 hover:bg-white/5 hover:text-white",
    ].join(" ");

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/punch"
          className="flex min-w-0 items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
            <Clock3 className="h-5 w-5 text-emerald-300" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              WMIBC Punch
            </p>
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-white/35">
              Attendance Portal
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            {isAdmin ? (
              <ShieldCheck className="h-4 w-4 text-amber-300" />
            ) : (
              <UserRound className="h-4 w-4 text-sky-300" />
            )}

            <div className="max-w-40">
              <p className="truncate text-xs font-semibold text-white">
                {user?.name || "Staff"}
              </p>
              <p className="truncate text-[10px] capitalize text-white/40">
                {user?.role || "staff"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/15"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white lg:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-slate-950 px-4 py-4 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            <div className="mb-2 rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold text-white">
                {user?.name || "Staff"}
              </p>
              <p className="mt-0.5 text-xs capitalize text-white/40">
                {user?.role || "staff"}
              </p>
            </div>

            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={linkClass}
              >
                {item.label}
              </NavLink>
            ))}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm font-semibold text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
