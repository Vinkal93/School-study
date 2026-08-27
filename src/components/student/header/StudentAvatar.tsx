"use client";

import React, { useState } from "react";
import Link from "next/link";

interface StudentAvatarProps {
  fullName: string;
  photoUrl?: string;
  onClick?: () => void;
}

export function StudentAvatar({ fullName, photoUrl, onClick }: StudentAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initialLetter = fullName ? fullName.trim().charAt(0).toUpperCase() : "S";

  const content = (
    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm active:scale-95 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0 bg-slate-200 dark:bg-slate-800">
      {photoUrl && !imageError ? (
        <img
          src={photoUrl}
          alt={`${fullName}'s profile photo`}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center rounded-full">
          {initialLetter}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={`View profile for ${fullName}`}>
        {content}
      </button>
    );
  }

  return (
    <Link href="/student/profile" aria-label={`View profile for ${fullName}`}>
      {content}
    </Link>
  );
}
