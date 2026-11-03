import Link from "next/link";
import { publicPages } from "@/lib/seo/pages";

/** Server-rendered discovery links independent of remote footer/UI settings. */
export function PublicPageLinks() {
  return (
    <nav
      aria-label="Explore School Study"
      className="border-t border-slate-200 bg-slate-50 px-4 py-10 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Explore School Study school management software
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Review the modules, compare current plans and discuss your school&apos;s requirements.
        </p>
        <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {publicPages
            .filter(({ path }) => path !== "/")
            .map(({ path, label }) => (
              <li key={path}>
                <Link
                  href={path}
                  className="inline-flex min-h-11 items-center text-blue-700 underline-offset-4 hover:underline dark:text-blue-300"
                >
                  {label}
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </nav>
  );
}
