# School Study SEO keyword and publishing plan

Primary domain: https://school.sbci.online
Founder: Vinkal Prajapati — Founder & Web Developer.

These are target queries, not measured search volumes or guaranteed rankings. Priorities reflect product relevance and search intent. Use one strong page per topic; do not create duplicate pages for every wording variation.

| Priority | Target queries | Canonical page | Intent |
| --- | --- | --- | --- |
| P1 | School Study; School Study ERP; School Study school management software; School Study by Vinkal Prajapati | / | Brand discovery |
| P1 | school management software; school management system; online school management software; school administration software | /school-management | Product evaluation |
| P1 | school ERP software; ERP software for schools; cloud school ERP; school ERP system; school ERP software India | /school-erp | Product evaluation |
| P1 | school fee management software; school fee collection software; school fee receipt software; school fees and dues management | /fee-management | Finance workflow |
| P1 | student attendance management system; school attendance software; online attendance system for schools | /attendance-management | Attendance workflow |
| P1 | Vinkal Prajapati; Vinkal Prajapati developer; Vinkal Prajapati School Study; School Study founder; Vinkal Prajapati educator | /about-developer | Personal identity |
| P2 | student management software; student information system; school student records software; student database management | /student-management | Student records |
| P2 | teacher management software; school faculty management; teacher class assignment software | /teacher-management | Staff operations |
| P2 | school management software pricing; school ERP pricing; school ERP cost in India | /pricing | Purchase evaluation |
| P2 | school ERP features; school management software modules; education management software for schools | /features | Feature discovery |
| P2 | School Study download; School Study app; school ERP mobile app | /download | Access/install |
| P2 | school management software demo; School Study contact | /contact | Enquiry |
| P3 | best school ERP in India; how to choose school management software; school ERP vs student information system | Future original buyer guides | Comparison/research |
| P3 | school admission management software; school timetable management software; school parent portal; school accounting software | Future dedicated pages after verified workflow demos | Specific modules |
| P3 | school management software for small schools; school ERP for primary schools; multi branch school management software | Expand existing product pages with actual use cases | School fit |
| P3 | school management software Hindi; school ERP kya hai; school fees management software India | Future human-reviewed Hindi content | Hindi discovery |

Do not target “free school ERP”, government affiliations, rankings, accreditation or competitor superiority unless current published evidence supports the claim. Broad “education management” queries also cover colleges and learning platforms; prioritize school-specific intent first.

## Implemented locally

- New server-rendered /fee-management page with workflow content, visible FAQs, matching FAQ markup, breadcrumbs and enquiry links.
- Related module links include fee management and make every module discoverable.
- Sitemap lists public canonical URLs, including fee management; removes request-time lastmod and unsupported ranking-priority assumptions.
- Person entity uses the confirmed founder identity and links to the supplied LinkedIn and Hashnode profiles.
- Removed hard-coded software offers that disagreed with the pricing page and homepage FAQ schema not tied to the active landing-page variant.
- Canonical/Open Graph URL resolution supports both relative and absolute URLs.
- Private portal/API routes receive X-Robots-Tag noindex in addition to existing robots crawl exclusions. Robots.txt is not access control; authentication remains required. A crawler must be allowed to fetch a URL to observe a noindex response, so already indexed private URLs need Search Console review/removal rather than relying on disallow alone.

## After deployment

1. Verify the canonical domain in Google Search Console and Bing Webmaster Tools. Submit https://school.sbci.online/sitemap.xml and inspect the homepage, ERP, fees and founder URLs.
2. Validate rendered structured data with Google's Rich Results Test and Schema.org Validator. Structured data does not guarantee a rich result or knowledge panel. Software offers should be added only from the same current pricing source shown to visitors.
3. Check mobile Core Web Vitals in PageSpeed Insights and Search Console. Measure before optimizing; target the pages with actual field-data problems.
4. Publish original screenshots, workflow demonstrations and school onboarding guidance. Obtain permission before publishing school names, testimonials or student information.
5. Link School Study naturally from the founder's owned portfolio, Hashnode and relevant institute pages. Use the same public name and product URL across profiles. Avoid purchased link packages and mass directory submissions.
6. Write useful buyer guides with explicit comparison criteria and dated, verified information. Add module pages only when their workflows can be demonstrated; do not publish thin city/keyword doorway pages.
7. Review query impressions, clicks, CTR, average position and demo enquiries monthly. Segment branded vs non-branded queries, country and device. Establish a baseline after deployment and assess changes over several weeks.

## Sources

- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/fundamentals/get-started-developers
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/special-tags

Google does not use meta keywords for ranking. Useful visible content, crawlable links and accurate metadata matter more than expanding a keyword meta tag. Worldwide first position cannot be guaranteed.
