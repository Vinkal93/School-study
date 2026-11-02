import { updateRenewal } from "@/lib/payments/renewal";
export async function POST(request: Request) { return updateRenewal(request, "resume"); }
