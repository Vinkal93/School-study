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
  User,
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
      { label: "Core Features", href: "/features", icon: Sparkles },
      { label: "School Management", href: "/school-management", icon: School },
      { label: "School ERP", href: "/school-erp", icon: Workflow },
      { label: "Multi-Tenant Security", href: "/super-admin/login", icon: ShieldCheck, badge: "Enterprise" },
    ],
  },
  {
    id: "modules",
    title: "Key Modules",
    links: [
      { label: "Student Management", href: "/student-management", icon: Users },
      { label: "Teacher Management", href: "/teacher-management", icon: GraduationCap },
      { label: "Attendance Automation", href: "/attendance-management", icon: ClipboardCheck },
      { label: "About Developer", href: "/about-developer", icon: User, badge: "Creator" },
      { label: "Contact & Support", href: "/contact", icon: Headphones },
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
    id: "legal",
    title: "Trust & Legal",
    links: [
      { label: "Privacy Policy", href: "#", icon: Shield },
      { label: "Terms of Service", href: "#", icon: FileText },
      { label: "Tenant Isolation", href: "/school-erp", icon: Lock },
      { label: "Platform Status", href: "/contact", icon: ShieldCheck },
    ],
  },
];

export const FOOTER_CONTACT = {
  email: "sbci224234@gmail.com",
  phone: "+91 9118245636",
  address: "School Study Platform, India",
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
