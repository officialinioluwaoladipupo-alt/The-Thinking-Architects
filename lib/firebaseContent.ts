import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
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
import { legacyDb } from "./legacyFirebase";

export type SessionResource = {
  label: string;
  url: string;
};

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
  startAtIso?: string;
  resources?: SessionResource[];
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
  httpsRequiredPattern: /^https:\/\/.+/,
  emailPattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
  isoDatePattern: /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?$/,
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
    startAtIso: { max: 40 },
    maxTopics: 6,
    topicMaxLength: 160,
    maxResources: 4,
    resourceLabelMax: 80,
    resourceUrlMax: 350,
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
  pitch: {
    name: { min: 2, max: 100 },
    email: { min: 5, max: 254 },
    roleOrStudio: { max: 120 },
    topicTitle: { min: 3, max: 140 },
    outline: { min: 10, max: 800 },
    linkUrl: { max: 300 },
  },
  siteSettings: {
    url: { max: 300 },
  },
  wrapped: {
    yearLabel: { min: 1, max: 20 },
    eyebrow: { min: 1, max: 80 },
    pageTitle: { min: 2, max: 120 },
    pageSubtitle: { min: 2, max: 240 },
    shareCaption: { min: 10, max: 420 },
    offlineTitle: { min: 2, max: 120 },
    offlineMessage: { min: 2, max: 320 },
    homeBannerEyebrow: { min: 1, max: 80 },
    homeBannerTitle: { min: 2, max: 140 },
    homeBannerCtaLabel: { min: 1, max: 50 },
    launchDateIso: { max: 40 },
    coverTitle: { min: 2, max: 120 },
    coverSubtitle: { min: 2, max: 180 },
    startLead: { min: 2, max: 140 },
    startStatement: { min: 2, max: 200 },
    prefixSuffixMax: 10,
    audienceCaption: { min: 2, max: 180 },
    returningCaption: { min: 2, max: 180 },
    sessionsHeading: { min: 2, max: 160 },
    maxSessionHighlights: 8,
    sessionHighlightMaxLength: 220,
    awarenessDate: { min: 1, max: 40 },
    awarenessPrefix: { min: 2, max: 180 },
    awarenessProgramTitle: { min: 2, max: 120 },
    awarenessSpeaker: { min: 2, max: 140 },
    communityCaption: { min: 2, max: 160 },
    discoveryHighlight: { min: 2, max: 80 },
    discoveryBody: { min: 2, max: 200 },
    locationsLead: { min: 2, max: 140 },
    locationPrimary: { min: 1, max: 60 },
    locationSecondary: { max: 60 },
    maxExtraLocations: 10,
    extraLocationMaxLength: 60,
    welcomeStatement: { min: 2, max: 260 },
    thankYouStatement: { min: 2, max: 260 },
    closingStatement: { min: 2, max: 220 },
    closingCtaLabel: { min: 2, max: 60 },
    maxCustomStats: 6,
    customStatMaxLength: 220,
  },
  communityStats: {
    countriesMax: 1000,
    maxTopLocations: 10,
    topLocationMaxLength: 60,
    sourceLabelMax: 80,
    lastSyncedIsoMax: 40,
  },
  googleSheets: {
    spreadsheetIdMax: 128,
    spreadsheetTitleMax: 140,
    sheetNameMax: 100,
    columnNameMax: 80,
    lastSyncedIsoMax: 40,
  },
  liveState: {
    sessionIdMax: 128,
    sessionNumberMax: 40,
    sessionTitleMax: 140,
    speakerMax: 100,
    startedAtIsoMax: 40,
    roomUrlMax: 400,
  },
  question: {
    sessionIdMax: 128,
    authorName: { min: 2, max: 80 },
    authorStageMax: 60,
    questionText: { min: 6, max: 320 },
    maxUpvotes: 100000,
  },
} as const;

export type FirestoreSessionRecord = ThinkSession & {
  isNextSession: boolean;
  published: boolean;
  registrationUrl: string;
  startAtIso: string;
  resources: SessionResource[];
  createdBy: string;
  updatedAtMs?: number;
  sourceDb?: "primary" | "legacy";
};

