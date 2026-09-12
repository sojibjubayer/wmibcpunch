import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Clock3,
  Loader2,
  UserCheck,
  Coffee,
  LogOut,
  XCircle,
  RefreshCcw,
  CalendarDays,
  Users,
  Activity,
  X,
} from "lucide-react";

const API_BASE = `${
  import.meta.env.VITE_API_BASE_URL ||
  "https://wmibcstaff-server.vercel.app"
}/api`;
const QATAR_TIMEZONE = "Asia/Qatar";
const HIDDEN_STAFF_NAMES = new Set(["tarikul"]);
const STATUS_DISPLAY_ORDER = {
  Working: 0,
  "On Break": 1,
  Absent: 2,
  "Weekly Off": 3,
  "Checked Out": 4,
  Leave: 5,
};

const legacyEmployeeDayOff = {
  Adil: "Sat",
  Saiful: "Sat",
  Sumaiya: "Sun",
  Nizam: "Mon",
  Neshat: "Tue",
  Sandesh: "Tue",
  Imtiaz: "Sun",
  Razzak: "Thu",
  Tarikul: "Wed",
  Ibrahim: "Fri",
  Shapna: "Fri",
  Nusrat: "Fri",
  Jasmin: "Fri",
  Israt: "Sun",
  Siam: "Mon",
  Mushfiqur: "Tue",
  Raju: "Thu",
};

function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: QATAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function formatTime(value) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleTimeString("en-US", {
    timeZone: QATAR_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getDayName(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: QATAR_TIMEZONE,
  });
}

function normalizeDayOffSchedule(schedule) {
  if (!schedule) return null;

  const dayName = schedule.dayName || schedule.dayOff || schedule.weekday;
  const effectiveFrom = schedule.effectiveFrom || schedule.startDate;
  if (!dayName || !effectiveFrom) return null;

  return {
    ...schedule,
    dayName,
    effectiveFrom: String(effectiveFrom).slice(0, 10),
  };
}

function isWeeklyOffDate(item, schedules = []) {
  if (!item?.date) return false;

  const applicableSchedule = schedules
    .map(normalizeDayOffSchedule)
    .filter(Boolean)
    .filter((schedule) => schedule.effectiveFrom <= item.date)
    .sort((first, second) =>
      first.effectiveFrom.localeCompare(second.effectiveFrom),
    )
    .at(-1);

  const activeDayOff =
    applicableSchedule?.dayName ||
    legacyEmployeeDayOff[String(item.userName || "").trim()] ||
    "";

  return activeDayOff === getDayName(item.date);
}

function getStatus(item, weeklyOff = false) {
  if (weeklyOff) return "Weekly Off";
  if (item?.isLeave) return "Leave";
  if (!item?.checkIn) return "Absent";
  if (item?.checkOut) return "Checked Out";
  if (item?.lunchOut && !item?.lunchIn) return "On Break";
  return "Working";
}

