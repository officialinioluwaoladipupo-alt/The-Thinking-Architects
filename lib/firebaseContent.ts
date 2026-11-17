import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import {
  auth,
  captureFirestoreError,
  db,
  handleFirestoreError,
  OperationType,
} from "./firebase";

export type ThinkSession = {
  id: string;
  number: string;
  title: string;
  speaker: string;
  speakerRole: string;
  dateLabel: string;
  timeLabel: string;
  format: string;
  status: "upcoming" | "archived";
  summary: string;
  topics: string[];
  duration?: string;
};

export type MediaFeature = {
  id: string;
  kind: "Recording" | "Feature";
  sessionRef: string;
  title: string;
  speaker: string;
  duration: string;
  publishedAt: string;
  summary: string;
  highlights: string[];
};

// Validation constants synchronized verbatim with firebase-blueprint.json
export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  httpsPattern: /^(https:\/\/.*)?$/,
  emailPattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
  session: {
    number: { min: 2, max: 40 },
    title: { min: 3, max: 140 },
    speaker: { min: 2, max: 100 },
    speakerRole: { min: 2, max: 120 },
    dateLabel: { min: 2, max: 80 },
    timeLabel: { min: 2, max: 80 },
    format: { min: 2, max: 80 },
    summary: { min: 10, max: 600 },
    registrationUrl: { max: 300 },
    maxTopics: 6,
    topicMaxLength: 160,
  },
  media: {
    sessionRef: { min: 2, max: 60 },
    title: { min: 3, max: 140 },
    speaker: { min: 2, max: 100 },
    duration: { min: 2, max: 40 },
    publishedAt: { min: 2, max: 60 },
    mediaUrl: { max: 400 },
    summary: { min: 10, max: 600 },
    maxHighlights: 6,
    highlightMaxLength: 160,
  },
  admin: {
    email: { min: 5, max: 254 },
    displayName: { min: 1, max: 100 },
  },
  subscriber: {
    email: { min: 5, max: 254 },
    name: { max: 100 },
    stage: { max: 80 },
    question: { max: 300 },
  },
  siteSettings: {
    url: { max: 300 },
  },
} as const;

export type FirestoreSessionRecord = ThinkSession & {
  isNextSession: boolean;
  published: boolean;
  registrationUrl: string;
  createdBy: string;
  updatedAtMs?: number;
};

export type FirestoreMediaRecord = MediaFeature & {
  mediaUrl: string;
  published: boolean;
  createdBy: string;
  updatedAtMs?: number;
};

export type AdminRecord = {
  id: string;
  email: string;
  displayName: string;
  addedBy: string;
};

export type SubscriberRecord = {
  id: string;
  email: string;
  name: string;
  stage: string;
  question: string;
  source: "footer" | "join_modal";
  createdAtMs: number;
};

export type SubscriberInput = {
  email: string;
  name?: string;
  stage?: string;
  question?: string;
  source: "footer" | "join_modal";
};

export type SiteSettingsRecord = {
  instagramUrl: string;
  xUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  exists: boolean;
};

export type SiteSettingsInput = {
  instagramUrl: string;
  xUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
};

export type SessionInput = {
  id?: string;
  number: string;
  title: string;
  speaker: string;
  speakerRole: string;
  dateLabel: string;
  timeLabel: string;
  format: string;
  status: "upcoming" | "archived";
  isNextSession: boolean;
  published: boolean;
  summary: string;
  topics: string[];
  registrationUrl: string;
};

export type MediaInput = {
  id?: string;
  kind: "Recording" | "Feature";
  sessionRef: string;
  title: string;
  speaker: string;
  duration: string;
  publishedAt: string;
  mediaUrl: string;
  published: boolean;
  summary: string;
  highlights: string[];
};

