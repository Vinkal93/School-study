import { GET as getDashboardBundle } from "../dashboard-bundle/route";

/**
 * GET /api/billing/dashboard
 * Alias route endpoint that delegates to /api/billing/dashboard-bundle
 * Ensures backward compatibility for dashboard fetching calls.
 */
export async function GET(request: Request) {
  return getDashboardBundle(request);
}
