import type { PartnerNotification } from "@/types/partner";
import { newId, nowIso, saveNotification } from "./store";
import { formatPaiseInr } from "./engine";

export interface MessagingProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendWhatsApp(to: string, body: string): Promise<void>;
}

class ConsoleMessagingProvider implements MessagingProvider {
  async sendEmail(to: string, subject: string, body: string) {
    if (process.env.RESEND_API_KEY || process.env.SMTP_HOST) {
      console.info("[PartnerMessaging] email queued", { to, subject });
    } else {
      console.info("[PartnerMessaging] email (no provider configured)", { to, subject, body: body.slice(0, 120) });
    }
  }
  async sendWhatsApp(to: string, body: string) {
    if (process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_URL) {
      console.info("[PartnerMessaging] whatsapp queued", { to });
    } else {
      console.info("[PartnerMessaging] whatsapp (no provider configured)", { to, body: body.slice(0, 120) });
    }
  }
}

let provider: MessagingProvider = new ConsoleMessagingProvider();

export function setPartnerMessagingProvider(next: MessagingProvider) {
  provider = next;
}

export async function notifyPartner(input: {
  partnerId: string;
  email?: string;
  whatsapp?: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}) {
  const n: PartnerNotification = {
    id: newId("pnotif"),
    audience: "partner",
    partnerId: input.partnerId,
    title: input.title,
    message: input.message,
    type: input.type,
    link: input.link,
    read: false,
    createdAt: nowIso(),
  };
  await saveNotification(n);
  if (input.email) {
    await provider.sendEmail(input.email, input.title, input.message).catch(() => {});
  }
  if (input.whatsapp) {
    await provider.sendWhatsApp(input.whatsapp, `${input.title}\n${input.message}`).catch(() => {});
  }
  return n;
}

export async function notifyAdmins(input: { title: string; message: string; type: string; link?: string }) {
  const n: PartnerNotification = {
    id: newId("anotif"),
    audience: "super_admin",
    title: input.title,
    message: input.message,
    type: input.type,
    link: input.link,
    read: false,
    createdAt: nowIso(),
  };
  await saveNotification(n);
  return n;
}

export function commissionGeneratedMessage(amountPaise: number) {
  return `${formatPaiseInr(amountPaise)} commission has been generated.`;
}

export function payoutProcessedMessage(amountPaise: number) {
  return `Your payout of ${formatPaiseInr(amountPaise)} has been processed.`;
}
