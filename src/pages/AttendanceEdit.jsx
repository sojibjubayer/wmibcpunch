import React, { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CalendarDays,
  Loader2,
  RotateCcw,
  Save,
  Search,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://wmibcstaff-server.vercel.app";

function getAttendanceToken() {
  return localStorage.getItem("attendanceToken") || "";
}

function getAttendanceHeaders() {
  const token = getAttendanceToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function handleAttendanceUnauthorized(response) {
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("attendanceToken");
    localStorage.removeItem("attendanceUser");
    window.location.replace("/");
    return true;
  }

  return false;
}

const monthOptions = [
  { value: "2026-01", label: "January 2026" },
  { value: "2026-02", label: "February 2026" },
  { value: "2026-03", label: "March 2026" },
  { value: "2026-04", label: "April 2026" },
  { value: "2026-05", label: "May 2026" },
  { value: "2026-06", label: "June 2026" },
  { value: "2026-07", label: "July 2026" },
  { value: "2026-08", label: "August 2026" },
  { value: "2026-09", label: "September 2026" },
  { value: "2026-10", label: "October 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "December 2026" },
];

const weekdayOptions = [
  { value: "Sun", label: "Sunday" },
  { value: "Mon", label: "Monday" },
  { value: "Tue", label: "Tuesday" },
  { value: "Wed", label: "Wednesday" },
  { value: "Thu", label: "Thursday" },
  { value: "Fri", label: "Friday" },
  { value: "Sat", label: "Saturday" },
];

// Used only until a staff member receives a saved weekly day-off schedule.
// New schedules are loaded from the backend and can change from an effective date.
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

function getCurrentQatarMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qatar",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    return new Date().toISOString().slice(0, 7);
  }

  return `${year}-${month}`;
}

function getCurrentQatarDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Qatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function toTimeInput(value) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 5);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Qatar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function makeDateTime(date, time) {
  if (!date || !time) return null;

  const dateTime = new Date(`${date}T${time}:00+03:00`);

  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }

  return dateTime.toISOString();
}

function formatDay(dateString) {
  if (!dateString) return "-";

  const day = String(dateString).split("-")[2];

  return day ? Number(day) : "-";
}

function getDayName(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00+03:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "Asia/Qatar",
  });
}

function getDayLabel(dateString) {
  const dayName = getDayName(dateString);

  return weekdayOptions.find((day) => day.value === dayName)?.label || dayName;
}

