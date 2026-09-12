import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock3,
  LogIn,
  LogOut,
  UtensilsCrossed,
  Coffee,
  Loader2,
  Calendar,
  Activity,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const actionConfig = [
  {
    label: "Check In",
    value: "check_in",
    icon: LogIn,
    cardClass:
      "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 focus-visible:ring-emerald-500/50",
    iconClass: "bg-emerald-500/20 text-emerald-400",
    badgeClass: "bg-emerald-500/20 text-emerald-300",
  },
  {
    label: "Break",
    value: "lunch_out",
    icon: UtensilsCrossed,
    cardClass:
      "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 focus-visible:ring-amber-500/50",
    iconClass: "bg-amber-500/20 text-amber-400",
    badgeClass: "bg-amber-500/20 text-amber-300",
  },
  {
    label: "Break End",
    value: "lunch_in",
    icon: Coffee,
    cardClass:
      "border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 focus-visible:ring-sky-500/50",
    iconClass: "bg-sky-500/20 text-sky-400",
    badgeClass: "bg-sky-500/20 text-sky-300",
  },
  {
    label: "Check Out",
    value: "check_out",
    icon: LogOut,
    cardClass:
      "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 focus-visible:ring-rose-500/50",
    iconClass: "bg-rose-500/20 text-rose-400",
    badgeClass: "bg-rose-500/20 text-rose-300",
  },
];

const DEFAULT_TIMEZONE = "Asia/Qatar";
const API_BASE = `${
  import.meta.env.VITE_API_BASE_URL ||
  "https://wmibcstaff-server.vercel.app"
}/api`;

function getUserTimezone(user) {
  if (user?.country === "Bangladesh") return "Asia/Dhaka";
  return DEFAULT_TIMEZONE;
}

function getTimezoneLabel(user) {
  if (user?.country === "Bangladesh") return "Bangladesh Time";
  return "Qatar Time";
}

function getStatusGif(statusValue) {
  if (statusValue === "check_in") return "/checkin.gif";
  if (statusValue === "lunch_out") return "/break.gif";
  if (statusValue === "lunch_in") return "/break-end.webp";
  if (statusValue === "check_out") return "/checkout.gif";
  return "/checkin.gif";
}

