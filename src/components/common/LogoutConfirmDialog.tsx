"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Shield, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export interface LogoutConfirmDialogProps {
  trigger?: React.ReactNode;
  onLogoutSuccess?: () => void;
}

export function LogoutConfirmDialog({ trigger, onLogoutSuccess }: LogoutConfirmDialogProps) {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setOpen(false);
      onLogoutSuccess?.();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <AlertDialogTrigger render={trigger} />
      ) : (
        <AlertDialogTrigger
          render={
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </Button>
          }
        />
      )}

      <AlertDialogContent
        size="sm"
        className="gap-0 overflow-hidden p-0 sm:max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
      >
        <div className="flex flex-col items-center justify-center gap-2 p-8">
          <AlertDialogMedia className="rounded-full h-12 w-12 bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 flex items-center justify-center shadow-xs">
            <Shield className="h-6 w-6 stroke-[2.2]" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-center text-base font-bold text-slate-900 dark:text-white pt-1">
            Are you sure?
          </AlertDialogTitle>
          <AlertDialogDescription className="p-0 text-center text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
            You can always log in later to your account.
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter className="grid flex-none grid-cols-2 gap-0 divide-x divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-0 bg-slate-50/50 dark:bg-slate-950/40">
          <AlertDialogCancel
            variant="ghost"
            className="h-12 flex-1 rounded-none border-0 border-r border-slate-100 dark:border-slate-800 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold text-xs sm:text-sm"
          >
            No
          </AlertDialogCancel>
          <AlertDialogAction
            variant="ghost"
            onClick={handleConfirmLogout}
            className="h-12 flex-1 rounded-none border-0 p-0 text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold text-xs sm:text-sm hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            {loggingOut ? "Logging out..." : "Yes, Logout"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