export function toValidDocId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (cleaned && BLUEPRINT_LIMITS.idPattern.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`;
}

function clampStr(val: string, max: number): string {
  return val.trim().slice(0, max);
}

function sanitizeStringArray(arr: string[], maxItems: number, maxLen: number): string[] {
  const cleaned = arr
    .map((item) => item.trim().slice(0, maxLen))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
  return cleaned.length > 0 ? cleaned : ["Open member Q&A"];
}

export function validateSessionInput(input: SessionInput): string | null {
  const L = BLUEPRINT_LIMITS.session;
  if (input.number.trim().length < L.number.min) return "Session label must be at least 2 characters.";
  if (input.title.trim().length < L.title.min) return "Title must be at least 3 characters.";
  if (input.speaker.trim().length < L.speaker.min) return "Speaker must be at least 2 characters.";
  if (input.speakerRole.trim().length < L.speakerRole.min) return "Speaker role must be at least 2 characters.";
  if (input.dateLabel.trim().length < L.dateLabel.min) return "Date label must be at least 2 characters.";
  if (input.timeLabel.trim().length < L.timeLabel.min) return "Time label must be at least 2 characters.";
  if (input.format.trim().length < L.format.min) return "Format must be at least 2 characters.";
  if (input.summary.trim().length < L.summary.min) return "Summary must be at least 10 characters.";
  const url = input.registrationUrl.trim();
  if (url && !BLUEPRINT_LIMITS.httpsPattern.test(url)) {
    return "Registration URL must start with https:// or be left blank.";
  }
  return null;
}

export function validateMediaInput(input: MediaInput): string | null {
  const L = BLUEPRINT_LIMITS.media;
  if (input.sessionRef.trim().length < L.sessionRef.min) return "Session reference must be at least 2 characters.";
  if (input.title.trim().length < L.title.min) return "Title must be at least 3 characters.";
  if (input.speaker.trim().length < L.speaker.min) return "Speaker must be at least 2 characters.";
  if (input.duration.trim().length < L.duration.min) return "Duration must be at least 2 characters.";
  if (input.publishedAt.trim().length < L.publishedAt.min) return "Label must be at least 2 characters.";
  if (input.summary.trim().length < L.summary.min) return "Summary must be at least 10 characters.";
  const url = input.mediaUrl.trim();
  if (url && !BLUEPRINT_LIMITS.httpsPattern.test(url)) {
    return "Media URL must start with https:// or be left blank.";
  }
  return null;
}

export function validateSiteSettingsInput(input: SiteSettingsInput): string | null {
  const fields: Array<[string, string]> = [
    ["Instagram URL", input.instagramUrl],
    ["X URL", input.xUrl],
    ["LinkedIn URL", input.linkedinUrl],
    ["YouTube URL", input.youtubeUrl],
  ];
  for (const [label, raw] of fields) {
    const val = raw.trim();
    if (val.length > BLUEPRINT_LIMITS.siteSettings.url.max) {
      return `${label} must be ${BLUEPRINT_LIMITS.siteSettings.url.max} characters or less.`;
    }
    if (val && !BLUEPRINT_LIMITS.httpsPattern.test(val)) {
      return `${label} must start with https:// or be left blank.`;
    }
  }
  return null;
}

function mapSessionDoc(id: string, data: Record<string, unknown>): FirestoreSessionRecord {
  const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
  return {
    id,
    number: String(data.number ?? "Session"),
    title: String(data.title ?? ""),
    speaker: String(data.speaker ?? ""),
    speakerRole: String(data.speakerRole ?? ""),
    dateLabel: String(data.dateLabel ?? ""),
    timeLabel: String(data.timeLabel ?? ""),
    format: String(data.format ?? ""),
    status: data.status === "archived" ? "archived" : "upcoming",
    isNextSession: Boolean(data.isNextSession),
    published: Boolean(data.published),
    summary: String(data.summary ?? ""),
    topics: Array.isArray(data.topics) ? data.topics.map(String) : [],
    registrationUrl: String(data.registrationUrl ?? ""),
    createdBy: String(data.createdBy ?? ""),
    updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
  };
}

function mapMediaDoc(id: string, data: Record<string, unknown>): FirestoreMediaRecord {
  const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
  return {
    id,
    kind: data.kind === "Feature" ? "Feature" : "Recording",
    sessionRef: String(data.sessionRef ?? ""),
    title: String(data.title ?? ""),
    speaker: String(data.speaker ?? ""),
    duration: String(data.duration ?? ""),
    publishedAt: String(data.publishedAt ?? ""),
    mediaUrl: String(data.mediaUrl ?? ""),
    published: Boolean(data.published),
    summary: String(data.summary ?? ""),
    highlights: Array.isArray(data.highlights) ? data.highlights.map(String) : [],
    createdBy: String(data.createdBy ?? ""),
    updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
  };
}

// --- Public Live Subscriptions & Queries (strictly filtered by published == true per Pillar 8) ---

function sortPublishedSessions(items: FirestoreSessionRecord[]): FirestoreSessionRecord[] {
  return [...items].sort((a, b) => {
    const nextDiff = Number(b.isNextSession) - Number(a.isNextSession);
    if (nextDiff !== 0) return nextDiff;
    return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
  });
}

export function subscribePublishedSessions(
  onData: (items: FirestoreSessionRecord[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, "sessions"), where("published", "==", true));
  return onSnapshot(
    q,
    (snap) => {
      const list = sortPublishedSessions(
        snap.docs.map((d) => mapSessionDoc(d.id, d.data())),
      );
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "sessions");
      onError(structured);
    },
  );
}

