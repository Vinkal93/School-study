/**
 * Phase 4 Quick Actions Data Contracts (Sections 15–22)
 */

export interface QuickActionItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  moduleKey?: string;
  badgeCount?: number;
}

export interface QuickActionsProps {
  actions?: QuickActionItem[];
  tenantEnabledModules?: string[];
  loading?: boolean;
  error?: string | null;
  onActionClick?: (action: QuickActionItem) => void;
}
