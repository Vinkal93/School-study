import { NotificationCenterView } from "@/components/notifications/NotificationCenterView";

export default function SuperAdminNotificationsPage() {
  return (
    <NotificationCenterView
      roleScope="super_admin"
      title="Platform Operations Notification Center"
      subtitle="Global feed for subscription renewal warnings, system alarms, payment activities, and administrative events."
      createActionHref="/super-admin/notices"
      createActionLabel="Global Broadcast"
    />
  );
}
