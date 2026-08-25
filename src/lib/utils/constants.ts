export const APP_NAME = "School Study";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SUPER_ADMIN: "/super-admin",
  SUPER_ADMIN_SCHOOLS: "/super-admin/schools",
  SUPER_ADMIN_NEW_SCHOOL: "/super-admin/schools/new",
  SUPER_ADMIN_USERS: "/super-admin/users",
  ADMIN: "/admin",
  ADMIN_SETUP: "/admin/setup",
  ADMIN_TEACHERS: "/admin/teachers",
  ADMIN_STUDENTS: "/admin/students",
  ADMIN_CLASSES: "/admin/classes",
  ADMIN_ATTENDANCE: "/admin/attendance",
  ADMIN_NOTICES: "/admin/notices",
  TEACHER: "/teacher",
  STUDENT: "/student",
} as const;

export const COLLECTIONS = {
  USERS: "users",
  SCHOOLS: "schools",
  ACADEMIC_YEARS: "academic_years",
  CLASSES: "classes",
  SECTIONS: "sections",
  TEACHERS: "teachers",
  STUDENTS: "students",
  ATTENDANCE: "attendance",
  NOTICES: "notices",
} as const;
