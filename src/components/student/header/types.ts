/**
 * Student Header Data Contracts (Section 10)
 */

export interface StudentHeaderData {
  id: string;
  firstName: string;
  fullName: string;
  photoUrl?: string;
}

export interface StudentNotificationData {
  unreadCount: number;
}

export interface DashboardHeaderProps {
  student?: StudentHeaderData;
  notifications?: StudentNotificationData;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
}
