"use client";

import React from "react";
import { Menu } from "lucide-react";

interface MenuButtonProps {
  onClick: () => void;
}

export function MenuButton({ onClick }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation menu"
      className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/70 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0 cursor-pointer shadow-xs border border-slate-200/50 dark:border-slate-700/50"
    >
      <Menu className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.2]" />
    </button>
  );
}
