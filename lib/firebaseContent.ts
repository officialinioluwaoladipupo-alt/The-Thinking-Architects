import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
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
  wrappedSettings: {
    countdownTargetPattern:
      /^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2})?(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})?)?$/,
    countdownTargetIso: { max: 40 },
    countdownHeadline: { min: 3, max: 140 },
    countdownSubtext: { min: 5, max: 260 },
    pageTitle: { min: 3, max: 100 },
    pageIntro: { min: 5, max: 240 },
    closingHeadline: { min: 3, max: 120 },
    closingBody: { min: 5, max: 240 },
    shareCaption: { min: 10, max: 400 },
    autoplaySeconds: { min: 0, max: 60 },
  },
  wrappedSlide: {
    order: { min: 0, max: 1000 },
    label: { min: 1, max: 40 },
    eyebrow: { max: 100 },
    headline: { max: 240 },
    body: { max: 320 },
    accentDate: { max: 40 },
    metricPrefix: { max: 8 },
    metricValue: { min: 0, max: 10000000 },
    metricSuffix: { max: 16 },
    secondaryMetricA: { min: 0, max: 10000000 },
    secondaryLabelA: { max: 60 },
    secondaryMetricB: { min: 0, max: 10000000 },
    secondaryLabelB: { max: 60 },
    maxItems: 8,
    itemMaxLength: 220,
    ctaLabel: { max: 50 },
  },
  liveSettings: {
    sessionIdPattern: /^([a-zA-Z0-9_-]+)?$/,
    announcementHrefPattern: /^((https:\/\/.*)|(\/.*))?$/,
    liveSessionId: { max: 128 },
    liveTitle: { max: 140 },
    liveRoomUrl: { max: 400 },
    liveStartedAtIso: { max: 40 },
    announcementText: { max: 140 },
    announcementLinkLabel: { max: 40 },
    announcementLinkHref: { max: 300 },
  },
  sessionQuestion: {
    authorName: { min: 1, max: 60 },
    question: { min: 5, max: 280 },
    maxUpvotes: 100000,
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

// --- Year Wrapped Settings (/siteSettings/wrapped) & Slides (/wrappedSlides/{slideId}) ---

export type WrappedSlideKind = "cover" | "statement" | "metric" | "sessions" | "community" | "cta";
export type WrappedSlideTheme = "dark" | "cream";

export type WrappedSettingsInput = {
  enabled: boolean;
  showHomeBanner: boolean;
  countdownTargetIso: string;
  countdownHeadline: string;
  countdownSubtext: string;
  pageTitle: string;
  pageIntro: string;
  closingHeadline: string;
  closingBody: string;
  shareCaption: string;
  autoplaySeconds: number;
};

export type WrappedSettingsRecord = WrappedSettingsInput & {
  exists: boolean;
};

export type WrappedSlideInput = {
  id?: string;
  order: number;
  label: string;
  kind: WrappedSlideKind;
  theme: WrappedSlideTheme;
  eyebrow: string;
  headline: string;
  body: string;
  accentDate: string;
  metricPrefix: string;
  metricValue: number;
  metricSuffix: string;
  secondaryMetricA: number;
  secondaryLabelA: string;
  secondaryMetricB: number;
  secondaryLabelB: string;
  items: string[];
  ctaLabel: string;
  published: boolean;
};

export type WrappedSlideRecord = Omit<WrappedSlideInput, "id"> & {
  id: string;
  createdBy: string;
  updatedAtMs?: number;
};

export const DEFAULT_WRAPPED_SETTINGS: WrappedSettingsRecord = {
  enabled: true,
  showHomeBanner: true,
  countdownTargetIso: "2026-12-31T18:00:00Z",
  countdownHeadline: "TTA Year Wrapped 2026 unlocks soon.",
  countdownSubtext:
    "Our first year, in conversations — the sessions, the numbers, and the architects who showed up.",
  pageTitle: "TTA Year Wrapped 2026",
  pageIntro: "Our first year, in conversations. Tap through to see what we built together.",
  closingHeadline: "Be part of what comes next.",
  closingBody: "Join the community and we'll send you the next session invitation.",
  shareCaption:
    "Our first year at The Thinking Architects, in conversations. Around 300 people registered, 76 joined the community, and we're just getting started. See our Year Wrapped: [link]",
  autoplaySeconds: 0,
  exists: false,
};

export const DEFAULT_WRAPPED_SLIDES: WrappedSlideRecord[] = [
  {
    id: "wrapped-01-cover",
    order: 1,
    label: "Cover",
    kind: "cover",
    theme: "dark",
    eyebrow: "The Thinking Architects",
    headline: "TTA Year Wrapped 2026",
    body: "Our first year, in conversations.",
    accentDate: "",
    metricPrefix: "",
    metricValue: 0,
    metricSuffix: "",
    secondaryMetricA: 0,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-02-start",
    order: 2,
    label: "Start",
    kind: "statement",
    theme: "cream",
    eyebrow: "In January 2026, we started with one idea:",
    headline: "nobody should have to figure this profession out alone.",
    body: "",
    accentDate: "",
    metricPrefix: "",
    metricValue: 0,
    metricSuffix: "",
    secondaryMetricA: 0,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-03-audience",
    order: 3,
    label: "Audience",
    kind: "metric",
    theme: "dark",
    eyebrow: "",
    headline: "",
    body: "people registered for at least one of our events.",
    accentDate: "",
    metricPrefix: "~",
    metricValue: 300,
    metricSuffix: "",
    secondaryMetricA: 0,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-04-returning",
    order: 4,
    label: "Coming back",
    kind: "metric",
    theme: "dark",
    eyebrow: "",
    headline: "",
    body: "registered for more than one session.",
    accentDate: "",
    metricPrefix: "",
    metricValue: 50,
    metricSuffix: "+",
    secondaryMetricA: 0,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-05-sessions",
    order: 5,
    label: "Think Sessions",
    kind: "sessions",
    theme: "cream",
    eyebrow: "",
    headline: "Real conversations with practising architects.",
    body: "",
    accentDate: "",
    metricPrefix: "",
    metricValue: 0,
    metricSuffix: "",
    secondaryMetricA: 0,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [
      "Apr 18 :: Building Your Name Before You Build Buildings, with Sana Tabassum",
      "May 30 :: The Project That Broke Me, and What I Built After, with Arc. Stephen Iyobosa Omwanghe",
      "Sep 26 :: Career-Proofing: How Architects Stay Relevant and Resilient, with Arc. Ololade Babajide Suleiman and Dr. Burabari Akpe Nwako",
    ],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-06-awareness",
    order: 6,
    label: "Awareness program",
    kind: "statement",
    theme: "cream",
    eyebrow: "Pathway to Practice",
    headline:
      "On Nov 14, we walked students and early-career architects through ARCON registration in Pathway to Practice, with Arc. Agboola Tomiloba Matthew.",
    body: "",
    accentDate: "Nov 14",
    metricPrefix: "",
    metricValue: 0,
    metricSuffix: "",
    secondaryMetricA: 0,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-07-community",
    order: 7,
    label: "Community",
    kind: "community",
    theme: "dark",
    eyebrow: "",
    headline: "",
    body: "members have joined the community.",
    accentDate: "",
    metricPrefix: "",
    metricValue: 76,
    metricSuffix: "",
    secondaryMetricA: 40,
    secondaryLabelA: "are students.",
    secondaryMetricB: 26,
    secondaryLabelB: "are professionals.",
    items: [],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-08-discovery",
    order: 8,
    label: "How they found us",
    kind: "statement",
    theme: "cream",
    eyebrow: "",
    headline: "More than half of our members joined after attending a Think Session.",
    body: "",
    accentDate: "More than half",
    metricPrefix: "",
    metricValue: 0,
    metricSuffix: "",
    secondaryMetricA: 58,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-09-geography",
    order: 9,
    label: "Where they're from",
    kind: "statement",
    theme: "cream",
    eyebrow: "Oyo",
    headline: "Members from across Nigeria, led by Lagos and Oyo.",
    body: "",
    accentDate: "Lagos",
    metricPrefix: "",
    metricValue: 0,
    metricSuffix: "",
    secondaryMetricA: 0,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-10-welcome",
    order: 10,
    label: "Welcome",
    kind: "statement",
    theme: "cream",
    eyebrow: "",
    headline: "Every new member gets a welcome email from us. Nobody joins and hears nothing.",
    body: "",
    accentDate: "",
    metricPrefix: "",
    metricValue: 0,
    metricSuffix: "",
    secondaryMetricA: 0,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-11-thank-you",
    order: 11,
    label: "Thank you",
    kind: "statement",
    theme: "cream",
    eyebrow: "",
    headline:
      "To our guests, our team, and everyone who showed up and asked a question: thank you.",
    body: "",
    accentDate: "",
    metricPrefix: "",
    metricValue: 0,
    metricSuffix: "",
    secondaryMetricA: 0,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [],
    ctaLabel: "",
    published: true,
    createdBy: "default",
  },
  {
    id: "wrapped-12-next",
    order: 12,
    label: "Next",
    kind: "cta",
    theme: "dark",
    eyebrow: "",
    headline: "More sessions. More conversations. See you in 2027.",
    body: "",
    accentDate: "",
    metricPrefix: "",
    metricValue: 0,
    metricSuffix: "",
    secondaryMetricA: 0,
    secondaryLabelA: "",
    secondaryMetricB: 0,
    secondaryLabelB: "",
    items: [],
    ctaLabel: "Join the community",
    published: true,
    createdBy: "default",
  },
];

export function validateWrappedSettingsInput(input: WrappedSettingsInput): string | null {
  const L = BLUEPRINT_LIMITS.wrappedSettings;
  const iso = input.countdownTargetIso.trim();
  if (iso.length > L.countdownTargetIso.max || !L.countdownTargetPattern.test(iso)) {
    return "Countdown target must be a valid ISO timestamp (e.g. 2026-12-31T18:00:00Z) or left blank.";
  }
  if (input.countdownHeadline.trim().length < L.countdownHeadline.min) {
    return "Countdown headline must be at least 3 characters.";
  }
  if (input.countdownSubtext.trim().length < L.countdownSubtext.min) {
    return "Countdown description must be at least 5 characters.";
  }
  if (input.pageTitle.trim().length < L.pageTitle.min) {
    return "Page title must be at least 3 characters.";
  }
  if (input.pageIntro.trim().length < L.pageIntro.min) {
    return "Page intro must be at least 5 characters.";
  }
  if (input.closingHeadline.trim().length < L.closingHeadline.min) {
    return "Closing headline must be at least 3 characters.";
  }
  if (input.closingBody.trim().length < L.closingBody.min) {
    return "Closing body must be at least 5 characters.";
  }
  if (input.shareCaption.trim().length < L.shareCaption.min) {
    return "Share caption must be at least 10 characters.";
  }
  if (
    !Number.isFinite(input.autoplaySeconds) ||
    input.autoplaySeconds < L.autoplaySeconds.min ||
    input.autoplaySeconds > L.autoplaySeconds.max
  ) {
    return "Autoplay seconds must be between 0 and 60.";
  }
  return null;
}

export function validateWrappedSlideInput(input: WrappedSlideInput): string | null {
  const L = BLUEPRINT_LIMITS.wrappedSlide;
  if (input.label.trim().length < L.label.min) {
    return "Slide label must be at least 1 character.";
  }
  if (
    !input.headline.trim() &&
    !input.body.trim() &&
    input.metricValue <= 0 &&
    input.items.length === 0
  ) {
    return "Please enter a headline, metric value, body copy, or session list items.";
  }
  if (
    !Number.isFinite(input.order) ||
    input.order < L.order.min ||
    input.order > L.order.max
  ) {
    return "Slide order must be between 0 and 1000.";
  }
  if (
    !Number.isFinite(input.metricValue) ||
    input.metricValue < L.metricValue.min ||
    input.metricValue > L.metricValue.max
  ) {
    return "Metric value must be between 0 and 10,000,000.";
  }
  return null;
}

function clampNonNegativeInt(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}

function sanitizeWrappedItems(items: string[]): string[] {
  const L = BLUEPRINT_LIMITS.wrappedSlide;
  return items
    .map((item) => item.trim().slice(0, L.itemMaxLength))
    .filter((item) => item.length > 0)
    .slice(0, L.maxItems);
}

const VALID_WRAPPED_KINDS: WrappedSlideKind[] = [
  "cover",
  "statement",
  "metric",
  "sessions",
  "community",
  "cta",
];

function mapWrappedSlideDoc(id: string, data: Record<string, unknown>): WrappedSlideRecord {
  const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
  const rawKind = String(data.kind ?? "statement") as WrappedSlideKind;
  const kind = VALID_WRAPPED_KINDS.includes(rawKind) ? rawKind : "statement";
  const theme: WrappedSlideTheme = data.theme === "dark" ? "dark" : "cream";

  return {
    id,
    order: typeof data.order === "number" ? data.order : Number(data.order ?? 0) || 0,
    label: String(data.label ?? "Slide"),
    kind,
    theme,
    eyebrow: String(data.eyebrow ?? ""),
    headline: String(data.headline ?? ""),
    body: String(data.body ?? ""),
    accentDate: String(data.accentDate ?? ""),
    metricPrefix: String(data.metricPrefix ?? ""),
    metricValue:
      typeof data.metricValue === "number"
        ? data.metricValue
        : Number(data.metricValue ?? 0) || 0,
    metricSuffix: String(data.metricSuffix ?? ""),
    secondaryMetricA:
      typeof data.secondaryMetricA === "number"
        ? data.secondaryMetricA
        : Number(data.secondaryMetricA ?? 0) || 0,
    secondaryLabelA: String(data.secondaryLabelA ?? ""),
    secondaryMetricB:
      typeof data.secondaryMetricB === "number"
        ? data.secondaryMetricB
        : Number(data.secondaryMetricB ?? 0) || 0,
    secondaryLabelB: String(data.secondaryLabelB ?? ""),
    items: Array.isArray(data.items) ? data.items.map(String) : [],
    ctaLabel: String(data.ctaLabel ?? ""),
    published: Boolean(data.published),
    createdBy: String(data.createdBy ?? ""),
    updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
  };
}

function sortWrappedSlides(items: WrappedSlideRecord[]): WrappedSlideRecord[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return (a.updatedAtMs ?? 0) - (b.updatedAtMs ?? 0);
  });
}

