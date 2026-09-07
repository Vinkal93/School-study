"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Play,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Video,
  HelpCircle,
  Tag,
} from "lucide-react";
import type { HelpVideo, HelpVideoCategory } from "@/types/help-video";
import { useAuth } from "@/hooks/use-auth";

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpCenterModal({ isOpen, onClose }: HelpCenterModalProps) {
  const { profile } = useAuth();
  const [videos, setVideos] = useState<HelpVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeVideo, setActiveVideo] = useState<HelpVideo | null>(null);

  // Fetch videos from API
  useEffect(() => {
    if (!isOpen) {
      setActiveVideo(null);
      return;
    }

    let isMounted = true;
    async function loadVideos() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/help-videos");
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.videos) {
            setVideos(data.videos);
          } else {
            setError(data.error || "Failed to load help tutorials");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to connect to help service");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVideos();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Categories list based on available videos
  const categories = useMemo(() => {
    const cats = new Set<string>();
    videos.forEach((v) => cats.add(v.category));
    return ["all", ...Array.from(cats)];
  }, [videos]);

  // Filtered videos
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (selectedCategory !== "all" && v.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = v.title.toLowerCase().includes(q);
        const matchDesc = v.description.toLowerCase().includes(q);
        const matchTags = v.tags?.some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchDesc || matchTags;
      }
      return true;
    });
  }, [videos, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  // Format embed url safely
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    // If it's a standard youtube watch url, convert to embed
    if (url.includes("youtube.com/watch?v=")) {
      const vid = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${vid}`;
    }
    if (url.includes("youtu.be/")) {
      const vid = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${vid}`;
    }
    return url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                  Interactive Knowledge Base
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/20 text-white">
                  {profile?.role ? profile.role.toUpperCase() : "PORTAL"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Help &amp; Video Tutorials
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
            aria-label="Close Help Center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tutorials..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Active Video Player View */}
          {activeVideo && (
            <div className="p-4 rounded-3xl bg-slate-950 text-white shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Now Playing • {activeVideo.category}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {activeVideo.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300 font-semibold"
                >
                  Close Player
                </button>
              </div>

              {/* Embed Container */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800">
                <iframe
                  src={getEmbedUrl(activeVideo.videoUrl)}
                  title={activeVideo.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {activeVideo.description}
              </p>
            </div>
          )}

          {/* Video Grid */}
          {loading ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              Loading video tutorials and interactive guides...
            </div>
          ) : error ? (
            <div className="p-8 text-center rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 text-xs font-medium">
              {error}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-3">
              <HelpCircle className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No tutorials found matching your search.
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try selecting &ldquo;all&rdquo; or clearing the search box to view all available system guides.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setActiveVideo(video)}
                  className="group relative rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
                >
                  {/* Thumbnail / Video Banner */}
                  <div className="relative aspect-video w-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/30 text-blue-400 flex items-center justify-center mx-auto mb-2 border border-blue-500/30 group-hover:scale-110 transition-transform">
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Video Walkthrough
                        </span>
                      </div>
                    )}

                    {/* Duration badge */}
                    {video.duration && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                        <Clock className="h-2.5 w-2.5" />
                        {video.duration}
                      </span>
                    )}

                    {/* Target role pill */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-600/90 text-white text-[9px] font-bold uppercase tracking-wider backdrop-blur-xs">
                      {video.targetRole}
                    </span>
                  </div>

                  {/* Body details */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {video.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    </div>

                    {/* Tags */}
                    {video.tags && video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {video.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-500 font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>School Study Interactive Learning &amp; Support</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold transition-all text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
