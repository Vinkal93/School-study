"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { Bell, AlertTriangle, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export interface SubscriptionExpiringDialogProps {
  daysRemaining?: number;
  planName?: string;
  trigger?: React.ReactNode;
  autoOpenIfExpiring?: boolean;
}

export function SubscriptionExpiringDialog({
  daysRemaining = 2,
  planName = "Pro",
  trigger,
  autoOpenIfExpiring = false,
}: SubscriptionExpiringDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoOpenIfExpiring && daysRemaining <= 7 && daysRemaining >= 0) {
      // Check if user clicked "remind me later" in this session
      const dismissed = sessionStorage.getItem("dismiss_sub_expiring_prompt");
      if (!dismissed) {
        setOpen(true);
      }
    }
  }, [autoOpenIfExpiring, daysRemaining]);

  const handleRemindLater = () => {
    sessionStorage.setItem("dismiss_sub_expiring_prompt", "true");
    setOpen(false);
  };

  const handleUpdatePayment = () => {
    setOpen(false);
    router.push("/admin/billing");
  };

  const getExpiryBadgeText = () => {
    if (daysRemaining <= 1) return "Expires in 1 day";
    if (daysRemaining <= 2) return "Expires in 2 days";
    if (daysRemaining <= 7) return `Expires in ${daysRemaining} days`;
    if (daysRemaining <= 30) return `Expires in ${Math.round(daysRemaining / 7)} weeks`;
    return `Expires in ${Math.round(daysRemaining / 30)} month`;
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <AlertDialogTrigger render={trigger} />
      ) : (
        <AlertDialogTrigger
          render={
            <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs">
              <Bell className="h-3.5 w-3.5 mr-1.5" />
              Subscription Notice
            </Button>
          }
        />
      )}

      <AlertDialogContent className="gap-0 p-0 sm:max-w-sm overflow-hidden">
        <div className="mx-auto flex flex-col items-center justify-center gap-2.5 p-8">
          <AlertDialogMedia className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 h-14 w-14 rounded-full flex items-center justify-center shadow-inner">
            <Bell className="h-7 w-7" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-center text-base sm:text-lg font-bold">
            Subscription Expiring Soon
          </AlertDialogTitle>
          <Badge
            variant={daysRemaining <= 3 ? "destructive-light" : "warning"}
            className="font-semibold text-xs px-3 py-1 rounded-full"
          >
            {getExpiryBadgeText()}
          </Badge>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 flex flex-col items-center justify-center gap-5 rounded-b-2xl p-6 border-t border-slate-100 dark:border-slate-800">
          <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-center text-xs sm:text-sm">
            Your current <strong>{planName} Plan</strong> will expire in{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {daysRemaining <= 1 ? "24 hours" : `${daysRemaining} days`}
            </span>
            . Renew or update your payment method now to ensure uninterrupted access to all school operations and premium features.
          </AlertDialogDescription>

          <AlertDialogFooter className="-mx-6 -mb-6 gap-3 self-stretch rounded-b-2xl p-6 border-t border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900">
            <AlertDialogCancel
              variant="outline"
              onClick={handleRemindLater}
              className="w-full text-xs font-semibold py-2.5"
            >
              Remind Me Later
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleUpdatePayment}
              className="w-full text-xs font-semibold py-2.5 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
            >
              Renew / Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
