import { NotificationCenterView } from "@/components/notifications/NotificationCenterView";

export default function AdminNotificationsPage() {
  return (
    <NotificationCenterView
      roleScope="admin"
      title="School Notification Center"
      subtitle="Track school circulars, student & teacher alerts, subscription status, and policy announcements."
      createActionHref="/admin/notices"
      createActionLabel="Publish Notice"
    />
  );
}
