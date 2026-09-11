export interface ExperienceSettings {
  // 1. Welcome & Onboarding
  enableAdminWelcomeScreen: boolean;
  welcomeScreenDuration: number; // in seconds (e.g. 1.0, 1.5, 2.0, 3.0)
  showWelcomeBigText: boolean;
  welcomeTitleTemplate: string; // e.g. "Welcome, {name} 👋"
  welcomeSubtitleTemplate: string; // e.g. "Ready to manage your school today"
  enableRegistrationConfetti: boolean;
  confettiDuration: number; // in seconds
  enableFirstTimeOnboarding: boolean;

  // 2. Collapsible Sidebar & Navigation Controls (@reui/c-collapsible-9 pattern)
  sidebarMode: "collapsible_rail" | "default_expanded" | "floating_compact";
  enableCollapsibleSidebar: boolean;
  collapsiblePortals: {
    schoolAdmin: boolean;
    superAdmin: boolean;
    teacher: boolean;
    student: boolean;
  };
  enableSidebarAutoCollapseOnMobile: boolean;
  showSidebarBadges: boolean;

  // 3. Accessibility & Display
  highContrastMode: boolean;
  reducedMotion: boolean;
  fontSizePreference: "normal" | "large" | "extra_large";
  enableRealtimeSync: boolean;

  // 4. Analytics & Dashboard Charts (@reui/c-chart-1, 11, 13, 17, 22, 23, 25)
  enableDashboardCharts: boolean;
  dashboardChartStyle: "gradient_area" | "multi_bar" | "radial_donut" | "all_interactive";

  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_EXPERIENCE_SETTINGS: ExperienceSettings = {
  enableAdminWelcomeScreen: true,
  welcomeScreenDuration: 2.0,
  showWelcomeBigText: true,
  welcomeTitleTemplate: "Welcome, {name} 👋",
  welcomeSubtitleTemplate: "School Administrator Workspace",
  enableRegistrationConfetti: true,
  confettiDuration: 3,
  enableFirstTimeOnboarding: true,

  sidebarMode: "collapsible_rail",
  enableCollapsibleSidebar: true,
  collapsiblePortals: {
    schoolAdmin: true,
    superAdmin: true,
    teacher: true,
    student: false,
  },
  enableSidebarAutoCollapseOnMobile: true,
  showSidebarBadges: true,

  highContrastMode: false,
  reducedMotion: false,
  fontSizePreference: "normal",
  enableRealtimeSync: true,

  enableDashboardCharts: true,
  dashboardChartStyle: "all_interactive",
};