function timeToMinutes(time) {
  if (!time) return null;

  const [hours, minutes] = String(time).split(":").map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function calculateWorkingMinutes(checkInTime, checkOutTime) {
  const checkInMinutes = timeToMinutes(checkInTime);
  let checkOutMinutes = timeToMinutes(checkOutTime);

  if (checkInMinutes === null || checkOutMinutes === null) {
    return 0;
  }

  if (checkOutMinutes < checkInMinutes) {
    checkOutMinutes += 24 * 60;
  }

  return checkOutMinutes - checkInMinutes;
}

function normalizeDayOffSchedule(schedule) {
  if (!schedule) return null;

  const dayName = schedule.dayName || schedule.dayOff || schedule.weekday;

  const effectiveFrom = schedule.effectiveFrom || schedule.startDate;

  if (!dayName || !effectiveFrom) {
    return null;
  }

  return {
    ...schedule,
    dayName,
    effectiveFrom: String(effectiveFrom).slice(0, 10),
  };
}

function getApplicableDayOff(item, weeklyDayOffSchedules = []) {
  if (!item?.date || !item?.userName) {
    return "";
  }

  const employeeName = item.userName.trim();
  const applicableSchedule = weeklyDayOffSchedules
    .map(normalizeDayOffSchedule)
    .filter(Boolean)
    .filter((schedule) => schedule.effectiveFrom <= item.date)
    .sort((first, second) =>
      first.effectiveFrom.localeCompare(second.effectiveFrom),
    )
    .at(-1);

  return (
    applicableSchedule?.dayName || legacyEmployeeDayOff[employeeName] || ""
  );
}

function isEmployeeDayOff(item, weeklyDayOffSchedules = []) {
  if (!item?.date || !item?.userName) {
    return false;
  }

  return (
    getApplicableDayOff(item, weeklyDayOffSchedules) === getDayName(item.date)
  );
}

function getRequiredMinutes(item, weeklyDayOffSchedules = []) {
  if (!item?.date || isEmployeeDayOff(item, weeklyDayOffSchedules)) {
    return 0;
  }

  return 9 * 60;
}

function calculateAutomaticExtraMinutes({
  item,
  checkInTime,
  checkOutTime,
  isLeave,
  weeklyDayOffSchedules = [],
}) {
  if (isLeave || !checkInTime || !checkOutTime) {
    return 0;
  }

  const workingMinutes = calculateWorkingMinutes(checkInTime, checkOutTime);

  if (isEmployeeDayOff(item, weeklyDayOffSchedules)) {
    return workingMinutes;
  }

  return workingMinutes - getRequiredMinutes(item, weeklyDayOffSchedules);
}

function formatMinutes(totalMinutes, showPlus = true) {
  const parsedMinutes = Number(totalMinutes);

  if (!Number.isFinite(parsedMinutes)) {
    return "-";
  }

  const wholeMinutes = Math.trunc(parsedMinutes);

  if (wholeMinutes === 0) {
    return "0m";
  }

  const sign = wholeMinutes < 0 ? "-" : showPlus ? "+" : "";

  const absoluteMinutes = Math.abs(wholeMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${sign}${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${sign}${hours}h`;
  }

  return `${sign}${minutes}m`;
}

export default function AttendanceEdit() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentQatarMonth());

  const [selectedStaff, setSelectedStaff] = useState("");
  const [records, setRecords] = useState([]);
  const [editing, setEditing] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [weeklyDayOffSchedules, setWeeklyDayOffSchedules] = useState([]);
  const [loadingDayOff, setLoadingDayOff] = useState(false);
  const [savingDayOff, setSavingDayOff] = useState(false);
  const [dayOffEditorOpen, setDayOffEditorOpen] = useState(false);
  const [dayOffForm, setDayOffForm] = useState({
    dayName: "",
    effectiveFrom: getCurrentQatarDate(),
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchRecords = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/api/attendance?monthly=true&month=${selectedMonth}`,
          {
            signal: controller.signal,
            headers: getAttendanceHeaders(),
          },
        );

        if (handleAttendanceUnauthorized(response)) {
          return;
        }

        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load attendance records");
        }

        setRecords(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Attendance records loading error:", error);

        setRecords([]);

        toast.error(error?.message || "Failed to load attendance records");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchRecords();

    return () => controller.abort();
  }, [selectedMonth]);

  useEffect(() => {
    const controller = new AbortController();

    if (!selectedStaff) {
      setWeeklyDayOffSchedules([]);
      return () => controller.abort();
    }

    const fetchWeeklyDayOffSchedules = async () => {
      try {
        setLoadingDayOff(true);

        const response = await fetch(
          `${API_BASE_URL}/api/attendance/weekly-day-off?userId=${encodeURIComponent(
            selectedStaff,
          )}`,
          {
            signal: controller.signal,
            headers: getAttendanceHeaders(),
          },
        );

        if (handleAttendanceUnauthorized(response)) {
          return;
        }

        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load weekly day off");
        }

        const schedules = Array.isArray(data)
          ? data
          : Array.isArray(data?.schedules)
            ? data.schedules
            : [];

        setWeeklyDayOffSchedules(
          schedules.map(normalizeDayOffSchedule).filter(Boolean),
        );
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Weekly day-off loading error:", error);

        setWeeklyDayOffSchedules([]);

        toast.error(error?.message || "Failed to load weekly day off");
      } finally {
        if (!controller.signal.aborted) {
          setLoadingDayOff(false);
        }
      }
    };

    fetchWeeklyDayOffSchedules();

    return () => controller.abort();
  }, [selectedStaff]);

  const staffList = useMemo(() => {
    const staffMap = new Map();

    records.forEach((item) => {
      if (item.userId && item.userName) {
        staffMap.set(String(item.userId), {
          userId: String(item.userId),
          userName: item.userName,
        });
      }
    });

    return Array.from(staffMap.values()).sort((firstStaff, secondStaff) =>
      firstStaff.userName.localeCompare(secondStaff.userName),
    );
  }, [records]);

  const selectedStaffData = useMemo(() => {
    return staffList.find(
      (staff) => String(staff.userId) === String(selectedStaff),
    );
  }, [staffList, selectedStaff]);

  const filteredRows = useMemo(() => {
    if (!selectedStaff || !selectedStaffData) {
      return [];
    }

    const [year, month] = selectedMonth.split("-").map(Number);

    const daysInMonth = new Date(year, month, 0).getDate();

    const recordMap = new Map();

    records
      .filter((item) => String(item.userId) === String(selectedStaff))
      .forEach((item) => {
        recordMap.set(item.date, item);
      });

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");

      const date = `${selectedMonth}-${day}`;
      const existingRecord = recordMap.get(date);

      if (existingRecord) {
        return existingRecord;
      }

      return {
        _id: `new-${selectedStaffData.userId}-${date}`,
        isNew: true,
        userId: selectedStaffData.userId,
        userName: selectedStaffData.userName,
        date,
        checkIn: null,
        lunchOut: null,
        lunchIn: null,
        checkOut: null,
        extraMinutesOverride: null,
        isLeave: false,
      };
    });
  }, [records, selectedMonth, selectedStaff, selectedStaffData]);

  const handleEditChange = (id, field, value) => {
    setEditing((previousEditing) => ({
      ...previousEditing,
      [id]: {
        ...previousEditing[id],
        [field]: value,
      },
    }));
  };

  const getTimeValue = (item, field) => {
    const editedValue = editing[item._id]?.[field];

    if (editedValue !== undefined) {
      return editedValue;
    }

    return toTimeInput(item[field]);
  };

  const getLeaveValue = (item) => {
    const editedValue = editing[item._id]?.isLeave;

    if (editedValue !== undefined) {
      return editedValue;
    }

    return Boolean(item.isLeave);
  };

  const hasEditedExtraTime = (item) => {
    return Object.prototype.hasOwnProperty.call(
      editing[item._id] || {},
      "extraMinutesOverride",
    );
  };

  const hasSavedExtraOverride = (item) => {
    return (
      item.extraMinutesOverride !== null &&
      item.extraMinutesOverride !== undefined
    );
  };

  const getAutomaticExtraMinutes = (item) => {
    return calculateAutomaticExtraMinutes({
      item,
      checkInTime: getTimeValue(item, "checkIn"),
      checkOutTime: getTimeValue(item, "checkOut"),
      isLeave: getLeaveValue(item),
      weeklyDayOffSchedules,
    });
  };

  const latestWeeklyDayOffSchedule = useMemo(() => {
    return weeklyDayOffSchedules
      .map(normalizeDayOffSchedule)
      .filter(Boolean)
      .sort((first, second) =>
        first.effectiveFrom.localeCompare(second.effectiveFrom),
      )
      .at(-1);
  }, [weeklyDayOffSchedules]);

  const currentWeeklyDayOff =
    latestWeeklyDayOffSchedule?.dayName ||
    legacyEmployeeDayOff[selectedStaffData?.userName?.trim()] ||
    "";

  const currentWeeklyDayOffLabel =
    weekdayOptions.find((day) => day.value === currentWeeklyDayOff)?.label ||
    "Not set";

  const openWeeklyDayOffEditor = () => {
    setDayOffForm({
      dayName: latestWeeklyDayOffSchedule?.dayName || "",
      effectiveFrom: getCurrentQatarDate(),
    });
    setDayOffEditorOpen(true);
  };

  const saveWeeklyDayOff = async (event) => {
    event.preventDefault();

    if (!selectedStaffData) {
      toast.error("Select a staff member first");
      return;
    }

    if (!dayOffForm.dayName || !dayOffForm.effectiveFrom) {
      toast.error("Select the weekly off day and effective date");
      return;
    }

    try {
      setSavingDayOff(true);

      const payload = {
        userId: selectedStaffData.userId,
        userName: selectedStaffData.userName,
        dayName: dayOffForm.dayName,
        effectiveFrom: dayOffForm.effectiveFrom,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/attendance/weekly-day-off`,
        {
          method: "PUT",
          headers: getAttendanceHeaders(),
          body: JSON.stringify(payload),
        },
      );

      if (handleAttendanceUnauthorized(response)) {
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to set weekly day off");
      }

      const savedSchedule = normalizeDayOffSchedule(
        data?.schedule || data?.record || payload,
      );

      setWeeklyDayOffSchedules((previous) => {
        const withoutSameStartDate = previous.filter(
          (schedule) =>
            normalizeDayOffSchedule(schedule)?.effectiveFrom !==
            payload.effectiveFrom,
        );

        return [...withoutSameStartDate, savedSchedule]
          .filter(Boolean)
          .sort((first, second) =>
            first.effectiveFrom.localeCompare(second.effectiveFrom),
          );
      });

      const selectedDayLabel =
        weekdayOptions.find((day) => day.value === payload.dayName)?.label ||
        payload.dayName;

      toast.success(
        `${selectedDayLabel} set as weekly off from ${payload.effectiveFrom}`,
      );

      setDayOffEditorOpen(false);
    } catch (error) {
      console.error("Weekly day-off save error:", error);

      toast.error(error?.message || "Failed to set weekly day off");
    } finally {
      setSavingDayOff(false);
    }
  };

  const getExtraMinutesValue = (item) => {
    if (hasEditedExtraTime(item)) {
      const editedValue = editing[item._id]?.extraMinutesOverride;

      if (editedValue === "") {
        return "";
      }

      return String(editedValue);
    }

    if (hasSavedExtraOverride(item)) {
      return String(item.extraMinutesOverride);
    }

    return String(getAutomaticExtraMinutes(item));
  };

  const getExtraTimeMode = (item) => {
    if (hasEditedExtraTime(item)) {
      const editedValue = editing[item._id]?.extraMinutesOverride;

      return editedValue === "" ? "auto-reset" : "manual";
    }

    return hasSavedExtraOverride(item) ? "manual" : "auto";
  };

  const handleLeaveChange = (item, checked) => {
    setEditing((previousEditing) => ({
      ...previousEditing,
      [item._id]: {
        ...previousEditing[item._id],
        isLeave: checked,
        ...(checked
          ? {
              checkIn: "",
              lunchOut: "",
              lunchIn: "",
              checkOut: "",
              extraMinutesOverride: "",
            }
          : {}),
      },
    }));
  };

  const resetExtraTimeToAuto = (item) => {
    handleEditChange(item._id, "extraMinutesOverride", "");
  };

  const updateRow = async (item) => {
    try {
      setSavingId(item._id);

      const isLeave = getLeaveValue(item);
      const rowEditing = editing[item._id] || {};

      let extraMinutesOverride = item.extraMinutesOverride ?? null;

      const extraTimeWasEdited = Object.prototype.hasOwnProperty.call(
        rowEditing,
        "extraMinutesOverride",
      );

      if (isLeave) {
        extraMinutesOverride = null;
      } else if (extraTimeWasEdited) {
        const extraInput = rowEditing.extraMinutesOverride;

        if (extraInput === "") {
          extraMinutesOverride = null;
        } else {
          const parsedExtraMinutes = Number(extraInput);

          if (
            !Number.isFinite(parsedExtraMinutes) ||
            !Number.isInteger(parsedExtraMinutes)
          ) {
            toast.error("Extra Time must be entered in whole minutes");
            return;
          }

          extraMinutesOverride = parsedExtraMinutes;
        }
      }

      const payload = {
        userId: item.userId,
        userName: item.userName,
        date: item.date,
        isLeave,
        extraMinutesOverride,

        checkIn: isLeave
          ? null
          : makeDateTime(item.date, getTimeValue(item, "checkIn")),

        lunchOut: isLeave
          ? null
          : makeDateTime(item.date, getTimeValue(item, "lunchOut")),

        lunchIn: isLeave
          ? null
          : makeDateTime(item.date, getTimeValue(item, "lunchIn")),

        checkOut: isLeave
          ? null
          : makeDateTime(item.date, getTimeValue(item, "checkOut")),
      };

      const response = await fetch(`${API_BASE_URL}/api/attendance/manual`, {
        method: "PUT",
        headers: getAttendanceHeaders(),
        body: JSON.stringify(payload),
      });

      if (handleAttendanceUnauthorized(response)) {
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to save attendance");
      }

      setRecords((previousRecords) => {
        const recordAlreadyExists = previousRecords.some(
          (record) =>
            String(record.userId) === String(item.userId) &&
            record.date === item.date,
        );

        if (recordAlreadyExists) {
          return previousRecords.map((record) =>
            String(record.userId) === String(item.userId) &&
            record.date === item.date
              ? {
                  ...record,
                  ...payload,
                  _id: record._id,
                  isNew: false,
                }
              : record,
          );
        }

        return [
          ...previousRecords,
          {
            ...payload,
            _id:
              data?.record?._id ||
              data?.upsertedId ||
              `saved-${item.userId}-${item.date}`,
            isNew: false,
          },
        ];
      });

      setEditing((previousEditing) => {
        const updatedEditing = {
          ...previousEditing,
        };

        delete updatedEditing[item._id];

        return updatedEditing;
      });

      toast.success(
        item.isNew
          ? "Attendance created successfully"
          : "Attendance updated successfully",
      );
    } catch (error) {
      console.error("Attendance save error:", error);

      toast.error(error?.message || "Failed to save attendance");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <Toaster position="top-center" />

      <div className="w-full rounded-4xl border border-slate-200 bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300">
            Admin Panel
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-white">
            Edit Attendance
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Edit attendance times, leave status and Extra Time. Automatically
            calculated Extra Time can also be replaced with a manual value.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">
              Select Month
            </label>

            <select
              value={selectedMonth}
              onChange={(event) => {
                setSelectedMonth(event.target.value);
                setSelectedStaff("");
                setEditing({});
              }}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
            >
              {monthOptions.map((month) => (
                <option
                  key={month.value}
                  value={month.value}
                  className="bg-slate-900 text-white"
                >
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">
              Select Staff
            </label>

            <select
              value={selectedStaff}
              onChange={(event) => {
                setSelectedStaff(event.target.value);
                setEditing({});
                setWeeklyDayOffSchedules([]);
                setDayOffEditorOpen(false);
              }}
              disabled={loading || staffList.length === 0}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <option value="" className="bg-slate-900 text-white">
                Select Staff
              </option>

              {staffList.map((staff) => (
                <option
                  key={staff.userId}
                  value={staff.userId}
                  className="bg-slate-900 text-white"
                >
                  {staff.userName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedStaff && (
          <div className="mt-4 rounded-3xl border border-emerald-400/15 bg-emerald-400/5 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300/70">
                  Weekly Off Schedule
                </p>

                <p className="mt-2 text-sm text-white">
                  Current weekly off:{" "}
                  <span className="font-semibold text-emerald-300">
                    {loadingDayOff ? "Loading..." : currentWeeklyDayOffLabel}
                  </span>
                </p>

                <p className="mt-1 text-xs text-white/45">
                  {latestWeeklyDayOffSchedule
                    ? `Latest schedule effective from ${latestWeeklyDayOffSchedule.effectiveFrom}`
                    : "Using the original default schedule"}
                </p>
              </div>

              <button
                type="button"
                onClick={openWeeklyDayOffEditor}
                disabled={loadingDayOff}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <CalendarDays className="h-4 w-4" />
                Set / Update Weekly Off
              </button>
            </div>

            {dayOffEditorOpen && (
              <form
                onSubmit={saveWeeklyDayOff}
                className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
              >
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                    Weekly Off Day
                  </label>

                  <select
                    value={dayOffForm.dayName}
                    onChange={(event) =>
                      setDayOffForm((previous) => ({
                        ...previous,
                        dayName: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-300/50"
                  >
                    <option value="">Select day</option>
                    {weekdayOptions.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                    Effective From
                  </label>

                  <input
                    type="date"
                    value={dayOffForm.effectiveFrom}
                    onChange={(event) =>
                      setDayOffForm((previous) => ({
                        ...previous,
                        effectiveFrom: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-300/50"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingDayOff}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingDayOff ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={() => setDayOffEditorOpen(false)}
                    disabled={savingDayOff}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/5 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-white/55">
              <Search className="mb-3 h-6 w-6 text-amber-300" />

              <p>No attendance data found for this month.</p>
            </div>
          ) : !selectedStaff ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-white/55">
              <Search className="mb-3 h-6 w-6 text-sky-300" />

              <p>Select a staff member to view attendance.</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-16 text-center text-white/55">
              No attendance records found.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-260 border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-white/45">
                    <th className="whitespace-nowrap px-4 py-2">Day</th>

                    <th className="whitespace-nowrap px-4 py-2">Date</th>

                    <th className="whitespace-nowrap px-4 py-2">Staff</th>

                    <th className="whitespace-nowrap px-4 py-2">Check In</th>

                    <th className="whitespace-nowrap px-4 py-2">Lunch Out</th>

                    <th className="whitespace-nowrap px-4 py-2">Lunch In</th>

                    <th className="whitespace-nowrap px-4 py-2">Check Out</th>

                    <th className="whitespace-nowrap px-4 py-2">Extra Time</th>

                    <th className="whitespace-nowrap px-4 py-2">
                      Mark as Leave
                    </th>

                    <th className="whitespace-nowrap px-4 py-2">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((item) => {
                    const isLeave = getLeaveValue(item);

                    const automaticExtraMinutes =
                      getAutomaticExtraMinutes(item);

                    const extraMinutesValue = getExtraMinutesValue(item);

                    const extraMode = getExtraTimeMode(item);

                    const isWeeklyDayOff = isEmployeeDayOff(
                      item,
                      weeklyDayOffSchedules,
                    );

                    const displayedExtraMinutes =
                      extraMinutesValue === ""
                        ? automaticExtraMinutes
                        : Number(extraMinutesValue);

                    return (
                      <tr
                        key={item._id}
                        className={
                          isLeave
                            ? "bg-amber-500/20"
                            : isWeeklyDayOff
                              ? "bg-sky-500/15"
                              : "bg-black/20"
                        }
                      >
                        <td className="rounded-l-2xl border-y border-l border-white/5 px-4 py-3 text-sm font-semibold text-white">
                          {formatDay(item.date)}
                        </td>

                        <td className="whitespace-nowrap border-y border-white/5 px-4 py-3">
                          <p className="text-sm font-semibold text-white">
                            {item.date}
                          </p>
                          <p className="mt-1 text-xs font-medium text-sky-300">
                            {getDayLabel(item.date)}
                          </p>
                        </td>

                        <td className="min-w-44 border-y border-white/5 px-4 py-3 text-sm text-white">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{item.userName}</span>

                            {isLeave && (
                              <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-950">
                                LEAVE
                              </span>
                            )}

                            {isWeeklyDayOff && !isLeave && (
                              <span className="rounded-full bg-emerald-300 px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-950">
                                WEEKLY OFF
                              </span>
                            )}
                          </div>
                        </td>

                        {["checkIn", "lunchOut", "lunchIn", "checkOut"].map(
                          (field) => (
                            <td
                              key={field}
                              className="border-y border-white/5 px-4 py-3"
                            >
                              <input
                                type="time"
                                value={getTimeValue(item, field)}
                                disabled={isLeave}
                                onChange={(event) =>
                                  handleEditChange(
                                    item._id,
                                    field,
                                    event.target.value,
                                  )
                                }
                                className="w-32 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 disabled:cursor-not-allowed disabled:opacity-35"
                              />
                            </td>
                          ),
                        )}

                        <td className="min-w-52 border-y border-white/5 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="1"
                              inputMode="numeric"
                              value={extraMinutesValue}
                              disabled={isLeave}
                              onChange={(event) =>
                                handleEditChange(
                                  item._id,
                                  "extraMinutesOverride",
                                  event.target.value,
                                )
                              }
                              className="w-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 disabled:cursor-not-allowed disabled:opacity-35"
                            />

                            <button
                              type="button"
                              title="Use automatic calculation"
                              disabled={isLeave}
                              onClick={() => resetExtraTimeToAuto(item)}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/55 transition hover:border-sky-400/30 hover:bg-sky-400/10 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Calculator className="h-3 w-3 text-white/35" />

                            <p
                              className={`whitespace-nowrap text-[10px] ${
                                extraMode === "manual"
                                  ? "text-amber-300"
                                  : "text-sky-300"
                              }`}
                            >
                              {extraMode === "manual"
                                ? `Manual: ${formatMinutes(
                                    displayedExtraMinutes,
                                  )}`
                                : extraMode === "auto-reset"
                                  ? `Auto after update: ${formatMinutes(
                                      automaticExtraMinutes,
                                    )}`
                                  : `Auto: ${formatMinutes(
                                      automaticExtraMinutes,
                                    )}`}
                            </p>
                          </div>
                        </td>

                        <td className="border-y border-white/5 px-4 py-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm font-semibold text-white/80">
                            <input
                              type="checkbox"
                              checked={isLeave}
                              onChange={(event) =>
                                handleLeaveChange(item, event.target.checked)
                              }
                              className="h-4 w-4 rounded border-white/20 bg-black/30 accent-amber-400"
                            />
                            Leave
                          </label> 
                        </td> 

                        <td className="rounded-r-2xl border-y border-r border-white/5 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => updateRow(item)}
                            disabled={savingId === item._id}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingId === item._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}

                            {item.isNew ? "Create" : "Update"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