export default function AttendancePage() {
  const navigate = useNavigate();

  const [loadingAction, setLoadingAction] = useState(null);
  const [time, setTime] = useState(new Date());
  const [status, setStatus] = useState(null);
  const [todayActions, setTodayActions] = useState([]);
  const [todayHistory, setTodayHistory] = useState([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("attendanceUser") || "null");
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("attendanceToken") || "");

  const userTimezone = getUserTimezone(user);
  const timezoneLabel = getTimezoneLabel(user);
  const statusGif = getStatusGif(status?.value);

  const logoutAndRedirect = useCallback(() => {
    localStorage.removeItem("attendanceToken");
    localStorage.removeItem("attendanceUser");
    setToken("");
    setUser(null);
    navigate("/", { replace: true });
  }, [navigate]);

  const handleUnauthorized = useCallback(
    (res) => {
      if (res.status === 401 || res.status === 403) {
        logoutAndRedirect();
        return true;
      }

      return false;
    },
    [logoutAndRedirect],
  );

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("attendanceToken");
      const storedUser = JSON.parse(
        localStorage.getItem("attendanceUser") || "null",
      );

      if (!storedToken) {
        logoutAndRedirect();
        return;
      }

      setToken(storedToken);
      setUser(storedUser);
    } catch {
      logoutAndRedirect();
    }
  }, [logoutAndRedirect]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function formatActionLabel(action) {
    if (!action) return "";
    if (action === "lunch_out") return "Break";
    if (action === "lunch_in") return "Break End";

    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function getActionMeta(action) {
    return actionConfig.find((item) => item.value === action);
  }

  function formatTime(value) {
    if (!value) return "-";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleTimeString("en-US", {
      timeZone: userTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatDate(value) {
    if (!value) return "";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";

    return d.toLocaleDateString("en-US", {
      timeZone: userTimezone,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const showSuccess = (text) => toast.success(text);
  const showError = (text) => toast.error(text);

  useEffect(() => {
    const fetchTodayAttendance = async () => {
      if (!token) return;

      try {
        setLoadingToday(true);

        const res = await fetch(`${API_BASE}/attendance/today`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (handleUnauthorized(res)) return;

        const data = await res.json();

        if (!res.ok) {
          showError(data.message || "Failed to load attendance");
          return;
        }

        const history = Array.isArray(data?.history) ? data.history : [];
        const actions = history.map((item) => item?.action).filter(Boolean);

        setTodayHistory(history);
        setTodayActions(actions);

        if (history.length > 0) {
          const last = history[history.length - 1];
          const meta = getActionMeta(last?.action);

          setStatus({
            action:
              meta?.label || last?.label || formatActionLabel(last?.action),
            time: formatTime(last?.createdAt),
            value: last?.action,
          });
        }
      } catch {
        showError("Failed to load today's attendance");
      } finally {
        setLoadingToday(false);
      }
    };

    fetchTodayAttendance();
  }, [token, userTimezone, handleUnauthorized]);

  const actionState = useMemo(() => {
    const hasCheckIn = todayActions.includes("check_in");
    const hasBreak = todayActions.includes("lunch_out");
    const hasBreakEnd = todayActions.includes("lunch_in");
    const hasCheckOut = todayActions.includes("check_out");

    return {
      check_in: {
        disabled: hasCheckIn,
        reason: hasCheckIn ? "Already checked in today" : "",
      },
      lunch_out: {
        disabled: !hasCheckIn || hasBreak || hasCheckOut,
        reason: !hasCheckIn
          ? "Check In first"
          : hasBreak
            ? "Break already started"
            : hasCheckOut
              ? "Already checked out"
              : "",
      },
      lunch_in: {
        disabled: !hasBreak || hasBreakEnd || hasCheckOut,
        reason: !hasBreak
          ? "Break first"
          : hasBreakEnd
            ? "Break already ended"
            : hasCheckOut
              ? "Already checked out"
              : "",
      },
      check_out: {
        disabled: !hasCheckIn || hasCheckOut,
        reason: !hasCheckIn
          ? "Check In first"
          : hasCheckOut
            ? "Already checked out"
            : "",
      },
    };
  }, [todayActions]);

  const openConfirmModal = (action) => {
    if (actionState?.[action]?.disabled) {
      showError(actionState[action].reason);
      return;
    }

    setConfirmAction(action);
  };

  const closeConfirmModal = () => {
    if (loadingAction) return;
    setConfirmAction(null);
  };

  const handleAttendance = async (action) => {
    if (!token) {
      logoutAndRedirect();
      return;
    }

    if (actionState?.[action]?.disabled) {
      showError(actionState[action].reason);
      return;
    }

    try {
      setLoadingAction(action);

      const res = await fetch(`${API_BASE}/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (handleUnauthorized(res)) return;

      const data = await res.json();

      if (!res.ok) {
        showError(data.message || "Failed");
        return;
      }

      const meta = getActionMeta(action);
      const label =
        meta?.label || data?.record?.label || formatActionLabel(action);
      const createdAt = data?.record?.createdAt || new Date().toISOString();

      setStatus({
        action: label,
        time: formatTime(createdAt),
        value: action,
      });

      setTodayActions((prev) =>
        prev.includes(action) ? prev : [...prev, action],
      );

      setTodayHistory((prev) => [...prev, { action, label, createdAt }]);

      setConfirmAction(null);
      showSuccess(`${label} recorded successfully`);
    } catch {
      showError("Server error");
    } finally {
      setLoadingAction(null);
    }
  };

  const confirmMeta = confirmAction ? getActionMeta(confirmAction) : null;
  const ConfirmIcon = confirmMeta?.icon;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 antialiased selection:bg-blue-500/30">
      <Toaster position="top-center" />

      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-confirm-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-3">
                {ConfirmIcon && (
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      confirmMeta?.iconClass || "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    <ConfirmIcon className="h-5 w-5" />
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
                    Confirm Attendance
                  </p>
                  <h2
                    id="attendance-confirm-title"
                    className="mt-0.5 text-lg font-bold text-white"
                  >
                    {confirmMeta?.label || formatActionLabel(confirmAction)}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={!!loadingAction}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <p className="text-sm leading-6 text-slate-300">
                Are you sure you want to record{" "}
                <span className="font-semibold text-white">
                  {confirmMeta?.label || formatActionLabel(confirmAction)}
                </span>{" "}
                for today?
              </p>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-400">Current time</span>
                  <span className="font-semibold tabular-nums text-slate-100">
                    {time.toLocaleTimeString("en-US", {
                      timeZone: userTimezone,
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-400">Timezone</span>
                  <span className="font-semibold text-slate-100">
                    {timezoneLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={!!loadingAction}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleAttendance(confirmAction)}
                disabled={!!loadingAction}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingAction === confirmAction && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                  WMIBC Punch
                </span>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                  Hi, {user?.name || "User"} 👋
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Record your attendance milestones.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={logoutAndRedirect}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-blue-400 shadow-inner">
                  <Clock3 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                  {timezoneLabel}
                </span>

                <p className="mt-1.5 text-xl font-bold tracking-wide text-white tabular-nums">
                  {time.toLocaleTimeString("en-US", {
                    timeZone: userTimezone,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  Today
                </span>

                <p className="mt-1.5 text-base font-semibold text-slate-200">
                  {formatDate(time) || "Loading..."}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-yellow-400/40">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${statusGif})` }}
            />

            <div className="relative z-10 flex h-48 items-start justify-end p-4 sm:h-64 sm:p-6">
              <div className="max-w-xs rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-left shadow-2xl backdrop-blur-lg sm:max-w-sm sm:px-5 sm:py-4">
                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-yellow-300">
                  LAST STATUS
                </span>

                <h2 className="mt-1 text-xl font-extrabold leading-tight text-white sm:text-2xl">
                  {loadingToday ? (
                    <span className="text-lg text-yellow-200">Updating...</span>
                  ) : status ? (
                    status.action
                  ) : (
                    "No Action Logged"
                  )}
                </h2>

                {status?.action && (
                  <span className="mt-1.5 inline-block rounded-full border border-yellow-300/30 bg-yellow-400/10 px-2.5 py-0.5 text-xs font-bold text-yellow-100">
                    {status.action}
                  </span>
                )}

                <p className="mt-2 text-xs font-medium text-slate-300">
                  {status
                    ? `Recorded at ${status.time}`
                    : "Waiting for first attendance"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {actionConfig.map((item, index) => {
              const Icon = item.icon;
              const isLoading = loadingAction === item.value;
              const isCompleted = todayActions.includes(item.value);
              const isDisabled =
                !!loadingAction ||
                loadingToday ||
                actionState?.[item.value]?.disabled;

              return (
                <button
                  key={item.value}
                  onClick={() => openConfirmModal(item.value)}
                  disabled={isDisabled}
                  className={`group relative flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left outline-none transition-all duration-200 focus-visible:ring-2 active:scale-[0.99] ${
                    isCompleted
                      ? "cursor-not-allowed border-slate-800 bg-slate-900/30 opacity-45"
                      : isDisabled
                        ? "cursor-not-allowed border-slate-900 bg-slate-900/20 opacity-40"
                        : `${item.cardClass} shadow-xs hover:translate-x-0.5`
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isCompleted
                          ? "bg-slate-800 text-slate-500"
                          : isDisabled
                            ? "bg-slate-900 text-slate-600"
                            : item.iconClass
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">
                          0{index + 1}
                        </span>

                        <p className="text-sm font-semibold tracking-tight text-slate-200">
                          Attendance Action
                        </p>
                      </div>

                      <p
                        className={`mt-0.5 text-xl font-bold tracking-wide ${
                          isCompleted ? "text-slate-500" : "text-white"
                        }`}
                      >
                        {item.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isCompleted
                          ? "border-slate-700 bg-slate-800 text-slate-400"
                          : isDisabled
                            ? "border-slate-800 bg-slate-950 text-slate-500"
                            : `${item.badgeClass} border-current/10`
                      }`}
                    >
                      {isCompleted ? "Done" : "Tap"}
                    </span>

                    {!isCompleted &&
                      isDisabled &&
                      actionState?.[item.value]?.reason && (
                        <span className="max-w-30 truncate text-right text-[10px] text-slate-500">
                          {actionState[item.value].reason}
                        </span>
                      )}

                    {!isDisabled && (
                      <span className="text-[10px] font-medium text-slate-400 transition-colors group-hover:text-current">
                        Ready
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Activity className="h-3.5 w-3.5 text-slate-500" />
                Today's Timeline
              </h3>

              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">
                {todayHistory.length} Record
                {todayHistory.length !== 1 ? "s" : ""}
              </span>
            </div>

            {todayHistory.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-500">
                  No events logged for this schedule window.
                </p>
              </div>
            ) : (
              <div className="subtle-scrollbar max-h-60 space-y-2 overflow-y-auto pr-1">
                {todayHistory.map((item, index) => {
                  const meta = getActionMeta(item?.action);

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/50 bg-slate-950/50 px-4 py-3 transition-colors hover:border-slate-800"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200">
                          {item?.label ||
                            meta?.label ||
                            formatActionLabel(item?.action)}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-400">
                        {formatTime(item?.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}