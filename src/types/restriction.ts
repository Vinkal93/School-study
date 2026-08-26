import { Timestamp } from "firebase/firestore";

export type RestrictionStatus = "active" | "revoked" | "expired";

export interface AccountRestriction {
  id?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  schoolId?: string | null;
  status: RestrictionStatus;
  reason: string;
  duration: "permanent" | "temporary";
  expiresAt: Timestamp | null;
  restrictedBy: {
    uid: string;
    name: string;
    email: string;
  };
  createdAt: Timestamp;
  revokedAt?: Timestamp | null;
  revokedBy?: {
    uid: string;
    name: string;
    email: string;
  } | null;
  revocationReason?: string;
}
