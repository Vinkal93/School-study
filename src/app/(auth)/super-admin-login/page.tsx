import { redirect } from "next/navigation";

export default function LegacySuperAdminLoginRedirect() {
  redirect("/super-admin/login");
}
