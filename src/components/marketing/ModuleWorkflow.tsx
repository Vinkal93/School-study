import Link from "next/link";
import { getFaqSchema } from "@/lib/seo/schema";

const guides = {
  "/school-management": {
    heading: "How to introduce school management software",
    steps: [
      [
        "Agree responsibilities",
        "Identify who maintains student records, allocates teachers, reviews attendance and follows up fee dues. Give each staff member the access needed for their role.",
      ],
      [
        "Prepare the academic session",
        "Check the session, class and section names before entering students. Keep admission numbers consistent across the directory and the records used by office staff.",
      ],
      [
        "Introduce connected workflows",
        "Review a sample student profile, classroom attendance entry and fee record with your team. Confirm the reports and mobile screens staff will use before a full rollout.",
      ],
    ],
    faqs: [
      {
        question: "What is school management software used for?",
        answer:
          "School management software organizes daily administrative work, including student records, teacher assignments, attendance and school notices. Connected modules reduce the need to maintain the same information in separate registers.",
      },
      {
        question: "What should a school prepare before onboarding?",
        answer:
          "Prepare academic sessions, classes, sections, admission numbers and staff responsibilities. Review sample records and the current plan's limits before importing a full student directory.",
      },
      {
        question: "How can we evaluate whether the software fits our school?",
        answer:
          "Request a demonstration using your typical admission, attendance and fee workflows. Check staff permissions, reports and device support, and compare the current pricing and included features with your requirements.",
      },
    ],
  },
  "/student-management": {
    heading: "From admission records to a connected student directory",
    steps: [
      [
        "Create a reliable student record",
        "Check the admission number, student details and guardian contact information. Consistent identifiers make it easier to find the same student across school workflows.",
      ],
      [
        "Assign the right class and session",
        "Review the student's academic session, class and section before creating related records. Resolve duplicate admission numbers before a bulk import.",
      ],
      [
        "Review linked school information",
        "Use the student record when checking attendance, outstanding fees and portal access. Review access with the school administrator when a student changes class or leaves the school.",
      ],
    ],
    faqs: [
      {
        question: "What is a student information system?",
        answer:
          "A student information system, or SIS, organizes student profiles, admission identifiers and academic placement. In School Study, student records connect with school workflows such as attendance and fees.",
      },
      {
        question: "Why do admission numbers and academic sessions matter?",
        answer:
          "An admission number helps distinguish a student from others with similar names. Academic sessions, classes and sections help staff review the correct enrollment, attendance and fee records for a particular year.",
      },
      {
        question: "What should we check before importing student data?",
        answer:
          "Check required fields, duplicate admission numbers, class and section names, session values and guardian details. Keep the original data backed up and review a small sample in a separate test setup before approving an import.",
      },
    ],
  },
  "/teacher-management": {
    heading: "Organize staff records around classroom responsibilities",
    steps: [
      [
        "Review the faculty directory",
        "Keep teacher names, contact details and identifiers consistent. Confirm who should have a teacher account and which staff members administer school records.",
      ],
      [
        "Assign classroom responsibilities",
        "Review class, section and subject responsibilities with school leadership. Clear assignments help teachers identify the classrooms and records relevant to their work.",
      ],
      [
        "Verify teacher access",
        "Walk through a teacher's portal and assigned classroom attendance flow on the device they use. Review responsibilities when staff assignments change.",
      ],
    ],
    faqs: [
      {
        question: "What does teacher management software help a school organize?",
        answer:
          "Teacher management software keeps faculty profiles and classroom responsibilities together. School Study includes teacher records, class assignments and teacher portal workflows.",
      },
      {
        question: "How are teacher records connected to attendance?",
        answer:
          "Teacher accounts and classroom assignments help staff work with the appropriate class and section. Review the assigned teacher's attendance workflow during onboarding.",
      },
      {
        question: "Should every teacher receive school administrator access?",
        answer:
          "Assign access according to the person's responsibilities. Review teacher and school administrator roles separately so staff can perform their classroom work without receiving unrelated administrative access.",
      },
    ],
  },
  "/attendance-management": {
    heading: "A practical daily attendance workflow",
    steps: [
      [
        "Confirm the class register",
        "Review the academic session, class, section and student roster before taking attendance. Correct placement errors so the register reflects the classroom.",
      ],
      [
        "Record attendance for the right date",
        "Teachers mark the classroom register using attendance statuses such as present, absent or late. Review the selected date and class before submitting.",
      ],
      [
        "Review attendance over time",
        "Use reports and attendance percentages to identify records needing follow-up. Check the report period and speak with the relevant teacher before acting on a pattern.",
      ],
    ],
    faqs: [
      {
        question: "How do teachers take student attendance in School Study?",
        answer:
          "Teachers use their assigned portal to select the class and section and mark student attendance. Review the selected date and register before submitting the classroom record.",
      },
      {
        question: "What should staff check when reviewing attendance percentages?",
        answer:
          "Check the academic session, selected date range, student roster and attendance entries. Interpret a percentage alongside the underlying daily records and the school's own attendance policy.",
      },
      {
        question: "Does this workflow require biometric hardware?",
        answer:
          "The classroom workflow described here uses teacher-entered attendance through the portal. If your school needs biometric devices or other hardware integrations, confirm their availability and requirements during a demonstration.",
      },
    ],
  },
} as const;

export function ModuleWorkflow({ path }: { path: keyof typeof guides }) {
  const guide = guides[path];
  return (
    <section className="border-t border-slate-200 px-4 py-14 dark:border-slate-800 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getFaqSchema([...guide.faqs])).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{guide.heading}</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {guide.steps.map(([heading, text], index) => (
            <li key={heading} className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-900">
              <h3 className="text-lg font-semibold">
                {index + 1}. {heading}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {text}
              </p>
            </li>
          ))}
        </ol>
        <h2 className="mt-12 text-2xl font-bold text-slate-900 dark:text-white">
          Questions schools often ask
        </h2>
        <div className="mt-6 space-y-4">
          {guide.faqs.map((faq) => (
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
        <p className="mt-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Compare{" "}
          <Link
            href="/pricing"
            className="font-semibold text-blue-700 underline dark:text-blue-300"
          >
            current school ERP plans
          </Link>{" "}
          or{" "}
          <Link
            href="/contact"
            className="font-semibold text-blue-700 underline dark:text-blue-300"
          >
            request a walkthrough for your school
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
