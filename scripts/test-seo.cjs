const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "..");

function createLoader(env) {
  const cache = new Map();
  function load(file) {
    let filename = path.resolve(root, file);
    if (!path.extname(filename)) {
      filename = [".ts", ".tsx", "/index.ts"].map((ext) => filename + ext).find(fs.existsSync);
    }
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const customRequire = (name) => {
      if (name === "next/link")
        return ({ children, ...props }) => React.createElement("a", props, children);
      if (name.startsWith("@/")) return load("src/" + name.slice(2));
      if (name.startsWith(".")) return load(path.resolve(path.dirname(filename), name));
      return require(name);
    };
    vm.runInNewContext(
      code,
      { exports: module.exports, module, require: customRequire, process: { env }, URL, console },
      { filename },
    );
    return module.exports;
  }
  return load;
}

const production = createLoader({
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://school.sbci.online/",
});
const { publicPages } = production("src/lib/seo/pages.ts");
const { constructPublicMetadata, constructMetadata, resolveCanonicalUrl, normalizeTitle } =
  production("src/lib/seo/metadata.ts");
const sitemap = production("src/app/sitemap.ts").default();
const titles = new Set();
const descriptions = new Set();
for (const page of publicPages) {
  const metadata = constructPublicMetadata(page.path);
  assert(!titles.has(metadata.title), `Duplicate title: ${page.path}`);
  assert(!descriptions.has(metadata.description), `Duplicate description: ${page.path}`);
  titles.add(metadata.title);
  descriptions.add(metadata.description);
  const canonical = new URL(page.path, "https://school.sbci.online").toString();
  assert.equal(metadata.alternates.canonical, canonical);
  assert.equal(metadata.openGraph.url, canonical);
  assert.equal(metadata.twitter.title, metadata.title);
  assert.equal(metadata.robots.index, true);
  assert(
    sitemap.some((entry) => entry.url === canonical),
    `Missing from sitemap: ${page.path}`,
  );
  assert(
    fs.existsSync(path.join(root, "src/app", page.path, "page.tsx")),
    `Missing page: ${page.path}`,
  );
}
assert.equal(sitemap.length, publicPages.length);
const productionRobots = production("src/app/robots.ts").default();
// Interpret the published robots directives as a crawler does: paths are prefixes
// unless the directive ends in $. Module slugs must remain crawlable.
function isDisallowed(pathname) {
  return productionRobots.rules.disallow.some((directive) => {
    if (directive.endsWith("$")) return pathname === directive.slice(0, -1);
    return pathname.startsWith(directive);
  });
}
for (const page of publicPages) assert(!isDisallowed(page.path), `Public page blocked by robots: ${page.path}`);
for (const privatePath of ["/student", "/student/fees", "/teacher", "/teacher/classes", "/admin", "/admin/students", "/api/billing", "/support"]) {
  assert(isDisallowed(privatePath), `Private workspace unexpectedly crawlable: ${privatePath}`);
}
assert(
  !sitemap.some(({ url }) =>
    /\/(admin|teacher|student|billing|login|register|support)(\/|$)/.test(new URL(url).pathname),
  ),
);
assert(!sitemap.some(({ url }) => /\/(play-store|app-store)$/.test(url)));
assert.equal(
  resolveCanonicalUrl("/features/?utm_source=campaign#modules"),
  "https://school.sbci.online/features",
);
assert.throws(() => resolveCanonicalUrl("https://unrelated.example/features"));
assert.equal(normalizeTitle("Features | School Study | School Study"), "Features | School Study");
const privateMetadata = constructMetadata({ title: "School records", noIndex: true });
assert.equal(privateMetadata.robots.index, false);
assert.equal(privateMetadata.alternates.canonical, null);

for (const env of ["preview", "development"]) {
  const preview = createLoader({
    VERCEL_ENV: env,
    NEXT_PUBLIC_SITE_URL: "https://school-study-preview.vercel.app",
  });
  const metadata = preview("src/lib/seo/metadata.ts").constructPublicMetadata("/features");
  assert.equal(metadata.robots.index, false);
  assert.equal(metadata.robots.googleBot.index, false);
  assert.equal(metadata.alternates.canonical, "https://school.sbci.online/features");
  assert.equal(preview("src/app/sitemap.ts").default().length, 0);
  assert.equal(preview("src/app/robots.ts").default().rules.disallow, "/");
}
for (const invalidUrl of [
  "not-a-url",
  "http://localhost:3000",
  "https://user:password@example.test",
]) {
  assert.equal(
    createLoader({ NEXT_PUBLIC_SITE_URL: invalidUrl })("src/lib/seo/config.ts").siteConfig.url,
    "https://school.sbci.online",
  );
}
const schemas = production("src/lib/seo/schema.ts");
assert.equal(
  schemas.getSoftwareAppSchema().offers,
  undefined,
  "Do not invent prices independent of the pricing source",
);
assert(
  !schemas.getHomepageJsonLd().some((schema) => schema["@type"] === "FAQPage"),
  "Homepage FAQ varies with UI settings",
);
assert.equal(
  schemas.getBreadcrumbSchema([{ name: "Features", url: "/features" }]).itemListElement[0].item,
  "https://school.sbci.online/",
);
assert.equal(schemas.getBreadcrumbSchema([{ name: "Home", url: "/" }]).itemListElement.length, 1);

const { PublicPageLinks } = production("src/components/marketing/PublicPageLinks.tsx");
const linksHtml = renderToStaticMarkup(React.createElement(PublicPageLinks));
for (const page of publicPages.filter(({ path }) => path !== "/"))
  assert(linksHtml.includes(`href="${page.path}"`), `Orphan public page: ${page.path}`);
const { ModuleWorkflow } = production("src/components/marketing/ModuleWorkflow.tsx");
const escapeHtml = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
for (const page of [
  "/school-management",
  "/student-management",
  "/teacher-management",
  "/attendance-management",
]) {
  const html = renderToStaticMarkup(React.createElement(ModuleWorkflow, { path: page }));
  const json = JSON.parse(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
  const visibleHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "");
  for (const question of json.mainEntity) {
    assert(
      visibleHtml.includes(escapeHtml(question.name)),
      `FAQ question missing from visible content: ${page}`,
    );
    assert(
      visibleHtml.includes(escapeHtml(question.acceptedAnswer.text)),
      `FAQ answer missing from visible content: ${page}`,
    );
  }
}
console.log(
  `PASS SEO: ${publicPages.length} public pages; unique metadata, canonicals, sitemap coverage, preview noindex, pricing/schema integrity, crawlable links and visible FAQ parity.`,
);
