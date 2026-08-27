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
      className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-800 dark:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
    >
      <Menu className="h-6 w-6 stroke-[2.2]" />
    </button>
  );
}