export function subscribeWrappedSettings(
  onData: (settings: WrappedSettingsRecord) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "siteSettings", "wrapped"),
    (snap) => {
      if (!snap.exists()) {
        onData({ ...DEFAULT_WRAPPED_SETTINGS, exists: false });
        return;
      }
      const data = snap.data();
      onData({
        enabled: typeof data.enabled === "boolean" ? data.enabled : DEFAULT_WRAPPED_SETTINGS.enabled,
        showHomeBanner:
          typeof data.showHomeBanner === "boolean"
            ? data.showHomeBanner
            : DEFAULT_WRAPPED_SETTINGS.showHomeBanner,
        countdownTargetIso: String(
          data.countdownTargetIso ?? DEFAULT_WRAPPED_SETTINGS.countdownTargetIso,
        ),
        countdownHeadline: String(
          data.countdownHeadline ?? DEFAULT_WRAPPED_SETTINGS.countdownHeadline,
        ),
        countdownSubtext: String(
          data.countdownSubtext ?? DEFAULT_WRAPPED_SETTINGS.countdownSubtext,
        ),
        pageTitle: String(data.pageTitle ?? DEFAULT_WRAPPED_SETTINGS.pageTitle),
        pageIntro: String(data.pageIntro ?? DEFAULT_WRAPPED_SETTINGS.pageIntro),
        closingHeadline: String(data.closingHeadline ?? DEFAULT_WRAPPED_SETTINGS.closingHeadline),
        closingBody: String(data.closingBody ?? DEFAULT_WRAPPED_SETTINGS.closingBody),
        shareCaption: String(data.shareCaption ?? DEFAULT_WRAPPED_SETTINGS.shareCaption),
        autoplaySeconds:
          typeof data.autoplaySeconds === "number"
            ? data.autoplaySeconds
            : DEFAULT_WRAPPED_SETTINGS.autoplaySeconds,
        exists: true,
      });
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.GET, "siteSettings/wrapped");
      if (onError) onError(structured);
    },
  );
}

