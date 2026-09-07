export type HelpVideoCategory =
  | "general"
  | "attendance"
  | "exams"
  | "homework"
  | "fees"
  | "complaints"
  | "system"
  | "super_admin";

export type HelpVideoRole =
  | "all"
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "student";

export interface HelpVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: HelpVideoCategory;
  targetRole: HelpVideoRole;
  duration?: string;
  tags?: string[];
  published: boolean;
  displayOrder?: number;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

export interface CreateHelpVideoInput {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: HelpVideoCategory;
  targetRole: HelpVideoRole;
  duration?: string;
  tags?: string[];
  published?: boolean;
  displayOrder?: number;
}

export interface UpdateHelpVideoInput {
  title?: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  category?: HelpVideoCategory;
  targetRole?: HelpVideoRole;
  duration?: string;
  tags?: string[];
  published?: boolean;
  displayOrder?: number;
}
