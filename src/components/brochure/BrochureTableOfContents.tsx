"use client";

import { useState, useEffect } from "react";
import { ListCollapse, ChevronRight } from "lucide-react";

interface TocItem {
  id: string;
  num: string;
  title: string;
}

const TOC_ITEMS: TocItem[] = [
  { id: "section-1-hero", num: "01", title: "Overview" },
  { id: "section-2-problem-solution", num: "02", title: "Problems & Solutions" },
  { id: "section-3-architecture", num: "03", title: "Architecture & Security" },
  { id: "section-4-students", num: "04", title: "Student Lifecycle" },
  { id: "section-5-fees", num: "05", title: "Smart Fees & Billing" },
  { id: "section-6-attendance", num: "06", title: "Attendance & Roll-Call" },
  { id: "section-7-academics", num: "07", title: "Academics & Timetables" },
  { id: "section-8-communication", num: "08", title: "Notice Board & Comms" },
  { id: "section-9-reports", num: "09", title: "Executive Dashboards" },
  { id: "section-10-roles", num: "10", title: "Role Portals" },
  { id: "section-11-why-us", num: "11", title: "Why School Study & ROI" },
  { id: "section-12-cta", num: "12", title: "Live Demo & Contact" },
];

export function BrochureTableOfContents() {
  const [activeId, setActiveId] = useState<string>("section-1-hero");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      for (let i = TOC_ITEMS.length - 1; i >= 0; i--) {
        const el = document.getElementById(TOC_ITEMS[i].id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveId(TOC_ITEMS[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: topOffset, behavior: "smooth" });
    }
  };

  return (
    <div className="sticky top-18 sm:top-20 z-30 mb-8 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 print:hidden">
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md p-2 shadow-sm">
        {/* Desktop Horizontal Scrollable Strip */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider px-3 whitespace-nowrap">
            Sections (12):
          </span>
          {TOC_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="opacity-70 mr-1.5">{item.num}</span>
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile / Tablet Accordion Dropdown */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center gap-2">
              <ListCollapse className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Table of Contents:</span>
              <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                {TOC_ITEMS.find((t) => t.id === activeId)?.title || "Overview"}
              </span>
            </div>
            <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>

          {open && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 max-h-60 overflow-y-auto">
              {TOC_ITEMS.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="opacity-70 text-[10px]">{item.num}</span>
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