function getStatusStyle(status) {
  if (status === "Weekly Off") {
    return {
      card: "border-cyan-400/25 bg-gradient-to-br from-cyan-500/15 via-slate-900/95 to-slate-950",
      glow: "shadow-[0_0_30px_rgba(34,211,238,0.12)]",
      badge: "bg-cyan-400 text-slate-950",
      iconBox: "bg-cyan-400/15 text-cyan-300",
      dot: "bg-cyan-400",
      activeBox: "border-cyan-400/45 bg-cyan-400/12 text-cyan-300",
      icon: <CalendarDays className="h-5 w-5" />,
      label: "Weekly Off",
    };
  }

  if (status === "Leave") {
    return {
      card: "border-violet-400/25 bg-gradient-to-br from-violet-500/15 via-slate-900/95 to-slate-950",
      glow: "shadow-[0_0_30px_rgba(167,139,250,0.12)]",
      badge: "bg-violet-400 text-slate-950",
      iconBox: "bg-violet-400/15 text-violet-300",
      dot: "bg-violet-400",
      activeBox: "border-violet-400/45 bg-violet-400/12 text-violet-300",
      icon: <CalendarDays className="h-5 w-5" />,
      label: "Leave",
    };
  }

  if (status === "Working") {
    return {
      card: "border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 via-slate-900/95 to-slate-950",
      glow: "shadow-[0_0_30px_rgba(16,185,129,0.12)]",
      badge: "bg-emerald-400 text-slate-950",
      iconBox: "bg-emerald-400/15 text-emerald-300",
      dot: "bg-emerald-400",
      activeBox: "border-sky-400/45 bg-sky-400/12 text-sky-300",
      icon: <UserCheck className="h-5 w-5" />,
      label: "Working",
    };
  }

  if (status === "On Break") {
    return {
      card: "border-amber-400/25 bg-gradient-to-br from-amber-500/15 via-slate-900/95 to-slate-950",
      glow: "shadow-[0_0_30px_rgba(251,191,36,0.12)]",
      badge: "bg-amber-400 text-slate-950",
      iconBox: "bg-amber-400/15 text-amber-300",
      dot: "bg-amber-400",
      activeBox: "border-amber-400/45 bg-amber-400/12 text-amber-300",
      icon: <Coffee className="h-5 w-5" />,
      label: "On Break",
    };
  }

  if (status === "Checked Out") {
    return {
      card: "border-sky-400/25 bg-gradient-to-br from-sky-500/15 via-slate-900/95 to-slate-950",
      glow: "shadow-[0_0_30px_rgba(56,189,248,0.12)]",
      badge: "bg-sky-400 text-slate-950",
      iconBox: "bg-sky-400/15 text-sky-300",
      dot: "bg-sky-400",
      activeBox: "border-sky-400/45 bg-sky-400/12 text-sky-300",
      icon: <LogOut className="h-5 w-5" />,
      label: "Checked Out",
    };
  }

  return {
    card: "border-red-400/20 bg-gradient-to-br from-red-500/10 via-slate-900/95 to-slate-950",
    glow: "shadow-[0_0_30px_rgba(248,113,113,0.10)]",
    badge: "bg-red-400 text-white",
    iconBox: "bg-red-400/15 text-red-300",
    dot: "bg-red-400",
    activeBox: "border-red-400/45 bg-red-400/12 text-red-300",
    icon: <XCircle className="h-5 w-5" />,
    label: "Absent",
  };
}

