import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaRightToBracket,
  FaUserClock,
} from "react-icons/fa6";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://wmibcstaff-server.vercel.app";

export default function AttendanceLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const attendanceToken =
      localStorage.getItem("attendanceToken");

    if (attendanceToken) {
      navigate("/punch", {
        replace: true,
      });
    }
  }, [navigate]);

  async function handleLogin(event) {
    event.preventDefault();

    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();

    const cleanPassword = String(
      password || "",
    );

    if (!cleanEmail || !cleanPassword) {
      toast.error(
        "Enter your email and password",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/api/attendance/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to sign in",
        );
      }

      if (!data?.token) {
        throw new Error(
          "Attendance session token was not returned.",
        );
      }

      localStorage.setItem(
        "attendanceToken",
        data.token,
      );

      localStorage.setItem(
        "attendanceUser",
        JSON.stringify(
          data?.user || {},
        ),
      );

      toast.success(
        "Attendance login successful",
      );

      navigate("/punch", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Attendance login error:",
        error,
      );

      toast.error(
        error.message ||
          "Unable to sign in",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <Toaster position="top-center" />

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <section className="w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl">
          <div className="bg-linear-to-br from-zinc-950 via-zinc-900 to-emerald-950 px-6 py-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-2xl text-emerald-300">
              <FaUserClock />
            </div>

            <h1 className="mt-5 text-2xl font-black text-white">
              WMIBC Punch
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Staff Attendance System
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-4 p-6"
          >
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                Email
              </span>

              <div className="relative">
                <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />

                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="Enter email"
                  className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                Password
              </span>

              <div className="relative">
                <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Enter password"
                  className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 pl-11 pr-12 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <FaEyeSlash />
                  ) : (
                    <FaEye />
                  )}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
            >
              <FaRightToBracket />

              {loading
                ? "Signing in..."
                : "Sign In"}
            </button>


          </form>
        </section>
      </div>
    </div>
  );
}