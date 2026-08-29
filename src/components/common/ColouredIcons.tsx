import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * Modern Vibrant Coloured Icons (inspired by coloured-icons).
 * Multi-tone, high-contrast SVG vector icons for SaaS features and portals.
 */

export function StudentColourIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <circle cx="16" cy="16" r="15" fill="#EEF2FF" />
      <path d="M16 6L6 11L16 16L26 11L16 6Z" fill="#4F46E5" />
      <path d="M10 13.2V19.5C10 22.8 12.7 25.5 16 25.5C19.3 25.5 22 22.8 22 19.5V13.2L16 16.2L10 13.2Z" fill="#6366F1" />
      <path d="M26 11V18" stroke="#4338CA" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="26" cy="19" r="1.5" fill="#F59E0B" />
    </svg>
  );
}

export function TeacherColourIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <circle cx="16" cy="16" r="15" fill="#ECFDF5" />
      <rect x="7" y="8" width="18" height="13" rx="2" fill="#10B981" />
      <path d="M10 12H18M10 15H15" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="23" r="3" fill="#059669" />
      <path d="M11 28C11 25.5 13.2 24.5 16 24.5C18.8 24.5 21 25.5 21 28" fill="#047857" />
    </svg>
  );
}

export function AttendanceColourIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <circle cx="16" cy="16" r="15" fill="#EFF6FF" />
      <rect x="8" y="7" width="16" height="19" rx="3" fill="#3B82F6" />
      <rect x="12" y="5" width="8" height="4" rx="1.5" fill="#1D4ED8" />
      <path d="M12 13L15 16L20 11" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19H20M12 22H17" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AnalyticsColourIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <circle cx="16" cy="16" r="15" fill="#FAF5FF" />
      <path d="M8 24V18" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 24V14" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 24V10" stroke="#7E22CE" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M23 24V16" stroke="#C084FC" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 13L13 9L18 13L24 7" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BillingColourIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <circle cx="16" cy="16" r="15" fill="#FEF3C7" />
      <rect x="6" y="9" width="20" height="14" rx="3" fill="#F59E0B" />
      <rect x="6" y="12" width="20" height="3" fill="#D97706" />
      <circle cx="11" cy="19" r="1.5" fill="#FEF3C7" />
      <rect x="15" y="18" width="7" height="2" rx="1" fill="#FEF3C7" />
    </svg>
  );
}

export function SecurityColourIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <circle cx="16" cy="16" r="15" fill="#ECFDF5" />
      <path d="M16 6L8 10V16C8 21.5 11.4 25.8 16 27C20.6 25.8 24 21.5 24 16V10L16 6Z" fill="#10B981" />
      <path d="M13 16L15.5 18.5L20 13.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppDownloadColourIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <circle cx="16" cy="16" r="15" fill="#E0F2FE" />
      <rect x="9" y="6" width="14" height="20" rx="3" fill="#0284C7" />
      <circle cx="16" cy="22" r="1" fill="#FFFFFF" />
      <path d="M16 11V17M16 17L13.5 14.5M16 17L18.5 14.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NoticeColourIcon({ size = 24, className = "", ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} {...props}>
      <circle cx="16" cy="16" r="15" fill="#FFF1F2" />
      <path d="M16 7C12.7 7 10 9.7 10 13V18L8 20V21H24V20L22 18V13C22 9.7 19.3 7 16 7Z" fill="#F43F5E" />
      <path d="M14 23C14 24.1 14.9 25 16 25C17.1 25 18 24.1 18 23" fill="#BE123C" />
    </svg>
  );
}
