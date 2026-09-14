"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { AiWorkspace } from "@/components/ai/AiWorkspace";

export default function AdminAiPage() {
  const { profile } = useAuth();

  return (
    <div className="max-w-6xl mx-auto">
      <AiWorkspace
        portal="school_admin"
        schoolName={profile?.schoolId ? "Your School" : undefined}
        userName={profile?.name}
      />
    </div>
  );
}
