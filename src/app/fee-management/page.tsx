import Link from "next/link";
import { MarketingHeader, RelatedModules } from "@/components/marketing";
import { Footer } from "@/components/footer";
import { constructMetadata, getBreadcrumbSchema, getFaqSchema } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "School Fee Management Software: Collection, Receipts & Ledgers",
  description: "Organize school fee structures, student dues, collections, receipts, concessions and ledgers with School Study. Explore the workflow and request a demo.",
  canonicalUrl: "/fee-management",
});

const workflows = [
  ["Define fees for an academic session", "Set up fee heads, class structures and billing periods. Keep the academic session consistent when reviewing student charges and collections."],
  ["Review student invoices and dues", "Check each student's billed amount, concessions, payments and outstanding balance before accepting a collection. Dues reports help staff plan follow-ups."],
  ["Collect fees and issue receipts", "Record the payment against outstanding invoices using an enabled payment method. Keep the receipt connected to the collection and the student's ledger."],
  ["Review concessions and refunds", "Record the reason for a concession or adjustment. A concession reduces what a student owes; a refund records money returned. Review both separately from new collections."],
  ["Reconcile school accounts", "Compare student ledgers, cash and bank movements, and accounting reports for the same session and date range. Review partial payments and refunds when checking totals."],
];
const faqs = [
  { question: "What is school fee management software?", answer: "School fee management software connects fee structures, student invoices, collections, receipts, dues and account records so school staff can review the fee lifecycle in one place." },
  { question: "How are fees connected to the school ERP?", answer: "School Study connects fee records with student profiles, class information and academic sessions. Staff can review collections and dues alongside school administration workflows." },
  { question: "What should a school check during a fee software demo?", answer: "Ask to see a partial payment, a concession, a refund and the corresponding receipt and ledger. Check session filters, payment methods, staff permissions and account reconciliation with your school's own workflow." },
];

export default function FeeManagementPage() {
  return <div className="min-h-screen bg-white text-slate-900 dark:bg-gray-950 dark:text-slate-100">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([getBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Fee Management", url: "/fee-management" }]), getFaqSchema(faqs)]).replace(/</g, "\\u003c") }} />
    <MarketingHeader currentPath="/fee-management" />
    <main id="main-content">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="mb-4 font-semibold text-blue-600">School Study · School finance</p>
        <h1 className="text-4xl font-bold leading-tight">School Fee Management Software</h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed">Bring student fees, collections, receipts and ledgers into a connected school workflow. School Study helps school administrators review what was billed, what was collected and what remains due for each academic session.</p>
        <div className="mt-8 flex gap-6"><Link href="/contact" className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Request a school demo</Link><Link href="/pricing" className="py-3 font-semibold">View pricing</Link></div>
      </section>
      <section className="mx-auto max-w-5xl px-6 pb-16"><h2 className="mb-8 text-3xl font-bold">From fee structure to school accounts</h2><div className="grid gap-6 md:grid-cols-2">{workflows.map(([title, text]) => <article key={title} className="rounded-2xl border border-slate-200 p-6 dark:border-slate-700"><h3 className="text-xl font-semibold">{title}</h3><p className="mt-3 leading-relaxed">{text}</p></article>)}</div></section>
      <section className="mx-auto max-w-5xl px-6 pb-16"><h2 className="mb-6 text-3xl font-bold">Choosing fee software for your school</h2><p className="leading-relaxed">Start with your fee heads, installment schedule, concession policy and reconciliation process. During onboarding, confirm payment configuration and staff access before recording live collections. Compare reports using the same session and dates, and review how existing balances will be imported.</p><p className="mt-4">Explore the wider <Link href="/school-erp" className="text-blue-600 underline">school ERP software</Link> and connected <Link href="/student-management" className="text-blue-600 underline">student management system</Link>.</p></section>
      <section className="mx-auto max-w-5xl px-6 pb-16"><h2 className="mb-6 text-3xl font-bold">Frequently asked questions</h2>{faqs.map(faq => <article key={faq.question} className="mb-6"><h3 className="text-xl font-semibold">{faq.question}</h3><p className="mt-2 leading-relaxed">{faq.answer}</p></article>)}</section>
      <RelatedModules currentPath="/fee-management" />
    </main><Footer />
  </div>;
}
