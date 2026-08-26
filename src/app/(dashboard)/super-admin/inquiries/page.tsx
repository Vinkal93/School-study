"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import {
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  Clock,
  Building2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  schoolName: string;
  city?: string;
  message: string;
  status: "new" | "contacted" | "resolved";
  createdAt: any;
}

export default function InquiriesPage() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!firebaseUser || profile?.role !== "super_admin")) {
      router.push("/dashboard");
    }
  }, [firebaseUser, profile, authLoading, router]);

  useEffect(() => {
    if (profile?.role !== "super_admin") return;

    const q = query(
      collection(db, "contactInquiries"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Inquiry[];
      setInquiries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === "new"
        ? "contacted"
        : currentStatus === "contacted"
        ? "resolved"
        : "new";
    try {
      await updateDoc(doc(db, "contactInquiries", id), {
        status: nextStatus,
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (authLoading || (profile?.role === "super_admin" && loading)) {
    return (
      <div className="p-6 sm:p-8 w-full max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 w-full bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (profile?.role !== "super_admin") return null;

  return (
    <div className="p-6 sm:p-8 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-500" />
            Contact Inquiries
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Manage and respond to school onboarding requests and inquiries.
          </p>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No inquiries yet
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            When people submit the contact form, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {inquiries.map((inquiry) => (
            <div
              key={inquiry.id}
              className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 transition-all hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {inquiry.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {inquiry.schoolName}
                      </span>
                    </div>
                    {inquiry.city && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{inquiry.city}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>
                        {inquiry.createdAt
                          ? new Intl.DateTimeFormat("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(inquiry.createdAt.toDate())
                          : "Pending..."}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleStatus(inquiry.id, inquiry.status)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                    inquiry.status === "new"
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
                      : inquiry.status === "contacted"
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                      : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60"
                  }`}
                >
                  {inquiry.status}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Message
                  </span>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 whitespace-pre-wrap">
                    {inquiry.message}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">
                      Contact Details
                    </span>
                    <div className="space-y-3">
                      <a
                        href={`mailto:${inquiry.email}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                          {inquiry.email}
                        </span>
                      </a>
                      <a
                        href={`tel:${inquiry.phone.replace(/\s+/g, "")}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <Phone className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                          {inquiry.phone}
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