export async function saveWrappedSettings(input: WrappedSettingsInput) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.wrappedSettings;
  const payload = {
    enabled: Boolean(input.enabled),
    showHomeBanner: Boolean(input.showHomeBanner),
    countdownTargetIso: clampStr(input.countdownTargetIso, L.countdownTargetIso.max),
    countdownHeadline: clampStr(input.countdownHeadline, L.countdownHeadline.max),
    countdownSubtext: clampStr(input.countdownSubtext, L.countdownSubtext.max),
    pageTitle: clampStr(input.pageTitle, L.pageTitle.max),
    pageIntro: clampStr(input.pageIntro, L.pageIntro.max),
    closingHeadline: clampStr(input.closingHeadline, L.closingHeadline.max),
    closingBody: clampStr(input.closingBody, L.closingBody.max),
    shareCaption: clampStr(input.shareCaption, L.shareCaption.max),
    autoplaySeconds: clampNonNegativeInt(input.autoplaySeconds, L.autoplaySeconds.max),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  const ref = doc(db, "siteSettings", "wrapped");
  const path = "siteSettings/wrapped";
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

export function subscribePublishedWrappedSlides(
  onData: (items: WrappedSlideRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, "wrappedSlides"), where("published", "==", true));
  return onSnapshot(
    q,
    (snap) => {
      const list = sortWrappedSlides(snap.docs.map((d) => mapWrappedSlideDoc(d.id, d.data())));
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "wrappedSlides");
      if (onError) onError(structured);
    },
  );
}

