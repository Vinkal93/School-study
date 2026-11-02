"use client";

import React from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  entityType?: string;
  entityName?: string;
  itemName?: string;
  entityId?: string;
  itemId?: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  isDeleting?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  entityType = "Record",
  entityName,
  itemName,
  entityId,
  itemId,
  description,
  message,
  confirmLabel = "Delete",
  isDeleting = false,
}: ConfirmDeleteModalProps) {
  const resolvedEntityName = entityName || itemName || "Record";
  const resolvedEntityId = entityId || itemId;
  const resolvedDescription =
    message ||
    description ||
    "This action cannot be undone. Associated data will be archived or removed according to platform policy.";
  const resolvedTitle = title || `Delete ${entityType}?`;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={resolvedTitle}
      description={resolvedDescription}
      entityType={entityType}
      entityName={resolvedEntityName}
      entityId={resolvedEntityId}
      confirmLabel={confirmLabel}
      cancelLabel="Cancel"
      isLoading={isDeleting}
      severity="danger"
    />
  );
}
