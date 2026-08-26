import {
  LayoutDashboard,
  Sparkles,
  Workflow,
  ShieldCheck,
  BarChart3,
  School,
  UserCog,
  GraduationCap,
  BookOpen,
  Shield,
  Users,
  ClipboardCheck,
  Bell,
  Headphones,
  FileText,
  Lock,
  Mail,
  Phone,
  MapPin,
  HelpCircle,
  LucideIcon,
} from "lucide-react";

export interface FooterLinkItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  isExternal?: boolean;
}

export interface FooterGroup {
  id: string;
  title: string;
  links: FooterLinkItem[];
}

export const FOOTER_NAVIGATION: FooterGroup[] = [
  {
    id: "product",
    title: "Product",
    links: [
      { label: "Platform Overview", href: "/", icon: LayoutDashboard },
      { label: "Core Features", href: "#features", icon: Sparkles },
      { label: "System Modules", href: "#modules", icon: Workflow },
      { label: "Institutional Security", href: "/super-admin/login", icon: ShieldCheck, badge: "Enterprise" },
      { label: "Operational Analytics", href: "/admin", icon: BarChart3 },
    ],
  },
  {
    id: "solutions",
    title: "Access Portals",
    links: [
      { label: "School Admin Portal", href: "/admin/login", icon: UserCog },
      { label: "Teacher Workspace", href: "/teacher/login", icon: GraduationCap },
      { label: "Student & Parent Hub", href: "/student/login", icon: BookOpen, badge: "Fast Sign-in" },
      { label: "Multi-Tenant Fleet", href: "/super-admin/schools", icon: School },
      { label: "Super Admin Gateway", href: "/super-admin/login", icon: Shield },
    ],
  },
  {
    id: "modules",
    title: "Key Modules",
    links: [
      { label: "Student Directory", href: "/admin/students", icon: Users },
      { label: "Attendance Automation", href: "/admin/attendance", icon: ClipboardCheck },
      { label: "Faculty Management", href: "/admin/teachers", icon: GraduationCap },
      { label: "Broadcast Notices", href: "/admin/notices", icon: Bell },
      { label: "Help & Setup Guide", href: "/setup-super-admin", icon: HelpCircle },
    ],
  },
  {
    id: "legal",
    title: "Trust & Legal",
    links: [
      { label: "Privacy Policy", href: "#", icon: Shield },
      { label: "Terms of Service", href: "#", icon: FileText },
      { label: "Tenant Isolation", href: "#", icon: Lock },
      { label: "Compliance & Security", href: "#", icon: ShieldCheck },
    ],
  },
];

export const FOOTER_CONTACT = {
  email: "support@schoolstudy.in",
  phone: "+91 12345 67890",
  address: "123, Education Street, Learning City, India",
};

export const FOOTER_SOCIALS = [
  {
    name: "LinkedIn",
    href: "https://linkedin.com",
    ariaLabel: "Visit School Study on LinkedIn",
  },
  {
    name: "YouTube",
    href: "https://youtube.com",
    ariaLabel: "Watch School Study demos on YouTube",
  },
  {
    name: "X (Twitter)",
    href: "https://x.com",
    ariaLabel: "Follow School Study on X",
  },
  {
    name: "Facebook",
    href: "https://facebook.com",
    ariaLabel: "Connect with School Study on Facebook",
  },
];
