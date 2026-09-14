"use client";

import React from "react";
import { MessageSquare, Plus, Trash2, X, Clock } from "lucide-react";
import type { AiConversation } from "@/types/ai";

interface AiConversationListProps {
  conversations: AiConversation[];
  activeConversationId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function AiConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onNewChat,
  onDelete,
  isOpen,
  onClose,
}: AiConversationListProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-sm bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col z-10 border-l border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Conversation History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No past conversations found.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                    isActive
                      ? "bg-indigo-50/80 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800"
                      : "bg-gray-50/60 hover:bg-gray-100/80 border-transparent dark:bg-gray-800/40 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => {
                    onSelect(conv.id);
                    onClose();
                  }}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive
                          ? "text-indigo-900 dark:text-indigo-200"
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {conv.title || "Untitled Conversation"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation?")) {
                        onDelete(conv.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
