"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { AiWorkspace } from "@/components/ai/AiWorkspace";

export default function StudentAiPage() {
  const { profile } = useAuth();

  return (
    <div className="max-w-6xl mx-auto">
      <AiWorkspace
        portal="student"
        userName={profile?.name}
      />
    </div>
  );
}