export function subscribePublishedMedia(
  onData: (items: FirestoreMediaRecord[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, "media"), where("published", "==", true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => mapMediaDoc(d.id, d.data()))
        .sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "media");
      onError(structured);
    },
  );
}

export async function fetchPublishedSessions(): Promise<FirestoreSessionRecord[]> {
  const q = query(collection(db, "sessions"), where("published", "==", true));
  try {
    const snap = await getDocs(q);
    return sortPublishedSessions(snap.docs.map((d) => mapSessionDoc(d.id, d.data())));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "sessions");
  }
}

export async function fetchPublishedMedia(): Promise<FirestoreMediaRecord[]> {
  const q = query(collection(db, "media"), where("published", "==", true));
  try {
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapMediaDoc(d.id, d.data()))
      .sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "media");
  }
}

// --- Admin Subscriptions (only attached when authenticated admin) ---

export function subscribeAllSessions(
  onData: (items: FirestoreSessionRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "sessions"),
    (snap) => {
      const list = sortPublishedSessions(
        snap.docs.map((d) => mapSessionDoc(d.id, d.data())),
      );
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "sessions");
      if (onError) onError(structured);
    },
  );
}

export function subscribeAllMedia(
  onData: (items: FirestoreMediaRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "media"),
    (snap) => {
      const list = snap.docs
        .map((d) => mapMediaDoc(d.id, d.data()))
        .sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "media");
      if (onError) onError(structured);
    },
  );
}

export function subscribeAdmins(
  onData: (items: AdminRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "admins"),
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          email: String(data.email ?? ""),
          displayName: String(data.displayName ?? ""),
          addedBy: String(data.addedBy ?? ""),
        };
      });
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "admins");
      if (onError) onError(structured);
    },
  );
}

// --- Admin Mutations ---

