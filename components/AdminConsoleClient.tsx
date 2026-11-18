"use client";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Film,
  Globe,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  Mic,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  addAdminUser,
  BLUEPRINT_LIMITS,
  DEFAULT_COMMUNITY_STATS,
  DEFAULT_GOOGLE_SHEETS_CONFIG,
  DEFAULT_LIVE_STATE,
  DEFAULT_WRAPPED_CONFIG,
  endLiveSession,
  promoteToNextSession,
  removeAdminUser,
  removeMediaItem,
  removePitch,
  removeSession,
  removeSubscriber,
  saveMediaItem,
  saveSession,
  saveSiteSettings,
  startLiveSession,
  subscribeAdmins,
  subscribeAllMedia,
  subscribeAllSessions,
  subscribeAllWrappedEditions,
  subscribeCommunityStats,
  subscribeGoogleSheetsConfig,
  subscribeLiveState,
  subscribePitches,
  subscribeSiteSettings,
  subscribeSubscribers,
  subscribeWrappedConfig,
  syncLegacyContentToPrimary,
  toggleMediaPublished,
  toggleSessionPublished,
  updatePitchStatus,
  validateMediaInput,
  validateSessionInput,
  validateSiteSettingsInput,
  type AdminRecord,
  type CommunityStatsRecord,
  type FirestoreMediaRecord,
  type FirestoreSessionRecord,
  type GoogleSheetsConfigRecord,
  type LiveStateInput,
  type MediaInput,
  type PitchStatus,
  type SessionInput,
  type SiteSettingsInput,
  type SubscriberRecord,
  type TopicPitchRecord,
  type WrappedConfigInput,
  type WrappedEditionRecord,
} from "../lib/firebaseContent";
import {
  formatTimezonePreview,
  isoToWatDatetimeLocal,
  watDatetimeLocalToIso,
} from "../lib/sessionCalendar";
import { TALLY_FORM_URL } from "../lib/tally";
import AdminGoogleSheetsSyncCard from "./AdminGoogleSheetsSyncCard";
import AdminLiveCompanionPanel from "./AdminLiveCompanionPanel";
import AdminWrappedTab from "./AdminWrappedTab";
import { useFirebase } from "./FirebaseProvider";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";

const emptySessionForm = (): SessionInput => ({
  number: "Session 04",
  title: "",
  speaker: "",
  speakerRole: "",
  dateLabel: "Monthly Live Session",
  timeLabel: "6:00 PM WAT · Live Online",
  format: "Conversation + Open Member Q&A",
  status: "upcoming",
  isNextSession: false,
  published: true,
  summary: "",
  topics: ["What comes after design school"],
  registrationUrl: "",
  startAtIso: "",
  resources: [],
});

const emptyMediaForm = (): MediaInput => ({
  kind: "Recording",
  sessionRef: "Think Session 04",
  title: "",
  speaker: "",
  duration: "60 mins",
  publishedAt: "Session Recording",
  mediaUrl: "",
  published: true,
  summary: "",
  highlights: ["Key takeaway from the conversation"],
});

