"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { AiWorkspace } from "@/components/ai/AiWorkspace";

export default function AdminAiPage() {
  const { profile } = useAuth();

  return (
    <div className="h-full w-full overflow-hidden">
      <AiWorkspace
        portal="school_admin"
        schoolName={profile?.schoolId ? profile?.name || "Your School" : undefined}
        userName={profile?.name}
      />
    </div>
  );
}
