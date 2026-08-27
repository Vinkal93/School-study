/**
 * Phase 4 Attention Center Data Contracts (Section 9)
 */

export type AttentionPriority = "critical" | "high" | "normal" | "low";
export type AttentionType = "fee" | "homework" | "exam" | "notice" | "attendance" | "document";

export interface AttentionItem {
  id: string;
  type: AttentionType;
  priority: AttentionPriority;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  dueDate?: string;
  amount?: number;
}

export interface AttentionCenterProps {
  items?: AttentionItem[];
  maxItems?: number; // Default 3
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewAllClick?: () => void;
  onItemAction?: (item: AttentionItem) => void;
}