function AdminConsoleInner() {
  const {
    user,
    authReady,
    isAdmin,
    checkingAdmin,
    authError,
    connectionOffline,
    signInWithGoogle,
    signOutUser,
  } = useFirebase();

  const [tab, setTab] = useState<
    "sessions" | "media" | "pitches" | "wrapped" | "subscribers" | "settings" | "admins"
  >("sessions");
  const [sessions, setSessions] = useState<FirestoreSessionRecord[]>([]);
  const [media, setMedia] = useState<FirestoreMediaRecord[]>([]);
  const [pitches, setPitches] = useState<TopicPitchRecord[]>([]);
  const [pitchFilter, setPitchFilter] = useState<"all" | PitchStatus>("all");
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [wrappedForm, setWrappedForm] = useState<WrappedConfigInput>(DEFAULT_WRAPPED_CONFIG);
  const [wrappedEditions, setWrappedEditions] = useState<WrappedEditionRecord[]>([]);
  const [activeWrappedId, setActiveWrappedId] = useState<string>("public");
  const [communityStats, setCommunityStats] = useState<CommunityStatsRecord>({
    ...DEFAULT_COMMUNITY_STATS,
    exists: false,
  });
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfigRecord>({
    ...DEFAULT_GOOGLE_SHEETS_CONFIG,
    exists: false,
  });
  const [liveState, setLiveState] = useState<LiveStateInput>(DEFAULT_LIVE_STATE);

  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionInput>(emptySessionForm);
  const [sessionTopicsText, setSessionTopicsText] = useState("What comes after design school");
  const [sessionError, setSessionError] = useState("");
  const [savingSession, setSavingSession] = useState(false);

  const [mediaFormOpen, setMediaFormOpen] = useState(false);
  const [mediaForm, setMediaForm] = useState<MediaInput>(emptyMediaForm);
  const [mediaHighlightsText, setMediaHighlightsText] = useState(
    "Key takeaway from the conversation",
  );
  const [mediaError, setMediaError] = useState("");
  const [savingMedia, setSavingMedia] = useState(false);

  const [settingsForm, setSettingsForm] = useState<SiteSettingsInput>({
    instagramUrl: "",
    xUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
  });
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [newAdminUid, setNewAdminUid] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [adminFormError, setAdminFormError] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);

  const [syncingLegacy, setSyncingLegacy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [actionError, setActionError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;
    setActionError("");

    const handleListenerError = (err: Error) => {
      setActionError(formatFirestoreErrorMessage(err));
    };

    const unsubSessions = subscribeAllSessions(setSessions, handleListenerError);
    const unsubMedia = subscribeAllMedia(setMedia, handleListenerError);
    const unsubPitches = subscribePitches(setPitches, handleListenerError);
    const unsubSubscribers = subscribeSubscribers(setSubscribers, handleListenerError);
    const unsubSettings = subscribeSiteSettings((s) => {
      setSettingsForm({
        instagramUrl: s.instagramUrl,
        xUrl: s.xUrl,
        linkedinUrl: s.linkedinUrl,
        youtubeUrl: s.youtubeUrl,
      });
    }, handleListenerError);
    const unsubWrappedEditions = subscribeAllWrappedEditions(
      setWrappedEditions,
      handleListenerError,
    );
    const unsubCommunityStats = subscribeCommunityStats(
      setCommunityStats,
      handleListenerError,
    );
    const unsubSheetsConfig = subscribeGoogleSheetsConfig(
      setSheetsConfig,
      handleListenerError,
    );
    const unsubLiveState = subscribeLiveState(setLiveState, handleListenerError);
    const unsubAdmins = subscribeAdmins(setAdmins, handleListenerError);

    return () => {
      unsubSessions();
      unsubMedia();
      unsubPitches();
      unsubSubscribers();
      unsubSettings();
      unsubWrappedEditions();
      unsubCommunityStats();
      unsubSheetsConfig();
      unsubLiveState();
      unsubAdmins();
    };
  }, [authReady, user, isAdmin, retryKey]);

  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;
    const unsubWrapped = subscribeWrappedConfig(
      (w) => {
        const { exists: _exists, updatedAtMs: _updatedAtMs, ...rest } = w;
        void _exists;
        void _updatedAtMs;
        setWrappedForm(rest);
      },
      (err) => {
        setActionError(formatFirestoreErrorMessage(err));
      },
      activeWrappedId,
    );
    return () => unsubWrapped();
  }, [authReady, user, isAdmin, retryKey, activeWrappedId]);

  const showToast = (msg: string) => {
    setActionError("");
    setToast(msg);
    window.setTimeout(() => setToast(""), 3500);
  };

  const startEditSession = (s: FirestoreSessionRecord) => {
    setSessionForm({
      id: s.id,
      number: s.number,
      title: s.title,
      speaker: s.speaker,
      speakerRole: s.speakerRole,
      dateLabel: s.dateLabel,
      timeLabel: s.timeLabel,
      format: s.format,
      status: s.status,
      isNextSession: s.isNextSession,
      published: s.published,
      summary: s.summary,
      topics: s.topics,
      registrationUrl: s.registrationUrl === TALLY_FORM_URL ? "" : s.registrationUrl || "",
      startAtIso: s.startAtIso || "",
      resources: s.resources ? s.resources.map((r) => ({ ...r })) : [],
    });
    setSessionTopicsText(s.topics.join("\n"));
    setSessionError("");
    setSessionFormOpen(true);
  };

  const startNewSession = () => {
    const fresh = emptySessionForm();
    setSessionForm(fresh);
    setSessionTopicsText(fresh.topics.join("\n"));
    setSessionError("");
    setSessionFormOpen(true);
  };

  const handleSaveSession = async (e: FormEvent) => {
    e.preventDefault();
    const topics = sessionTopicsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, BLUEPRINT_LIMITS.session.maxTopics);

    const payload: SessionInput = {
      ...sessionForm,
      topics: topics.length > 0 ? topics : ["Open member Q&A"],
    };

    const validationErr = validateSessionInput(payload);
    if (validationErr) {
      setSessionError(validationErr);
      return;
    }

    setSessionError("");
    setSavingSession(true);
    try {
      await saveSession(payload, sessions);
      setSessionFormOpen(false);
      showToast(payload.id ? "Session updated." : "New session saved to Firestore.");
    } catch (err) {
      setSessionError(formatFirestoreErrorMessage(err));
    } finally {
      setSavingSession(false);
    }
  };

  const startEditMedia = (m: FirestoreMediaRecord) => {
    setMediaForm({
      id: m.id,
      kind: m.kind,
      sessionRef: m.sessionRef,
      title: m.title,
      speaker: m.speaker,
      duration: m.duration,
      publishedAt: m.publishedAt,
      mediaUrl: m.mediaUrl,
      published: m.published,
      summary: m.summary,
      highlights: m.highlights,
    });
    setMediaHighlightsText(m.highlights.join("\n"));
    setMediaError("");
    setMediaFormOpen(true);
  };

  const startNewMedia = () => {
    const fresh = emptyMediaForm();
    setMediaForm(fresh);
    setMediaHighlightsText(fresh.highlights.join("\n"));
    setMediaError("");
    setMediaFormOpen(true);
  };

  const createMediaFromSession = (s: FirestoreSessionRecord) => {
    const highlights =
      s.topics.length > 0 ? s.topics : ["Key takeaway from the Think Session"];
    setMediaForm({
      kind: "Recording",
      sessionRef: s.number,
      title: s.title,
      speaker: s.speaker,
      duration: "60 mins",
      publishedAt: s.dateLabel || "Session Recording",
      mediaUrl: "",
      published: false,
      summary: s.summary,
      highlights,
    });
    setMediaHighlightsText(highlights.join("\n"));
    setMediaError("");
    setMediaFormOpen(true);
    setConfirmDeleteId(null);
    setTab("media");
    showToast(`Drafted Media entry from "${s.title}". Paste the recording URL to publish.`);
  };

  const convertPitchToSession = async (p: TopicPitchRecord) => {
    const topics = [`${p.targetStage} focus`, "Open member Q&A"];
    setSessionForm({
      number: "Next Session",
      title: p.topicTitle.slice(0, BLUEPRINT_LIMITS.session.title.max),
      speaker: p.pitchType === "speaker" ? p.name : "",
      speakerRole: p.roleOrStudio || (p.pitchType === "speaker" ? "Guest Architect" : ""),
      dateLabel: "Upcoming Monthly Session",
      timeLabel: "6:00 PM WAT · Live Online",
      format: "Conversation + Open Member Q&A",
      status: "upcoming",
      isNextSession: false,
      published: false,
      summary: p.outline.slice(0, BLUEPRINT_LIMITS.session.summary.max),
      topics,
      registrationUrl: "",
      startAtIso: "",
      resources: p.linkUrl ? [{ label: "Speaker Portfolio / Link", url: p.linkUrl }] : [],
    });
    setSessionTopicsText(topics.join("\n"));
    setSessionError("");
    setSessionFormOpen(true);
    setConfirmDeleteId(null);
    setTab("sessions");
    if (p.status === "new") {
      try {
        await updatePitchStatus(p.id, "reviewed");
      } catch {
        // Non-blocking status sync when converting to session draft
      }
    }
    showToast(`Drafted Think Session from "${p.topicTitle}".`);
  };

  const handleSaveMedia = async (e: FormEvent) => {
    e.preventDefault();
    const highlights = mediaHighlightsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, BLUEPRINT_LIMITS.media.maxHighlights);

    const payload: MediaInput = {
      ...mediaForm,
      highlights: highlights.length > 0 ? highlights : ["Session highlights"],
    };

    const validationErr = validateMediaInput(payload);
    if (validationErr) {
      setMediaError(validationErr);
      return;
    }

    setMediaError("");
    setSavingMedia(true);
    try {
      await saveMediaItem(payload);
      setMediaFormOpen(false);
      showToast(payload.id ? "Media item updated." : "New media item published to Firestore.");
    } catch (err) {
      setMediaError(formatFirestoreErrorMessage(err));
    } finally {
      setSavingMedia(false);
    }
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!BLUEPRINT_LIMITS.idPattern.test(newAdminUid.trim())) {
      setAdminFormError("UID must be alphanumeric with optional hyphens or underscores.");
      return;
    }
    if (!BLUEPRINT_LIMITS.emailPattern.test(newAdminEmail.trim())) {
      setAdminFormError("Please enter a valid email address.");
      return;
    }
    if (newAdminName.trim().length < 1) {
      setAdminFormError("Please enter a display name.");
      return;
    }

    setAdminFormError("");
    setSavingAdmin(true);
    try {
      await addAdminUser(newAdminUid, newAdminEmail, newAdminName);
      setNewAdminUid("");
      setNewAdminEmail("");
      setNewAdminName("");
      showToast("Admin access granted.");
    } catch (err) {
      setAdminFormError(formatFirestoreErrorMessage(err));
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    const validationErr = validateSiteSettingsInput(settingsForm);
    if (validationErr) {
      setSettingsError(validationErr);
      return;
    }

    setSettingsError("");
    setSavingSettings(true);
    try {
      await saveSiteSettings(settingsForm);
      showToast("Public channel links updated.");
    } catch (err) {
      setSettingsError(formatFirestoreErrorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportSubscribersCsv = () => {
    if (subscribers.length === 0) return;
    const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const headers = ["Email", "Name", "Stage", "Question", "Source", "Submitted At"];
    const rows = subscribers.map((sub) => [
      csvEscape(sub.email),
      csvEscape(sub.name),
      csvEscape(sub.stage),
      csvEscape(sub.question),
      csvEscape(sub.source),
      csvEscape(sub.createdAtMs > 0 ? new Date(sub.createdAtMs).toISOString() : ""),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tta-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${subscribers.length} subscriber records.`);
  };

  const nextSpotlight = sessions.find((s) => s.isNextSession && s.published) ?? null;
  const newPitchesCount = pitches.filter((p) => p.status === "new").length;
  const sessionPreviewTopics = sessionTopicsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, BLUEPRINT_LIMITS.session.maxTopics);
  const filteredPitches =
    pitchFilter === "all" ? pitches : pitches.filter((p) => p.status === pitchFilter);

  return (
    <div className="min-h-screen bg-[#f7f6f4] text-[#111111]">
      {/* Top Studio Bar */}
      <header className="border-b border-black/[0.08] bg-[#EAEAEA]/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-[#111111]/70 transition-colors hover:text-[#111111]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Public Site</span>
            </Link>
            <span className="h-4 w-px bg-black/10" aria-hidden="true" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">
              <span className="logo-tta mr-1.5 font-bold text-[#fe3619]">TTA</span>· The Thinking
              Architects Console
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/sessions"
              className="hidden text-[13px] font-medium text-[#111111]/70 hover:text-[#111111] sm:inline"
            >
              View Sessions
            </Link>
            <Link
              href="/media"
              className="hidden text-[13px] font-medium text-[#111111]/70 hover:text-[#111111] sm:inline"
            >
              View Media
            </Link>
            {user && (
              <button
                type="button"
                onClick={signOutUser}
                className="label-mono inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-black/12 bg-[#f7f6f4] px-4 py-2 text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 py-12">
        {!authReady || checkingAdmin ? (
          <div className="mx-auto max-w-[560px] rounded-2xl border border-black/[0.08] bg-[#efeeec] p-8 text-center">
            <p className="label-mono text-[#111111]/55">Checking Session &amp; Permissions</p>
            <p className="mt-3 text-[15px] text-[#111111]/75">
              Verifying authentication state with Firebase...
            </p>
          </div>
        ) : !user ? (
          <div className="mx-auto max-w-[540px] rounded-2xl border border-black/[0.08] bg-[#efeeec] p-8 sm:p-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111111] text-white">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="label-mono mt-6 text-[#fe3619]">Protected Studio Access</p>
            <h1 className="mt-2 text-[1.9rem] font-medium leading-[1.12] tracking-[-0.03em]">
              Sign in to manage Think Sessions &amp; Media
            </h1>
            <p className="mt-3 text-[15px] leading-[1.6] text-[#111111]/75">
              This console controls live Firestore collections for the Next Session spotlight,
              monthly Think Sessions, and published Media recordings. Only authorized community
              administrators can write changes.
            </p>

            {authError && (
              <p role="alert" className="mt-4 text-[13px] font-medium text-[#fe3619]">
                {authError}
              </p>
            )}

            <button
              type="button"
              onClick={signInWithGoogle}
              className="label-mono mt-7 inline-flex min-h-[50px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-[#fe3619] px-6 py-3.5 text-white transition-opacity hover:opacity-90"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>Sign in with Google</span>
            </button>
          </div>
        ) : !isAdmin ? (
          <div className="mx-auto max-w-[580px] rounded-2xl border border-black/[0.08] bg-[#efeeec] p-8 sm:p-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fe3619]/12 text-[#fe3619]">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="label-mono mt-6 text-[#fe3619]">Access Denied</p>
            <h1 className="mt-2 text-[1.8rem] font-medium leading-[1.14] tracking-[-0.03em]">
              Admin authorization required
            </h1>
            <p className="mt-3 text-[15px] leading-[1.6] text-[#111111]/75">
              You are signed in as{" "}
              <span className="font-medium text-[#111111]">{user.email ?? user.uid}</span>{" "}
              ({user.emailVerified ? "verified email" : "unverified email"}), which does not have
              administrator write access in Firestore.
            </p>
            <div className="mt-5 rounded-xl border border-black/[0.08] bg-[#f7f6f4] p-4 font-mono text-[12px] text-[#111111]/75">
              Your UID: <span className="select-all text-[#111111]">{user.uid}</span>
            </div>
            <p className="mt-4 text-[13px] text-[#111111]/60">
              Ask the primary administrator to add your UID under the Admin Access tab, or sign in
              with an authorized account.
            </p>
            <button
              type="button"
              onClick={signOutUser}
              className="label-mono mt-6 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-[#111111] px-5 py-2.5 text-white transition-opacity hover:opacity-85"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Switch Google account</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Verified Admin Dashboard Header */}
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-black/[0.08] pb-8">
              <div>
                <div className="flex items-center gap-2 text-[#111111]">
                  <ShieldCheck className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
                  <span className="label-mono text-[#fe3619]">
                    Verified Admin · {user.email}
                  </span>
                </div>
                <h1 className="mt-2 text-[clamp(1.85rem,3.4vw,3rem)] font-medium leading-[1.08] tracking-[-0.03em]">
                  Community Database Control
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-black/[0.08] bg-[#efeeec] p-1">
                  {(
                    [
                      {
                        key: "sessions",
                        label: liveState.isLive
                          ? `Sessions · LIVE (${sessions.length})`
                          : `Sessions (${sessions.length})`,
                      },
                      { key: "media", label: `Media (${media.length})` },
                      {
                        key: "pitches",
                        label:
                          newPitchesCount > 0
                            ? `Pitches (${newPitchesCount} new)`
                            : `Pitches (${pitches.length})`,
                      },
                      { key: "wrapped", label: wrappedForm.enabled ? "Wrapped · Live" : "Wrapped · Off" },
                      { key: "subscribers", label: `Signups & Sheet (${subscribers.length})` },
                      { key: "settings", label: "Channels" },
                      { key: "admins", label: `Admins (${admins.length + 2})` },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setTab(item.key);
                        setConfirmDeleteId(null);
                      }}
                      className={`label-mono min-h-[38px] cursor-pointer rounded-lg px-4 py-2 transition-colors ${
                        tab === item.key
                          ? "bg-[#111111] text-white"
                          : "text-[#111111]/65 hover:text-[#111111]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {connectionOffline && (
              <div
                role="alert"
                className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-[#fe3619]/30 bg-[#fe3619]/10 px-5 py-3.5 text-[14px] text-[#111111]"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#fe3619]" aria-hidden="true" />
                  <span>Unable to reach Firestore. Check network connectivity or Firebase config.</span>
                </div>
              </div>
            )}

            {actionError && (
              <div
                role="alert"
                className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#fe3619]/30 bg-[#fe3619]/10 px-5 py-3.5 text-[14px] text-[#111111]"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#fe3619]" aria-hidden="true" />
                  <span>{actionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="label-mono inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#111111] px-3.5 py-1.5 text-white"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {toast && (
              <div
                role="status"
                className="mt-6 flex items-center gap-2.5 rounded-xl border border-black/10 bg-[#efeeec] px-5 py-3.5 text-[14px] font-medium text-[#111111]"
              >
                <Check className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
                <span>{toast}</span>
              </div>
            )}

            {/* Dual-DB Status & Optional Sync Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black/[0.08] bg-[#efeeec] px-5 py-3.5">
              <p className="text-[13.5px] text-[#111111]/75">
                <strong>Dual-Database Active:</strong> Published sessions, media, and channels from
                your existing database (<span className="font-mono text-[12px]">principal-day-6n50x</span>)
                still serve the live site automatically.
              </p>
              <button
                type="button"
                disabled={syncingLegacy}
                onClick={async () => {
                  setSyncingLegacy(true);
                  try {
                    const res = await syncLegacyContentToPrimary();
                    showToast(
                      `Synced ${res.sessionsImported} session(s), ${res.mediaImported} media item(s)${
                        res.settingsImported ? ", and channel links" : ""
                      } into this console.`,
                    );
                  } catch (err) {
                    setActionError(formatFirestoreErrorMessage(err));
                  } finally {
                    setSyncingLegacy(false);
                  }
                }}
                className="label-mono inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-black/12 bg-[#f7f6f4] px-3.5 py-2 text-[#111111] transition-colors hover:bg-[#111111] hover:text-white disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncingLegacy ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span>{syncingLegacy ? "Syncing..." : "Copy Legacy Items Here"}</span>
              </button>
            </div>

            {/* Overview KPI Strip */}
            <div className="mt-6 grid grid-cols-1 gap-px border border-black/[0.09] bg-black/[0.09] sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-[#f7f6f4] p-6">
                <p className="label-mono text-[#111111]/55">
                  {liveState.isLive ? "Live Broadcast Active" : "Home Spotlight (Next Session)"}
                </p>
                <p className="mt-2 text-[1.05rem] font-medium leading-snug">
                  {liveState.isLive
                    ? `LIVE: ${liveState.sessionTitle}`
                    : nextSpotlight
                      ? nextSpotlight.title
                      : "Served from Legacy DB or unassigned"}
                </p>
              </div>
              <div className="bg-[#f7f6f4] p-6">
                <p className="label-mono text-[#111111]/55">Wrapped Status</p>
                <p className="mt-2 font-mono text-[1.25rem] font-bold">
                  <span className={wrappedForm.enabled ? "text-[#fe3619]" : "text-[#111111]/55"}>
                    {wrappedForm.enabled ? "LIVE" : "OFFLINE"}
                  </span>{" "}
                  <span className="text-[12px] font-normal text-[#111111]/55">
                    · {wrappedForm.homeCountdownEnabled ? "Countdown ON" : "Countdown OFF"}
                  </span>
                </p>
              </div>
              <div className="bg-[#f7f6f4] p-6">
                <p className="label-mono text-[#111111]/55">Published Media (Primary)</p>
                <p className="mt-2 font-mono text-[1.5rem] font-bold tabular-nums">
                  {media.filter((m) => m.published).length}{" "}
                  <span className="text-[13px] font-normal text-[#111111]/55">
                    / {media.length} total
                  </span>
                </p>
              </div>
              <div className="bg-[#f7f6f4] p-6">
                <p className="label-mono text-[#111111]/55">Community Signups</p>
                <p className="mt-2 font-mono text-[1.5rem] font-bold tabular-nums">
                  {subscribers.length}{" "}
                  <span className="text-[13px] font-normal text-[#111111]/55">records</span>
                </p>
              </div>
            </div>

            {/* TAB 1: SESSIONS */}
            {tab === "sessions" && (
              <section className="mt-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-[1.45rem] font-medium tracking-[-0.02em]">
                    Think Sessions &amp; Next Session Spotlight
                  </h2>
                  <button
                    type="button"
                    onClick={startNewSession}
                    className="label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-5 py-2.5 text-white transition-opacity hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>New Think Session</span>
                  </button>
                </div>

                <AdminLiveCompanionPanel
                  primarySessions={sessions}
                  liveState={liveState}
                  onToast={showToast}
                  onError={setActionError}
                />

                {sessionFormOpen && (
                  <form
                    onSubmit={handleSaveSession}
                    className="mt-6 rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8"
                  >
                    <div className="flex items-center justify-between border-b border-black/[0.08] pb-4">
                      <h3 className="text-lg font-medium">
                        {sessionForm.id ? "Edit Think Session" : "Create Think Session"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSessionFormOpen(false)}
                        className="label-mono cursor-pointer text-[#111111]/60 hover:text-[#111111]"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label-mono block text-[#111111]/65">
                          Label (e.g. Next Session, Session 04)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.session.number.max}
                          value={sessionForm.number}
                          onChange={(e) =>
                            setSessionForm((f) => ({ ...f, number: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">Status</label>
                        <select
                          value={sessionForm.status}
                          onChange={(e) =>
                            setSessionForm((f) => ({
                              ...f,
                              status: e.target.value === "archived" ? "archived" : "upcoming",
                            }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="label-mono block text-[#111111]/65">
                          Session Title ({sessionForm.title.length}/
                          {BLUEPRINT_LIMITS.session.title.max})
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.session.title.max}
                          value={sessionForm.title}
                          onChange={(e) =>
                            setSessionForm((f) => ({ ...f, title: e.target.value }))
                          }
                          placeholder="From Studio to Registered Practice: What Actually Counts"
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">Speaker / Panel</label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.session.speaker.max}
                          value={sessionForm.speaker}
                          onChange={(e) =>
                            setSessionForm((f) => ({ ...f, speaker: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">Speaker Role</label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.session.speakerRole.max}
                          value={sessionForm.speakerRole}
                          onChange={(e) =>
                            setSessionForm((f) => ({ ...f, speakerRole: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">Date Label</label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.session.dateLabel.max}
                          value={sessionForm.dateLabel}
                          onChange={(e) =>
                            setSessionForm((f) => ({ ...f, dateLabel: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">
                          Time / Duration Label
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.session.timeLabel.max}
                          value={sessionForm.timeLabel}
                          onChange={(e) =>
                            setSessionForm((f) => ({ ...f, timeLabel: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">Format</label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.session.format.max}
                          value={sessionForm.format}
                          onChange={(e) =>
                            setSessionForm((f) => ({ ...f, format: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">
                          Luma / Registration URL (HTTPS, optional)
                        </label>
                        <input
                          type="url"
                          maxLength={BLUEPRINT_LIMITS.session.registrationUrl.max}
                          value={sessionForm.registrationUrl}
                          onChange={(e) =>
                            setSessionForm((f) => ({ ...f, registrationUrl: e.target.value }))
                          }
                          placeholder="https://lu.ma/your-session"
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="label-mono block text-[#111111]/65">
                          Exact Start Date &amp; Time (WAT · unlocks Calendar + Auto-Timezone)
                        </label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={isoToWatDatetimeLocal(sessionForm.startAtIso)}
                            onChange={(e) =>
                              setSessionForm((f) => ({
                                ...f,
                                startAtIso: watDatetimeLocalToIso(e.target.value),
                              }))
                            }
                            className="h-11 flex-1 rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                          />
                          {sessionForm.startAtIso && (
                            <button
                              type="button"
                              onClick={() =>
                                setSessionForm((f) => ({ ...f, startAtIso: "" }))
                              }
                              className="label-mono h-11 cursor-pointer rounded-lg border border-black/10 bg-[#f7f6f4] px-3 text-[11px] text-[#111111]/70 hover:text-[#fe3619]"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        {sessionForm.startAtIso && (
                          <p className="mt-1 font-mono text-[11px] text-[#111111]/55">
                            WAT: {formatTimezonePreview(sessionForm.startAtIso, "Africa/Lagos")} ·
                            London: {formatTimezonePreview(sessionForm.startAtIso, "Europe/London")} ·
                            NY: {formatTimezonePreview(sessionForm.startAtIso, "America/New_York")}
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="label-mono block text-[#111111]/65">
                          Summary ({sessionForm.summary.length}/
                          {BLUEPRINT_LIMITS.session.summary.max})
                        </label>
                        <textarea
                          rows={3}
                          required
                          maxLength={BLUEPRINT_LIMITS.session.summary.max}
                          value={sessionForm.summary}
                          onChange={(e) =>
                            setSessionForm((f) => ({ ...f, summary: e.target.value }))
                          }
                          className="mt-1.5 w-full rounded-lg border border-black/10 bg-[#f7f6f4] p-3.5 text-[14px]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="label-mono block text-[#111111]/65">
                          Topics Covered (1 per line, max {BLUEPRINT_LIMITS.session.maxTopics})
                        </label>
                        <textarea
                          rows={3}
                          value={sessionTopicsText}
                          onChange={(e) => setSessionTopicsText(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-black/10 bg-[#f7f6f4] p-3.5 font-mono text-[13px]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="label-mono block text-[#111111]/65">
                            Companion Links &amp; Resources (0–{BLUEPRINT_LIMITS.session.maxResources})
                          </label>
                          {(sessionForm.resources?.length ?? 0) <
                            BLUEPRINT_LIMITS.session.maxResources && (
                            <button
                              type="button"
                              onClick={() =>
                                setSessionForm((f) => ({
                                  ...f,
                                  resources: [...(f.resources ?? []), { label: "", url: "" }],
                                }))
                              }
                              className="label-mono inline-flex cursor-pointer items-center gap-1 rounded-lg border border-black/12 bg-[#f7f6f4] px-3 py-1.5 text-[11px] text-[#111111] hover:bg-[#111111] hover:text-white"
                            >
                              <Plus className="h-3 w-3" aria-hidden="true" />
                              <span>Add resource link</span>
                            </button>
                          )}
                        </div>
                        {(sessionForm.resources?.length ?? 0) === 0 ? (
                          <p className="mt-1.5 text-[13px] text-[#111111]/55">
                            Optional: attach ARCON/NIA guides, logbook templates, slides, or reading
                            lists shown on the session detail page.
                          </p>
                        ) : (
                          <div className="mt-2 space-y-2.5">
                            {(sessionForm.resources ?? []).map((res, idx) => (
                              <div
                                key={idx}
                                className="grid gap-2 rounded-lg border border-black/10 bg-[#f7f6f4] p-3 sm:grid-cols-[1fr_1.4fr_auto]"
                              >
                                <input
                                  type="text"
                                  maxLength={BLUEPRINT_LIMITS.session.resourceLabelMax}
                                  placeholder="Label (e.g. ARCON Logbook Template)"
                                  value={res.label}
                                  onChange={(e) => {
                                    const next = [...(sessionForm.resources ?? [])];
                                    next[idx] = { ...next[idx], label: e.target.value };
                                    setSessionForm((f) => ({ ...f, resources: next }));
                                  }}
                                  className="h-10 rounded-lg border border-black/10 bg-white px-3 text-[13.5px]"
                                />
                                <input
                                  type="url"
                                  maxLength={BLUEPRINT_LIMITS.session.resourceUrlMax}
                                  placeholder="https://..."
                                  value={res.url}
                                  onChange={(e) => {
                                    const next = [...(sessionForm.resources ?? [])];
                                    next[idx] = { ...next[idx], url: e.target.value };
                                    setSessionForm((f) => ({ ...f, resources: next }));
                                  }}
                                  className="h-10 rounded-lg border border-black/10 bg-white px-3 text-[13.5px]"
                                />
                                <button
                                  type="button"
                                  aria-label={`Remove resource ${idx + 1}`}
                                  onClick={() => {
                                    const next = (sessionForm.resources ?? []).filter(
                                      (_, i) => i !== idx,
                                    );
                                    setSessionForm((f) => ({ ...f, resources: next }));
                                  }}
                                  className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-black/10 text-[#111111]/60 hover:border-[#fe3619] hover:text-[#fe3619]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
                        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
                          <input
                            type="checkbox"
                            checked={sessionForm.published}
                            onChange={(e) =>
                              setSessionForm((f) => ({ ...f, published: e.target.checked }))
                            }
                            className="h-4 w-4 accent-[#fe3619]"
                          />
                          <span>Published on public site</span>
                        </label>

                        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
                          <input
                            type="checkbox"
                            checked={sessionForm.isNextSession}
                            onChange={(e) =>
                              setSessionForm((f) => ({
                                ...f,
                                isNextSession: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 accent-[#fe3619]"
                          />
                          <span>Feature as Home Page Next Session</span>
                        </label>
                      </div>
                    </div>

                    {/* Live Home Page Next Session Card Preview */}
                    <div className="mt-7 border-t border-black/[0.08] pt-6">
                      <p className="label-mono text-[#111111]/60">
                        Live Home Page Card Preview (#next-session)
                      </p>
                      <div className="mt-3 rounded-[12px] border border-black/[0.08] bg-[#f7f6f4] p-6">
                        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#111111]/60">
                              <span className="text-[#fe3619]">
                                {sessionForm.number || "Next Session"}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-[#111111]/50" aria-hidden="true" />
                                <span>{sessionForm.dateLabel || "Date TBC"}</span>
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1.5 tabular-nums">
                                <Clock className="h-3.5 w-3.5 text-[#111111]/50" aria-hidden="true" />
                                <span>{sessionForm.timeLabel || "Time TBC"}</span>
                              </span>
                            </div>

                            <h4 className="mt-2.5 text-[1.35rem] font-medium leading-[1.18] tracking-[-0.025em] text-[#111111]">
                              {sessionForm.title || "Session Title Preview"}
                            </h4>

                            <p className="mt-1.5 font-mono text-[12px] text-[#111111]/70">
                              {sessionForm.speaker || "Speaker Name"} —{" "}
                              {sessionForm.speakerRole || "Practice / Role"}
                            </p>

                            <p className="mt-3 max-w-[60ch] text-[14px] leading-[1.58] text-[#111111]/75">
                              {sessionForm.summary ||
                                "A brief editorial summary of the conversation will appear here."}
                            </p>
                          </div>

                          <div className="flex flex-col justify-between gap-4 border-t border-black/[0.08] pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                            <div>
                              <p className="label-mono text-[#111111]/55">
                                What this session covers
                              </p>
                              <ul className="mt-3 space-y-2 text-[13.5px] text-[#111111]/85">
                                {(sessionPreviewTopics.length > 0
                                  ? sessionPreviewTopics
                                  : ["Open member Q&A"]
                                ).map((topic, i) => (
                                  <li key={`${topic}-${i}`} className="flex items-start gap-2.5">
                                    <span className="font-mono text-[11px] font-bold tabular-nums text-[#fe3619]">
                                      0{i + 1}
                                    </span>
                                    <span>{topic}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="label-mono inline-flex min-h-[38px] items-center rounded-lg bg-[#fe3619] px-4 py-2 text-[11px] text-white">
                                {sessionForm.registrationUrl &&
                                sessionForm.registrationUrl.trim().startsWith("https://") &&
                                sessionForm.registrationUrl.trim() !== TALLY_FORM_URL
                                  ? "Register for this session"
                                  : "Join the community"}
                              </span>
                              <span className="label-mono inline-flex min-h-[38px] items-center rounded-lg border border-black/10 bg-[#efeeec] px-4 py-2 text-[11px] text-[#111111]">
                                View all sessions
                              </span>
                              {sessionForm.startAtIso && (
                                <span className="label-mono inline-flex min-h-[38px] items-center rounded-lg border border-black/10 bg-[#f7f6f4] px-3 py-2 text-[11px] text-[#111111]/75">
                                  Calendar + .ics ready
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {sessionError && (
                      <p role="alert" className="mt-4 text-[13px] font-medium text-[#fe3619]">
                        {sessionError}
                      </p>
                    )}

                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={savingSession}
                        className="label-mono inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-[#fe3619] px-6 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {savingSession ? "Saving..." : "Save Think Session"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Sessions List */}
                <div className="mt-6 border-t border-black/[0.09]">
                  {sessions.length === 0 ? (
                    <div className="py-12 text-center text-[15px] text-[#111111]/60">
                      No Think Sessions in Firestore yet. Click &ldquo;New Think Session&rdquo;
                      above to publish one.
                    </div>
                  ) : (
                    sessions.map((s) => (
                      <article
                        key={s.id}
                        className="flex flex-col justify-between gap-5 border-b border-black/[0.09] py-6 lg:flex-row lg:items-center"
                      >
                        <div className="max-w-[68ch]">
                          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.07em]">
                            <span className="text-[#fe3619]">{s.number}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#111111]/60">{s.status}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                s.published ? "text-[#111111]" : "text-[#111111]/45"
                              }
                            >
                              {s.published ? "Published" : "Draft"}
                            </span>
                            {s.isNextSession && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#fe3619]">Home Spotlight</span>
                              </>
                            )}
                          </div>
                          <h3 className="mt-2 text-[1.2rem] font-medium tracking-[-0.02em]">
                            {s.title}
                          </h3>
                          <p className="mt-1 font-mono text-[12px] text-[#111111]/60">
                            {s.speaker} · {s.dateLabel} · {s.timeLabel}
                            {s.startAtIso ? " · Calendar sync ON" : ""}
                            {s.resources.length > 0 ? ` · ${s.resources.length} resource(s)` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const isThisLive = liveState.isLive && liveState.sessionId === s.id;
                              try {
                                if (isThisLive) {
                                  await endLiveSession(liveState);
                                  showToast(`Ended live mode for "${s.title}".`);
                                } else {
                                  await startLiveSession(s, {
                                    roomUrl: liveState.roomUrl,
                                    qaOpen: true,
                                  });
                                  showToast(`"${s.title}" is now LIVE with Q&A Queue open.`);
                                }
                              } catch (err) {
                                setActionError(formatFirestoreErrorMessage(err));
                              }
                            }}
                            className={`label-mono inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 transition-colors ${
                              liveState.isLive && liveState.sessionId === s.id
                                ? "border-[#fe3619] bg-[#fe3619] text-white"
                                : "border-black/10 bg-[#111111] text-white hover:bg-[#fe3619]"
                            }`}
                          >
                            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {liveState.isLive && liveState.sessionId === s.id
                                ? "End Live"
                                : "Go LIVE"}
                            </span>
                          </button>

                          {!s.isNextSession && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await promoteToNextSession(s, sessions);
                                  showToast(`"${s.title}" is now the Home Next Session.`);
                                } catch (err) {
                                  setActionError(formatFirestoreErrorMessage(err));
                                }
                              }}
                              className="label-mono inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/10 bg-[#efeeec] px-3.5 py-2 text-[#111111] transition-colors hover:bg-[#fe3619] hover:text-white"
                            >
                              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Set Next</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await toggleSessionPublished(s);
                                showToast(s.published ? "Session unpublished." : "Session published.");
                              } catch (err) {
                                setActionError(formatFirestoreErrorMessage(err));
                              }
                            }}
                            className="label-mono inline-flex min-h-[38px] cursor-pointer items-center rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 py-2 text-[#111111] transition-colors hover:bg-[#efeeec]"
                          >
                            {s.published ? "Unpublish" : "Publish"}
                          </button>

                          <button
                            type="button"
                            onClick={() => createMediaFromSession(s)}
                            className="label-mono inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 py-2 text-[#111111] transition-colors hover:bg-[#efeeec]"
                          >
                            <Film className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Create Media</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => startEditSession(s)}
                            className="label-mono inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 py-2 text-[#111111] transition-colors hover:bg-[#efeeec]"
                          >
                            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </button>

                          {confirmDeleteId === s.id ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await removeSession(s.id);
                                  setConfirmDeleteId(null);
                                  showToast("Session deleted.");
                                } catch (err) {
                                  setActionError(formatFirestoreErrorMessage(err));
                                }
                              }}
                              className="label-mono inline-flex min-h-[38px] cursor-pointer items-center rounded-lg bg-[#fe3619] px-3.5 py-2 text-white"
                            >
                              Confirm Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(s.id)}
                              aria-label={`Delete ${s.title}`}
                              className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-lg border border-black/10 text-[#111111]/60 transition-colors hover:border-[#fe3619] hover:text-[#fe3619]"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* TAB 2: MEDIA */}
            {tab === "media" && (
              <section className="mt-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-[1.45rem] font-medium tracking-[-0.02em]">
                    Recordings &amp; Editorial Features
                  </h2>
                  <button
                    type="button"
                    onClick={startNewMedia}
                    className="label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-5 py-2.5 text-white transition-opacity hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>New Media Entry</span>
                  </button>
                </div>

                {mediaFormOpen && (
                  <form
                    onSubmit={handleSaveMedia}
                    className="mt-6 rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8"
                  >
                    <div className="flex items-center justify-between border-b border-black/[0.08] pb-4">
                      <h3 className="text-lg font-medium">
                        {mediaForm.id ? "Edit Media Entry" : "Add Media Recording or Feature"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setMediaFormOpen(false)}
                        className="label-mono cursor-pointer text-[#111111]/60 hover:text-[#111111]"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="label-mono block text-[#111111]/65">Kind</label>
                        <select
                          value={mediaForm.kind}
                          onChange={(e) =>
                            setMediaForm((f) => ({
                              ...f,
                              kind: e.target.value === "Feature" ? "Feature" : "Recording",
                            }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        >
                          <option value="Recording">Recording</option>
                          <option value="Feature">Feature</option>
                        </select>
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">
                          Source Session Ref
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.media.sessionRef.max}
                          value={mediaForm.sessionRef}
                          onChange={(e) =>
                            setMediaForm((f) => ({ ...f, sessionRef: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="label-mono block text-[#111111]/65">
                          Title ({mediaForm.title.length}/{BLUEPRINT_LIMITS.media.title.max})
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.media.title.max}
                          value={mediaForm.title}
                          onChange={(e) =>
                            setMediaForm((f) => ({ ...f, title: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">Speaker</label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.media.speaker.max}
                          value={mediaForm.speaker}
                          onChange={(e) =>
                            setMediaForm((f) => ({ ...f, speaker: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">
                          Duration / Read Time
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.media.duration.max}
                          value={mediaForm.duration}
                          onChange={(e) =>
                            setMediaForm((f) => ({ ...f, duration: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">
                          Published Label
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={BLUEPRINT_LIMITS.media.publishedAt.max}
                          value={mediaForm.publishedAt}
                          onChange={(e) =>
                            setMediaForm((f) => ({ ...f, publishedAt: e.target.value }))
                          }
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div>
                        <label className="label-mono block text-[#111111]/65">
                          Recording / Feature URL (HTTPS, optional)
                        </label>
                        <input
                          type="url"
                          maxLength={BLUEPRINT_LIMITS.media.mediaUrl.max}
                          value={mediaForm.mediaUrl}
                          onChange={(e) =>
                            setMediaForm((f) => ({ ...f, mediaUrl: e.target.value }))
                          }
                          placeholder="https://youtube.com/watch?v=..."
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="label-mono block text-[#111111]/65">
                          Summary ({mediaForm.summary.length}/{BLUEPRINT_LIMITS.media.summary.max})
                        </label>
                        <textarea
                          rows={3}
                          required
                          maxLength={BLUEPRINT_LIMITS.media.summary.max}
                          value={mediaForm.summary}
                          onChange={(e) =>
                            setMediaForm((f) => ({ ...f, summary: e.target.value }))
                          }
                          className="mt-1.5 w-full rounded-lg border border-black/10 bg-[#f7f6f4] p-3.5 text-[14px]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="label-mono block text-[#111111]/65">
                          Key Takeaways (1 per line, max {BLUEPRINT_LIMITS.media.maxHighlights})
                        </label>
                        <textarea
                          rows={3}
                          value={mediaHighlightsText}
                          onChange={(e) => setMediaHighlightsText(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-black/10 bg-[#f7f6f4] p-3.5 font-mono text-[13px]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
                          <input
                            type="checkbox"
                            checked={mediaForm.published}
                            onChange={(e) =>
                              setMediaForm((f) => ({ ...f, published: e.target.checked }))
                            }
                            className="h-4 w-4 accent-[#fe3619]"
                          />
                          <span>Published on Media page</span>
                        </label>
                      </div>
                    </div>

                    {mediaError && (
                      <p role="alert" className="mt-4 text-[13px] font-medium text-[#fe3619]">
                        {mediaError}
                      </p>
                    )}

                    <div className="mt-6">
                      <button
                        type="submit"
                        disabled={savingMedia}
                        className="label-mono inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-[#fe3619] px-6 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {savingMedia ? "Saving..." : "Save Media Entry"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-6 border-t border-black/[0.09]">
                  {media.length === 0 ? (
                    <div className="py-12 text-center text-[15px] text-[#111111]/60">
                      No Media entries in Firestore yet.
                    </div>
                  ) : (
                    media.map((m) => (
                      <article
                        key={m.id}
                        className="flex flex-col justify-between gap-5 border-b border-black/[0.09] py-6 lg:flex-row lg:items-center"
                      >
                        <div className="max-w-[68ch]">
                          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.07em]">
                            <span className="inline-flex items-center gap-1.5 text-[#fe3619]">
                              <Film className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{m.kind}</span>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#111111]/60">{m.sessionRef}</span>
                            <span aria-hidden="true">·</span>
                            <span>{m.published ? "Published" : "Draft"}</span>
                          </div>
                          <h3 className="mt-2 text-[1.2rem] font-medium tracking-[-0.02em]">
                            {m.title}
                          </h3>
                          <p className="mt-1 font-mono text-[12px] text-[#111111]/60">
                            {m.speaker} · {m.duration}
                            {m.mediaUrl ? (
                              <>
                                {" · "}
                                <a
                                  href={m.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[#111111]"
                                >
                                  <span>External Link</span>
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              </>
                            ) : null}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await toggleMediaPublished(m);
                                showToast(m.published ? "Media unpublished." : "Media published.");
                              } catch (err) {
                                setActionError(formatFirestoreErrorMessage(err));
                              }
                            }}
                            className="label-mono inline-flex min-h-[38px] cursor-pointer items-center rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 py-2 text-[#111111] transition-colors hover:bg-[#efeeec]"
                          >
                            {m.published ? "Unpublish" : "Publish"}
                          </button>

                          <button
                            type="button"
                            onClick={() => startEditMedia(m)}
                            className="label-mono inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 py-2 text-[#111111] transition-colors hover:bg-[#efeeec]"
                          >
                            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </button>

                          {confirmDeleteId === m.id ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await removeMediaItem(m.id);
                                  setConfirmDeleteId(null);
                                  showToast("Media entry deleted.");
                                } catch (err) {
                                  setActionError(formatFirestoreErrorMessage(err));
                                }
                              }}
                              className="label-mono inline-flex min-h-[38px] cursor-pointer items-center rounded-lg bg-[#fe3619] px-3.5 py-2 text-white"
                            >
                              Confirm Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(m.id)}
                              aria-label={`Delete ${m.title}`}
                              className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-lg border border-black/10 text-[#111111]/60 transition-colors hover:border-[#fe3619] hover:text-[#fe3619]"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* TAB 3: SPEAKER & TOPIC PITCHES */}
            {tab === "pitches" && (
              <section className="mt-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[1.45rem] font-medium tracking-[-0.02em]">
                      Speaker &amp; Topic Pitches
                    </h2>
                    <p className="mt-1 text-[14px] text-[#111111]/65">
                      Direct submissions from the Contact, Sessions, and Community pitch forms.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-black/[0.08] bg-[#efeeec] p-1">
                    {(["all", "new", "reviewed", "scheduled", "archived"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setPitchFilter(st)}
                        className={`label-mono min-h-[34px] cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
                          pitchFilter === st
                            ? "bg-[#111111] text-white"
                            : "text-[#111111]/65 hover:text-[#111111]"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-black/[0.09]">
                  {filteredPitches.length === 0 ? (
                    <div className="py-12 text-center text-[15px] text-[#111111]/60">
                      {pitches.length === 0
                        ? "No speaker or topic pitches submitted yet."
                        : `No pitches matching "${pitchFilter}".`}
                    </div>
                  ) : (
                    filteredPitches.map((p) => (
                      <article
                        key={p.id}
                        className="flex flex-col justify-between gap-5 border-b border-black/[0.09] py-6 lg:flex-row lg:items-start"
                      >
                        <div className="max-w-[70ch]">
                          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.07em]">
                            <span className="inline-flex items-center gap-1.5 text-[#fe3619]">
                              {p.pitchType === "speaker" ? (
                                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              <span>
                                {p.pitchType === "speaker" ? "Speaker Offer" : "Topic Suggestion"}
                              </span>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#111111]/75">{p.targetStage}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#111111]/55">
                              {p.createdAtMs > 0
                                ? new Date(p.createdAtMs).toLocaleDateString("en-NG", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "Just submitted"}
                            </span>
                          </div>

                          <h3 className="mt-2 text-[1.2rem] font-medium tracking-[-0.02em]">
                            {p.topicTitle}
                          </h3>

                          <p className="mt-1 font-mono text-[12px] text-[#111111]/70">
                            {p.name} · {p.email}
                            {p.roleOrStudio ? ` · ${p.roleOrStudio}` : ""}
                          </p>

                          <p className="mt-3 text-[14.5px] leading-[1.6] text-[#111111]/80">
                            {p.outline}
                          </p>

                          {p.linkUrl && (
                            <p className="mt-2.5">
                              <a
                                href={p.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[#111111] underline underline-offset-4 hover:text-[#fe3619]"
                              >
                                <span>{p.linkUrl}</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <select
                            aria-label={`Status for ${p.topicTitle}`}
                            value={p.status}
                            onChange={async (e) => {
                              const nextStatus = e.target.value as PitchStatus;
                              try {
                                await updatePitchStatus(p.id, nextStatus);
                                showToast(`Marked pitch as ${nextStatus}.`);
                              } catch (err) {
                                setActionError(formatFirestoreErrorMessage(err));
                              }
                            }}
                            className="label-mono h-[38px] cursor-pointer rounded-lg border border-black/12 bg-[#efeeec] px-3 text-[#111111]"
                          >
                            <option value="new">New</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="archived">Archived</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => void convertPitchToSession(p)}
                            className="label-mono inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg bg-[#111111] px-3.5 py-2 text-white transition-opacity hover:opacity-85"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Session Draft</span>
                          </button>

                          {confirmDeleteId === p.id ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await removePitch(p.id);
                                  setConfirmDeleteId(null);
                                  showToast("Pitch deleted.");
                                } catch (err) {
                                  setActionError(formatFirestoreErrorMessage(err));
                                }
                              }}
                              className="label-mono inline-flex min-h-[38px] cursor-pointer items-center rounded-lg bg-[#fe3619] px-3.5 py-2 text-white"
                            >
                              Confirm Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(p.id)}
                              aria-label={`Delete pitch ${p.topicTitle}`}
                              className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-lg border border-black/10 text-[#111111]/60 transition-colors hover:border-[#fe3619] hover:text-[#fe3619]"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* TAB 4: WRAPPED CMS */}
            {tab === "wrapped" && (
              <AdminWrappedTab
                form={wrappedForm}
                setForm={setWrappedForm}
                activeConfigId={activeWrappedId}
                editions={wrappedEditions}
                onSelectConfigId={setActiveWrappedId}
                onSaved={(msg) => showToast(msg)}
              />
            )}

            {/* TAB 4: SUBSCRIBERS & GOOGLE SHEETS SYNC */}
            {tab === "subscribers" && (
              <section className="mt-10">
                <AdminGoogleSheetsSyncCard
                  communityStats={communityStats}
                  sheetsConfig={sheetsConfig}
                  wrappedForm={wrappedForm}
                  onSaved={(msg) => showToast(msg)}
                />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[1.45rem] font-medium tracking-[-0.02em]">
                      Community Signups &amp; Newsletter
                    </h2>
                    <p className="mt-1 text-[14px] text-[#111111]/65">
                      Submissions saved from the footer invite form and fallback community modal.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={subscribers.length === 0}
                    onClick={handleExportSubscribersCsv}
                    className="label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    <span>Export CSV</span>
                  </button>
                </div>

                <div className="mt-6 border-t border-black/[0.09]">
                  {subscribers.length === 0 ? (
                    <div className="py-12 text-center text-[15px] text-[#111111]/60">
                      No subscriber signups recorded in Firestore yet.
                    </div>
                  ) : (
                    subscribers.map((sub) => (
                      <article
                        key={sub.id}
                        className="flex flex-col justify-between gap-4 border-b border-black/[0.09] py-5 sm:flex-row sm:items-center"
                      >
                        <div className="max-w-[68ch]">
                          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.07em]">
                            <span className="inline-flex items-center gap-1.5 text-[#fe3619]">
                              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>
                                {sub.source === "join_modal"
                                  ? "Community Form"
                                  : "Footer Newsletter"}
                              </span>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#111111]/55">
                              {sub.createdAtMs > 0
                                ? new Date(sub.createdAtMs).toLocaleDateString("en-NG", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "Just submitted"}
                            </span>
                            {sub.stage && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#111111]/75">{sub.stage}</span>
                              </>
                            )}
                          </div>
                          <p className="mt-1.5 text-[1.05rem] font-medium tracking-[-0.01em]">
                            {sub.email}
                            {sub.name ? (
                              <span className="ml-2 text-[14px] font-normal text-[#111111]/65">
                                ({sub.name})
                              </span>
                            ) : null}
                          </p>
                          {sub.question && (
                            <p className="mt-1.5 text-[14px] leading-relaxed text-[#111111]/75">
                              &ldquo;{sub.question}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {confirmDeleteId === sub.id ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await removeSubscriber(sub.id);
                                  setConfirmDeleteId(null);
                                  showToast("Subscriber record deleted.");
                                } catch (err) {
                                  setActionError(formatFirestoreErrorMessage(err));
                                }
                              }}
                              className="label-mono inline-flex min-h-[38px] cursor-pointer items-center rounded-lg bg-[#fe3619] px-3.5 py-2 text-white"
                            >
                              Confirm Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(sub.id)}
                              aria-label={`Delete ${sub.email}`}
                              className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-lg border border-black/10 text-[#111111]/60 transition-colors hover:border-[#fe3619] hover:text-[#fe3619]"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* TAB 4: PUBLIC CHANNELS / SETTINGS */}
            {tab === "settings" && (
              <section className="mt-10 max-w-[720px]">
                <form
                  onSubmit={handleSaveSettings}
                  className="rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8"
                >
                  <div className="flex items-center gap-2 text-[#fe3619]">
                    <Globe className="h-4 w-4" aria-hidden="true" />
                    <span className="label-mono">Footer Social Links</span>
                  </div>
                  <h2 className="mt-2 text-xl font-medium tracking-[-0.02em]">
                    Official Community Channels
                  </h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#111111]/70">
                    Add your verified HTTPS social profile URLs below. Only channels with a saved
                    link are shown in the public footer, so visitors never land on broken or generic
                    placeholder links.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="label-mono block text-[#111111]/65">Instagram URL</label>
                      <input
                        type="url"
                        maxLength={BLUEPRINT_LIMITS.siteSettings.url.max}
                        value={settingsForm.instagramUrl}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, instagramUrl: e.target.value }))
                        }
                        placeholder="https://instagram.com/thethinkingarchitect"
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">X / Twitter URL</label>
                      <input
                        type="url"
                        maxLength={BLUEPRINT_LIMITS.siteSettings.url.max}
                        value={settingsForm.xUrl}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, xUrl: e.target.value }))
                        }
                        placeholder="https://x.com/thethinkingarch"
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">LinkedIn URL</label>
                      <input
                        type="url"
                        maxLength={BLUEPRINT_LIMITS.siteSettings.url.max}
                        value={settingsForm.linkedinUrl}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, linkedinUrl: e.target.value }))
                        }
                        placeholder="https://linkedin.com/company/thethinkingarchitect"
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">YouTube URL</label>
                      <input
                        type="url"
                        maxLength={BLUEPRINT_LIMITS.siteSettings.url.max}
                        value={settingsForm.youtubeUrl}
                        onChange={(e) =>
                          setSettingsForm((s) => ({ ...s, youtubeUrl: e.target.value }))
                        }
                        placeholder="https://youtube.com/@thethinkingarchitect"
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>
                  </div>

                  {settingsError && (
                    <p role="alert" className="mt-4 text-[13px] font-medium text-[#fe3619]">
                      {settingsError}
                    </p>
                  )}

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="label-mono inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-[#fe3619] px-6 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {savingSettings ? "Saving..." : "Save Channel Links"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* TAB 5: ADMINS */}
            {tab === "admins" && (
              <section className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
                <form
                  onSubmit={handleAddAdmin}
                  className="rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8"
                >
                  <div className="flex items-center gap-2 text-[#fe3619]">
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    <span className="label-mono">Grant Co-Admin Access</span>
                  </div>
                  <h2 className="mt-2 text-xl font-medium tracking-[-0.02em]">
                    Authorize a Team Member
                  </h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#111111]/70">
                    When a teammate signs in on this page, they will see their Firebase UID on the
                    authorization screen. Paste their UID here to grant write access.
                  </p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="label-mono block text-[#111111]/65">
                        Firebase Auth UID
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdminUid}
                        onChange={(e) => setNewAdminUid(e.target.value)}
                        placeholder="e.g. a1b2c3d4e5f6..."
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 font-mono text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">
                        Verified Email
                      </label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="editor@thethinkingarchitects.com.ng"
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">Display Name</label>
                      <input
                        type="text"
                        required
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="Adaeze Okafor"
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>
                  </div>

                  {adminFormError && (
                    <p role="alert" className="mt-4 text-[13px] font-medium text-[#fe3619]">
                      {adminFormError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={savingAdmin}
                    className="label-mono mt-6 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-[#111111] px-6 py-2.5 text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                  >
                    {savingAdmin ? "Adding..." : "Add Admin"}
                  </button>
                </form>

                <div>
                  <h2 className="text-[1.35rem] font-medium tracking-[-0.02em]">
                    Authorized Administrators
                  </h2>
                  <div className="mt-4 border-t border-black/[0.09]">
                    <div className="flex items-center justify-between border-b border-black/[0.09] py-4">
                      <div>
                        <p className="font-medium">Primary Owner (Bootstrapped)</p>
                        <p className="font-mono text-[12px] text-[#111111]/65">
                          oladipupoinioluwa93@gmail.com
                        </p>
                      </div>
                      <span className="label-mono text-[#fe3619]">Locked</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-black/[0.09] py-4">
                      <div>
                        <p className="font-medium">Secondary Owner (Bootstrapped)</p>
                        <p className="font-mono text-[12px] text-[#111111]/65">
                          officialinioluwaoladipupo@gmail.com
                        </p>
                      </div>
                      <span className="label-mono text-[#fe3619]">Locked</span>
                    </div>

                    {admins.map((admin) => (
                      <div
                        key={admin.id}
                        className="flex items-center justify-between gap-4 border-b border-black/[0.09] py-4"
                      >
                        <div>
                          <p className="font-medium">{admin.displayName}</p>
                          <p className="font-mono text-[12px] text-[#111111]/65">
                            {admin.email} · {admin.id}
                          </p>
                        </div>
                        {admin.id !== user.uid && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await removeAdminUser(admin.id);
                                showToast("Admin access revoked.");
                              } catch (err) {
                                setActionError(formatFirestoreErrorMessage(err));
                              }
                            }}
                            className="label-mono cursor-pointer text-[#111111]/60 hover:text-[#fe3619]"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminConsoleClient() {
  return (
    <FirestoreErrorBoundary>
      <AdminConsoleInner />
    </FirestoreErrorBoundary>
  );
}
