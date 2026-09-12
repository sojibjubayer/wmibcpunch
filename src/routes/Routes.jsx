import React from "react";
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import AttendanceLogin from "../pages/AttendanceLogin";
import Attendance from "../pages/Attendance";
import AttendanceEdit from "../pages/AttendanceEdit";
import AttendanceReport from "../pages/AttendanceReport";
import PunchStatus from "../pages/PunchStatus";
import AttendanceLayout from "../layouts/AttendanceLayout";

// =====================================================
// ATTENDANCE AUTH HELPERS
// =====================================================

function getAttendanceToken() {
  return localStorage.getItem("attendanceToken") || "";
}

function getAttendanceUser() {
  try {
    const raw = localStorage.getItem("attendanceUser");

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === "object"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

// =====================================================
// ATTENDANCE PRIVATE ROUTE
// =====================================================

function AttendancePrivateRoute({ children }) {
  const token = getAttendanceToken();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// =====================================================
// ATTENDANCE ADMIN ROUTE
// =====================================================

function AttendanceAdminRoute({ children }) {
  const token = getAttendanceToken();
  const user = getAttendanceUser();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  const role = String(user?.role || "")
    .trim()
    .toLowerCase();

  if (role !== "admin") {
    return <Navigate to="/punch-status" replace />;
  }

  return children;
}

// =====================================================
// ROUTER
// =====================================================

const router = createBrowserRouter([
  {
    path: "/",
    element: <AttendanceLogin />,
  },

  {
    element: (
      <AttendancePrivateRoute>
        <AttendanceLayout />
      </AttendancePrivateRoute>
    ),
    children: [
      {
        path: "/punch",
        element: <Attendance />,
      },
      {
        path: "/punch-status",
        element: <PunchStatus />,
      },
      {
        path: "/attendance/report",
        element: <AttendanceReport />,
      },
      {
        path: "/admin/attendance/edit",
        element: (
          <AttendanceAdminRoute>
            <AttendanceEdit />
          </AttendanceAdminRoute>
        ),
      },
    ],
  },

  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

// =====================================================
// ROUTES COMPONENT
// =====================================================

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
