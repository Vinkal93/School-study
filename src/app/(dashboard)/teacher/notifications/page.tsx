import { NotificationCenterView } from "@/components/notifications/NotificationCenterView";

export default function TeacherNotificationsPage() {
  return (
    <NotificationCenterView
      roleScope="teacher"
      title="Teacher Notification Center"
      subtitle="View school circulars, homework activity, timetable changes, and administrative announcements."
      createActionHref="/teacher/homework"
      createActionLabel="Assign Homework"
    />
  );
}
