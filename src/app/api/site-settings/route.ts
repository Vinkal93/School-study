import { NextResponse } from "next/server";
import {
  getPublicSiteSettings,
  computeAnnouncementStatus,
  SiteSettings,
} from "@/lib/cms/siteSettings";

export async function GET() {
  try {
    const rawSettings = await getPublicSiteSettings();
    const nowMs = Date.now();

    // 1. Filter announcements: ONLY return currently active and within valid date window
    const activeAnnouncements = (rawSettings.announcements || [])
      .filter((a) => {
        const status = computeAnnouncementStatus(a, nowMs);
        return status === "ACTIVE";
      })
      .sort((a, b) => (b.priority || 1) - (a.priority || 1));

    // 2. Filter FAQs: ONLY return active FAQs sorted by displayOrder
    const activeFaqs = (rawSettings.faqs || [])
      .filter((f) => f.active)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // 3. Filter Testimonials: ONLY return active testimonials sorted by displayOrder
    const activeTestimonials = (rawSettings.testimonials || [])
      .filter((t) => t.active)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // 4. Safe Public Projection
    const publicSettings: SiteSettings = {
      version: rawSettings.version || 1,
      updatedAt: rawSettings.updatedAt,
      updatedBy: "system", // Do not expose admin emails to public visitors
      status: "published",
      general: rawSettings.general,
      branding: rawSettings.branding,
      landing: rawSettings.landing,
      seo: rawSettings.seo,
      announcements: activeAnnouncements,
      faqs: activeFaqs,
      testimonials: activeTestimonials,
      legalContent: rawSettings.legalContent,
      header: rawSettings.header,
      footer: rawSettings.footer,
      contact: rawSettings.contact,
      socials: (rawSettings.socials || []).filter((s) => s.enabled),
      legal: (rawSettings.legal || []).filter((l) => l.enabled),
    };

    return NextResponse.json(
      { success: true, settings: publicSettings },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error("Public Site Settings GET Error:", error);
    return NextResponse.json(
      { error: "Failed to load public site settings: " + (error.message || "") },
      { status: 500 }
    );
  }
}
