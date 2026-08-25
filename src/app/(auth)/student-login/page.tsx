import { redirect } from "next/navigation";

export default function LegacyStudentLoginRedirect() {
  redirect("/student/login");
}
