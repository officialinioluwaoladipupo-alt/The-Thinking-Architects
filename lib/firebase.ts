import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { doc, getDocFromServer, getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function captureFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): Error {
  try {
    handleFirestoreError(error, operationType, path);
  } catch (structuredError) {
    return structuredError instanceof Error
      ? structuredError
      : new Error(String(structuredError));
  }
}

export function formatFirestoreErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  let detail = raw;
  let op: string | undefined;
  let path: string | null | undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<FirestoreErrorInfo>;
    if (parsed && typeof parsed.error === "string") {
      detail = parsed.error;
      op = parsed.operationType;
      path = parsed.path;
    }
  } catch {
    // Raw message is already plain text
  }

  const lower = detail.toLowerCase();
  if (lower.includes("quota exceeded")) {
    return "Database daily read quota has been exceeded. Please try again later.";
  }
  if (lower.includes("the client is offline") || lower.includes("unavailable") || lower.includes("network")) {
    return "Unable to reach the database right now. Check your connection and try again.";
  }
  if (lower.includes("permission") || lower.includes("insufficient")) {
    if (op && path) {
      return `Database access was denied by security rules (${op} on ${path}).`;
    }
    return "Database access was denied by security rules.";
  }
  return detail || "An unexpected database error occurred.";
}

let connectionTested = false;

export async function testConnection(): Promise<{ ok: boolean; offline?: boolean }> {
  if (typeof window === "undefined") return { ok: true };
  if (connectionTested) return { ok: true };
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
      return { ok: false, offline: true };
    }
    // Expected permission-denied on default-deny test/connection confirms live server reachability
    return { ok: true };
  }
}
