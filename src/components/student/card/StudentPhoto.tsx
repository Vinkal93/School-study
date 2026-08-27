"use client";

import React, { useState } from "react";
import { User } from "lucide-react";

interface StudentPhotoProps {
  photoUrl?: string;
  fullName: string;
}

export function StudentPhoto({ photoUrl, fullName }: StudentPhotoProps) {
  const [hasError, setHasError] = useState(false);
  const initialLetter = fullName ? fullName.trim().charAt(0).toUpperCase() : "S";

  return (
    <div className="relative w-24 sm:w-28 md:w-32 h-28 sm:h-32 md:h-36 shrink-0 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-center">
      {photoUrl && !hasError ? (
        <img
          src={photoUrl}
          alt={`${fullName}'s profile photo`}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover object-center rounded-2xl transition-opacity duration-300"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-800 text-white flex flex-col items-center justify-center gap-1 p-2 rounded-2xl">
          <User className="h-10 w-10 sm:h-12 sm:w-12 text-white/90" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/80">
            {initialLetter}
          </span>
        </div>
      )}
    </div>
  );
}