export async function saveSession(input: SessionInput, allExisting: FirestoreSessionRecord[]) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.session;
  const docId = input.id ? input.id : toValidDocId(input.title, "session");
  const path = `sessions/${docId}`;

  const payloadFields = {
    number: clampStr(input.number, L.number.max),
    title: clampStr(input.title, L.title.max),
    speaker: clampStr(input.speaker, L.speaker.max),
    speakerRole: clampStr(input.speakerRole, L.speakerRole.max),
    dateLabel: clampStr(input.dateLabel, L.dateLabel.max),
    timeLabel: clampStr(input.timeLabel, L.timeLabel.max),
    format: clampStr(input.format, L.format.max),
    status: input.status,
    isNextSession: input.isNextSession,
    published: input.published,
    summary: clampStr(input.summary, L.summary.max),
    topics: sanitizeStringArray(input.topics, L.maxTopics, L.topicMaxLength),
    registrationUrl: clampStr(input.registrationUrl, L.registrationUrl.max),
  };

  try {
    const batch = writeBatch(db);

    if (input.isNextSession) {
      for (const other of allExisting) {
        if (other.id !== docId && other.isNextSession) {
          batch.update(doc(db, "sessions", other.id), {
            isNextSession: false,
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    if (input.id) {
      batch.update(doc(db, "sessions", docId), {
        ...payloadFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(db, "sessions", docId), {
        ...payloadFields,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return docId;
  } catch (error) {
    handleFirestoreError(error, input.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function toggleSessionPublished(session: FirestoreSessionRecord) {
  const path = `sessions/${session.id}`;
  try {
    await updateDoc(doc(db, "sessions", session.id), {
      published: !session.published,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function promoteToNextSession(
  target: FirestoreSessionRecord,
  allSessions: FirestoreSessionRecord[],
) {
  const path = `sessions/${target.id}`;
  try {
    const batch = writeBatch(db);
    for (const item of allSessions) {
      if (item.id !== target.id && item.isNextSession) {
        batch.update(doc(db, "sessions", item.id), {
          isNextSession: false,
          updatedAt: serverTimestamp(),
        });
      }
    }
    batch.update(doc(db, "sessions", target.id), {
      isNextSession: true,
      published: true,
      status: "upcoming",
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeSession(sessionId: string) {
  const path = `sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, "sessions", sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveMediaItem(input: MediaInput) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.media;
  const docId = input.id ? input.id : toValidDocId(input.title, "media");
  const path = `media/${docId}`;

  const payloadFields = {
    kind: input.kind,
    sessionRef: clampStr(input.sessionRef, L.sessionRef.max),
    title: clampStr(input.title, L.title.max),
    speaker: clampStr(input.speaker, L.speaker.max),
    duration: clampStr(input.duration, L.duration.max),
    publishedAt: clampStr(input.publishedAt, L.publishedAt.max),
    mediaUrl: clampStr(input.mediaUrl, L.mediaUrl.max),
    published: input.published,
    summary: clampStr(input.summary, L.summary.max),
    highlights: sanitizeStringArray(input.highlights, L.maxHighlights, L.highlightMaxLength),
  };

  try {
    if (input.id) {
      await updateDoc(doc(db, "media", docId), {
        ...payloadFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, "media", docId), {
        ...payloadFields,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return docId;
  } catch (error) {
    handleFirestoreError(error, input.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function toggleMediaPublished(item: FirestoreMediaRecord) {
  const path = `media/${item.id}`;
  try {
    await updateDoc(doc(db, "media", item.id), {
      published: !item.published,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeMediaItem(mediaId: string) {
  const path = `media/${mediaId}`;
  try {
    await deleteDoc(doc(db, "media", mediaId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addAdminUser(uidToAdd: string, email: string, displayName: string) {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error("Authentication required.");

  const cleanUid = uidToAdd.trim();
  if (!BLUEPRINT_LIMITS.idPattern.test(cleanUid)) {
    throw new Error("Admin UID may only contain letters, numbers, underscores, and hyphens.");
  }

  const path = `admins/${cleanUid}`;
  try {
    await setDoc(doc(db, "admins", cleanUid), {
      email: clampStr(email, BLUEPRINT_LIMITS.admin.email.max),
      displayName: clampStr(displayName, BLUEPRINT_LIMITS.admin.displayName.max),
      addedBy: currentUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeAdminUser(uidToRemove: string) {
  const path = `admins/${uidToRemove}`;
  try {
    await deleteDoc(doc(db, "admins", uidToRemove));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Public Subscribers Intake & Admin Reader ---

export async function saveSubscriber(input: SubscriberInput): Promise<string> {
  const cleanEmail = clampStr(input.email, BLUEPRINT_LIMITS.subscriber.email.max).toLowerCase();
  if (
    cleanEmail.length < BLUEPRINT_LIMITS.subscriber.email.min ||
    !BLUEPRINT_LIMITS.emailPattern.test(cleanEmail)
  ) {
    throw new Error("Please enter a valid email address.");
  }

  const cleanName = clampStr(input.name ?? "", BLUEPRINT_LIMITS.subscriber.name.max);
  const cleanStage = clampStr(input.stage ?? "", BLUEPRINT_LIMITS.subscriber.stage.max);
  const cleanQuestion = clampStr(input.question ?? "", BLUEPRINT_LIMITS.subscriber.question.max);

  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const docId = `sub-${Date.now()}-${randomSuffix}`;
  const path = `subscribers/${docId}`;

  try {
    await setDoc(doc(db, "subscribers", docId), {
      email: cleanEmail,
      name: cleanName,
      stage: cleanStage,
      question: cleanQuestion,
      source: input.source,
      createdAt: serverTimestamp(),
    });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeSubscribers(
  onData: (items: SubscriberRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "subscribers"),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
          return {
            id: d.id,
            email: String(data.email ?? ""),
            name: String(data.name ?? ""),
            stage: String(data.stage ?? ""),
            question: String(data.question ?? ""),
            source: (data.source === "join_modal" ? "join_modal" : "footer") as
              | "footer"
              | "join_modal",
            createdAtMs: createdAt?.toMillis ? createdAt.toMillis() : 0,
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "subscribers");
      if (onError) onError(structured);
    },
  );
}

export async function removeSubscriber(subscriberId: string) {
  const path = `subscribers/${subscriberId}`;
  try {
    await deleteDoc(doc(db, "subscribers", subscriberId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Public Site Settings (/siteSettings/public) ---

export function subscribeSiteSettings(
  onData: (settings: SiteSettingsRecord) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "siteSettings", "public"),
    (snap) => {
      if (!snap.exists()) {
        onData({
          instagramUrl: "",
          xUrl: "",
          linkedinUrl: "",
          youtubeUrl: "",
          exists: false,
        });
        return;
      }
      const data = snap.data();
      onData({
        instagramUrl: String(data.instagramUrl ?? ""),
        xUrl: String(data.xUrl ?? ""),
        linkedinUrl: String(data.linkedinUrl ?? ""),
        youtubeUrl: String(data.youtubeUrl ?? ""),
        exists: true,
      });
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.GET, "siteSettings/public");
      if (onError) onError(structured);
    },
  );
}

export async function saveSiteSettings(input: SiteSettingsInput) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.siteSettings.url.max;
  const payload = {
    instagramUrl: clampStr(input.instagramUrl, L),
    xUrl: clampStr(input.xUrl, L),
    linkedinUrl: clampStr(input.linkedinUrl, L),
    youtubeUrl: clampStr(input.youtubeUrl, L),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  const ref = doc(db, "siteSettings", "public");
  const path = "siteSettings/public";
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
