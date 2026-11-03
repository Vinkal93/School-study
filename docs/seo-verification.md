# Public page SEO verification

The public page catalogue in `src/lib/seo/pages.ts` defines 14 canonical pages and their individual search intent. It supplies page metadata, the sitemap and homepage discovery links. Login, registration, school records, billing, support and coming-soon store pages remain outside the public sitemap and use noindex metadata. School records still require application authorization; SEO controls are not access control.

The previous bot-specific robots groups disallowed `/student` and `/teacher` as prefixes, inadvertently blocking public `/student-management` and `/teacher-management` pages for Googlebot and Bingbot. Private roots now use end-of-path matches and slash-delimited descendants; all crawlers share the same policy. The SEO regression suite checks every public URL against the generated disallows.

## Automated checks

Run `npm run test:seo`, `npm run typecheck`, `npm run test:release` and `npm run build`. The SEO suite executes the real metadata/schema modules and renders the discovery links and module FAQ components. It checks unique titles/descriptions, canonical normalization, sitemap membership, preview noindex, the absence of invented software prices, and agreement between FAQ schema and visible answers. Release CI includes this suite.

No test reads school records or performs payments. Use build-only Firebase defaults for builds; never copy production credentials into local verification.

## Preview and release

The existing connected Vercel project's Firebase and Razorpay entries were jointly scoped to Production and Preview when inspected on 3 November 2026. The SEO branch explicitly disables its own automatic Vercel deployment through `vercel.json` so it can be pushed for code review and CI without creating another preview using live configuration. This setting affects only `codex/public-pages-seo`; other branches keep their existing behavior. It does not satisfy the required deployment check.

Before preview verification, configure an isolated test Firebase project and test payment configuration, then remove that branch's deployment restriction in a reviewed commit. Keep the PR draft until the latest head has passed release checks and the Vercel deployment check and the owner has reviewed the preview. Do not merge to work around a missing deployment check.

On the preview, verify desktop and mobile versions of the homepage, ERP page, module pages, pricing, brochure, download, contact, founder and cookie pages. Confirm a single primary heading per page, working navigation and enquiry links, readable FAQ disclosure controls, and the existing cookie preferences. Confirm preview responses remain noindex. This change does not claim measured Core Web Vitals improvements.

## Production SEO checks after an approved release

1. Fetch every URL in `/sitemap.xml`: it should return the intended public page, use a self-referencing canonical on the production origin and be indexable. `/cookies` must have its own title and canonical. Private and coming-soon routes must remain excluded.
2. Inspect source and rendered HTML, including all landing-page variants. Check title, description, canonical, Open Graph, Twitter cards and JSON-LD. Confirm homepage links are present without waiting for Firestore settings. Prices remain in the current pricing UI rather than an unrelated hard-coded schema offer.
3. Check redirects, `/robots.txt`, `/sitemap.xml`, the social image, and any older or alternate hostnames. Review redirect configuration separately before changing domains. No blanket redirects were added by this change.
4. Validate representative pages in Google's Rich Results Test and Schema.org Validator. FAQ markup describes visible answers but does not promise FAQ rich results. No ratings, reviews, invented prices or unsupported biometric capabilities are asserted by the shared software schema.
5. In the owner's verified Google Search Console property, submit `https://school.sbci.online/sitemap.xml` and inspect the homepage, ERP, attendance, fees, pricing and founder URLs. Review existing exclusion/duplicate reports before requesting indexing. This session has no Search Console connection and cannot certify submission or indexing.
6. Use PageSpeed Insights and field data in Search Console to establish mobile Core Web Vitals for the public URLs. Optimize measured bottlenecks; do not equate a static SEO check with a Lighthouse score or ranking.
7. Track branded and non-branded impressions, clicks, CTR and demo enquiries over time. Publish original workflow demonstrations and consented school case studies. Do not buy backlinks, invent testimonials, or generate duplicate city/keyword doorway pages.

Google decides crawling, indexing, ranking and rich-result appearance. This implementation provides technical and content improvements, not a 100% ranking guarantee.

References: [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [Vercel branch deployment controls](https://vercel.com/docs/project-configuration/git-configuration).