export function subscribeAllWrappedSlides(
  onData: (items: WrappedSlideRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "wrappedSlides"),
    (snap) => {
      const list = sortWrappedSlides(snap.docs.map((d) => mapWrappedSlideDoc(d.id, d.data())));
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "wrappedSlides");
      if (onError) onError(structured);
    },
  );
}

export async function saveWrappedSlide(input: WrappedSlideInput) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.wrappedSlide;
  const docId = input.id ? input.id : toValidDocId(input.label, "wrapped-slide");
  const path = `wrappedSlides/${docId}`;

  const payloadFields = {
    order: clampNonNegativeInt(input.order, L.order.max),
    label: clampStr(input.label, L.label.max),
    kind: input.kind,
    theme: input.theme,
    eyebrow: clampStr(input.eyebrow, L.eyebrow.max),
    headline: clampStr(input.headline, L.headline.max),
    body: clampStr(input.body, L.body.max),
    accentDate: clampStr(input.accentDate, L.accentDate.max),
    metricPrefix: clampStr(input.metricPrefix, L.metricPrefix.max),
    metricValue: clampNonNegativeInt(input.metricValue, L.metricValue.max),
    metricSuffix: clampStr(input.metricSuffix, L.metricSuffix.max),
    secondaryMetricA: clampNonNegativeInt(input.secondaryMetricA, L.secondaryMetricA.max),
    secondaryLabelA: clampStr(input.secondaryLabelA, L.secondaryLabelA.max),
    secondaryMetricB: clampNonNegativeInt(input.secondaryMetricB, L.secondaryMetricB.max),
    secondaryLabelB: clampStr(input.secondaryLabelB, L.secondaryLabelB.max),
    items: sanitizeWrappedItems(input.items),
    ctaLabel: clampStr(input.ctaLabel, L.ctaLabel.max),
    published: Boolean(input.published),
  };

  try {
    if (input.id) {
      await updateDoc(doc(db, "wrappedSlides", docId), {
        ...payloadFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, "wrappedSlides", docId), {
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

export async function toggleWrappedSlidePublished(slide: WrappedSlideRecord) {
  const path = `wrappedSlides/${slide.id}`;
  try {
    await updateDoc(doc(db, "wrappedSlides", slide.id), {
      published: !slide.published,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function swapWrappedSlideOrder(
  first: WrappedSlideRecord,
  second: WrappedSlideRecord,
) {
  const path = `wrappedSlides/${first.id}`;
  try {
    const batch = writeBatch(db);
    const firstOrder = first.order;
    const secondOrder = second.order === firstOrder ? firstOrder + 1 : second.order;
    batch.update(doc(db, "wrappedSlides", first.id), {
      order: secondOrder,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, "wrappedSlides", second.id), {
      order: firstOrder,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeWrappedSlide(slideId: string) {
  const path = `wrappedSlides/${slideId}`;
  try {
    await deleteDoc(doc(db, "wrappedSlides", slideId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDefaultWrappedSlides(existingSlides: WrappedSlideRecord[] = []) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.wrappedSlide;
  try {
    const batch = writeBatch(db);
    const existingIds = new Set(existingSlides.map((s) => s.id));

    for (const slide of DEFAULT_WRAPPED_SLIDES) {
      const ref = doc(db, "wrappedSlides", slide.id);
      const baseFields = {
        order: clampNonNegativeInt(slide.order, L.order.max),
        label: clampStr(slide.label, L.label.max),
        kind: slide.kind,
        theme: slide.theme,
        eyebrow: clampStr(slide.eyebrow, L.eyebrow.max),
        headline: clampStr(slide.headline, L.headline.max),
        body: clampStr(slide.body, L.body.max),
        accentDate: clampStr(slide.accentDate, L.accentDate.max),
        metricPrefix: clampStr(slide.metricPrefix, L.metricPrefix.max),
        metricValue: clampNonNegativeInt(slide.metricValue, L.metricValue.max),
        metricSuffix: clampStr(slide.metricSuffix, L.metricSuffix.max),
        secondaryMetricA: clampNonNegativeInt(slide.secondaryMetricA, L.secondaryMetricA.max),
        secondaryLabelA: clampStr(slide.secondaryLabelA, L.secondaryLabelA.max),
        secondaryMetricB: clampNonNegativeInt(slide.secondaryMetricB, L.secondaryMetricB.max),
        secondaryLabelB: clampStr(slide.secondaryLabelB, L.secondaryLabelB.max),
        items: sanitizeWrappedItems(slide.items),
        ctaLabel: clampStr(slide.ctaLabel, L.ctaLabel.max),
        published: slide.published,
      };

      if (existingIds.has(slide.id)) {
        batch.update(ref, {
          ...baseFields,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(ref, {
          ...baseFields,
          createdBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "wrappedSlides");
  }
}

// --- Live Session Companion (/siteSettings/live) & Live Q&A (/sessionQuestions) ---

export type LiveSettingsInput = {
  isLive: boolean;
  liveSessionId: string;
  liveTitle: string;
  liveRoomUrl: string;
  liveStartedAtIso: string;
  qaEnabled: boolean;
  announcementEnabled: boolean;
  announcementText: string;
  announcementLinkLabel: string;
  announcementLinkHref: string;
};

export type LiveSettingsRecord = LiveSettingsInput & {
  exists: boolean;
};

export type SessionQuestionRecord = {
  id: string;
  sessionId: string;
  authorName: string;
  question: string;
  upvotes: number;
  answered: boolean;
  createdAtMs: number;
};

export type SessionQuestionInput = {
  sessionId: string;
  authorName: string;
  question: string;
};

export const DEFAULT_LIVE_SETTINGS: LiveSettingsRecord = {
  isLive: false,
  liveSessionId: "",
  liveTitle: "",
  liveRoomUrl: "",
  liveStartedAtIso: "",
  qaEnabled: true,
  announcementEnabled: false,
  announcementText: "TTA Year Wrapped 2026 is now live — explore our first year in conversations.",
  announcementLinkLabel: "View Wrapped",
  announcementLinkHref: "/wrapped",
  exists: false,
};

export function validateLiveSettingsInput(input: LiveSettingsInput): string | null {
  const L = BLUEPRINT_LIMITS.liveSettings;
  const sid = input.liveSessionId.trim();
  if (sid.length > L.liveSessionId.max || !L.sessionIdPattern.test(sid)) {
    return "Selected session ID contains invalid characters.";
  }
  const roomUrl = input.liveRoomUrl.trim();
  if (roomUrl.length > L.liveRoomUrl.max || (roomUrl && !BLUEPRINT_LIMITS.httpsPattern.test(roomUrl))) {
    return "Live room URL must start with https:// or be left blank.";
  }
  const startedIso = input.liveStartedAtIso.trim();
  if (
    startedIso.length > L.liveStartedAtIso.max ||
    !BLUEPRINT_LIMITS.wrappedSettings.countdownTargetPattern.test(startedIso)
  ) {
    return "Live start timestamp must be valid ISO-8601 or left blank.";
  }
  if (input.liveTitle.trim().length > L.liveTitle.max) {
    return `Live title must be ${L.liveTitle.max} characters or less.`;
  }
  if (input.announcementText.trim().length > L.announcementText.max) {
    return `Announcement bar text must be ${L.announcementText.max} characters or less.`;
  }
  if (input.announcementLinkLabel.trim().length > L.announcementLinkLabel.max) {
    return `Announcement link label must be ${L.announcementLinkLabel.max} characters or less.`;
  }
  const href = input.announcementLinkHref.trim();
  if (href.length > L.announcementLinkHref.max || !L.announcementHrefPattern.test(href)) {
    return "Announcement link must start with / or https:// (or be left blank).";
  }
  return null;
}

export function validateSessionQuestionInput(input: SessionQuestionInput): string | null {
  const L = BLUEPRINT_LIMITS.sessionQuestion;
  const cleanSid = input.sessionId.trim();
  if (!cleanSid || !BLUEPRINT_LIMITS.idPattern.test(cleanSid)) {
    return "Invalid target session.";
  }
  if (input.authorName.trim().length < L.authorName.min) {
    return "Please enter your name.";
  }
  if (input.question.trim().length < L.question.min) {
    return "Question must be at least 5 characters.";
  }
  if (input.question.trim().length > L.question.max) {
    return `Question must be ${L.question.max} characters or less.`;
  }
  return null;
}

function mapQuestionDoc(id: string, data: Record<string, unknown>): SessionQuestionRecord {
  const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
  return {
    id,
    sessionId: String(data.sessionId ?? ""),
    authorName: String(data.authorName ?? ""),
    question: String(data.question ?? ""),
    upvotes: typeof data.upvotes === "number" ? data.upvotes : Number(data.upvotes ?? 1) || 1,
    answered: Boolean(data.answered),
    createdAtMs: createdAt?.toMillis ? createdAt.toMillis() : 0,
  };
}

function sortQuestions(items: SessionQuestionRecord[]): SessionQuestionRecord[] {
  return [...items].sort((a, b) => {
    if (a.answered !== b.answered) return Number(a.answered) - Number(b.answered);
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    return b.createdAtMs - a.createdAtMs;
  });
}

export function subscribeLiveSettings(
  onData: (settings: LiveSettingsRecord) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "siteSettings", "live"),
    (snap) => {
      if (!snap.exists()) {
        onData({ ...DEFAULT_LIVE_SETTINGS, exists: false });
        return;
      }
      const data = snap.data();
      onData({
        isLive: Boolean(data.isLive),
        liveSessionId: String(data.liveSessionId ?? ""),
        liveTitle: String(data.liveTitle ?? ""),
        liveRoomUrl: String(data.liveRoomUrl ?? ""),
        liveStartedAtIso: String(data.liveStartedAtIso ?? ""),
        qaEnabled: typeof data.qaEnabled === "boolean" ? data.qaEnabled : true,
        announcementEnabled: Boolean(data.announcementEnabled),
        announcementText: String(data.announcementText ?? DEFAULT_LIVE_SETTINGS.announcementText),
        announcementLinkLabel: String(
          data.announcementLinkLabel ?? DEFAULT_LIVE_SETTINGS.announcementLinkLabel,
        ),
        announcementLinkHref: String(
          data.announcementLinkHref ?? DEFAULT_LIVE_SETTINGS.announcementLinkHref,
        ),
        exists: true,
      });
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.GET, "siteSettings/live");
      if (onError) onError(structured);
    },
  );
}

export async function saveLiveSettings(input: LiveSettingsInput) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.liveSettings;
  const payload = {
    isLive: Boolean(input.isLive),
    liveSessionId: clampStr(input.liveSessionId, L.liveSessionId.max),
    liveTitle: clampStr(input.liveTitle, L.liveTitle.max),
    liveRoomUrl: clampStr(input.liveRoomUrl, L.liveRoomUrl.max),
    liveStartedAtIso: clampStr(input.liveStartedAtIso, L.liveStartedAtIso.max),
    qaEnabled: Boolean(input.qaEnabled),
    announcementEnabled: Boolean(input.announcementEnabled),
    announcementText: clampStr(input.announcementText, L.announcementText.max),
    announcementLinkLabel: clampStr(input.announcementLinkLabel, L.announcementLinkLabel.max),
    announcementLinkHref: clampStr(input.announcementLinkHref, L.announcementLinkHref.max),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  const ref = doc(db, "siteSettings", "live");
  const path = "siteSettings/live";
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

export function subscribeSessionQuestions(
  sessionId: string,
  onData: (items: SessionQuestionRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const cleanId = sessionId.trim();
  if (!cleanId) {
    onData([]);
    return () => {};
  }
  const q = query(collection(db, "sessionQuestions"), where("sessionId", "==", cleanId));
  return onSnapshot(
    q,
    (snap) => {
      const list = sortQuestions(snap.docs.map((d) => mapQuestionDoc(d.id, d.data())));
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "sessionQuestions");
      if (onError) onError(structured);
    },
  );
}

export function subscribeAllSessionQuestions(
  onData: (items: SessionQuestionRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "sessionQuestions"),
    (snap) => {
      const list = sortQuestions(snap.docs.map((d) => mapQuestionDoc(d.id, d.data())));
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "sessionQuestions");
      if (onError) onError(structured);
    },
  );
}

export async function submitSessionQuestion(input: SessionQuestionInput): Promise<string> {
  const L = BLUEPRINT_LIMITS.sessionQuestion;
  const err = validateSessionQuestionInput(input);
  if (err) throw new Error(err);

  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const docId = `q-${Date.now()}-${randomSuffix}`;
  const path = `sessionQuestions/${docId}`;

  try {
    await setDoc(doc(db, "sessionQuestions", docId), {
      sessionId: input.sessionId.trim(),
      authorName: clampStr(input.authorName, L.authorName.max),
      question: clampStr(input.question, L.question.max),
      upvotes: 1,
      answered: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function upvoteSessionQuestion(questionId: string) {
  const path = `sessionQuestions/${questionId}`;
  try {
    await updateDoc(doc(db, "sessionQuestions", questionId), {
      upvotes: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleQuestionAnswered(item: SessionQuestionRecord) {
  const path = `sessionQuestions/${item.id}`;
  try {
    await updateDoc(doc(db, "sessionQuestions", item.id), {
      answered: !item.answered,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeSessionQuestion(questionId: string) {
  const path = `sessionQuestions/${questionId}`;
  try {
    await deleteDoc(doc(db, "sessionQuestions", questionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
