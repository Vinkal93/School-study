"use client";

import React, { createContext, useContext, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface FileUploadContextType {
  openFilePicker: () => void;
  isDragging: boolean;
  accept?: string;
}

const FileUploadContext = createContext<FileUploadContextType | null>(null);

export interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
  accept?: string;
  children: React.ReactNode;
  className?: string;
}

export function FileUpload({ onFilesAdded, accept, children, className }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  return (
    <FileUploadContext.Provider value={{ openFilePicker, isDragging, accept }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn("relative w-full", className)}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        {children}
      </div>
    </FileUploadContext.Provider>
  );
}

export function FileUploadTrigger({
  asChild,
  children,
  className,
}: {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(FileUploadContext);
  if (!ctx) throw new Error("FileUploadTrigger must be within FileUpload");

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: any) => {
        (children as any).props?.onClick?.(e);
        ctx.openFilePicker();
      },
    });
  }

  return (
    <button
      type="button"
      onClick={ctx.openFilePicker}
      className={cn("cursor-pointer focus:outline-none", className)}
    >
      {children}
    </button>
  );
}

export function FileUploadContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(FileUploadContext);
  if (!ctx?.isDragging) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 rounded-2xl bg-indigo-950/20 backdrop-blur-xs border-2 border-dashed border-indigo-500 flex items-center justify-center p-4 pointer-events-none animate-in fade-in duration-150",
        className
      )}
    >
      {children}
    </div>
  );
}
