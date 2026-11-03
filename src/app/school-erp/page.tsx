import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader, RelatedModules } from "@/components/marketing";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Footer } from "@/components/footer";
import {
  constructPublicMetadata,
  getBreadcrumbSchema,
  getFaqSchema,
  getSoftwareAppSchema,
} from "@/lib/seo";

export const metadata: Metadata = constructPublicMetadata("/school-erp");

const modules = [
  {
    href: "/student-management",
    title: "Student records and admissions",
    text: "Start with a consistent student directory. Link admission numbers, class sections and academic sessions so attendance and fee records refer to the right student.",
  },
  {
    href: "/teacher-management",
    title: "Teachers and class assignments",
    text: "Keep faculty profiles and classroom responsibilities together. Review which staff members need access to each class before rolling out teacher accounts.",
  },
  {
    href: "/attendance-management",
    title: "Classroom attendance and reports",
    text: "Teachers record classroom attendance through their assigned portal. School staff can review attendance percentages and reports instead of maintaining disconnected registers.",
  },
  {
    href: "/fee-management",
    title: "Fees, collections and receipts",
    text: "Connect fee structures with student invoices, dues, receipts and ledgers. Review concessions, partial payments and refunds as distinct events when reconciling accounts.",
  },
  {
    href: "/school-management",
    title: "Daily school administration",
    text: "Use student records, staff assignments and notices together to coordinate everyday work. Role-based school, teacher and student portals give each user a focused workspace.",
  },
  {
    href: "/features",
    title: "Modules and plan access",
    text: "Review the available modules and compare them with your school's requirements. Check the current plan's limits and feature access before choosing an implementation scope.",
  },
];
const faqs = [
  {
    question: "What is cloud school ERP software?",
    answer:
      "School ERP software connects administrative workflows such as student records, staff assignments, attendance and fees. A cloud school ERP is accessed through an internet-connected browser rather than requiring a separate server at every school.",
  },
  {
    question: "How is a school ERP different from a student information system?",
    answer:
      "A student information system focuses on student records and related information. A school ERP connects those records with broader operations such as staff responsibilities, attendance and fee workflows. Check the actual modules and plan limits instead of relying only on the product label.",
  },
  {
    question: "Can a school use School Study on mobile devices?",
    answer:
      "School Study provides browser-based school, teacher and student portals. Visit the download page for current Android and web app installation options, and test the workflows your staff use on their own devices.",
  },
  {
    question: "How should a school evaluate ERP pricing?",
    answer:
      "Compare current subscription pricing, student and teacher limits, included modules and staff access. Review onboarding effort and your school's fee and reporting requirements. The pricing page shows the current available plans; request a walkthrough if you need help matching a plan to your school.",
  },
  {
    question: "What should we verify before importing school records?",
    answer:
      "Confirm academic sessions, class and section names, unique admission numbers and staff permissions. Use a separate test setup to review sample records and fee workflows. Keep a backup of the source data and reconcile totals before approving a live rollout.",
  },
];
const breadcrumbs = [
  { name: "Features", url: "/features" },
  { name: "Cloud School ERP", url: "/school-erp" },
];

export default function SchoolErpPage() {
  const jsonLd = [getBreadcrumbSchema(breadcrumbs), getSoftwareAppSchema(), getFaqSchema(faqs)];
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-gray-950 dark:text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <MarketingHeader currentPath="/school-erp" />
      <Breadcrumbs items={breadcrumbs} />
      <main id="main-content">
        <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-16 dark:from-slate-900 dark:to-gray-950 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              School Study cloud school ERP
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Cloud School ERP Software for Connected School Operations
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Bring student records, attendance, teachers and fees into connected school workflows.
              School Study helps staff work from shared records while giving school administrators,
              teachers and students their own portals.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Discuss your school&apos;s ERP needs
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Compare school ERP plans
              </Link>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-bold">What can your school manage in one ERP?</h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300">
            An ERP is useful when the same information serves more than one team. A student&apos;s
            class should inform the attendance register and fee structure; staff assignments should
            guide classroom access. Explore each workflow before deciding which modules to introduce
            first.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <article
                key={module.href}
                className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
              >
                <h3 className="text-xl font-bold">
                  <Link
                    href={module.href}
                    className="text-blue-700 hover:underline dark:text-blue-300"
                  >
                    {module.title}
                  </Link>
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {module.text}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="bg-slate-50 px-4 py-14 dark:bg-slate-900/50 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold">A practical school ERP implementation checklist</h2>
            <ol className="mt-6 list-decimal space-y-5 pl-6 leading-relaxed text-slate-700 dark:text-slate-300">
              <li>
                <strong>Map the school&apos;s daily work.</strong> List the people who maintain
                student records, take attendance, collect fees and approve changes. Agree who owns
                each task before creating accounts.
              </li>
              <li>
                <strong>Prepare a clean academic structure.</strong> Confirm sessions, classes,
                sections and unique admission numbers. Resolve duplicate records in the source
                spreadsheet before import.
              </li>
              <li>
                <strong>Run a representative demonstration.</strong> Follow one sample student from
                admission through attendance and fee collection. Check the receipt, outstanding
                balance and staff access rather than judging only the dashboard.
              </li>
              <li>
                <strong>Verify exceptions and reports.</strong> Test a partial payment, a concession
                and a refund in a separate test setup. Check that session filters and account totals
                match the expected records.
              </li>
              <li>
                <strong>Approve the rollout and train staff.</strong> Keep a backup, agree the
                starting balances and introduce the most important workflows first. Confirm that
                teachers and office staff can complete their tasks on their normal devices.
              </li>
            </ol>
            <p className="mt-6 leading-relaxed">
              Need an overview for a school committee?{" "}
              <Link
                href="/brochure"
                className="font-semibold text-blue-700 underline dark:text-blue-300"
              >
                Share the School Study product brochure
              </Link>{" "}
              and use the checklist to prepare questions for a demonstration.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-bold">School ERP questions answered</h2>
          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"
              >
                <summary className="cursor-pointer font-semibold">{faq.question}</summary>
                <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
        <RelatedModules currentPath="/school-erp" />
      </main>
      <Footer />
    </div>
  );
}
