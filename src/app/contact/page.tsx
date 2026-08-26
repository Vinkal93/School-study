import type { Metadata } from "next";
import Link from "next/link";
import {
  Mail,
  Phone,
  Headphones,
  ShieldCheck,
  ArrowRight,
  Clock,
  MapPin,
  Sparkles,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import { constructMetadata, siteConfig, getBreadcrumbSchema } from "@/lib/seo";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = constructMetadata({
  title: "Contact Support & Inquiries | School Study",
  description:
    "Get in touch with School Study. Contact our official support team via email or phone for institutional onboarding, technical assistance, or product questions.",
  canonicalUrl: "/contact",
});

export default function ContactPage() {
  const breadcrumbData = [
    { name: "Contact", url: "/contact" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact School Study Support",
      description:
        "Official contact and support information for School Study school management software.",
      url: `${siteConfig.url}/contact`,
      mainEntity: {
        "@type": "Organization",
        name: siteConfig.name,
        email: siteConfig.supportEmail,
        telephone: siteConfig.supportPhone,
        url: siteConfig.url,
        contactPoint: {
          "@type": "ContactPoint",
          telephone: siteConfig.supportPhone,
          email: siteConfig.supportEmail,
          contactType: "Customer Support",
        },
      },
    },
    getBreadcrumbSchema(breadcrumbData),
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-slate-900 dark:text-slate-100 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingHeader currentPath="/contact" />
      <Breadcrumbs items={breadcrumbData} />

      <main id="main-content">
        {/* Hero Section */}
        <section className="relative pt-10 pb-20 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-sm mb-6">
              <Headphones className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Official Support & Inquiries</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-3xl mx-auto leading-tight">
              Get in Touch with School Study
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Have questions regarding school onboarding, feature setup, or need technical assistance? Our dedicated support team is here to assist you directly.
            </p>
          </div>
        </section>

        {/* Contact Content Section */}
        <section className="py-16 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">
              {/* Left Column: Contact Form */}
              <div>
                <ContactForm />
              </div>

              {/* Right Column: Contact Info Cards */}
              <div className="space-y-6">
                {/* Email Support */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-4">
                    <Mail className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Email Support
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Send your questions, school registration inquiries, or feedback directly to our team.
                  </p>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Official Email Address
                    </span>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {siteConfig.supportEmail}
                    </p>
                  </div>
                  <div className="mt-6">
                    <a
                      href={`mailto:${siteConfig.supportEmail}`}
                      aria-label="Email School Study support"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all active:scale-95"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Send Us an Email</span>
                    </a>
                  </div>
                </div>

                {/* Phone Support */}
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 mb-4">
                    <Phone className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Phone & Helpline
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Speak directly with our team for urgent institutional inquiries or platform onboarding.
                  </p>
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Helpline Number
                    </span>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {siteConfig.supportPhone}
                    </p>
                  </div>
                  <div className="mt-6">
                    <a
                      href={`tel:${siteConfig.supportPhone.replace(/\s+/g, "")}`}
                      aria-label="Call School Study support"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      <Phone className="h-4 w-4" />
                      <span>Call Support Helpline</span>
                    </a>
                  </div>
                </div>

                {/* Additional Info Box */}
                <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 text-center dark:border-slate-800 dark:bg-slate-900/40">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Learn About the Creator
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Read about Vinkal Prajapati, his engineering background, and why School Study was created.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/about-developer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <span>Visit About Developer Page</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
