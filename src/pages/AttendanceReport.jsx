import React, { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Users } from "lucide-react";
import toast from "react-hot-toast";

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

// Fallback schedule used only before a staff member receives a saved
// weekly day-off schedule from the backend.
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

function normalizeStaffName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function getStaffKey(value) {
  return normalizeStaffName(value).toLocaleLowerCase();
}

function getMonthLabel(month) {
  return (
    monthOptions.find((monthOption) => monthOption.value === month)?.label ||
    month
  );
}

function formatQatarTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Qatar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function minutesToText(totalMinutes, showPlus = false) {
  if (totalMinutes === null || totalMinutes === undefined) {
    return "-";
  }

  const numericMinutes = Number(totalMinutes);

  if (!Number.isFinite(numericMinutes)) {
    return "-";
  }

  const wholeMinutes = Math.trunc(numericMinutes);

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

function getDayName(dateString) {
  if (!dateString) return "-";

  const date = new Date(`${dateString}T00:00:00+03:00`);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "Asia/Qatar",
  });
}

function getDayNumber(dateString) {
  if (!dateString) return "-";

  const day = String(dateString).split("-")[2];

  return day ? Number(day) : "-";
}

function getDaysInMonth(selectedMonth) {
  const [year, month] = selectedMonth.split("-").map(Number);

  return new Date(year, month, 0).getDate();
}

function getWorkingMinutes(item) {
  if (item?.isLeave) {
    return 0;
  }

  if (!item?.date || !item?.checkIn || !item?.checkOut) {
    return 0;
  }

  const checkInTime = formatQatarTime(item.checkIn);

  const checkOutTime = formatQatarTime(item.checkOut);

  if (checkInTime === "-" || checkOutTime === "-") {
    return 0;
  }

  const checkIn = new Date(`${item.date}T${checkInTime}:00+03:00`);

  let checkOut = new Date(`${item.date}T${checkOutTime}:00+03:00`);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return 0;
  }

  if (checkOut < checkIn) {
    checkOut = new Date(checkOut.getTime() + 24 * 60 * 60 * 1000);
  }

  return Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000);
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

  const cleanName = normalizeStaffName(item.userName);

  const applicableSchedule = weeklyDayOffSchedules
    .map(normalizeDayOffSchedule)
    .filter(Boolean)
    .filter((schedule) => schedule.effectiveFrom <= item.date)
    .sort((first, second) =>
      first.effectiveFrom.localeCompare(second.effectiveFrom),
    )
    .at(-1);

  return applicableSchedule?.dayName || legacyEmployeeDayOff[cleanName] || "";
}

function isEmployeeDayOff(item, weeklyDayOffSchedules = []) {
  if (!item?.date || !item?.userName) {
    return false;
  }

  const dayName = getDayName(item.date);

  return getApplicableDayOff(item, weeklyDayOffSchedules) === dayName;
}

function getRequiredMinutesForDay(item, weeklyDayOffSchedules = []) {
  if (!item?.date || isEmployeeDayOff(item, weeklyDayOffSchedules)) {
    return 0;
  }

  return 9 * 60;
}

function getExtraMinutes(item, weeklyDayOffSchedules = []) {
  if (item?.isLeave) {
    return 0;
  }

  const savedOverride = item?.extraMinutesOverride;

  if (
    savedOverride !== null &&
    savedOverride !== undefined &&
    savedOverride !== ""
  ) {
    const parsedOverride = Number(savedOverride);

    if (Number.isFinite(parsedOverride)) {
      return Math.trunc(parsedOverride);
    }
  }

  if (!item?.checkIn || !item?.checkOut) {
    return 0;
  }

  const workingMinutes = getWorkingMinutes(item);

  if (isEmployeeDayOff(item, weeklyDayOffSchedules)) {
    return workingMinutes;
  }

  return workingMinutes - getRequiredMinutesForDay(item, weeklyDayOffSchedules);
}