function ActionTimeBox({ label, time, active, activeClass }) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2.5 transition ${
        active ? activeClass : "border-white/10 bg-black/25 text-white/75"
      }`}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>

      <p className="mt-1.5 text-base font-black leading-none">{time}</p>
    </div>
  );
}

function SummaryBox({ label, value, icon, names = [] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-3.5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
          {label}
        </p>

        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-black text-white">{value}</p>

      {names.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-2.5">
          <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
            {names.map((name) => (
              <span
                key={`${label}-${name}`}
                className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-semibold leading-none text-white/70"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({ item, weeklyOff, personal = false }) {
  const status = getStatus(item, weeklyOff);
  const style = getStatusStyle(status);

  return (
    <div
      className={`group relative w-full overflow-hidden rounded-[26px] border backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
        personal ? "p-5 sm:p-6" : "p-4"
      } ${style.card} ${style.glow}`}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-28 w-28 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
            />

            <p className="truncate text-xl font-black text-white">
              {item.userName || "Unknown Staff"}
            </p>
          </div>

          <div className="mt-1.5 text-xs font-semibold text-white/45">
            <span>{item.date || getTodayDate()}</span>
            <span className="ml-2 text-white/30">
              {getDayName(item.date || getTodayDate())}
            </span>
          </div>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconBox}`}
        >
          {style.icon}
        </div>
      </div>

      <div
        className={`relative mt-4 grid grid-cols-2 gap-2.5 ${
          personal ? "md:grid-cols-4" : ""
        }`}
      >
        <ActionTimeBox
          label="Check In"
          time={formatTime(item.checkIn)}
          active={!!item?.checkIn}
          activeClass={style.activeBox}
        />

        <ActionTimeBox
          label="Break"
          time={formatTime(item.lunchOut)}
          active={!!item?.lunchOut}
          activeClass={style.activeBox}
        />

        <ActionTimeBox
          label="Break End"
          time={formatTime(item.lunchIn)}
          active={!!item?.lunchIn}
          activeClass={style.activeBox}
        />

        <ActionTimeBox
          label="Check Out"
          time={formatTime(item.checkOut)}
          active={!!item?.checkOut}
          activeClass={style.activeBox}
        />
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-4 py-2 text-xs font-black ${style.badge}`}
        >
          {style.label}
        </span>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-white/45">
          Current
        </span>
      </div>
    </div>
  );
}

function canViewAllStaffStatus(user) {
  const role = String(
    user?.role ||
      user?.userRole ||
      user?.type ||
      user?.accountType ||
      "",
  )
    .trim()
    .toLowerCase();

  return (
    user?.isAdmin === true ||
    role === "admin" ||
    role === "administrator"
  );
}

export default function CurrentStatus() {
  const [records, setRecords] = useState([]);
  const [weeklySchedulesByUser, setWeeklySchedulesByUser] = useState({});
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showMyAttendance, setShowMyAttendance] = useState(false);
  const [reportMonth, setReportMonth] = useState(() =>
    getTodayDate().slice(0, 7),
  );
  const [reportRecords, setReportRecords] = useState([]);
  const [reportSchedules, setReportSchedules] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("attendanceUser") || "null");
    } catch {
      return null;
    }
  });
  const [token] = useState(() => localStorage.getItem("attendanceToken") || "");

  const loggedInUserId = getUserId(user);
  const loggedInUserName = getUserName(user);
  const canViewAllStaff = canViewAllStaffStatus(user);

  const fetchCurrentStatus = async () => {
    try {
      setLoading(true);
      setMessage("");

      const selectedMonth = selectedDate.slice(0, 7);

      // The Attendance backend scopes non-admin users to their own records.
      // Admin users receive the full staff set.
      const res = await fetch(
        `${API_BASE}/attendance?monthly=true&month=${encodeURIComponent(
          selectedMonth,
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      let data = [];

      try {
        data = await res.json();
      } catch {
        data = [];
      }

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("attendanceToken");
          localStorage.removeItem("attendanceUser");
          window.location.replace("/");
          return;
        }

        setRecords([]);
        setWeeklySchedulesByUser({});
        setMessage(data?.message || "Failed to load current status.");
        return;
      }

      const monthRecords = Array.isArray(data) ? data : [];
      const staffMap = new Map();
      const selectedDateMap = new Map();

      monthRecords.forEach((item) => {
        const normalizedName = String(item?.userName || "")
          .trim()
          .toLowerCase();

        if (HIDDEN_STAFF_NAMES.has(normalizedName)) return;

        const key = String(item?.userId || item?.userName || "").trim();
        if (!key) return;

        if (!staffMap.has(key)) {
          staffMap.set(key, {
            userId: item.userId,
            userName: item.userName,
          });
        }

        if (String(item?.date).slice(0, 10) === selectedDate) {
          selectedDateMap.set(key, item);
        }
      });

      const staffRows = Array.from(staffMap.entries()).map(([key, staff]) =>
        selectedDateMap.get(key)
          ? selectedDateMap.get(key)
          : {
              ...staff,
              date: selectedDate,
              checkIn: null,
              lunchOut: null,
              lunchIn: null,
              checkOut: null,
              isLeave: false,
            },
      );

      const scheduleEntries = await Promise.all(
        staffRows.map(async (item) => {
          const userId = String(item?.userId || "").trim();
          if (!userId) return [String(item?.userName || ""), []];

          try {
            const scheduleResponse = await fetch(
              `${API_BASE}/attendance/weekly-day-off?userId=${encodeURIComponent(
                userId,
              )}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              },
            );
            const scheduleData = await scheduleResponse.json().catch(() => []);
            const schedules = scheduleResponse.ok
              ? Array.isArray(scheduleData)
                ? scheduleData
                : Array.isArray(scheduleData?.schedules)
                  ? scheduleData.schedules
                  : []
              : [];

            return [
              userId,
              schedules.map(normalizeDayOffSchedule).filter(Boolean),
            ];
          } catch {
            return [userId, []];
          }
        }),
      );

      setWeeklySchedulesByUser(Object.fromEntries(scheduleEntries));
      setRecords(
        staffRows.sort((first, second) =>
          String(first.userName || "").localeCompare(
            String(second.userName || ""),
          ),
        ),
      );
    } catch (error) {
      console.error("Current status fetch error:", error);
      setRecords([]);
      setWeeklySchedulesByUser({});
      setMessage("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentStatus();
  }, [selectedDate, canViewAllStaff, loggedInUserId, loggedInUserName]);

  const allStatusRecords = useMemo(() => {
    const mapped = records.map((item) => {
      const scheduleKey = String(item?.userId || item?.userName || "").trim();
      const weeklyOff = isWeeklyOffDate(
        item,
        weeklySchedulesByUser[scheduleKey] || [],
      );

      return {
        ...item,
        weeklyOff,
        status: getStatus(item, weeklyOff),
      };
    });

    return [...mapped].sort((first, second) => {
      const statusDifference =
        (STATUS_DISPLAY_ORDER[first.status] ?? 99) -
        (STATUS_DISPLAY_ORDER[second.status] ?? 99);

      if (statusDifference !== 0) return statusDifference;

      return String(first.userName || "").localeCompare(
        String(second.userName || ""),
      );
    });
  }, [records, weeklySchedulesByUser]);

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase().trim();

    const permissionFiltered = canViewAllStaff
      ? allStatusRecords
      : allStatusRecords.filter((item) => {
          const itemUserId = String(item?.userId || "").trim();
          const normalizedName = String(item?.userName || "")
            .trim()
            .toLowerCase();

          return loggedInUserId
            ? itemUserId === loggedInUserId
            : normalizedName === loggedInUserName.toLowerCase();
        });

    const visibleRecords =
      canViewAllStaff && q
        ? permissionFiltered.filter(
            (item) =>
              item.userName?.toLowerCase().includes(q) ||
              item.status?.toLowerCase().includes(q),
          )
        : permissionFiltered;

    return visibleRecords;
  }, [
    allStatusRecords,
    search,
    canViewAllStaff,
    loggedInUserId,
    loggedInUserName,
  ]);

  // Admin sees the complete staff summary.
  // Normal staff only see their own attendance data.
  const summaryRecords = filteredRecords;

  const workingCount = summaryRecords.filter(
    (item) => item.status === "Working",
  ).length;

  const breakCount = summaryRecords.filter(
    (item) => item.status === "On Break",
  ).length;

  const checkedOutCount = summaryRecords.filter(
    (item) => item.status === "Checked Out",
  ).length;

  const weeklyOffCount = summaryRecords.filter(
    (item) => item.status === "Weekly Off",
  ).length;

  const absentCount = summaryRecords.filter(
    (item) => item.status === "Absent",
  ).length;

  const getNamesByStatus = (status) =>
    summaryRecords
      .filter((item) => item.status === status)
      .map((item) => String(item.userName || "").trim())
      .filter(Boolean);

  const breakNames = [];
  const checkedOutNames = [];
  const weeklyOffNames = [];
  const absentNames = [];

  useEffect(() => {
    if (!showMyAttendance) return undefined;

    const userId = getUserId(user);
    if (!userId) {
      setReportRecords([]);
      setReportSchedules([]);
      setReportError("Logged-in user information was not found.");
      return undefined;
    }

    const controller = new AbortController();

    const loadMyAttendance = async () => {
      try {
        setReportLoading(true);
        setReportError("");

        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const [recordsResponse, schedulesResponse] = await Promise.all([
          fetch(
            `${API_BASE}/attendance?monthly=true&month=${encodeURIComponent(
              reportMonth,
            )}&userId=${encodeURIComponent(userId)}`,
            { headers, signal: controller.signal },
          ),
          fetch(
            `${API_BASE}/attendance/weekly-day-off?userId=${encodeURIComponent(
              userId,
            )}`,
            { headers, signal: controller.signal },
          ),
        ]);

        const [recordsData, schedulesData] = await Promise.all([
          recordsResponse.json().catch(() => []),
          schedulesResponse.json().catch(() => []),
        ]);

        if (!recordsResponse.ok) {
          throw new Error(
            recordsData?.message || "Failed to load monthly attendance.",
          );
        }

        if (!schedulesResponse.ok) {
          throw new Error(
            schedulesData?.message || "Failed to load weekly day-off schedule.",
          );
        }

        setReportRecords(Array.isArray(recordsData) ? recordsData : []);
        setReportSchedules(
          (Array.isArray(schedulesData)
            ? schedulesData
            : Array.isArray(schedulesData?.schedules)
              ? schedulesData.schedules
              : []
          )
            .map(normalizeDayOffSchedule)
            .filter(Boolean),
        );
      } catch (error) {
        if (error?.name === "AbortError") return;

        console.error("My attendance report error:", error);
        setReportRecords([]);
        setReportSchedules([]);
        setReportError(error?.message || "Failed to load monthly attendance.");
      } finally {
        if (!controller.signal.aborted) setReportLoading(false);
      }
    };

    loadMyAttendance();
    return () => controller.abort();
  }, [showMyAttendance, reportMonth, token, user]);

  const reportRows = useMemo(() => {
    const today = getTodayDate();
    const totalDays = getDaysInMonth(reportMonth);
    const recordMap = new Map(
      reportRecords
        .filter((item) => item?.date)
        .map((item) => [String(item.date).slice(0, 10), item]),
    );

    return Array.from({ length: totalDays }, (_, index) => {
      const date = `${reportMonth}-${String(index + 1).padStart(2, "0")}`;
      const record = recordMap.get(date) || {
        date,
        userId: getUserId(user),
        userName: getUserName(user),
      };
      const weeklyOff = isWeeklyOffDate(record, reportSchedules);
      const future = date > today;
      let status = "Absent";

      if (future) status = "Upcoming";
      else if (weeklyOff)
        status = record.checkIn ? "Weekly Off / Worked" : "Weekly Off";
      else if (record.isLeave) status = "Leave";
      else if (record.checkIn && record.checkOut) status = "Present";
      else if (record.checkIn) status = "In Progress";

      return {
        ...record,
        date,
        weeklyOff,
        future,
        status,
      };
    });
  }, [reportMonth, reportRecords, reportSchedules, user]);

  const reportSummary = useMemo(
    () =>
      reportRows.reduce(
        (summary, row) => {
          if (row.future) return summary;

          if (row.checkIn && row.checkOut && !row.isLeave) summary.present += 1;
          if (row.weeklyOff) summary.weeklyOff += 1;
          else if (row.isLeave) summary.leave += 1;
          else if (!row.checkIn) summary.absent += 1;

          return summary;
        },
        { present: 0, weeklyOff: 0, leave: 0, absent: 0 },
      ),
    [reportRows],
  );

  const handleAttendanceLogout = () => {
    localStorage.removeItem("attendanceToken");
    localStorage.removeItem("attendanceUser");
    window.location.replace("/");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 p-2.5 text-white sm:p-4 lg:p-5">
      {showMyAttendance && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="my-attendance-title"
        >
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-xl">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Monthly Report
                </p>
                <h2
                  id="my-attendance-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  My Attendance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {getUserName(user) || "Logged-in employee"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  aria-label="Attendance report month"
                  value={reportMonth}
                  onChange={(event) => {
                    if (event.target.value) setReportMonth(event.target.value);
                  }}
                  className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />

                <button
                  type="button"
                  onClick={() => setShowMyAttendance(false)}
                  className="rounded-md border border-slate-300 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close My Attendance"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {reportLoading ? (
                <div className="flex min-h-80 items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
                  Loading monthly attendance...
                </div>
              ) : reportError ? (
                <div className="flex min-h-80 items-center justify-center px-4 text-center">
                  <div>
                    <XCircle className="mx-auto h-10 w-10 text-red-500" />
                    <p className="mt-3 font-semibold text-slate-700">
                      {reportError}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Present", reportSummary.present, "text-emerald-700"],
                      ["Weekly Off", reportSummary.weeklyOff, "text-sky-700"],
                      ["Leave", reportSummary.leave, "text-violet-700"],
                      ["Absent", reportSummary.absent, "text-red-700"],
                    ].map(([label, value, valueClass]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="text-xs font-medium text-slate-500">
                          {label}
                        </p>
                        <p className={`mt-1 text-2xl font-bold ${valueClass}`}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-205 border-collapse text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-100 text-xs text-slate-600">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Day</th>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">
                              Check In
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              Lunch Out
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              Lunch In
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              Check Out
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {reportRows.map((row) => {
                            const statusClass = row.future
                              ? "border-slate-300 bg-slate-100 text-slate-500"
                              : row.weeklyOff
                                ? "border-sky-200 bg-sky-50 text-sky-700"
                                : row.isLeave
                                  ? "border-violet-200 bg-violet-50 text-violet-700"
                                  : row.status === "Present"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : row.status === "In Progress"
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-red-200 bg-red-50 text-red-700";

                            return (
                              <tr key={row.date} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-semibold text-slate-700">
                                  {Number(row.date.slice(-2))}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-slate-800">
                                    {row.date}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {getDayName(row.date)}
                                  </p>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
                                  >
                                    {row.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium tabular-nums text-slate-700">
                                  {formatTime(row.checkIn)}
                                </td>
                                <td className="px-4 py-3 font-medium tabular-nums text-slate-700">
                                  {formatTime(row.lunchOut)}
                                </td>
                                <td className="px-4 py-3 font-medium tabular-nums text-slate-700">
                                  {formatTime(row.lunchIn)}
                                </td>
                                <td className="px-4 py-3 font-medium tabular-nums text-slate-700">
                                  {formatTime(row.checkOut)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative min-h-screen overflow-hidden rounded-[28px] border border-white/10 bg-linear-to-br from-slate-950 via-slate-900 to-black p-3.5 shadow-2xl sm:p-5 lg:p-6">
        <div className="pointer-events-none absolute left-0 top-0 h-60 w-60 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                <Activity className="h-3.5 w-3.5" />
                Live Attendance
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Current Staff Status
              </h1>

              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/55 sm:text-sm">
                {canViewAllStaff
                  ? "Showing Check In, Break, Break End, and Check Out times for all staff."
                  : `Showing your own attendance status${
                      loggedInUserName ? ` — ${loggedInUserName}` : ""
                    }.`}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setShowMyAttendance(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-400/25 bg-sky-400/10 px-4 py-2.5 text-xs font-black text-sky-300 transition hover:bg-sky-400/20"
              >
                <CalendarDays className="h-4 w-4" />
                My Attendance
              </button>

              <button
                type="button"
                onClick={handleAttendanceLogout}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-2.5 text-xs font-black text-red-300 transition hover:bg-red-400/20"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>

              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white/70 backdrop-blur-xl">
                <CalendarDays className="h-4 w-4 text-sky-300" />
                {selectedDate}
              </div>

              <button
                onClick={fetchCurrentStatus}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300 disabled:opacity-60"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
            <SummaryBox
              label="Working"
              value={workingCount}
              icon={<UserCheck className="h-4.5 w-4.5 text-emerald-300" />}
            />

            <SummaryBox
              label="On Break"
              value={breakCount}
              names={breakNames}
              icon={<Coffee className="h-4.5 w-4.5 text-amber-300" />}
            />

            <SummaryBox
              label="Checked Out"
              value={checkedOutCount}
              names={checkedOutNames}
              icon={<LogOut className="h-4.5 w-4.5 text-sky-300" />}
            />

            <SummaryBox
              label="Weekly Off"
              value={weeklyOffCount}
              names={weeklyOffNames}
              icon={<CalendarDays className="h-4.5 w-4.5 text-cyan-300" />}
            />

            <SummaryBox
              label="Absent"
              value={absentCount}
              names={absentNames}
              icon={<XCircle className="h-4.5 w-4.5 text-red-300" />}
            />
          </div>

          {canViewAllStaff ? (
            <>
              <div className="mt-5 rounded-3xl border border-white/10 bg-white/6 p-3.5 backdrop-blur-xl">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />

                    <input
                      type="text"
                      placeholder="Search by name or status..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-white/35 focus:border-sky-400/50 focus:ring-4 focus:ring-sky-400/10"
                    />
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        if (e.target.value) setSelectedDate(e.target.value);
                      }}
                      className="rounded-2xl border border-white/10 bg-black/25 px-3.5 py-3 text-sm font-medium text-white outline-none transition focus:border-sky-400/50 focus:ring-4 focus:ring-sky-400/10"
                    />

                    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3.5 py-3 text-xs font-bold text-white/65">
                      <Users className="h-4 w-4 text-sky-300" />
                      Total Staff: {filteredRecords.length}
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3.5 py-3 text-xs font-bold text-white/65">
                      <Clock3 className="h-4 w-4 text-sky-300" />
                      Status
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                {loading ? (
                  <div className="flex min-h-65 items-center justify-center rounded-[26px] border border-white/10 bg-white/4">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-300" />
                      <p className="mt-3 text-sm font-medium text-white/55">
                        Loading current status...
                      </p>
                    </div>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="flex min-h-65 items-center justify-center rounded-[26px] border border-white/10 bg-white/4 px-4 text-center">
                    <div>
                      <XCircle className="mx-auto h-10 w-10 text-white/25" />
                      <p className="mt-3 text-base font-semibold text-white/70">
                        {message || "No attendance status found."}
                      </p>
                      <p className="mt-1 text-sm text-white/40">
                        Try another date or refresh the page.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {filteredRecords.map((item) => (
                      <StatusCard
                        key={item._id || item.userId || item.userName}
                        item={item}
                        weeklyOff={item.weeklyOff}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-5">
              <div className="rounded-3xl border border-white/10 bg-white/6 p-3.5 backdrop-blur-xl sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex items-center gap-2 text-sm font-black text-emerald-300">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
                      <UserCheck className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p>My Current Status</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-white/40">
                        {loggedInUserName || "Logged-in staff"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-sky-300" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        if (e.target.value) setSelectedDate(e.target.value);
                      }}
                      className="rounded-2xl border border-white/10 bg-black/25 px-3.5 py-2.5 text-sm font-medium text-white outline-none transition focus:border-sky-400/50 focus:ring-4 focus:ring-sky-400/10"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3">
                {loading ? (
                  <div className="flex min-h-48 items-center justify-center rounded-[26px] border border-white/10 bg-white/4">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-300" />
                      <p className="mt-3 text-sm font-medium text-white/55">
                        Loading your current status...
                      </p>
                    </div>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="flex min-h-48 items-center justify-center rounded-[26px] border border-white/10 bg-white/4 px-4 text-center">
                    <div>
                      <XCircle className="mx-auto h-10 w-10 text-white/25" />
                      <p className="mt-3 text-base font-semibold text-white/70">
                        {message || "No attendance status found."}
                      </p>
                      <p className="mt-1 text-sm text-white/40">
                        No attendance record was found for your account on this date.
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredRecords.slice(0, 1).map((item) => (
                    <StatusCard
                      key={item._id || item.userId || item.userName}
                      item={item}
                      weeklyOff={item.weeklyOff}
                      personal
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getUserId(user) {
  return String(user?.userId || user?._id || user?.id || "").trim();
}

function getUserName(user) {
  return String(user?.name || user?.userName || user?.username || "").trim();
}

function getDaysInMonth(monthValue) {
  const [year, month] = String(monthValue).split("-").map(Number);
  return new Date(year, month, 0).getDate();
}
