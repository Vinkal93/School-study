export interface ExperienceSettings {
  enableAdminWelcomeScreen: boolean;
  welcomeScreenDuration: number; // in seconds (e.g. 1.0, 1.5, 2.0, 3.0)
  showWelcomeBigText: boolean;
  welcomeTitleTemplate: string; // e.g. "Welcome, {name} 👋"
  welcomeSubtitleTemplate: string; // e.g. "Ready to manage your school today"
  enableRegistrationConfetti: boolean;
  confettiDuration: number; // in seconds
  enableFirstTimeOnboarding: boolean;
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
};
