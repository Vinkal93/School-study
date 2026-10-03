// Browser replacement: private Firebase Admin credentials and SDK never enter client bundles.
export const getSafeAdminDb = () => null;
export const getSafeAdminAuth = () => null;
export const getAdminApp = () => null;
export const getServiceAccount = () => null;
export const isFirebaseAdminConfigured = () => false;
const unavailable = new Proxy({}, {get() {throw new Error("Firebase Admin is server-only.");}});
export const adminDb = unavailable;
export const adminAuth = unavailable;
export const adminApp = unavailable;