export type FirestoreMediaRecord = MediaFeature & {
  mediaUrl: string;
  published: boolean;
  createdBy: string;
  updatedAtMs?: number;
  sourceDb?: "primary" | "legacy";
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

export type PitchType = "speaker" | "topic";
export type PitchStatus = "new" | "reviewed" | "scheduled" | "archived";
export const PITCH_TARGET_STAGES = [
  "Students",
  "Graduates & Early-Career",
  "Practising Architects",
  "All Stages",
] as const;
export type PitchTargetStage = (typeof PITCH_TARGET_STAGES)[number];

export type TopicPitchInput = {
  pitchType: PitchType;
  name: string;
  email: string;
  roleOrStudio?: string;
  topicTitle: string;
  targetStage: PitchTargetStage;
  outline: string;
  linkUrl?: string;
};

export type TopicPitchRecord = {
  id: string;
  pitchType: PitchType;
  name: string;
  email: string;
  roleOrStudio: string;
  topicTitle: string;
  targetStage: PitchTargetStage;
  outline: string;
  linkUrl: string;
  status: PitchStatus;
  createdAtMs: number;
  updatedAtMs: number;
};

export type WrappedConfigInput = {
  enabled: boolean;
  showInFooter: boolean;
  showInNav: boolean;
  homeBannerEnabled: boolean;
  homeCountdownEnabled: boolean;
  yearLabel: string;
  eyebrow: string;
  pageTitle: string;
  pageSubtitle: string;
  shareCaption: string;
  offlineTitle: string;
  offlineMessage: string;
  homeBannerEyebrow: string;
  homeBannerTitle: string;
  homeBannerCtaLabel: string;
  launchDateIso: string;
  coverTitle: string;
  coverSubtitle: string;
  startLead: string;
  startStatement: string;
  audienceCount: number;
  audiencePrefix: string;
  audienceSuffix: string;
  audienceCaption: string;
  returningCount: number;
  returningSuffix: string;
  returningCaption: string;
  sessionsHeading: string;
  sessionHighlights: string[];
  awarenessDate: string;
  awarenessPrefix: string;
  awarenessProgramTitle: string;
  awarenessSpeaker: string;
  communityTotal: number;
  communityCaption: string;
  studentsCount: number;
  professionalsCount: number;
  discoveryHighlight: string;
  discoveryBody: string;
  discoveryPercent: number;
  locationsLead: string;
  locationPrimary: string;
  locationSecondary: string;
  extraLocations: string[];
  welcomeStatement: string;
  thankYouStatement: string;
  closingStatement: string;
  closingCtaLabel: string;
  customStats: string[];
};

export type WrappedConfigRecord = WrappedConfigInput & {
  exists: boolean;
  updatedAtMs?: number;
};

export type WrappedEditionRecord = WrappedConfigRecord & {
  id: string;
};

export const DEFAULT_WRAPPED_CONFIG: WrappedConfigInput = {
  enabled: true,
  showInFooter: true,
  showInNav: false,
  homeBannerEnabled: true,
  homeCountdownEnabled: false,
  yearLabel: "2026",
  eyebrow: "Annual Review · 2026",
  pageTitle: "TTA Year Wrapped 2026",
  pageSubtitle: "Our first year, in conversations. Tap through to see what we built together.",
  shareCaption:
    "Our first year at The Thinking Architects, in conversations. Around 300 people registered, 76 joined the community, and we're just getting started.",
  offlineTitle: "TTA Year Wrapped is currently offline",
  offlineMessage:
    "We are putting together the next edition of our annual review. Join the community to get notified the moment it goes live.",
  homeBannerEyebrow: "TTA Year Wrapped · 2026",
  homeBannerTitle: "Our first year, in conversations.",
  homeBannerCtaLabel: "Open Wrapped",
  launchDateIso: "2026-12-20T18:00:00Z",
  coverTitle: "TTA Year Wrapped 2026",
  coverSubtitle: "Our first year, in conversations.",
  startLead: "In January 2026, we started with one idea:",
  startStatement: "nobody should have to figure this profession out alone.",
  audienceCount: 300,
  audiencePrefix: "~",
  audienceSuffix: "",
  audienceCaption: "people registered for at least one of our events.",
  returningCount: 50,
  returningSuffix: "+",
  returningCaption: "registered for more than one session.",
  sessionsHeading: "Real conversations with practising architects.",
  sessionHighlights: [
    "Apr 18 | Building Your Name Before You Build Buildings, with Sana Tabassum",
    "May 30 | The Project That Broke Me, and What I Built After, with Arc. Stephen Iyobosa Omwanghe",
    "Sep 26 | Career-Proofing: How Architects Stay Relevant and Resilient, with Arc. Ololade Babajide Suleiman and Dr. Burabari Akpe Nwako",
  ],
  awarenessDate: "Nov 14",
  awarenessPrefix: "we walked students and early-career architects through ARCON registration in",
  awarenessProgramTitle: "Pathway to Practice",
  awarenessSpeaker: "with Arc. Agboola Tomiloba Matthew.",
  communityTotal: 76,
  communityCaption: "members have joined the community.",
  studentsCount: 40,
  professionalsCount: 26,
  discoveryHighlight: "More than half",
  discoveryBody: "of our members joined after attending a Think Session.",
  discoveryPercent: 58,
  locationsLead: "Members from across Nigeria, led by",
  locationPrimary: "Lagos",
  locationSecondary: "Oyo",
  extraLocations: [],
  welcomeStatement:
    "Every new member gets a welcome email from us. Nobody joins and hears nothing.",
  thankYouStatement:
    "To our guests, our team, and everyone who showed up and asked a question: thank you.",
  closingStatement: "More sessions. More conversations. See you in 2027.",
  closingCtaLabel: "Join the community",
  customStats: [],
};

export type CommunityStatsInput = {
  showOnCommunity: boolean;
  communityTotal: number;
  studentsCount: number;
  graduatesCount: number;
  professionalsCount: number;
  countriesCount: number;
  topLocations: string[];
  sourceLabel: string;
  lastSyncedIso: string;
};

export type CommunityStatsRecord = CommunityStatsInput & {
  exists: boolean;
  updatedAtMs?: number;
};

export const DEFAULT_COMMUNITY_STATS: CommunityStatsInput = {
  showOnCommunity: true,
  communityTotal: 76,
  studentsCount: 40,
  graduatesCount: 10,
  professionalsCount: 26,
  countriesCount: 1,
  topLocations: ["Nigeria"],
  sourceLabel: "Community Directory",
  lastSyncedIso: "",
};

export type GoogleSheetsConfigInput = {
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheetName: string;
  emailColumn: string;
  stageColumn: string;
  locationColumn: string;
  lastSyncedIso: string;
};

export type GoogleSheetsConfigRecord = GoogleSheetsConfigInput & {
  exists: boolean;
  updatedAtMs?: number;
};

export const DEFAULT_GOOGLE_SHEETS_CONFIG: GoogleSheetsConfigInput = {
  spreadsheetId: "",
  spreadsheetTitle: "",
  sheetName: "",
  emailColumn: "",
  stageColumn: "",
  locationColumn: "",
  lastSyncedIso: "",
};

export type LiveStateInput = {
  isLive: boolean;
  sessionId: string;
  sessionNumber: string;
  sessionTitle: string;
  speaker: string;
  startedAtIso: string;
  roomUrl: string;
  qaOpen: boolean;
};

export type LiveStateRecord = LiveStateInput & {
  exists: boolean;
  updatedAtMs?: number;
};

export const DEFAULT_LIVE_STATE: LiveStateInput = {
  isLive: false,
  sessionId: "",
  sessionNumber: "",
  sessionTitle: "",
  speaker: "",
  startedAtIso: "",
  roomUrl: "",
  qaOpen: false,
};

export type QuestionStatus = "queued" | "on_air" | "answered";

export type SessionQuestionInput = {
  sessionId: string;
  authorName: string;
  authorStage?: string;
  questionText: string;
};

export type SessionQuestionRecord = {
  id: string;
  sessionId: string;
  authorName: string;
  authorStage: string;
  questionText: string;
  upvotes: number;
  status: QuestionStatus;
  createdAtMs: number;
  updatedAtMs: number;
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
  startAtIso?: string;
  resources?: SessionResource[];
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

function clampInt(val: number, min = 0, max = 10000000): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

function sanitizeStringArray(arr: string[], maxItems: number, maxLen: number): string[] {
  const cleaned = arr
    .map((item) => item.trim().slice(0, maxLen))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
  return cleaned.length > 0 ? cleaned : ["Open member Q&A"];
}

function sanitizeOptionalStringArray(arr: string[], maxItems: number, maxLen: number): string[] {
  return arr
    .map((item) => item.trim().slice(0, maxLen))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

function sanitizeResources(items?: SessionResource[]): SessionResource[] {
  if (!Array.isArray(items)) return [];
  const L = BLUEPRINT_LIMITS.session;
  return items
    .map((item) => ({
      label: clampStr(String(item?.label ?? ""), L.resourceLabelMax),
      url: clampStr(String(item?.url ?? ""), L.resourceUrlMax),
    }))
    .filter(
      (item) =>
        item.label.length >= 1 &&
        item.url.length >= 10 &&
        BLUEPRINT_LIMITS.httpsRequiredPattern.test(item.url),
    )
    .slice(0, L.maxResources);
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
  const iso = (input.startAtIso ?? "").trim();
  if (iso && (!BLUEPRINT_LIMITS.isoDatePattern.test(iso) || Number.isNaN(Date.parse(iso)))) {
    return "Start date/time must be a valid ISO-8601 timestamp (e.g. 2026-11-28T18:00:00+01:00) or left blank.";
  }
  if (Array.isArray(input.resources)) {
    for (let i = 0; i < Math.min(input.resources.length, L.maxResources); i += 1) {
      const r = input.resources[i];
      const label = (r?.label ?? "").trim();
      const rUrl = (r?.url ?? "").trim();
      if (!label && !rUrl) continue;
      if (!label) return `Resource #${i + 1} needs a label.`;
      if (!rUrl || !BLUEPRINT_LIMITS.httpsRequiredPattern.test(rUrl) || rUrl.length < 10) {
        return `Resource #${i + 1} URL must be a full https:// link.`;
      }
    }
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

export function validatePitchInput(input: TopicPitchInput): string | null {
  const L = BLUEPRINT_LIMITS.pitch;
  if (input.name.trim().length < L.name.min) return "Please enter your name.";
  const email = input.email.trim().toLowerCase();
  if (email.length < L.email.min || !BLUEPRINT_LIMITS.emailPattern.test(email)) {
    return "Please enter a valid email address.";
  }
  if (input.topicTitle.trim().length < L.topicTitle.min) {
    return "Please provide a topic title (at least 3 characters).";
  }
  if (input.outline.trim().length < L.outline.min) {
    return "Please add a short outline of what you'd cover (at least 10 characters).";
  }
  const url = (input.linkUrl ?? "").trim();
  if (url && !BLUEPRINT_LIMITS.httpsPattern.test(url)) {
    return "Optional link must start with https:// or be left blank.";
  }
  return null;
}

export function validateWrappedConfigInput(input: WrappedConfigInput): string | null {
  const L = BLUEPRINT_LIMITS.wrapped;
  if (input.yearLabel.trim().length < L.yearLabel.min) return "Year label is required.";
  if (input.eyebrow.trim().length < L.eyebrow.min) return "Eyebrow label is required.";
  if (input.pageTitle.trim().length < L.pageTitle.min) return "Page title must be at least 2 characters.";
  if (input.pageSubtitle.trim().length < L.pageSubtitle.min) return "Page subtitle must be at least 2 characters.";
  if (input.shareCaption.trim().length < L.shareCaption.min) return "Share caption must be at least 10 characters.";
  if (input.offlineTitle.trim().length < L.offlineTitle.min) return "Offline headline must be at least 2 characters.";
  if (input.offlineMessage.trim().length < L.offlineMessage.min) return "Offline message must be at least 2 characters.";
  if (input.homeBannerEyebrow.trim().length < L.homeBannerEyebrow.min) return "Home banner eyebrow is required.";
  if (input.homeBannerTitle.trim().length < L.homeBannerTitle.min) return "Home banner title must be at least 2 characters.";
  if (input.homeBannerCtaLabel.trim().length < L.homeBannerCtaLabel.min) return "Home banner CTA label is required.";
  const iso = input.launchDateIso.trim();
  if (iso && !BLUEPRINT_LIMITS.isoDatePattern.test(iso)) {
    return "Launch date must be ISO-8601 format (e.g. 2026-12-20T18:00:00Z) or left blank.";
  }
  if (input.coverTitle.trim().length < L.coverTitle.min) return "Cover title must be at least 2 characters.";
  if (input.coverSubtitle.trim().length < L.coverSubtitle.min) return "Cover subtitle must be at least 2 characters.";
  if (input.startLead.trim().length < L.startLead.min) return "Start lead must be at least 2 characters.";
  if (input.startStatement.trim().length < L.startStatement.min) return "Start statement must be at least 2 characters.";
  if (input.audienceCaption.trim().length < L.audienceCaption.min) return "Audience caption must be at least 2 characters.";
  if (input.returningCaption.trim().length < L.returningCaption.min) return "Returning caption must be at least 2 characters.";
  if (input.sessionsHeading.trim().length < L.sessionsHeading.min) return "Sessions heading must be at least 2 characters.";
  if (input.awarenessDate.trim().length < L.awarenessDate.min) return "Awareness date is required.";
  if (input.awarenessPrefix.trim().length < L.awarenessPrefix.min) return "Awareness intro must be at least 2 characters.";
  if (input.awarenessProgramTitle.trim().length < L.awarenessProgramTitle.min) return "Awareness program title must be at least 2 characters.";
  if (input.awarenessSpeaker.trim().length < L.awarenessSpeaker.min) return "Awareness speaker attribution must be at least 2 characters.";
  if (input.communityCaption.trim().length < L.communityCaption.min) return "Community caption must be at least 2 characters.";
  if (input.discoveryHighlight.trim().length < L.discoveryHighlight.min) return "Discovery highlight must be at least 2 characters.";
  if (input.discoveryBody.trim().length < L.discoveryBody.min) return "Discovery body must be at least 2 characters.";
  if (input.discoveryPercent < 1 || input.discoveryPercent > 100) return "Discovery percent must be between 1 and 100.";
  if (input.locationsLead.trim().length < L.locationsLead.min) return "Locations lead must be at least 2 characters.";
  if (input.locationPrimary.trim().length < L.locationPrimary.min) return "Primary location is required.";
  if (input.welcomeStatement.trim().length < L.welcomeStatement.min) return "Welcome statement must be at least 2 characters.";
  if (input.thankYouStatement.trim().length < L.thankYouStatement.min) return "Thank you statement must be at least 2 characters.";
  if (input.closingStatement.trim().length < L.closingStatement.min) return "Closing statement must be at least 2 characters.";
  if (input.closingCtaLabel.trim().length < L.closingCtaLabel.min) return "Closing CTA label must be at least 2 characters.";
  return null;
}

function mapSessionResources(raw: unknown): SessionResource[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const label = String(obj.label ?? "").trim();
      const url = String(obj.url ?? "").trim();
      if (!label || !url.startsWith("https://")) return null;
      return { label, url };
    })
    .filter((item): item is SessionResource => item !== null)
    .slice(0, BLUEPRINT_LIMITS.session.maxResources);
}

function mapSessionDoc(
  id: string,
  data: Record<string, unknown>,
  sourceDb: "primary" | "legacy" = "primary",
): FirestoreSessionRecord {
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
    startAtIso: typeof data.startAtIso === "string" ? data.startAtIso : "",
    resources: mapSessionResources(data.resources),
    createdBy: String(data.createdBy ?? ""),
    updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
    sourceDb,
  };
}

function mapMediaDoc(
  id: string,
  data: Record<string, unknown>,
  sourceDb: "primary" | "legacy" = "primary",
): FirestoreMediaRecord {
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
    sourceDb,
  };
}

function mapWrappedConfigDoc(data: Record<string, unknown>): WrappedConfigRecord {
  const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
  const d = DEFAULT_WRAPPED_CONFIG;
  return {
    exists: true,
    enabled: typeof data.enabled === "boolean" ? data.enabled : d.enabled,
    showInFooter: typeof data.showInFooter === "boolean" ? data.showInFooter : d.showInFooter,
    showInNav: typeof data.showInNav === "boolean" ? data.showInNav : d.showInNav,
    homeBannerEnabled:
      typeof data.homeBannerEnabled === "boolean" ? data.homeBannerEnabled : d.homeBannerEnabled,
    homeCountdownEnabled:
      typeof data.homeCountdownEnabled === "boolean"
        ? data.homeCountdownEnabled
        : d.homeCountdownEnabled,
    yearLabel: String(data.yearLabel ?? d.yearLabel),
    eyebrow: String(data.eyebrow ?? d.eyebrow),
    pageTitle: String(data.pageTitle ?? d.pageTitle),
    pageSubtitle: String(data.pageSubtitle ?? d.pageSubtitle),
    shareCaption: String(data.shareCaption ?? d.shareCaption),
    offlineTitle: String(data.offlineTitle ?? d.offlineTitle),
    offlineMessage: String(data.offlineMessage ?? d.offlineMessage),
    homeBannerEyebrow: String(data.homeBannerEyebrow ?? d.homeBannerEyebrow),
    homeBannerTitle: String(data.homeBannerTitle ?? d.homeBannerTitle),
    homeBannerCtaLabel: String(data.homeBannerCtaLabel ?? d.homeBannerCtaLabel),
    launchDateIso: String(data.launchDateIso ?? d.launchDateIso),
    coverTitle: String(data.coverTitle ?? d.coverTitle),
    coverSubtitle: String(data.coverSubtitle ?? d.coverSubtitle),
    startLead: String(data.startLead ?? d.startLead),
    startStatement: String(data.startStatement ?? d.startStatement),
    audienceCount:
      typeof data.audienceCount === "number" ? data.audienceCount : d.audienceCount,
    audiencePrefix: String(data.audiencePrefix ?? d.audiencePrefix),
    audienceSuffix: String(data.audienceSuffix ?? d.audienceSuffix),
    audienceCaption: String(data.audienceCaption ?? d.audienceCaption),
    returningCount:
      typeof data.returningCount === "number" ? data.returningCount : d.returningCount,
    returningSuffix: String(data.returningSuffix ?? d.returningSuffix),
    returningCaption: String(data.returningCaption ?? d.returningCaption),
    sessionsHeading: String(data.sessionsHeading ?? d.sessionsHeading),
    sessionHighlights: Array.isArray(data.sessionHighlights)
      ? data.sessionHighlights.map(String)
      : d.sessionHighlights,
    awarenessDate: String(data.awarenessDate ?? d.awarenessDate),
    awarenessPrefix: String(data.awarenessPrefix ?? d.awarenessPrefix),
    awarenessProgramTitle: String(data.awarenessProgramTitle ?? d.awarenessProgramTitle),
    awarenessSpeaker: String(data.awarenessSpeaker ?? d.awarenessSpeaker),
    communityTotal:
      typeof data.communityTotal === "number" ? data.communityTotal : d.communityTotal,
    communityCaption: String(data.communityCaption ?? d.communityCaption),
    studentsCount:
      typeof data.studentsCount === "number" ? data.studentsCount : d.studentsCount,
    professionalsCount:
      typeof data.professionalsCount === "number"
        ? data.professionalsCount
        : d.professionalsCount,
    discoveryHighlight: String(data.discoveryHighlight ?? d.discoveryHighlight),
    discoveryBody: String(data.discoveryBody ?? d.discoveryBody),
    discoveryPercent:
      typeof data.discoveryPercent === "number" ? data.discoveryPercent : d.discoveryPercent,
    locationsLead: String(data.locationsLead ?? d.locationsLead),
    locationPrimary: String(data.locationPrimary ?? d.locationPrimary),
    locationSecondary: String(data.locationSecondary ?? d.locationSecondary),
    extraLocations: Array.isArray(data.extraLocations)
      ? data.extraLocations.map(String)
      : d.extraLocations,
    welcomeStatement: String(data.welcomeStatement ?? d.welcomeStatement),
    thankYouStatement: String(data.thankYouStatement ?? d.thankYouStatement),
    closingStatement: String(data.closingStatement ?? d.closingStatement),
    closingCtaLabel: String(data.closingCtaLabel ?? d.closingCtaLabel),
    customStats: Array.isArray(data.customStats) ? data.customStats.map(String) : d.customStats,
    updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
  };
}

// --- Public Live Subscriptions & Dual-DB Merging (Primary + Legacy active DB) ---

function sortPublishedSessions(items: FirestoreSessionRecord[]): FirestoreSessionRecord[] {
  return [...items].sort((a, b) => {
    const nextDiff = Number(b.isNextSession) - Number(a.isNextSession);
    if (nextDiff !== 0) return nextDiff;
    return (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0);
  });
}

function mergeById<T extends { id: string }>(legacyList: T[], primaryList: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of legacyList) {
    byId.set(item.id, item);
  }
  for (const item of primaryList) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

export function subscribePublishedSessions(
  onData: (items: FirestoreSessionRecord[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  let primaryItems: FirestoreSessionRecord[] = [];
  let legacyItems: FirestoreSessionRecord[] = [];
  let primaryFailed = false;
  let legacyFailed = false;

  const emit = () => {
    onData(sortPublishedSessions(mergeById(legacyItems, primaryItems)));
  };

  const unsubPrimary = onSnapshot(
    query(collection(db, "sessions"), where("published", "==", true)),
    (snap) => {
      primaryFailed = false;
      primaryItems = snap.docs.map((d) => mapSessionDoc(d.id, d.data(), "primary"));
      emit();
    },
    (error) => {
      primaryFailed = true;
      const structured = captureFirestoreError(error, OperationType.LIST, "sessions");
      if (legacyFailed) {
        onError(structured);
      } else {
        console.warn("Primary sessions listener error (falling back to legacy):", structured.message);
      }
    },
  );

  const unsubLegacy = onSnapshot(
    query(collection(legacyDb, "sessions"), where("published", "==", true)),
    (snap) => {
      legacyFailed = false;
      legacyItems = snap.docs.map((d) => mapSessionDoc(d.id, d.data(), "legacy"));
      emit();
    },
    (error) => {
      legacyFailed = true;
      console.warn("Legacy sessions listener error:", error);
      if (primaryFailed) {
        onError(captureFirestoreError(error, OperationType.LIST, "legacy:sessions"));
      }
    },
  );

  return () => {
    unsubPrimary();
    unsubLegacy();
  };
}

export function subscribePublishedMedia(
  onData: (items: FirestoreMediaRecord[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  let primaryItems: FirestoreMediaRecord[] = [];
  let legacyItems: FirestoreMediaRecord[] = [];
  let primaryFailed = false;
  let legacyFailed = false;

  const emit = () => {
    const merged = mergeById(legacyItems, primaryItems).sort(
      (a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0),
    );
    onData(merged);
  };

  const unsubPrimary = onSnapshot(
    query(collection(db, "media"), where("published", "==", true)),
    (snap) => {
      primaryFailed = false;
      primaryItems = snap.docs.map((d) => mapMediaDoc(d.id, d.data(), "primary"));
      emit();
    },
    (error) => {
      primaryFailed = true;
      const structured = captureFirestoreError(error, OperationType.LIST, "media");
      if (legacyFailed) {
        onError(structured);
      } else {
        console.warn("Primary media listener error (falling back to legacy):", structured.message);
      }
    },
  );

  const unsubLegacy = onSnapshot(
    query(collection(legacyDb, "media"), where("published", "==", true)),
    (snap) => {
      legacyFailed = false;
      legacyItems = snap.docs.map((d) => mapMediaDoc(d.id, d.data(), "legacy"));
      emit();
    },
    (error) => {
      legacyFailed = true;
      console.warn("Legacy media listener error:", error);
      if (primaryFailed) {
        onError(captureFirestoreError(error, OperationType.LIST, "legacy:media"));
      }
    },
  );

  return () => {
    unsubPrimary();
    unsubLegacy();
  };
}

export async function fetchPublishedSessions(): Promise<FirestoreSessionRecord[]> {
  const [primaryRes, legacyRes] = await Promise.allSettled([
    getDocs(query(collection(db, "sessions"), where("published", "==", true))),
    getDocs(query(collection(legacyDb, "sessions"), where("published", "==", true))),
  ]);

  if (primaryRes.status === "rejected" && legacyRes.status === "rejected") {
    handleFirestoreError(primaryRes.reason, OperationType.LIST, "sessions");
  }

  const primaryItems =
    primaryRes.status === "fulfilled"
      ? primaryRes.value.docs.map((d) => mapSessionDoc(d.id, d.data(), "primary"))
      : [];
  const legacyItems =
    legacyRes.status === "fulfilled"
      ? legacyRes.value.docs.map((d) => mapSessionDoc(d.id, d.data(), "legacy"))
      : [];

  return sortPublishedSessions(mergeById(legacyItems, primaryItems));
}

export async function fetchPublishedMedia(): Promise<FirestoreMediaRecord[]> {
  const [primaryRes, legacyRes] = await Promise.allSettled([
    getDocs(query(collection(db, "media"), where("published", "==", true))),
    getDocs(query(collection(legacyDb, "media"), where("published", "==", true))),
  ]);

  if (primaryRes.status === "rejected" && legacyRes.status === "rejected") {
    handleFirestoreError(primaryRes.reason, OperationType.LIST, "media");
  }

  const primaryItems =
    primaryRes.status === "fulfilled"
      ? primaryRes.value.docs.map((d) => mapMediaDoc(d.id, d.data(), "primary"))
      : [];
  const legacyItems =
    legacyRes.status === "fulfilled"
      ? legacyRes.value.docs.map((d) => mapMediaDoc(d.id, d.data(), "legacy"))
      : [];

  return mergeById(legacyItems, primaryItems).sort(
    (a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0),
  );
}

// --- Admin Subscriptions (primary DB) & Legacy Snapshot ---

export function subscribeAllSessions(
  onData: (items: FirestoreSessionRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "sessions"),
    (snap) => {
      const list = sortPublishedSessions(
        snap.docs.map((d) => mapSessionDoc(d.id, d.data(), "primary")),
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
        .map((d) => mapMediaDoc(d.id, d.data(), "primary"))
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

export async function syncLegacyContentToPrimary(): Promise<{
  sessionsImported: number;
  mediaImported: number;
  settingsImported: boolean;
}> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const [legacySessionsSnap, legacyMediaSnap, legacySettingsSnap] = await Promise.all([
    getDocs(query(collection(legacyDb, "sessions"), where("published", "==", true))),
    getDocs(query(collection(legacyDb, "media"), where("published", "==", true))),
    getDoc(doc(legacyDb, "siteSettings", "public")),
  ]);

  const [existingSessionsSnap, existingMediaSnap, existingSettingsSnap] = await Promise.all([
    getDocs(collection(db, "sessions")),
    getDocs(collection(db, "media")),
    getDoc(doc(db, "siteSettings", "public")),
  ]);

  const existingSessionIds = new Set(existingSessionsSnap.docs.map((d) => d.id));
  const existingMediaIds = new Set(existingMediaSnap.docs.map((d) => d.id));

  let sessionsImported = 0;
  let mediaImported = 0;
  let settingsImported = false;

  const batch = writeBatch(db);
  const SL = BLUEPRINT_LIMITS.session;
  for (const sDoc of legacySessionsSnap.docs) {
    if (existingSessionIds.has(sDoc.id) || !BLUEPRINT_LIMITS.idPattern.test(sDoc.id)) continue;
    const raw = sDoc.data();
    const regUrl = clampStr(String(raw.registrationUrl ?? ""), SL.registrationUrl.max);
    batch.set(doc(db, "sessions", sDoc.id), {
      number: clampStr(String(raw.number ?? "Session"), SL.number.max).padEnd(SL.number.min, " "),
      title: clampStr(String(raw.title ?? "Untitled Session"), SL.title.max),
      speaker: clampStr(String(raw.speaker ?? "Guest Speaker"), SL.speaker.max),
      speakerRole: clampStr(String(raw.speakerRole ?? "Architect"), SL.speakerRole.max),
      dateLabel: clampStr(String(raw.dateLabel ?? "Monthly"), SL.dateLabel.max),
      timeLabel: clampStr(String(raw.timeLabel ?? "6:00 PM WAT"), SL.timeLabel.max),
      format: clampStr(String(raw.format ?? "Live Session"), SL.format.max),
      status: raw.status === "archived" ? "archived" : "upcoming",
      isNextSession: Boolean(raw.isNextSession),
      published: true,
      summary: clampStr(
        String(raw.summary ?? "Think Session conversation.").padEnd(SL.summary.min, "."),
        SL.summary.max,
      ),
      topics: sanitizeStringArray(
        Array.isArray(raw.topics) ? raw.topics.map(String) : ["Open Q&A"],
        SL.maxTopics,
        SL.topicMaxLength,
      ),
      registrationUrl: BLUEPRINT_LIMITS.httpsPattern.test(regUrl) ? regUrl : "",
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    sessionsImported += 1;
  }

  const ML = BLUEPRINT_LIMITS.media;
  for (const mDoc of legacyMediaSnap.docs) {
    if (existingMediaIds.has(mDoc.id) || !BLUEPRINT_LIMITS.idPattern.test(mDoc.id)) continue;
    const raw = mDoc.data();
    const mediaUrl = clampStr(String(raw.mediaUrl ?? ""), ML.mediaUrl.max);
    batch.set(doc(db, "media", mDoc.id), {
      kind: raw.kind === "Feature" ? "Feature" : "Recording",
      sessionRef: clampStr(String(raw.sessionRef ?? "Think Session"), ML.sessionRef.max),
      title: clampStr(String(raw.title ?? "Session Recording"), ML.title.max),
      speaker: clampStr(String(raw.speaker ?? "Guest Speaker"), ML.speaker.max),
      duration: clampStr(String(raw.duration ?? "60 mins"), ML.duration.max),
      publishedAt: clampStr(String(raw.publishedAt ?? "Archive"), ML.publishedAt.max),
      mediaUrl: BLUEPRINT_LIMITS.httpsPattern.test(mediaUrl) ? mediaUrl : "",
      published: true,
      summary: clampStr(
        String(raw.summary ?? "Session recording summary.").padEnd(ML.summary.min, "."),
        ML.summary.max,
      ),
      highlights: sanitizeStringArray(
        Array.isArray(raw.highlights) ? raw.highlights.map(String) : ["Session highlights"],
        ML.maxHighlights,
        ML.highlightMaxLength,
      ),
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    mediaImported += 1;
  }

  if (legacySettingsSnap.exists() && !existingSettingsSnap.exists()) {
    const raw = legacySettingsSnap.data();
    const safeUrl = (val: unknown) => {
      const str = clampStr(String(val ?? ""), BLUEPRINT_LIMITS.siteSettings.url.max);
      return BLUEPRINT_LIMITS.httpsPattern.test(str) ? str : "";
    };
    batch.set(doc(db, "siteSettings", "public"), {
      instagramUrl: safeUrl(raw.instagramUrl),
      xUrl: safeUrl(raw.xUrl),
      linkedinUrl: safeUrl(raw.linkedinUrl),
      youtubeUrl: safeUrl(raw.youtubeUrl),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
    settingsImported = true;
  }

  if (sessionsImported > 0 || mediaImported > 0 || settingsImported) {
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "legacy-sync");
    }
  }

  return { sessionsImported, mediaImported, settingsImported };
}

// --- Admin Mutations (Primary DB) ---

export async function saveSession(input: SessionInput, allExisting: FirestoreSessionRecord[]) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.session;
  const docId = input.id ? input.id : toValidDocId(input.title, "session");
  const path = `sessions/${docId}`;

  const rawIso = clampStr(input.startAtIso ?? "", L.startAtIso.max);
  const safeStartAtIso =
    rawIso && BLUEPRINT_LIMITS.isoDatePattern.test(rawIso) && !Number.isNaN(Date.parse(rawIso))
      ? rawIso
      : "";

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
    startAtIso: safeStartAtIso,
    resources: sanitizeResources(input.resources),
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

// --- Public Speaker & Topic Pitches (/pitches/{pitchId}) ---

export async function submitTopicPitch(input: TopicPitchInput): Promise<string> {
  const validationErr = validatePitchInput(input);
  if (validationErr) {
    throw new Error(validationErr);
  }

  const L = BLUEPRINT_LIMITS.pitch;
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const docId = `pitch-${Date.now()}-${randomSuffix}`;
  const path = `pitches/${docId}`;

  const rawUrl = clampStr(input.linkUrl ?? "", L.linkUrl.max);
  const safeUrl = BLUEPRINT_LIMITS.httpsPattern.test(rawUrl) ? rawUrl : "";

  try {
    await setDoc(doc(db, "pitches", docId), {
      pitchType: input.pitchType === "speaker" ? "speaker" : "topic",
      name: clampStr(input.name, L.name.max),
      email: clampStr(input.email, L.email.max).toLowerCase(),
      roleOrStudio: clampStr(input.roleOrStudio ?? "", L.roleOrStudio.max),
      topicTitle: clampStr(input.topicTitle, L.topicTitle.max),
      targetStage: PITCH_TARGET_STAGES.includes(input.targetStage)
        ? input.targetStage
        : "All Stages",
      outline: clampStr(input.outline, L.outline.max),
      linkUrl: safeUrl,
      status: "new",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribePitches(
  onData: (items: TopicPitchRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "pitches"),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
          const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
          const status = data.status;
          const safeStatus: PitchStatus =
            status === "reviewed" || status === "scheduled" || status === "archived"
              ? status
              : "new";
          const stage = data.targetStage;
          const safeStage: PitchTargetStage = PITCH_TARGET_STAGES.includes(
            stage as PitchTargetStage,
          )
            ? (stage as PitchTargetStage)
            : "All Stages";

          return {
            id: d.id,
            pitchType: (data.pitchType === "speaker" ? "speaker" : "topic") as PitchType,
            name: String(data.name ?? ""),
            email: String(data.email ?? ""),
            roleOrStudio: String(data.roleOrStudio ?? ""),
            topicTitle: String(data.topicTitle ?? ""),
            targetStage: safeStage,
            outline: String(data.outline ?? ""),
            linkUrl: String(data.linkUrl ?? ""),
            status: safeStatus,
            createdAtMs: createdAt?.toMillis ? createdAt.toMillis() : 0,
            updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "pitches");
      if (onError) onError(structured);
    },
  );
}

export async function updatePitchStatus(pitchId: string, status: PitchStatus) {
  const path = `pitches/${pitchId}`;
  try {
    await updateDoc(doc(db, "pitches", pitchId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removePitch(pitchId: string) {
  const path = `pitches/${pitchId}`;
  try {
    await deleteDoc(doc(db, "pitches", pitchId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Public Site Settings (/siteSettings/public, merged Primary + Legacy) ---

export function subscribeSiteSettings(
  onData: (settings: SiteSettingsRecord) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  let primaryData: SiteSettingsRecord = {
    instagramUrl: "",
    xUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
    exists: false,
  };
  let legacyData: SiteSettingsRecord = {
    instagramUrl: "",
    xUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
    exists: false,
  };
  let primaryFailed = false;
  let legacyFailed = false;

  const emit = () => {
    onData({
      instagramUrl: primaryData.instagramUrl || legacyData.instagramUrl,
      xUrl: primaryData.xUrl || legacyData.xUrl,
      linkedinUrl: primaryData.linkedinUrl || legacyData.linkedinUrl,
      youtubeUrl: primaryData.youtubeUrl || legacyData.youtubeUrl,
      exists: primaryData.exists || legacyData.exists,
    });
  };

  const unsubPrimary = onSnapshot(
    doc(db, "siteSettings", "public"),
    (snap) => {
      primaryFailed = false;
      if (!snap.exists()) {
        primaryData = {
          instagramUrl: "",
          xUrl: "",
          linkedinUrl: "",
          youtubeUrl: "",
          exists: false,
        };
      } else {
        const data = snap.data();
        primaryData = {
          instagramUrl: String(data.instagramUrl ?? ""),
          xUrl: String(data.xUrl ?? ""),
          linkedinUrl: String(data.linkedinUrl ?? ""),
          youtubeUrl: String(data.youtubeUrl ?? ""),
          exists: true,
        };
      }
      emit();
    },
    (error) => {
      primaryFailed = true;
      const structured = captureFirestoreError(error, OperationType.GET, "siteSettings/public");
      if (legacyFailed && onError) {
        onError(structured);
      }
    },
  );

  const unsubLegacy = onSnapshot(
    doc(legacyDb, "siteSettings", "public"),
    (snap) => {
      legacyFailed = false;
      if (!snap.exists()) {
        legacyData = {
          instagramUrl: "",
          xUrl: "",
          linkedinUrl: "",
          youtubeUrl: "",
          exists: false,
        };
      } else {
        const data = snap.data();
        legacyData = {
          instagramUrl: String(data.instagramUrl ?? ""),
          xUrl: String(data.xUrl ?? ""),
          linkedinUrl: String(data.linkedinUrl ?? ""),
          youtubeUrl: String(data.youtubeUrl ?? ""),
          exists: true,
        };
      }
      emit();
    },
    (error) => {
      legacyFailed = true;
      if (primaryFailed && onError) {
        onError(captureFirestoreError(error, OperationType.GET, "legacy:siteSettings/public"));
      }
    },
  );

  return () => {
    unsubPrimary();
    unsubLegacy();
  };
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
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Public Wrapped CMS Configuration & Yearly Archives (/wrappedConfig/{configId}) ---

export function subscribeWrappedConfig(
  onData: (config: WrappedConfigRecord) => void,
  onError?: (err: Error) => void,
  configId = "public",
): Unsubscribe {
  const safeId =
    configId === "public" || /^year-\d{4}$/.test(configId) ? configId : "public";
  return onSnapshot(
    doc(db, "wrappedConfig", safeId),
    (snap) => {
      if (!snap.exists()) {
        onData({ ...DEFAULT_WRAPPED_CONFIG, exists: false });
        return;
      }
      onData(mapWrappedConfigDoc(snap.data()));
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.GET, `wrappedConfig/${safeId}`);
      if (onError) onError(structured);
    },
  );
}

export function subscribePublishedWrappedEditions(
  onData: (editions: WrappedEditionRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "wrappedConfig"), where("enabled", "==", true)),
    (snap) => {
      const list = snap.docs
        .filter((d) => d.id === "public" || /^year-\d{4}$/.test(d.id))
        .map((d) => ({
          id: d.id,
          ...mapWrappedConfigDoc(d.data()),
        }))
        .sort((a, b) => {
          if (a.id === "public") return -1;
          if (b.id === "public") return 1;
          return b.yearLabel.localeCompare(a.yearLabel);
        });
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "wrappedConfig");
      if (onError) onError(structured);
    },
  );
}

export function subscribeAllWrappedEditions(
  onData: (editions: WrappedEditionRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, "wrappedConfig"),
    (snap) => {
      const list = snap.docs
        .filter((d) => d.id === "public" || /^year-\d{4}$/.test(d.id))
        .map((d) => ({
          id: d.id,
          ...mapWrappedConfigDoc(d.data()),
        }))
        .sort((a, b) => {
          if (a.id === "public") return -1;
          if (b.id === "public") return 1;
          return b.yearLabel.localeCompare(a.yearLabel);
        });
      onData(list);
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.LIST, "wrappedConfig");
      if (onError) onError(structured);
    },
  );
}

export async function saveWrappedConfig(input: WrappedConfigInput, configId = "public") {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const safeId =
    configId === "public" || /^year-\d{4}$/.test(configId) ? configId : "public";
  const L = BLUEPRINT_LIMITS.wrapped;
  const isoTrimmed = clampStr(input.launchDateIso, L.launchDateIso.max);

  const payload = {
    enabled: Boolean(input.enabled),
    showInFooter: Boolean(input.showInFooter),
    showInNav: Boolean(input.showInNav),
    homeBannerEnabled: Boolean(input.homeBannerEnabled),
    homeCountdownEnabled: Boolean(input.homeCountdownEnabled),
    yearLabel: clampStr(input.yearLabel, L.yearLabel.max),
    eyebrow: clampStr(input.eyebrow, L.eyebrow.max),
    pageTitle: clampStr(input.pageTitle, L.pageTitle.max),
    pageSubtitle: clampStr(input.pageSubtitle, L.pageSubtitle.max),
    shareCaption: clampStr(input.shareCaption, L.shareCaption.max),
    offlineTitle: clampStr(input.offlineTitle, L.offlineTitle.max),
    offlineMessage: clampStr(input.offlineMessage, L.offlineMessage.max),
    homeBannerEyebrow: clampStr(input.homeBannerEyebrow, L.homeBannerEyebrow.max),
    homeBannerTitle: clampStr(input.homeBannerTitle, L.homeBannerTitle.max),
    homeBannerCtaLabel: clampStr(input.homeBannerCtaLabel, L.homeBannerCtaLabel.max),
    launchDateIso: BLUEPRINT_LIMITS.isoDatePattern.test(isoTrimmed) ? isoTrimmed : "",
    coverTitle: clampStr(input.coverTitle, L.coverTitle.max),
    coverSubtitle: clampStr(input.coverSubtitle, L.coverSubtitle.max),
    startLead: clampStr(input.startLead, L.startLead.max),
    startStatement: clampStr(input.startStatement, L.startStatement.max),
    audienceCount: clampInt(input.audienceCount),
    audiencePrefix: clampStr(input.audiencePrefix, L.prefixSuffixMax),
    audienceSuffix: clampStr(input.audienceSuffix, L.prefixSuffixMax),
    audienceCaption: clampStr(input.audienceCaption, L.audienceCaption.max),
    returningCount: clampInt(input.returningCount),
    returningSuffix: clampStr(input.returningSuffix, L.prefixSuffixMax),
    returningCaption: clampStr(input.returningCaption, L.returningCaption.max),
    sessionsHeading: clampStr(input.sessionsHeading, L.sessionsHeading.max),
    sessionHighlights: sanitizeStringArray(
      input.sessionHighlights,
      L.maxSessionHighlights,
      L.sessionHighlightMaxLength,
    ),
    awarenessDate: clampStr(input.awarenessDate, L.awarenessDate.max),
    awarenessPrefix: clampStr(input.awarenessPrefix, L.awarenessPrefix.max),
    awarenessProgramTitle: clampStr(input.awarenessProgramTitle, L.awarenessProgramTitle.max),
    awarenessSpeaker: clampStr(input.awarenessSpeaker, L.awarenessSpeaker.max),
    communityTotal: clampInt(input.communityTotal),
    communityCaption: clampStr(input.communityCaption, L.communityCaption.max),
    studentsCount: clampInt(input.studentsCount),
    professionalsCount: clampInt(input.professionalsCount),
    discoveryHighlight: clampStr(input.discoveryHighlight, L.discoveryHighlight.max),
    discoveryBody: clampStr(input.discoveryBody, L.discoveryBody.max),
    discoveryPercent: clampInt(input.discoveryPercent, 1, 100),
    locationsLead: clampStr(input.locationsLead, L.locationsLead.max),
    locationPrimary: clampStr(input.locationPrimary, L.locationPrimary.max),
    locationSecondary: clampStr(input.locationSecondary, L.locationSecondary.max),
    extraLocations: sanitizeOptionalStringArray(
      input.extraLocations,
      L.maxExtraLocations,
      L.extraLocationMaxLength,
    ),
    welcomeStatement: clampStr(input.welcomeStatement, L.welcomeStatement.max),
    thankYouStatement: clampStr(input.thankYouStatement, L.thankYouStatement.max),
    closingStatement: clampStr(input.closingStatement, L.closingStatement.max),
    closingCtaLabel: clampStr(input.closingCtaLabel, L.closingCtaLabel.max),
    customStats: sanitizeOptionalStringArray(
      input.customStats,
      L.maxCustomStats,
      L.customStatMaxLength,
    ),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  const ref = doc(db, "wrappedConfig", safeId);
  const path = `wrappedConfig/${safeId}`;
  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeWrappedArchive(configId: string) {
  if (!/^year-\d{4}$/.test(configId)) {
    throw new Error("Only yearly Wrapped archives (year-YYYY) can be deleted.");
  }
  const path = `wrappedConfig/${configId}`;
  try {
    await deleteDoc(doc(db, "wrappedConfig", configId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Public Aggregate Community Stats (/communityStats/public) ---

function mapCommunityStatsDoc(data: Record<string, unknown>): CommunityStatsRecord {
  const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
  const d = DEFAULT_COMMUNITY_STATS;
  return {
    exists: true,
    showOnCommunity:
      typeof data.showOnCommunity === "boolean" ? data.showOnCommunity : d.showOnCommunity,
    communityTotal:
      typeof data.communityTotal === "number" ? data.communityTotal : d.communityTotal,
    studentsCount: typeof data.studentsCount === "number" ? data.studentsCount : d.studentsCount,
    graduatesCount:
      typeof data.graduatesCount === "number" ? data.graduatesCount : d.graduatesCount,
    professionalsCount:
      typeof data.professionalsCount === "number" ? data.professionalsCount : d.professionalsCount,
    countriesCount:
      typeof data.countriesCount === "number" ? data.countriesCount : d.countriesCount,
    topLocations: Array.isArray(data.topLocations) ? data.topLocations.map(String) : d.topLocations,
    sourceLabel: String(data.sourceLabel ?? d.sourceLabel),
    lastSyncedIso: String(data.lastSyncedIso ?? ""),
    updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
  };
}

export function subscribeCommunityStats(
  onData: (stats: CommunityStatsRecord) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "communityStats", "public"),
    (snap) => {
      if (!snap.exists()) {
        onData({ ...DEFAULT_COMMUNITY_STATS, exists: false });
        return;
      }
      onData(mapCommunityStatsDoc(snap.data()));
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.GET, "communityStats/public");
      if (onError) onError(structured);
    },
  );
}

export async function saveCommunityStats(input: CommunityStatsInput) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.communityStats;
  const rawIso = clampStr(input.lastSyncedIso ?? "", L.lastSyncedIsoMax);
  const safeIso =
    rawIso && BLUEPRINT_LIMITS.isoDatePattern.test(rawIso) ? rawIso : "";

  const payload = {
    showOnCommunity: Boolean(input.showOnCommunity),
    communityTotal: clampInt(input.communityTotal),
    studentsCount: clampInt(input.studentsCount),
    graduatesCount: clampInt(input.graduatesCount),
    professionalsCount: clampInt(input.professionalsCount),
    countriesCount: clampInt(input.countriesCount, 0, L.countriesMax),
    topLocations: sanitizeOptionalStringArray(
      input.topLocations,
      L.maxTopLocations,
      L.topLocationMaxLength,
    ),
    sourceLabel: clampStr(input.sourceLabel || "Community Directory", L.sourceLabelMax),
    lastSyncedIso: safeIso,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "communityStats", "public"), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "communityStats/public");
  }
}

// --- Admin-Only Google Sheets Integration Config (/adminConfig/googleSheets) ---

function mapGoogleSheetsConfigDoc(data: Record<string, unknown>): GoogleSheetsConfigRecord {
  const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
  return {
    exists: true,
    spreadsheetId: String(data.spreadsheetId ?? ""),
    spreadsheetTitle: String(data.spreadsheetTitle ?? ""),
    sheetName: String(data.sheetName ?? ""),
    emailColumn: String(data.emailColumn ?? ""),
    stageColumn: String(data.stageColumn ?? ""),
    locationColumn: String(data.locationColumn ?? ""),
    lastSyncedIso: String(data.lastSyncedIso ?? ""),
    updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
  };
}

export function subscribeGoogleSheetsConfig(
  onData: (config: GoogleSheetsConfigRecord) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "adminConfig", "googleSheets"),
    (snap) => {
      if (!snap.exists()) {
        onData({ ...DEFAULT_GOOGLE_SHEETS_CONFIG, exists: false });
        return;
      }
      onData(mapGoogleSheetsConfigDoc(snap.data()));
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.GET, "adminConfig/googleSheets");
      if (onError) onError(structured);
    },
  );
}

export async function saveGoogleSheetsConfig(input: GoogleSheetsConfigInput) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.googleSheets;
  const cleanId = clampStr(input.spreadsheetId, L.spreadsheetIdMax);
  if (cleanId && !BLUEPRINT_LIMITS.idPattern.test(cleanId)) {
    throw new Error("Invalid Spreadsheet ID format.");
  }

  const rawIso = clampStr(input.lastSyncedIso ?? "", L.lastSyncedIsoMax);
  const safeIso =
    rawIso && BLUEPRINT_LIMITS.isoDatePattern.test(rawIso) ? rawIso : "";

  const payload = {
    spreadsheetId: cleanId,
    spreadsheetTitle: clampStr(input.spreadsheetTitle, L.spreadsheetTitleMax),
    sheetName: clampStr(input.sheetName, L.sheetNameMax),
    emailColumn: clampStr(input.emailColumn, L.columnNameMax),
    stageColumn: clampStr(input.stageColumn, L.columnNameMax),
    locationColumn: clampStr(input.locationColumn, L.columnNameMax),
    lastSyncedIso: safeIso,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "adminConfig", "googleSheets"), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "adminConfig/googleSheets");
  }
}

// --- Live Session Companion State (/liveState/current) ---

function mapLiveStateDoc(data: Record<string, unknown>): LiveStateRecord {
  const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
  return {
    exists: true,
    isLive: Boolean(data.isLive),
    sessionId: String(data.sessionId ?? ""),
    sessionNumber: String(data.sessionNumber ?? ""),
    sessionTitle: String(data.sessionTitle ?? ""),
    speaker: String(data.speaker ?? ""),
    startedAtIso: String(data.startedAtIso ?? ""),
    roomUrl: String(data.roomUrl ?? ""),
    qaOpen: Boolean(data.qaOpen),
    updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
  };
}

export function subscribeLiveState(
  onData: (state: LiveStateRecord) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "liveState", "current"),
    (snap) => {
      if (!snap.exists()) {
        onData({ ...DEFAULT_LIVE_STATE, exists: false });
        return;
      }
      onData(mapLiveStateDoc(snap.data()));
    },
    (error) => {
      const structured = captureFirestoreError(error, OperationType.GET, "liveState/current");
      if (onError) onError(structured);
    },
  );
}

export async function saveLiveState(input: LiveStateInput) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required.");

  const L = BLUEPRINT_LIMITS.liveState;
  const cleanSessionId = clampStr(input.sessionId, L.sessionIdMax);
  if (cleanSessionId && !BLUEPRINT_LIMITS.idPattern.test(cleanSessionId)) {
    throw new Error("Invalid live session ID format.");
  }

  const rawRoomUrl = clampStr(input.roomUrl ?? "", L.roomUrlMax);
  if (rawRoomUrl && !BLUEPRINT_LIMITS.httpsPattern.test(rawRoomUrl)) {
    throw new Error("Live room URL must start with https:// or be left blank.");
  }

  const rawIso = clampStr(input.startedAtIso ?? "", L.startedAtIsoMax);
  const safeIso =
    rawIso && BLUEPRINT_LIMITS.isoDatePattern.test(rawIso) && !Number.isNaN(Date.parse(rawIso))
      ? rawIso
      : "";

  const payload = {
    isLive: Boolean(input.isLive),
    sessionId: cleanSessionId,
    sessionNumber: clampStr(input.sessionNumber ?? "", L.sessionNumberMax),
    sessionTitle: clampStr(input.sessionTitle ?? "", L.sessionTitleMax),
    speaker: clampStr(input.speaker ?? "", L.speakerMax),
    startedAtIso: safeIso,
    roomUrl: rawRoomUrl,
    qaOpen: Boolean(input.qaOpen),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "liveState", "current"), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "liveState/current");
  }
}

export async function startLiveSession(
  session: FirestoreSessionRecord,
  options?: { roomUrl?: string; qaOpen?: boolean },
) {
  const cleanRoom = (options?.roomUrl ?? "").trim();
  const fallbackRoom =
    session.registrationUrl && session.registrationUrl.trim().startsWith("https://")
      ? session.registrationUrl.trim()
      : "";

  await saveLiveState({
    isLive: true,
    sessionId: session.id,
    sessionNumber: session.number,
    sessionTitle: session.title,
    speaker: session.speaker,
    startedAtIso: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    roomUrl: cleanRoom || fallbackRoom,
    qaOpen: options?.qaOpen ?? true,
  });
}

export async function endLiveSession(current?: LiveStateInput) {
  await saveLiveState({
    isLive: false,
    sessionId: current?.sessionId ?? "",
    sessionNumber: current?.sessionNumber ?? "",
    sessionTitle: current?.sessionTitle ?? "",
    speaker: current?.speaker ?? "",
    startedAtIso: "",
    roomUrl: current?.roomUrl ?? "",
    qaOpen: false,
  });
}

// --- Real-Time Session Q&A Queue (/sessionQuestions/{questionId}) ---

export function validateSessionQuestionInput(input: SessionQuestionInput): string | null {
  const L = BLUEPRINT_LIMITS.question;
  const sessionId = input.sessionId.trim();
  if (!sessionId || !BLUEPRINT_LIMITS.idPattern.test(sessionId)) {
    return "Invalid session reference.";
  }
  if (input.authorName.trim().length < L.authorName.min) {
    return "Please enter your name (at least 2 characters).";
  }
  if (input.questionText.trim().length < L.questionText.min) {
    return "Please enter a question (at least 6 characters).";
  }
  return null;
}

function mapSessionQuestionDoc(
  id: string,
  data: Record<string, unknown>,
): SessionQuestionRecord {
  const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
  const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
  const rawStatus = data.status;
  const safeStatus: QuestionStatus =
    rawStatus === "on_air" || rawStatus === "answered" ? rawStatus : "queued";
  const rawVotes = typeof data.upvotes === "number" ? data.upvotes : 1;

  return {
    id,
    sessionId: String(data.sessionId ?? ""),
    authorName: String(data.authorName ?? ""),
    authorStage: String(data.authorStage ?? ""),
    questionText: String(data.questionText ?? ""),
    upvotes: Math.max(1, Math.round(rawVotes)),
    status: safeStatus,
    createdAtMs: createdAt?.toMillis ? createdAt.toMillis() : 0,
    updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : 0,
  };
}

function sortSessionQuestions(items: SessionQuestionRecord[]): SessionQuestionRecord[] {
  const rank: Record<QuestionStatus, number> = {
    on_air: 0,
    queued: 1,
    answered: 2,
  };
  return [...items].sort((a, b) => {
    const rDiff = rank[a.status] - rank[b.status];
    if (rDiff !== 0) return rDiff;
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    return a.createdAtMs - b.createdAtMs;
  });
}

export function subscribeSessionQuestions(
  sessionId: string,
  onData: (items: SessionQuestionRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!sessionId || !BLUEPRINT_LIMITS.idPattern.test(sessionId)) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    query(
      collection(db, "sessionQuestions"),
      where("sessionId", "==", sessionId),
      limit(200),
    ),
    (snap) => {
      const list = snap.docs.map((d) => mapSessionQuestionDoc(d.id, d.data()));
      onData(sortSessionQuestions(list));
    },
    (error) => {
      const structured = captureFirestoreError(
        error,
        OperationType.LIST,
        `sessionQuestions?sessionId=${sessionId}`,
      );
      if (onError) onError(structured);
    },
  );
}

export async function submitSessionQuestion(input: SessionQuestionInput): Promise<string> {
  const validationErr = validateSessionQuestionInput(input);
  if (validationErr) {
    throw new Error(validationErr);
  }

  const L = BLUEPRINT_LIMITS.question;
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const docId = `q-${Date.now()}-${randomSuffix}`;
  const path = `sessionQuestions/${docId}`;

  try {
    await setDoc(doc(db, "sessionQuestions", docId), {
      sessionId: clampStr(input.sessionId, L.sessionIdMax),
      authorName: clampStr(input.authorName, L.authorName.max),
      authorStage: clampStr(input.authorStage ?? "", L.authorStageMax),
      questionText: clampStr(input.questionText, L.questionText.max),
      upvotes: 1,
      status: "queued",
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
  const ref = doc(db, "sessionQuestions", questionId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new Error("Question no longer exists.");
      }
      const data = snap.data();
      const status = String(data.status ?? "queued");
      if (status !== "queued" && status !== "on_air") {
        throw new Error("Answered questions can no longer be upvoted.");
      }
      const currentVotes = typeof data.upvotes === "number" ? data.upvotes : 1;
      if (currentVotes >= BLUEPRINT_LIMITS.question.maxUpvotes) {
        return;
      }
      tx.update(ref, {
        upvotes: currentVotes + 1,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateSessionQuestionStatus(
  questionId: string,
  status: QuestionStatus,
) {
  const path = `sessionQuestions/${questionId}`;
  try {
    await updateDoc(doc(db, "sessionQuestions", questionId), {
      status,
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

