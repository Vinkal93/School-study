"use client";

import React, { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";

export interface LogoutConfirmDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
  onLogoutSuccess?: () => void;
}

export function LogoutConfirmDialog({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  trigger,
  onLogoutSuccess,
}: LogoutConfirmDialogProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalOpen;

  const handleClose = () => {
    if (loggingOut) return;
    if (!isControlled) {
      setInternalOpen(false);
    }
    controlledOnClose?.();
  };

  const handleConfirmLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
      toast.success("Logged out successfully.");
      handleClose();
      onLogoutSuccess?.();
      router.push("/login");
    } catch (e: any) {
      console.error("[LogoutConfirmDialog] Logout error:", e);
      toast.error(e?.message || "Failed to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {trigger ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setInternalOpen(true);
          }}
          className="inline-block w-full cursor-pointer"
        >
          {trigger}
        </span>
      ) : !isControlled ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setInternalOpen(true)}
          className="gap-2 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Logout</span>
        </Button>
      ) : null}

      <ConfirmDialog
        isOpen={open}
        onClose={handleClose}
        onConfirm={handleConfirmLogout}
        title="Are you sure you want to log out?"
        description="You will be signed out of your administrative session. You can sign back in at any time with your credentials."
        icon={<LogOut className="h-6 w-6 stroke-[2.2]" />}
        severity="danger"
        confirmLabel={loggingOut ? "Signing out..." : "Yes, Logout"}
        cancelLabel="No, Stay Logged In"
        isLoading={loggingOut}
      />
    </>
  );
}
