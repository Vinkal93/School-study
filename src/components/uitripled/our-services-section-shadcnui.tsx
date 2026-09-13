"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import {
  GraduationCap,
  ClipboardCheck,
  CreditCard,
  Clock,
  FileText,
  ShieldCheck,
} from "lucide-react";

const services = [
  {
    icon: GraduationCap,
    title: "Student Lifecycle & SIS",
    description:
      "Complete student record management from online admission inquiries to digital documentation and alumni tracking.",
    badge: "Essential",
  },
  {
    icon: ClipboardCheck,
    title: "Smart Attendance & SMS Alerts",
    description:
      "One-tap daily roll call for teachers with automatic real-time SMS / WhatsApp notifications to parents of absent students.",
    badge: "Automated",
  },
  {
    icon: CreditCard,
    title: "Fee Collection & Razorpay",
    description:
      "Configure multiple fee heads, send digital invoices, track defaulters, and collect payments online with instant GST receipts.",
    badge: "Popular",
  },
  {
    icon: Clock,
    title: "AI Timetable & Period Bells",
    description:
      "Smart clash-free schedule generation for classrooms and faculty, automatic substitution management, and audio period bells.",
    badge: "Smart AI",
  },
  {
    icon: FileText,
    title: "Exams & CBSE/ICSE Report Cards",
    description:
      "Manage examination schedules, enter subject marks, configure grading scales, and generate compliant printable report cards.",
    badge: "Board Ready",
  },
  {
    icon: ShieldCheck,
    title: "Multi-Tenant Cloud & Security",
    description:
      "Role-based access control for Admins, Teachers, Students & Parents, automated daily cloud backups, and PIN data safety.",
    badge: "Ultra Secure",
  },
];

export function OurServicesSection() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section className="bg-background px-4 py-20 md:py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <Badge className="mb-4">School ERP Modules</Badge>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl text-foreground">
            Everything Your School Needs to Flourish
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Comprehensive, interconnected modules tailored specifically for modern Indian schools, institutes, and colleges.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div key={service.title} variants={itemVariants}>
                <Card className="group relative h-full border-2 p-6 transition-all hover:border-primary hover:shadow-xl bg-card">
                  {service.badge && (
                    <Badge className="absolute -right-2 -top-2">
                      {service.badge}
                    </Badge>
                  )}
                  <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 transition-transform group-hover:scale-110">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-foreground">
                    {service.title}
                  </h3>
                  <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
                    {service.description}
                  </p>
                  <Link href="/features">
                    <Button variant="ghost" size="sm" className="group/btn text-primary font-bold">
                      Explore Module
                      <motion.span
                        className="ml-1 inline-block"
                        whileHover={{ x: 5 }}
                      >
                        →
                      </motion.span>
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
