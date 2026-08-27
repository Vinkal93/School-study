/**
 * Phase 6 Mobile Bottom Navigation Data Contracts
 */
import { StudentNavItem } from "@/lib/config/student-navigation";

export interface MobileBottomNavigationProps {
  navItems?: StudentNavItem[];
  tenantEnabledModules?: string[];
  unreadNotificationCount?: number;
}