export default function AttendanceReport() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentQatarMonth());

  const [records, setRecords] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState("");

  const [loading, setLoading] = useState(false);

  const [generating, setGenerating] = useState("");

  const [weeklyDayOffSchedules, setWeeklyDayOffSchedules] = useState([]);

  const [loadingDayOff, setLoadingDayOff] = useState(false);

  const [dayOffLoadError, setDayOffLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchMonthData = async () => {
      try {
        setLoading(true);
        setSelectedStaff("");

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
          throw new Error(data?.message || "Failed to load attendance data");
        }

        setRecords(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Attendance report loading error:", error);

        setRecords([]);

        toast.error(error?.message || "Failed to load attendance data");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchMonthData();

    return () => {
      controller.abort();
    };
  }, [selectedMonth]);

  const monthName = getMonthLabel(selectedMonth);

  const totalDates = getDaysInMonth(selectedMonth);

  const hasData = records.length > 0;

  const staffList = useMemo(() => {
    const staffMap = new Map();

    records.forEach((item) => {
      const cleanName = normalizeStaffName(item.userName);

      if (!cleanName) {
        return;
      }

      const staffKey = getStaffKey(cleanName);

      if (!staffMap.has(staffKey)) {
        staffMap.set(staffKey, cleanName);
      }
    });

    return Array.from(staffMap.values()).sort((firstName, secondName) =>
      firstName.localeCompare(secondName),
    );
  }, [records]);

  const selectedStaffData = useMemo(() => {
    if (!selectedStaff) {
      return null;
    }

    const selectedStaffKey = getStaffKey(selectedStaff);

    return (
      records.find((item) => getStaffKey(item.userName) === selectedStaffKey) ||
      null
    );
  }, [records, selectedStaff]);

  useEffect(() => {
    const controller = new AbortController();

    setWeeklyDayOffSchedules([]);
    setDayOffLoadError(false);

    if (!selectedStaff) {
      return () => controller.abort();
    }

    if (!selectedStaffData?.userId) {
      setDayOffLoadError(true);
      toast.error("Staff ID not found for weekly day-off schedule");
      return () => controller.abort();
    }

    const fetchWeeklyDayOffSchedules = async () => {
      try {
        setLoadingDayOff(true);

        const response = await fetch(
          `${API_BASE_URL}/api/attendance/weekly-day-off?userId=${encodeURIComponent(
            selectedStaffData.userId,
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
          throw new Error(
            data?.message || "Failed to load weekly day-off schedule",
          );
        }

        const schedules = Array.isArray(data)
          ? data
          : Array.isArray(data?.schedules)
            ? data.schedules
            : [];

        setWeeklyDayOffSchedules(
          schedules
            .map(normalizeDayOffSchedule)
            .filter(Boolean)
            .sort((first, second) =>
              first.effectiveFrom.localeCompare(second.effectiveFrom),
            ),
        );
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Weekly day-off report loading error:", error);

        setWeeklyDayOffSchedules([]);
        setDayOffLoadError(true);

        toast.error(error?.message || "Failed to load weekly day-off schedule");
      } finally {
        if (!controller.signal.aborted) {
          setLoadingDayOff(false);
        }
      }
    };

    fetchWeeklyDayOffSchedules();

    return () => controller.abort();
  }, [selectedStaff, selectedStaffData?.userId]);

  const summaryRows = useMemo(() => {
    const summaryMap = new Map();

    records.forEach((item) => {
      const cleanName = normalizeStaffName(item.userName) || "Unknown";

      const staffKey = getStaffKey(cleanName);

      if (!summaryMap.has(staffKey)) {
        summaryMap.set(staffKey, {
          staffName: cleanName,
          totalDays: 0,
          totalWorkingMinutes: 0,
        });
      }

      const currentSummary = summaryMap.get(staffKey);

      if (!item.isLeave && item.checkIn && item.checkOut) {
        currentSummary.totalDays += 1;
      }

      currentSummary.totalWorkingMinutes += getWorkingMinutes(item);
    });

    return Array.from(summaryMap.values()).sort((firstItem, secondItem) =>
      firstItem.staffName.localeCompare(secondItem.staffName),
    );
  }, [records]);

  const staffMonthRows = useMemo(() => {
    if (!selectedStaff) {
      return [];
    }

    const selectedStaffKey = getStaffKey(selectedStaff);

    const recordMap = new Map();

    records
      .filter((item) => getStaffKey(item.userName) === selectedStaffKey)
      .forEach((item) => {
        recordMap.set(item.date, {
          ...item,
          userName: normalizeStaffName(item.userName),
        });
      });

    return Array.from({ length: totalDates }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");

      const date = `${selectedMonth}-${day}`;

      return (
        recordMap.get(date) || {
          date,
          userName: normalizeStaffName(selectedStaff),
          checkIn: null,
          checkOut: null,
          lunchOut: null,
          lunchIn: null,
          extraMinutesOverride: null,
          isLeave: false,
        }
      );
    });
  }, [records, selectedStaff, selectedMonth, totalDates]);

  const generateSummaryPdf = async () => {
    if (!hasData) {
      toast.error("No data found for selected month");

      return;
    }

    try {
      setGenerating("summary");

      const { jsPDF } = await import("jspdf");

      const autoTable = (await import("jspdf-autotable")).default;

      const document = new jsPDF("portrait", "mm", "a4");

      document.setFillColor(230, 230, 230);

      document.rect(0, 0, 210, 32, "F");

      document.setTextColor(0, 0, 0);
      document.setFont("helvetica", "bold");
      document.setFontSize(17);

      document.text("WMIBC Staff Attendance Report", 14, 14);

      document.setFont("helvetica", "normal");
      document.setFontSize(10);

      document.text("Attendance Summary", 14, 23);

      document.setFont("helvetica", "bold");
      document.setFontSize(11);

      document.text("Report Details", 14, 44);

      document.setFont("helvetica", "normal");
      document.setFontSize(9);

      document.text(`Month Name: ${monthName}`, 14, 53);

      document.text(`Total Date: ${totalDates}`, 14, 60);

      document.text(`Total Staff: ${staffList.length}`, 14, 67);

      autoTable(document, {
        startY: 78,

        head: [["Staff Name", "Total Days", "Total Working Hours"]],

        body: summaryRows.map((item) => [
          item.staffName,
          item.totalDays,
          minutesToText(item.totalWorkingMinutes),
        ]),

        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor: [0, 0, 0],
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },

        headStyles: {
          fillColor: [230, 230, 230],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },

        alternateRowStyles: {
          fillColor: [248, 248, 248],
        },

        bodyStyles: {
          fillColor: [255, 255, 255],
        },

        margin: {
          left: 14,
          right: 14,
        },
      });

      document.save(
        `WMIBC-Attendance-Summary-${monthName.replaceAll(" ", "-")}.pdf`,
      );

      toast.success("Attendance summary downloaded");
    } catch (error) {
      console.error("Summary PDF generation error:", error);

      toast.error("Failed to generate PDF");
    } finally {
      setGenerating("");
    }
  };

  const generateStaffPdf = async () => {
    if (!selectedStaff) {
      toast.error("Please select staff");

      return;
    }

    try {
      setGenerating("staff");

      const { jsPDF } = await import("jspdf");

      const autoTable = (await import("jspdf-autotable")).default;

      const document = new jsPDF("portrait", "mm", "a4");

      const presentRows = staffMonthRows.filter(
        (item) => !item.isLeave && item.checkIn && item.checkOut,
      );

      const totalWorkingMinutes = staffMonthRows.reduce(
        (total, item) => total + getWorkingMinutes(item),
        0,
      );

      const leaveDays = staffMonthRows.filter(
        (item) =>
          item.isLeave && !isEmployeeDayOff(item, weeklyDayOffSchedules),
      ).length;

      const weeklyDayOffDays = staffMonthRows.filter((item) =>
        isEmployeeDayOff(item, weeklyDayOffSchedules),
      ).length;

      const totalExtraMinutes = staffMonthRows.reduce(
        (total, item) => total + getExtraMinutes(item, weeklyDayOffSchedules),
        0,
      );

      document.setFillColor(220, 220, 220);

      document.rect(0, 0, 210, 28, "F");

      document.setTextColor(0, 0, 0);
      document.setFont("helvetica", "bold");
      document.setFontSize(15);

      document.text("WMIBC Staff Attendance Report", 14, 13);

      document.setFont("helvetica", "normal");
      document.setFontSize(9);

      document.text("Staff Monthly Attendance Report", 14, 21);

      document.setTextColor(15, 23, 42);

      document.setFont("helvetica", "bold");
      document.setFontSize(10);

      document.text("Employee Report", 14, 39);

      document.setFont("helvetica", "normal");
      document.setFontSize(8);

      document.text(`Month Name: ${monthName}`, 14, 47);

      document.text(
        `Employee Name: ${normalizeStaffName(selectedStaff)}`,
        14,
        54,
      );

      document.text(`Month Dates: ${totalDates}`, 14, 61);

      document.text(`Present Dates: ${presentRows.length}`, 75, 61);

      document.text(`Weekly Off: ${weeklyDayOffDays}`, 140, 61);

      document.text(
        `Total Working Hour: ${minutesToText(totalWorkingMinutes)}`,
        14,
        68,
      );

      document.text(
        `Leave Taken: ${leaveDays} ${leaveDays === 1 ? "day" : "days"}`,
        90,
        68,
      );

      autoTable(document, {
        startY: 75,

        head: [["Day", "Date", "In", "Out", "Working", "Extra", "Status"]],

        body: staffMonthRows.map((item) => {
          const isDayOff = isEmployeeDayOff(item, weeklyDayOffSchedules);

          const isPresent = !item.isLeave && item.checkIn && item.checkOut;

          const status = isDayOff
            ? "Weekly Off"
            : item.isLeave
              ? "Leave"
              : isPresent
                ? "Present"
                : "Absent";

          return [
            getDayNumber(item.date),

            `${getDayNumber(item.date)} ${monthName
              .split(" ")[0]
              .slice(0, 3)} (${getDayName(item.date)})`,

            isDayOff && !item.checkIn
              ? "DAY OFF"
              : item.isLeave
                ? "LEAVE"
                : formatQatarTime(item.checkIn),

            isDayOff && !item.checkOut
              ? "DAY OFF"
              : item.isLeave
                ? "LEAVE"
                : formatQatarTime(item.checkOut),

            item.isLeave ? "0m" : minutesToText(getWorkingMinutes(item)),

            item.isLeave
              ? "0m"
              : minutesToText(
                  getExtraMinutes(item, weeklyDayOffSchedules),
                  true,
                ),

            status,
          ];
        }),

        styles: {
          fontSize: 6,
          cellPadding: 1.1,
          overflow: "linebreak",
          valign: "middle",
          halign: "center",
          minCellHeight: 4.2,
        },

        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 6.5,
        },

        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },

        columnStyles: {
          0: {
            cellWidth: 12,
          },
          1: {
            cellWidth: 32,
          },
          2: {
            cellWidth: 22,
          },
          3: {
            cellWidth: 22,
          },
          4: {
            cellWidth: 28,
          },
          5: {
            cellWidth: 27,
          },
          6: {
            cellWidth: 31,
          },
        },

        margin: {
          left: 12,
          right: 12,
        },

        pageBreak: "avoid",

        didParseCell(data) {
          if (data.section !== "body") {
            return;
          }

          const row = staffMonthRows[data.row.index];

          const isLeave = Boolean(row?.isLeave);

          const isDayOff = isEmployeeDayOff(row, weeklyDayOffSchedules);

          const isAbsent = !row?.checkIn && !isDayOff && !isLeave;

          if (isLeave) {
            data.cell.styles.fillColor = [255, 247, 214];

            data.cell.styles.textColor = [120, 80, 0];
          } else if (isDayOff) {
            data.cell.styles.fillColor = [255, 240, 240];

            data.cell.styles.textColor = [120, 0, 0];
          } else if (isAbsent) {
            data.cell.styles.fillColor = [255, 200, 200];

            data.cell.styles.textColor = [120, 0, 0];
          }
        },
      });

      const finalY = document.lastAutoTable?.finalY || 250;

      document.setFont("helvetica", "bold");

      document.setFontSize(8.5);

      document.text(
        `Total Working Hour: ${minutesToText(totalWorkingMinutes)}`,
        14,
        finalY + 7,
      );

      document.text(
        `Leave Taken: ${leaveDays} ${leaveDays === 1 ? "day" : "days"}`,
        14,
        finalY + 13,
      );

      document.text(
        `Weekly Day Off: ${weeklyDayOffDays} ${
          weeklyDayOffDays === 1 ? "day" : "days"
        }`,
        90,
        finalY + 13,
      );

      document.text(
        `Total Extra/Deduction: ${minutesToText(totalExtraMinutes, true)}`,
        14,
        finalY + 19,
      );

      document.save(
        `WMIBC-${normalizeStaffName(selectedStaff).replaceAll(
          " ",
          "-",
        )}-${monthName.replaceAll(" ", "-")}.pdf`,
      );

      toast.success("Staff report downloaded");
    } catch (error) {
      console.error("Staff PDF generation error:", error);

      toast.error("Failed to generate staff PDF");
    } finally {
      setGenerating("");
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="w-full rounded-4xl border border-slate-200 bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-sky-300">
            Admin Panel
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-white">
            WMIBC Staff Attendance Report
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Select a month, then download the attendance summary or an
            individual staff report.
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
          <label className="text-xs uppercase tracking-[0.18em] text-white/45">
            Select Month
          </label>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 md:w-72"
            >
              {monthOptions.map((monthOption) => (
                <option
                  key={monthOption.value}
                  value={monthOption.value}
                  className="bg-slate-900 text-white"
                >
                  {monthOption.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={generateSummaryPdf}
              disabled={!hasData || loading || generating === "summary"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {generating === "summary" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Attendance Summary
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-white/45">Month</p>

              <p className="mt-2 text-lg font-semibold text-white">
                {monthName}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-white/45">Total Dates</p>

              <p className="mt-2 text-lg font-semibold text-white">
                {totalDates}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-white/45">Total Staff</p>

              <p className="mt-2 text-lg font-semibold text-white">
                {loading ? "-" : staffList.length}
              </p>
            </div>
          </div>

          {!loading && !hasData && (
            <p className="mt-4 text-sm text-amber-300">
              No attendance data found for this month.
            </p>
          )}

          {loading && (
            <div className="mt-5 flex items-center gap-2 text-sm text-white/60">
              <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
              Loading attendance data...
            </div>
          )}
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-300" />

            <h2 className="text-lg font-semibold text-white">
              Get Attendance by Staff
            </h2>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={selectedStaff}
              onChange={(event) => setSelectedStaff(event.target.value)}
              disabled={!hasData || loading}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 disabled:cursor-not-allowed disabled:opacity-40 md:w-72"
            >
              <option value="" className="bg-slate-900 text-white">
                Select Staff
              </option>

              {staffList.map((staffName) => (
                <option
                  key={getStaffKey(staffName)}
                  value={staffName}
                  className="bg-slate-900 text-white"
                >
                  {staffName}
                </option>
              ))}
            </select>

            {selectedStaff && (
              <button
                type="button"
                onClick={generateStaffPdf}
                disabled={
                  generating === "staff" || loadingDayOff || dayOffLoadError
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating === "staff" || loadingDayOff ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Report
              </button>
            )}
          </div>

          {selectedStaff && dayOffLoadError && (
            <p className="mt-3 text-sm text-rose-300">
              Weekly day-off schedule could not be loaded. The report is
              disabled to prevent incorrect attendance calculations.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
