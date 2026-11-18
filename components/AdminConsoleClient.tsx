"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  Film,
  Globe,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  Plus,
  Radio,
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
  DEFAULT_LIVE_SETTINGS,
  DEFAULT_WRAPPED_SETTINGS,
  promoteToNextSession,
  removeAdminUser,
  removeMediaItem,
  removeSession,
  removeSessionQuestion,
  removeSubscriber,
  removeWrappedSlide,
  saveLiveSettings,
  saveMediaItem,
  saveSession,
  saveSiteSettings,
  saveWrappedSettings,
  saveWrappedSlide,
  seedDefaultWrappedSlides,
  subscribeAdmins,
  subscribeAllMedia,
  subscribeAllSessionQuestions,
  subscribeAllSessions,
  subscribeAllWrappedSlides,
  subscribeLiveSettings,
  subscribeSiteSettings,
  subscribeSubscribers,
  subscribeWrappedSettings,
  swapWrappedSlideOrder,
  toggleMediaPublished,
  toggleQuestionAnswered,
  toggleSessionPublished,
  toggleWrappedSlidePublished,
  validateLiveSettingsInput,
  validateMediaInput,
  validateSessionInput,
  validateSiteSettingsInput,
  validateWrappedSettingsInput,
  validateWrappedSlideInput,
  type AdminRecord,
  type FirestoreMediaRecord,
  type FirestoreSessionRecord,
  type LiveSettingsInput,
  type MediaInput,
  type SessionInput,
  type SessionQuestionRecord,
  type SiteSettingsInput,
  type SubscriberRecord,
  type WrappedSettingsInput,
  type WrappedSlideInput,
  type WrappedSlideKind,
  type WrappedSlideRecord,
  type WrappedSlideTheme,
} from "../lib/firebaseContent";
import { TALLY_FORM_URL } from "../lib/tally";
import { useFirebase } from "./FirebaseProvider";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import LiveElapsedTimer from "./LiveElapsedTimer";

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
  registrationUrl: TALLY_FORM_URL,
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

const emptyWrappedSlideForm = (nextOrder = 1): WrappedSlideInput => ({
  order: nextOrder,
  label: "Milestone",
  kind: "statement",
  theme: "cream",
  eyebrow: "",
  headline: "",
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
});

function isoToDatetimeLocalValue(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed) return "";
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
    "sessions" | "media" | "wrapped" | "subscribers" | "settings" | "admins"
  >("sessions");
  const [sessions, setSessions] = useState<FirestoreSessionRecord[]>([]);
  const [media, setMedia] = useState<FirestoreMediaRecord[]>([]);
  const [wrappedSlides, setWrappedSlides] = useState<WrappedSlideRecord[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);

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

  const [wrappedSettingsForm, setWrappedSettingsForm] = useState<WrappedSettingsInput>(() => ({
    enabled: DEFAULT_WRAPPED_SETTINGS.enabled,
    showHomeBanner: DEFAULT_WRAPPED_SETTINGS.showHomeBanner,
    countdownTargetIso: DEFAULT_WRAPPED_SETTINGS.countdownTargetIso,
    countdownHeadline: DEFAULT_WRAPPED_SETTINGS.countdownHeadline,
    countdownSubtext: DEFAULT_WRAPPED_SETTINGS.countdownSubtext,
    pageTitle: DEFAULT_WRAPPED_SETTINGS.pageTitle,
    pageIntro: DEFAULT_WRAPPED_SETTINGS.pageIntro,
    closingHeadline: DEFAULT_WRAPPED_SETTINGS.closingHeadline,
    closingBody: DEFAULT_WRAPPED_SETTINGS.closingBody,
    shareCaption: DEFAULT_WRAPPED_SETTINGS.shareCaption,
    autoplaySeconds: DEFAULT_WRAPPED_SETTINGS.autoplaySeconds,
  }));
  const [wrappedSettingsError, setWrappedSettingsError] = useState("");
  const [savingWrappedSettings, setSavingWrappedSettings] = useState(false);

  const [wrappedSlideFormOpen, setWrappedSlideFormOpen] = useState(false);
  const [wrappedSlideForm, setWrappedSlideForm] = useState<WrappedSlideInput>(() =>
    emptyWrappedSlideForm(1),
  );
  const [wrappedSlideItemsText, setWrappedSlideItemsText] = useState("");
  const [wrappedSlideError, setWrappedSlideError] = useState("");
  const [savingWrappedSlide, setSavingWrappedSlide] = useState(false);
  const [seedingWrappedSlides, setSeedingWrappedSlides] = useState(false);

  const [settingsForm, setSettingsForm] = useState<SiteSettingsInput>({
    instagramUrl: "",
    xUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
  });
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [liveSettingsForm, setLiveSettingsForm] = useState<LiveSettingsInput>(() => ({
    isLive: DEFAULT_LIVE_SETTINGS.isLive,
    liveSessionId: DEFAULT_LIVE_SETTINGS.liveSessionId,
    liveTitle: DEFAULT_LIVE_SETTINGS.liveTitle,
    liveRoomUrl: DEFAULT_LIVE_SETTINGS.liveRoomUrl,
    liveStartedAtIso: DEFAULT_LIVE_SETTINGS.liveStartedAtIso,
    qaEnabled: DEFAULT_LIVE_SETTINGS.qaEnabled,
    announcementEnabled: DEFAULT_LIVE_SETTINGS.announcementEnabled,
    announcementText: DEFAULT_LIVE_SETTINGS.announcementText,
    announcementLinkLabel: DEFAULT_LIVE_SETTINGS.announcementLinkLabel,
    announcementLinkHref: DEFAULT_LIVE_SETTINGS.announcementLinkHref,
  }));
  const [liveSettingsError, setLiveSettingsError] = useState("");
  const [savingLiveSettings, setSavingLiveSettings] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestionRecord[]>([]);
  const [qaFilter, setQaFilter] = useState<"open" | "all">("open");

  const [newAdminUid, setNewAdminUid] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [adminFormError, setAdminFormError] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);

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
    const unsubWrappedSlides = subscribeAllWrappedSlides(setWrappedSlides, handleListenerError);
    const unsubWrappedSettings = subscribeWrappedSettings((w) => {
      setWrappedSettingsForm({
        enabled: w.enabled,
        showHomeBanner: w.showHomeBanner,
        countdownTargetIso: w.countdownTargetIso,
        countdownHeadline: w.countdownHeadline,
        countdownSubtext: w.countdownSubtext,
        pageTitle: w.pageTitle,
        pageIntro: w.pageIntro,
        closingHeadline: w.closingHeadline,
        closingBody: w.closingBody,
        shareCaption: w.shareCaption,
        autoplaySeconds: w.autoplaySeconds,
      });
    }, handleListenerError);
    const unsubLiveSettings = subscribeLiveSettings((l) => {
      setLiveSettingsForm({
        isLive: l.isLive,
        liveSessionId: l.liveSessionId,
        liveTitle: l.liveTitle,
        liveRoomUrl: l.liveRoomUrl,
        liveStartedAtIso: l.liveStartedAtIso,
        qaEnabled: l.qaEnabled,
        announcementEnabled: l.announcementEnabled,
        announcementText: l.announcementText,
        announcementLinkLabel: l.announcementLinkLabel,
        announcementLinkHref: l.announcementLinkHref,
      });
    }, handleListenerError);
    const unsubQuestions = subscribeAllSessionQuestions(setSessionQuestions, handleListenerError);
    const unsubSubscribers = subscribeSubscribers(setSubscribers, handleListenerError);
    const unsubSettings = subscribeSiteSettings((s) => {
      setSettingsForm({
        instagramUrl: s.instagramUrl,
        xUrl: s.xUrl,
        linkedinUrl: s.linkedinUrl,
        youtubeUrl: s.youtubeUrl,
      });
    }, handleListenerError);
    const unsubAdmins = subscribeAdmins(setAdmins, handleListenerError);

    return () => {
      unsubSessions();
      unsubMedia();
      unsubWrappedSlides();
      unsubWrappedSettings();
      unsubLiveSettings();
      unsubQuestions();
      unsubSubscribers();
      unsubSettings();
      unsubAdmins();
    };
  }, [authReady, user, isAdmin, retryKey]);

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
      registrationUrl: s.registrationUrl || TALLY_FORM_URL,
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

  const handleSaveWrappedSettings = async (
    e?: FormEvent,
    override?: Partial<WrappedSettingsInput>,
  ) => {
    if (e) e.preventDefault();
    const payload: WrappedSettingsInput = {
      ...wrappedSettingsForm,
      ...override,
    };
    const validationErr = validateWrappedSettingsInput(payload);
    if (validationErr) {
      setWrappedSettingsError(validationErr);
      return;
    }

    setWrappedSettingsError("");
    setSavingWrappedSettings(true);
    try {
      await saveWrappedSettings(payload);
      setWrappedSettingsForm(payload);
      showToast("Wrapped settings saved to Firestore.");
    } catch (err) {
      setWrappedSettingsError(formatFirestoreErrorMessage(err));
    } finally {
      setSavingWrappedSettings(false);
    }
  };

  const startNewWrappedSlide = () => {
    const nextOrder =
      wrappedSlides.length > 0
        ? Math.max(...wrappedSlides.map((s) => s.order)) + 1
        : 1;
    setWrappedSlideForm(emptyWrappedSlideForm(nextOrder));
    setWrappedSlideItemsText("");
    setWrappedSlideError("");
    setWrappedSlideFormOpen(true);
  };

  const startEditWrappedSlide = (slide: WrappedSlideRecord) => {
    setWrappedSlideForm({
      id: slide.id,
      order: slide.order,
      label: slide.label,
      kind: slide.kind,
      theme: slide.theme,
      eyebrow: slide.eyebrow,
      headline: slide.headline,
      body: slide.body,
      accentDate: slide.accentDate,
      metricPrefix: slide.metricPrefix,
      metricValue: slide.metricValue,
      metricSuffix: slide.metricSuffix,
      secondaryMetricA: slide.secondaryMetricA,
      secondaryLabelA: slide.secondaryLabelA,
      secondaryMetricB: slide.secondaryMetricB,
      secondaryLabelB: slide.secondaryLabelB,
      items: slide.items,
      ctaLabel: slide.ctaLabel,
      published: slide.published,
    });
    setWrappedSlideItemsText(slide.items.join("\n"));
    setWrappedSlideError("");
    setWrappedSlideFormOpen(true);
  };

  const handleSaveWrappedSlide = async (e: FormEvent) => {
    e.preventDefault();
    const items = wrappedSlideItemsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, BLUEPRINT_LIMITS.wrappedSlide.maxItems);

    const payload: WrappedSlideInput = {
      ...wrappedSlideForm,
      items,
    };

    const validationErr = validateWrappedSlideInput(payload);
    if (validationErr) {
      setWrappedSlideError(validationErr);
      return;
    }

    setWrappedSlideError("");
    setSavingWrappedSlide(true);
    try {
      await saveWrappedSlide(payload);
      setWrappedSlideFormOpen(false);
      showToast(payload.id ? "Wrapped slide updated." : "New Wrapped slide saved.");
    } catch (err) {
      setWrappedSlideError(formatFirestoreErrorMessage(err));
    } finally {
      setSavingWrappedSlide(false);
    }
  };

  const nextSpotlight = sessions.find((s) => s.isNextSession && s.published) ?? null;

  const handleSaveLiveSettings = async (
    e?: FormEvent,
    override?: Partial<LiveSettingsInput>,
    successMsg = "Live Companion & Notice settings saved.",
  ) => {
    if (e) e.preventDefault();
    const payload: LiveSettingsInput = {
      ...liveSettingsForm,
      ...override,
    };

    const validationErr = validateLiveSettingsInput(payload);
    if (validationErr) {
      setLiveSettingsError(validationErr);
      return;
    }

    setLiveSettingsError("");
    setSavingLiveSettings(true);
    try {
      await saveLiveSettings(payload);
      setLiveSettingsForm(payload);
      showToast(successMsg);
    } catch (err) {
      setLiveSettingsError(formatFirestoreErrorMessage(err));
    } finally {
      setSavingLiveSettings(false);
    }
  };

  const handleToggleLiveNow = async () => {
    const turningOn = !liveSettingsForm.isLive;
    const defaultSessionId =
      liveSettingsForm.liveSessionId || nextSpotlight?.id || "";

    await handleSaveLiveSettings(
      undefined,
      {
        isLive: turningOn,
        liveSessionId: defaultSessionId,
        liveStartedAtIso: turningOn ? new Date().toISOString() : "",
      },
      turningOn
        ? "Session is now LIVE across the site."
        : "Live Session Companion turned off.",
    );
  };

  const filteredQuestions =
    qaFilter === "open"
      ? sessionQuestions.filter((q) => !q.answered)
      : sessionQuestions;

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
              className="hidden whitespace-nowrap text-[13px] font-medium text-[#111111]/70 hover:text-[#111111] sm:inline"
            >
              View Sessions
            </Link>
            <Link
              href="/media"
              className="hidden whitespace-nowrap text-[13px] font-medium text-[#111111]/70 hover:text-[#111111] sm:inline"
            >
              View Media
            </Link>
            <Link
              href="/wrapped"
              className="hidden whitespace-nowrap text-[13px] font-medium text-[#111111]/70 hover:text-[#111111] sm:inline"
            >
              View Wrapped
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
                      { key: "sessions", label: `Sessions (${sessions.length})` },
                      { key: "media", label: `Media (${media.length})` },
                      { key: "wrapped", label: `Wrapped (${wrappedSlides.length || 12})` },
                      { key: "subscribers", label: `Signups (${subscribers.length})` },
                      { key: "settings", label: "Notice & Channels" },
                      { key: "admins", label: `Admins (${admins.length + 1})` },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setTab(item.key);
                        setConfirmDeleteId(null);
                      }}
                      className={`label-mono min-h-[38px] cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 transition-colors ${
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

            {/* Overview KPI Strip */}
            <div className="mt-8 grid grid-cols-1 gap-px border border-black/[0.09] bg-black/[0.09] sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-[#f7f6f4] p-6">
                <p className="label-mono text-[#111111]/55">Home Spotlight (Next Session)</p>
                <p className="mt-2 text-[1.05rem] font-medium leading-snug">
                  {nextSpotlight ? nextSpotlight.title : "Not yet assigned in Firestore"}
                </p>
              </div>
              <div className="bg-[#f7f6f4] p-6">
                <p className="label-mono text-[#111111]/55">Published Think Sessions</p>
                <p className="mt-2 font-mono text-[1.5rem] font-bold tabular-nums">
                  {sessions.filter((s) => s.published).length}{" "}
                  <span className="text-[13px] font-normal text-[#111111]/55">
                    / {sessions.length} total
                  </span>
                </p>
              </div>
              <div className="bg-[#f7f6f4] p-6">
                <p className="label-mono text-[#111111]/55">Published Media Entries</p>
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
              <section className="mt-10 space-y-8">
                {/* 1-Click Live Session Companion Control */}
                <form
                  onSubmit={(e) =>
                    void handleSaveLiveSettings(e, undefined, "Live Session Companion config saved.")
                  }
                  className={`rounded-2xl border p-6 transition-colors sm:p-8 ${
                    liveSettingsForm.isLive
                      ? "border-white/10 bg-[#1C1C1C] text-[#F2EDE8]"
                      : "border-black/[0.09] bg-[#efeeec] text-[#111111]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-current/10 pb-5">
                    <div>
                      <div
                        className={`flex items-center gap-2 ${
                          liveSettingsForm.isLive ? "text-[#D94F2B]" : "text-[#fe3619]"
                        }`}
                      >
                        <Radio className="h-4 w-4" aria-hidden="true" />
                        <span className="label-mono">Live Session Companion Mode</span>
                        {liveSettingsForm.isLive && liveSettingsForm.liveStartedAtIso && (
                          <span className="ml-2 inline-flex items-center gap-1.5 bg-[#D94F2B] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                            <span>ON-AIR</span>
                            <LiveElapsedTimer startedAtIso={liveSettingsForm.liveStartedAtIso} />
                          </span>
                        )}
                      </div>
                      <h2 className="mt-2 text-xl font-medium tracking-[-0.02em]">
                        {liveSettingsForm.isLive
                          ? "Session is LIVE across Home & Sessions"
                          : "Ready for your next live Think Session"}
                      </h2>
                      <p
                        className={`mt-1 text-[13.5px] ${
                          liveSettingsForm.isLive ? "text-[#F2EDE8]/70" : "text-[#111111]/65"
                        }`}
                      >
                        Flipping this on transforms the Home spotlight into a live room entry strip
                        with an elapsed timer and highlights the attendee Q&amp;A queue.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={savingLiveSettings}
                      onClick={() => void handleToggleLiveNow()}
                      className={`label-mono inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
                        liveSettingsForm.isLive ? "bg-[#D94F2B]" : "bg-[#111111]"
                      }`}
                    >
                      <Radio className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {liveSettingsForm.isLive ? "End Live Session" : "Session is LIVE Now"}
                      </span>
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        className={`label-mono block ${
                          liveSettingsForm.isLive ? "text-[#F2EDE8]/70" : "text-[#111111]/65"
                        }`}
                      >
                        Active Session Room
                      </label>
                      <select
                        value={liveSettingsForm.liveSessionId}
                        onChange={(e) =>
                          setLiveSettingsForm((f) => ({ ...f, liveSessionId: e.target.value }))
                        }
                        className={`mt-1.5 h-11 w-full rounded-lg border px-3.5 text-[14px] ${
                          liveSettingsForm.isLive
                            ? "border-white/15 bg-black/30 text-[#F2EDE8]"
                            : "border-black/10 bg-[#f7f6f4] text-[#111111]"
                        }`}
                      >
                        <option value="">General Live Lobby (/sessions)</option>
                        {sessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.number} — {s.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        className={`label-mono block ${
                          liveSettingsForm.isLive ? "text-[#F2EDE8]/70" : "text-[#111111]/65"
                        }`}
                      >
                        Live Headline Override (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.liveSettings.liveTitle.max}
                        value={liveSettingsForm.liveTitle}
                        onChange={(e) =>
                          setLiveSettingsForm((f) => ({ ...f, liveTitle: e.target.value }))
                        }
                        placeholder="Defaults to selected Think Session title"
                        className={`mt-1.5 h-11 w-full rounded-lg border px-3.5 text-[14px] ${
                          liveSettingsForm.isLive
                            ? "border-white/15 bg-black/30 text-[#F2EDE8] placeholder:text-[#F2EDE8]/35"
                            : "border-black/10 bg-[#f7f6f4] text-[#111111]"
                        }`}
                      />
                    </div>

                    <div>
                      <label
                        className={`label-mono block ${
                          liveSettingsForm.isLive ? "text-[#F2EDE8]/70" : "text-[#111111]/65"
                        }`}
                      >
                        Live Video Call URL (HTTPS, Optional)
                      </label>
                      <input
                        type="url"
                        maxLength={BLUEPRINT_LIMITS.liveSettings.liveRoomUrl.max}
                        value={liveSettingsForm.liveRoomUrl}
                        onChange={(e) =>
                          setLiveSettingsForm((f) => ({ ...f, liveRoomUrl: e.target.value }))
                        }
                        placeholder="https://meet.google.com/... or Zoom link"
                        className={`mt-1.5 h-11 w-full rounded-lg border px-3.5 text-[14px] ${
                          liveSettingsForm.isLive
                            ? "border-white/15 bg-black/30 text-[#F2EDE8] placeholder:text-[#F2EDE8]/35"
                            : "border-black/10 bg-[#f7f6f4] text-[#111111]"
                        }`}
                      />
                    </div>

                    <div className="flex items-end pb-2">
                      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
                        <input
                          type="checkbox"
                          checked={liveSettingsForm.qaEnabled}
                          onChange={(e) =>
                            setLiveSettingsForm((f) => ({ ...f, qaEnabled: e.target.checked }))
                          }
                          className="h-4 w-4 accent-[#fe3619]"
                        />
                        <span>Open Live Q&amp;A Queue for attendee submissions</span>
                      </label>
                    </div>
                  </div>

                  {liveSettingsError && (
                    <p role="alert" className="mt-4 text-[13px] font-medium text-[#D94F2B]">
                      {liveSettingsError}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={savingLiveSettings}
                      className={`label-mono inline-flex min-h-[42px] cursor-pointer items-center rounded-xl px-5 py-2 transition-opacity hover:opacity-90 disabled:opacity-50 ${
                        liveSettingsForm.isLive
                          ? "bg-[#F2EDE8] text-[#1C1C1C]"
                          : "bg-[#111111] text-white"
                      }`}
                    >
                      {savingLiveSettings ? "Saving..." : "Save Companion Config"}
                    </button>
                  </div>
                </form>

                <div>
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
                          Registration URL (HTTPS)
                        </label>
                        <input
                          type="url"
                          maxLength={BLUEPRINT_LIMITS.session.registrationUrl.max}
                          value={sessionForm.registrationUrl}
                          onChange={(e) =>
                            setSessionForm((f) => ({ ...f, registrationUrl: e.target.value }))
                          }
                          placeholder="https://tally.so/r/9q8l55"
                          className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                        />
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
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
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
                </div>

                {/* Live Q&A Moderation Queue */}
                <div className="rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.08] pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-[#fe3619]">
                        <MessageSquare className="h-4 w-4" aria-hidden="true" />
                        <span className="label-mono">Live Q&amp;A Speaker Queue</span>
                      </div>
                      <h3 className="mt-1.5 text-[1.25rem] font-medium tracking-[-0.02em]">
                        Audience Questions ({sessionQuestions.filter((q) => !q.answered).length} Open)
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg border border-black/10 bg-[#f7f6f4] p-1">
                      <button
                        type="button"
                        onClick={() => setQaFilter("open")}
                        className={`label-mono cursor-pointer rounded-md px-3 py-1.5 transition-colors ${
                          qaFilter === "open"
                            ? "bg-[#111111] text-white"
                            : "text-[#111111]/65 hover:text-[#111111]"
                        }`}
                      >
                        Unanswered
                      </button>
                      <button
                        type="button"
                        onClick={() => setQaFilter("all")}
                        className={`label-mono cursor-pointer rounded-md px-3 py-1.5 transition-colors ${
                          qaFilter === "all"
                            ? "bg-[#111111] text-white"
                            : "text-[#111111]/65 hover:text-[#111111]"
                        }`}
                      >
                        All ({sessionQuestions.length})
                      </button>
                    </div>
                  </div>

                  {filteredQuestions.length === 0 ? (
                    <p className="py-8 text-center text-[14px] text-[#111111]/60">
                      {qaFilter === "open"
                        ? "No unanswered attendee questions in the queue."
                        : "No audience questions have been submitted yet."}
                    </p>
                  ) : (
                    <div className="divide-y divide-black/[0.08]">
                      {filteredQuestions.map((q) => {
                        const targetSession = sessions.find((s) => s.id === q.sessionId);
                        const sessionLabel =
                          q.sessionId === "live-lobby"
                            ? "Live Lobby"
                            : targetSession
                              ? targetSession.number
                              : q.sessionId;
                        return (
                          <article
                            key={q.id}
                            className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
                          >
                            <div className="max-w-[68ch]">
                              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.07em]">
                                <span className="text-[#fe3619] tabular-nums">
                                  {q.upvotes} ▲
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#111111]/65">{sessionLabel}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#111111]">{q.authorName}</span>
                                {q.answered && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-[#111111]/50">Answered</span>
                                  </>
                                )}
                              </div>
                              <p
                                className={`mt-1.5 text-[15px] leading-[1.55] ${
                                  q.answered ? "text-[#111111]/55 line-through" : "text-[#111111]"
                                }`}
                              >
                                {q.question}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await toggleQuestionAnswered(q);
                                    showToast(
                                      q.answered
                                        ? "Question reopened in queue."
                                        : "Marked answered on-air.",
                                    );
                                  } catch (err) {
                                    setActionError(formatFirestoreErrorMessage(err));
                                  }
                                }}
                                className="label-mono inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 py-2 text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{q.answered ? "Reopen" : "Mark Answered"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await removeSessionQuestion(q.id);
                                    showToast("Question removed.");
                                  } catch (err) {
                                    setActionError(formatFirestoreErrorMessage(err));
                                  }
                                }}
                                aria-label={`Delete question by ${q.authorName}`}
                                className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-lg border border-black/10 text-[#111111]/60 transition-colors hover:border-[#fe3619] hover:text-[#fe3619]"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
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

            {/* TAB 2B: WRAPPED MANAGEMENT */}
            {tab === "wrapped" && (
              <section className="mt-10 space-y-10">
                {/* Live Quick Switches Bar */}
                <div className="flex flex-col justify-between gap-6 rounded-2xl border border-black/[0.09] bg-[#1C1C1C] p-6 text-[#F2EDE8] sm:flex-row sm:items-center sm:p-8">
                  <div>
                    <div className="flex items-center gap-2 text-[#D94F2B]">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      <span className="label-mono">Year Wrapped Control</span>
                    </div>
                    <h2 className="mt-2 text-[1.45rem] font-medium tracking-[-0.02em]">
                      {wrappedSettingsForm.enabled
                        ? "Wrapped Deck is Live on /wrapped"
                        : "Countdown Lock Mode Active"}
                    </h2>
                    <p className="mt-1.5 max-w-[54ch] text-[14px] text-[#F2EDE8]/72">
                      {wrappedSettingsForm.enabled
                        ? "Visitors can step through interactive slides. Toggle off anytime to switch /wrapped and the Home spotlight to a live countdown."
                        : "Visitors see the countdown timer and community waitlist CTA until you flip Wrapped back on."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={savingWrappedSettings}
                      onClick={() =>
                        void handleSaveWrappedSettings(undefined, {
                          enabled: !wrappedSettingsForm.enabled,
                        })
                      }
                      className={`label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50 ${
                        wrappedSettingsForm.enabled
                          ? "bg-[#F2EDE8] text-[#1C1C1C]"
                          : "bg-[#D94F2B] text-[#F2EDE8]"
                      }`}
                    >
                      {wrappedSettingsForm.enabled ? "Switch to Countdown" : "Turn Wrapped On"}
                    </button>

                    <button
                      type="button"
                      disabled={savingWrappedSettings}
                      onClick={() =>
                        void handleSaveWrappedSettings(undefined, {
                          showHomeBanner: !wrappedSettingsForm.showHomeBanner,
                        })
                      }
                      className="label-mono inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border border-[#F2EDE8]/20 bg-[#1C1C1C] px-4 py-2.5 text-[#F2EDE8] transition-colors hover:bg-[#F2EDE8]/10 disabled:opacity-50"
                    >
                      {wrappedSettingsForm.showHomeBanner
                        ? "Hide Home Banner"
                        : "Show Home Banner"}
                    </button>
                  </div>
                </div>

                {/* Wrapped Global Settings & Copy Editor */}
                <form
                  onSubmit={(e) => void handleSaveWrappedSettings(e)}
                  className="rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.08] pb-4">
                    <div>
                      <h3 className="text-lg font-medium">
                        Display Mode, Home Countdown &amp; Copy
                      </h3>
                      <p className="mt-1 text-[13px] text-[#111111]/65">
                        Controls both `/wrapped` and the Home page spotlight/countdown module.
                      </p>
                    </div>
                    <Link
                      href="/wrapped"
                      target="_blank"
                      className="label-mono inline-flex items-center gap-1.5 text-[#111111]/75 hover:text-[#111111]"
                    >
                      <span>Open /wrapped</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
                      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
                        <input
                          type="checkbox"
                          checked={wrappedSettingsForm.enabled}
                          onChange={(e) =>
                            setWrappedSettingsForm((f) => ({ ...f, enabled: e.target.checked }))
                          }
                          className="h-4 w-4 accent-[#fe3619]"
                        />
                        <span>Wrapped Deck Enabled (uncheck for Countdown Lock Mode)</span>
                      </label>

                      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
                        <input
                          type="checkbox"
                          checked={wrappedSettingsForm.showHomeBanner}
                          onChange={(e) =>
                            setWrappedSettingsForm((f) => ({
                              ...f,
                              showHomeBanner: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 accent-[#fe3619]"
                        />
                        <span>Show Wrapped Spotlight / Countdown on Home page</span>
                      </label>
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">
                        Countdown Target Date &amp; Time (Local Picker)
                      </label>
                      <input
                        type="datetime-local"
                        value={isoToDatetimeLocalValue(wrappedSettingsForm.countdownTargetIso)}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (!raw) {
                            setWrappedSettingsForm((f) => ({ ...f, countdownTargetIso: "" }));
                            return;
                          }
                          const parsed = new Date(raw);
                          if (!Number.isNaN(parsed.getTime())) {
                            setWrappedSettingsForm((f) => ({
                              ...f,
                              countdownTargetIso: parsed.toISOString(),
                            }));
                          }
                        }}
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">
                        Default Story Auto-Play
                      </label>
                      <select
                        value={wrappedSettingsForm.autoplaySeconds}
                        onChange={(e) =>
                          setWrappedSettingsForm((f) => ({
                            ...f,
                            autoplaySeconds: Number(e.target.value) || 0,
                          }))
                        }
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      >
                        <option value={0}>Manual navigation (Auto-play Off)</option>
                        <option value={5}>Every 5 seconds</option>
                        <option value={7}>Every 7 seconds</option>
                        <option value={10}>Every 10 seconds</option>
                      </select>
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">
                        Page Title ({wrappedSettingsForm.pageTitle.length}/
                        {BLUEPRINT_LIMITS.wrappedSettings.pageTitle.max})
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={BLUEPRINT_LIMITS.wrappedSettings.pageTitle.max}
                        value={wrappedSettingsForm.pageTitle}
                        onChange={(e) =>
                          setWrappedSettingsForm((f) => ({ ...f, pageTitle: e.target.value }))
                        }
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">
                        Countdown Headline ({wrappedSettingsForm.countdownHeadline.length}/
                        {BLUEPRINT_LIMITS.wrappedSettings.countdownHeadline.max})
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={BLUEPRINT_LIMITS.wrappedSettings.countdownHeadline.max}
                        value={wrappedSettingsForm.countdownHeadline}
                        onChange={(e) =>
                          setWrappedSettingsForm((f) => ({
                            ...f,
                            countdownHeadline: e.target.value,
                          }))
                        }
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="label-mono block text-[#111111]/65">
                        Page Intro ({wrappedSettingsForm.pageIntro.length}/
                        {BLUEPRINT_LIMITS.wrappedSettings.pageIntro.max})
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={BLUEPRINT_LIMITS.wrappedSettings.pageIntro.max}
                        value={wrappedSettingsForm.pageIntro}
                        onChange={(e) =>
                          setWrappedSettingsForm((f) => ({ ...f, pageIntro: e.target.value }))
                        }
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="label-mono block text-[#111111]/65">
                        Countdown Subtext ({wrappedSettingsForm.countdownSubtext.length}/
                        {BLUEPRINT_LIMITS.wrappedSettings.countdownSubtext.max})
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={BLUEPRINT_LIMITS.wrappedSettings.countdownSubtext.max}
                        value={wrappedSettingsForm.countdownSubtext}
                        onChange={(e) =>
                          setWrappedSettingsForm((f) => ({
                            ...f,
                            countdownSubtext: e.target.value,
                          }))
                        }
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">
                        Closing Block Headline ({wrappedSettingsForm.closingHeadline.length}/
                        {BLUEPRINT_LIMITS.wrappedSettings.closingHeadline.max})
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={BLUEPRINT_LIMITS.wrappedSettings.closingHeadline.max}
                        value={wrappedSettingsForm.closingHeadline}
                        onChange={(e) =>
                          setWrappedSettingsForm((f) => ({
                            ...f,
                            closingHeadline: e.target.value,
                          }))
                        }
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">
                        Closing Block Body ({wrappedSettingsForm.closingBody.length}/
                        {BLUEPRINT_LIMITS.wrappedSettings.closingBody.max})
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={BLUEPRINT_LIMITS.wrappedSettings.closingBody.max}
                        value={wrappedSettingsForm.closingBody}
                        onChange={(e) =>
                          setWrappedSettingsForm((f) => ({ ...f, closingBody: e.target.value }))
                        }
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="label-mono block text-[#111111]/65">
                        Share Caption ({wrappedSettingsForm.shareCaption.length}/
                        {BLUEPRINT_LIMITS.wrappedSettings.shareCaption.max} · include [link] to
                        auto-insert URL)
                      </label>
                      <textarea
                        rows={2}
                        required
                        maxLength={BLUEPRINT_LIMITS.wrappedSettings.shareCaption.max}
                        value={wrappedSettingsForm.shareCaption}
                        onChange={(e) =>
                          setWrappedSettingsForm((f) => ({ ...f, shareCaption: e.target.value }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-black/10 bg-[#f7f6f4] p-3.5 text-[14px]"
                      />
                    </div>
                  </div>

                  {wrappedSettingsError && (
                    <p role="alert" className="mt-4 text-[13px] font-medium text-[#fe3619]">
                      {wrappedSettingsError}
                    </p>
                  )}

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={savingWrappedSettings}
                      className="label-mono inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-[#fe3619] px-6 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {savingWrappedSettings ? "Saving..." : "Save Wrapped Settings"}
                    </button>
                  </div>
                </form>

                {/* Wrapped Slide Deck Manager */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-[1.45rem] font-medium tracking-[-0.02em]">
                        Wrapped Slide Deck ({wrappedSlides.length} custom records)
                      </h3>
                      <p className="mt-1 text-[14px] text-[#111111]/65">
                        {wrappedSlides.length === 0
                          ? "Currently using the 12 default confirmed 2026 slides. Load them into Firestore to edit, reorder, or add new metrics."
                          : "Edit text, numbers, color themes (#1C1C1C dark vs #F2EDE8 cream), or reorder slides live."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        disabled={seedingWrappedSlides}
                        onClick={async () => {
                          setSeedingWrappedSlides(true);
                          try {
                            await seedDefaultWrappedSlides(wrappedSlides);
                            showToast("Loaded all 12 confirmed 2026 Wrapped slides into Firestore.");
                          } catch (err) {
                            setActionError(formatFirestoreErrorMessage(err));
                          } finally {
                            setSeedingWrappedSlides(false);
                          }
                        }}
                        className="label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-black/12 bg-[#efeeec] px-4 py-2.5 text-[#111111] transition-colors hover:bg-[#111111] hover:text-white disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {seedingWrappedSlides
                            ? "Loading..."
                            : wrappedSlides.length === 0
                              ? "Load 12 Confirmed Slides"
                              : "Restore 12 Defaults"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={startNewWrappedSlide}
                        className="label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-5 py-2.5 text-white transition-opacity hover:opacity-90"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span>Add Slide</span>
                      </button>
                    </div>
                  </div>

                  {wrappedSlideFormOpen && (
                    <form
                      onSubmit={(e) => void handleSaveWrappedSlide(e)}
                      className="mt-6 rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8"
                    >
                      <div className="flex items-center justify-between border-b border-black/[0.08] pb-4">
                        <h4 className="text-lg font-medium">
                          {wrappedSlideForm.id ? "Edit Wrapped Slide" : "Create Wrapped Slide"}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setWrappedSlideFormOpen(false)}
                          className="label-mono cursor-pointer text-[#111111]/60 hover:text-[#111111]"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="label-mono block text-[#111111]/65">
                              Chapter Tab Label
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={BLUEPRINT_LIMITS.wrappedSlide.label.max}
                              value={wrappedSlideForm.label}
                              onChange={(e) =>
                                setWrappedSlideForm((f) => ({ ...f, label: e.target.value }))
                              }
                              placeholder="Audience"
                              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                            />
                          </div>

                          <div>
                            <label className="label-mono block text-[#111111]/65">Order</label>
                            <input
                              type="number"
                              min={0}
                              max={BLUEPRINT_LIMITS.wrappedSlide.order.max}
                              required
                              value={wrappedSlideForm.order}
                              onChange={(e) =>
                                setWrappedSlideForm((f) => ({
                                  ...f,
                                  order: Number(e.target.value) || 0,
                                }))
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                            />
                          </div>

                          <div>
                            <label className="label-mono block text-[#111111]/65">
                              Slide Archetype
                            </label>
                            <select
                              value={wrappedSlideForm.kind}
                              onChange={(e) =>
                                setWrappedSlideForm((f) => ({
                                  ...f,
                                  kind: e.target.value as WrappedSlideKind,
                                }))
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                            >
                              <option value="cover">Cover</option>
                              <option value="statement">Statement / Story</option>
                              <option value="metric">Big Metric Counter</option>
                              <option value="sessions">Sessions List</option>
                              <option value="community">Community Breakdown</option>
                              <option value="cta">Closing CTA</option>
                            </select>
                          </div>

                          <div>
                            <label className="label-mono block text-[#111111]/65">
                              Color Theme
                            </label>
                            <select
                              value={wrappedSlideForm.theme}
                              onChange={(e) =>
                                setWrappedSlideForm((f) => ({
                                  ...f,
                                  theme: e.target.value as WrappedSlideTheme,
                                }))
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                            >
                              <option value="dark">Charcoal (#1C1C1C)</option>
                              <option value="cream">Cream (#F2EDE8)</option>
                            </select>
                          </div>

                          <div>
                            <label className="label-mono block text-[#111111]/65">
                              Eyebrow / Highlight 2
                            </label>
                            <input
                              type="text"
                              maxLength={BLUEPRINT_LIMITS.wrappedSlide.eyebrow.max}
                              value={wrappedSlideForm.eyebrow}
                              onChange={(e) =>
                                setWrappedSlideForm((f) => ({ ...f, eyebrow: e.target.value }))
                              }
                              placeholder="Optional lead-in or keyword"
                              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                            />
                          </div>

                          <div>
                            <label className="label-mono block text-[#111111]/65">
                              Orange Highlight Token / Date
                            </label>
                            <input
                              type="text"
                              maxLength={BLUEPRINT_LIMITS.wrappedSlide.accentDate.max}
                              value={wrappedSlideForm.accentDate}
                              onChange={(e) =>
                                setWrappedSlideForm((f) => ({ ...f, accentDate: e.target.value }))
                              }
                              placeholder="e.g. Nov 14 or Lagos"
                              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="label-mono block text-[#111111]/65">
                              Headline ({wrappedSlideForm.headline.length}/
                              {BLUEPRINT_LIMITS.wrappedSlide.headline.max})
                            </label>
                            <textarea
                              rows={2}
                              maxLength={BLUEPRINT_LIMITS.wrappedSlide.headline.max}
                              value={wrappedSlideForm.headline}
                              onChange={(e) =>
                                setWrappedSlideForm((f) => ({ ...f, headline: e.target.value }))
                              }
                              className="mt-1.5 w-full rounded-lg border border-black/10 bg-[#f7f6f4] p-3 text-[14px]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="label-mono block text-[#111111]/65">
                              Body / Stat Caption ({wrappedSlideForm.body.length}/
                              {BLUEPRINT_LIMITS.wrappedSlide.body.max})
                            </label>
                            <textarea
                              rows={2}
                              maxLength={BLUEPRINT_LIMITS.wrappedSlide.body.max}
                              value={wrappedSlideForm.body}
                              onChange={(e) =>
                                setWrappedSlideForm((f) => ({ ...f, body: e.target.value }))
                              }
                              className="mt-1.5 w-full rounded-lg border border-black/10 bg-[#f7f6f4] p-3 text-[14px]"
                            />
                          </div>

                          {(wrappedSlideForm.kind === "metric" ||
                            wrappedSlideForm.kind === "community") && (
                            <>
                              <div>
                                <label className="label-mono block text-[#111111]/65">
                                  Metric Prefix (e.g. ~)
                                </label>
                                <input
                                  type="text"
                                  maxLength={BLUEPRINT_LIMITS.wrappedSlide.metricPrefix.max}
                                  value={wrappedSlideForm.metricPrefix}
                                  onChange={(e) =>
                                    setWrappedSlideForm((f) => ({
                                      ...f,
                                      metricPrefix: e.target.value,
                                    }))
                                  }
                                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                                />
                              </div>

                              <div>
                                <label className="label-mono block text-[#111111]/65">
                                  Primary Metric Number
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={BLUEPRINT_LIMITS.wrappedSlide.metricValue.max}
                                  value={wrappedSlideForm.metricValue}
                                  onChange={(e) =>
                                    setWrappedSlideForm((f) => ({
                                      ...f,
                                      metricValue: Number(e.target.value) || 0,
                                    }))
                                  }
                                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                                />
                              </div>

                              <div>
                                <label className="label-mono block text-[#111111]/65">
                                  Metric Suffix (e.g. +)
                                </label>
                                <input
                                  type="text"
                                  maxLength={BLUEPRINT_LIMITS.wrappedSlide.metricSuffix.max}
                                  value={wrappedSlideForm.metricSuffix}
                                  onChange={(e) =>
                                    setWrappedSlideForm((f) => ({
                                      ...f,
                                      metricSuffix: e.target.value,
                                    }))
                                  }
                                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                                />
                              </div>
                            </>
                          )}

                          {(wrappedSlideForm.kind === "community" ||
                            wrappedSlideForm.kind === "statement") && (
                            <>
                              <div>
                                <label className="label-mono block text-[#111111]/65">
                                  {wrappedSlideForm.kind === "statement"
                                    ? "Progress Bar % (0 = hidden)"
                                    : "Breakdown A Value"}
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={BLUEPRINT_LIMITS.wrappedSlide.secondaryMetricA.max}
                                  value={wrappedSlideForm.secondaryMetricA}
                                  onChange={(e) =>
                                    setWrappedSlideForm((f) => ({
                                      ...f,
                                      secondaryMetricA: Number(e.target.value) || 0,
                                    }))
                                  }
                                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                                />
                              </div>
                            </>
                          )}

                          {wrappedSlideForm.kind === "community" && (
                            <>
                              <div>
                                <label className="label-mono block text-[#111111]/65">
                                  Breakdown A Label
                                </label>
                                <input
                                  type="text"
                                  maxLength={BLUEPRINT_LIMITS.wrappedSlide.secondaryLabelA.max}
                                  value={wrappedSlideForm.secondaryLabelA}
                                  onChange={(e) =>
                                    setWrappedSlideForm((f) => ({
                                      ...f,
                                      secondaryLabelA: e.target.value,
                                    }))
                                  }
                                  placeholder="are students."
                                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                                />
                              </div>

                              <div>
                                <label className="label-mono block text-[#111111]/65">
                                  Breakdown B Value
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={BLUEPRINT_LIMITS.wrappedSlide.secondaryMetricB.max}
                                  value={wrappedSlideForm.secondaryMetricB}
                                  onChange={(e) =>
                                    setWrappedSlideForm((f) => ({
                                      ...f,
                                      secondaryMetricB: Number(e.target.value) || 0,
                                    }))
                                  }
                                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                                />
                              </div>

                              <div>
                                <label className="label-mono block text-[#111111]/65">
                                  Breakdown B Label
                                </label>
                                <input
                                  type="text"
                                  maxLength={BLUEPRINT_LIMITS.wrappedSlide.secondaryLabelB.max}
                                  value={wrappedSlideForm.secondaryLabelB}
                                  onChange={(e) =>
                                    setWrappedSlideForm((f) => ({
                                      ...f,
                                      secondaryLabelB: e.target.value,
                                    }))
                                  }
                                  placeholder="are professionals."
                                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                                />
                              </div>
                            </>
                          )}

                          {wrappedSlideForm.kind === "sessions" && (
                            <div className="sm:col-span-2">
                              <label className="label-mono block text-[#111111]/65">
                                Session Lines (1 per line, use Date :: Title format, max{" "}
                                {BLUEPRINT_LIMITS.wrappedSlide.maxItems})
                              </label>
                              <textarea
                                rows={4}
                                value={wrappedSlideItemsText}
                                onChange={(e) => setWrappedSlideItemsText(e.target.value)}
                                placeholder="Apr 18 :: Building Your Name Before You Build Buildings, with Sana Tabassum"
                                className="mt-1.5 w-full rounded-lg border border-black/10 bg-[#f7f6f4] p-3 font-mono text-[12.5px]"
                              />
                            </div>
                          )}

                          {wrappedSlideForm.kind === "cta" && (
                            <div>
                              <label className="label-mono block text-[#111111]/65">
                                CTA Button Label
                              </label>
                              <input
                                type="text"
                                maxLength={BLUEPRINT_LIMITS.wrappedSlide.ctaLabel.max}
                                value={wrappedSlideForm.ctaLabel}
                                onChange={(e) =>
                                  setWrappedSlideForm((f) => ({ ...f, ctaLabel: e.target.value }))
                                }
                                placeholder="Join the community"
                                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                              />
                            </div>
                          )}

                          <div className="sm:col-span-2">
                            <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
                              <input
                                type="checkbox"
                                checked={wrappedSlideForm.published}
                                onChange={(e) =>
                                  setWrappedSlideForm((f) => ({
                                    ...f,
                                    published: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 accent-[#fe3619]"
                              />
                              <span>Published in live deck</span>
                            </label>
                          </div>
                        </div>

                        {/* Live Slide Miniature Card Preview */}
                        <div className="flex flex-col justify-between rounded-xl border border-black/10 bg-[#f7f6f4] p-4">
                          <p className="label-mono text-[#111111]/55">Live Card Preview</p>
                          <div
                            className={`mt-3 flex min-h-[220px] flex-col justify-between rounded-lg border p-5 ${
                              wrappedSlideForm.theme === "dark"
                                ? "border-white/10 bg-[#1C1C1C] text-[#F2EDE8]"
                                : "border-black/10 bg-[#F2EDE8] text-[#1C1C1C]"
                            }`}
                          >
                            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.08em] uppercase opacity-70">
                              <span>{wrappedSlideForm.label || "Slide"}</span>
                              <span className="text-[#D94F2B]">{wrappedSlideForm.kind}</span>
                            </div>

                            <div className="my-4">
                              {(wrappedSlideForm.kind === "metric" ||
                                wrappedSlideForm.kind === "community") && (
                                <p className="text-[2.4rem] font-bold leading-none text-[#D94F2B]">
                                  {wrappedSlideForm.metricPrefix}
                                  {wrappedSlideForm.metricValue}
                                  {wrappedSlideForm.metricSuffix}
                                </p>
                              )}
                              {wrappedSlideForm.headline && (
                                <p className="mt-2 text-[1.1rem] font-medium leading-snug">
                                  {wrappedSlideForm.headline}
                                </p>
                              )}
                              {wrappedSlideForm.body && (
                                <p className="mt-2 text-[13px] opacity-80">
                                  {wrappedSlideForm.body}
                                </p>
                              )}
                            </div>

                            <div className="h-[2px] w-12 bg-[#D94F2B]" />
                          </div>
                          <p className="mt-3 font-mono text-[11px] text-[#111111]/55">
                            Theme:{" "}
                            {wrappedSlideForm.theme === "dark"
                              ? "Charcoal #1C1C1C + Orange"
                              : "Cream #F2EDE8 + Charcoal"}
                          </p>
                        </div>
                      </div>

                      {wrappedSlideError && (
                        <p role="alert" className="mt-4 text-[13px] font-medium text-[#fe3619]">
                          {wrappedSlideError}
                        </p>
                      )}

                      <div className="mt-6">
                        <button
                          type="submit"
                          disabled={savingWrappedSlide}
                          className="label-mono inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-[#fe3619] px-6 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {savingWrappedSlide ? "Saving..." : "Save Wrapped Slide"}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="mt-6 border-t border-black/[0.09]">
                    {wrappedSlides.length === 0 ? (
                      <div className="py-12 text-center text-[15px] text-[#111111]/60">
                        No custom slides in Firestore yet. Click &ldquo;Load 12 Confirmed Slides&rdquo;
                        above to import the live 2026 deck for editing, or click &ldquo;Add Slide&rdquo;.
                      </div>
                    ) : (
                      wrappedSlides.map((slide, idx) => (
                        <article
                          key={slide.id}
                          className="flex flex-col justify-between gap-4 border-b border-black/[0.09] py-5 lg:flex-row lg:items-center"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border font-mono text-[12px] font-bold tabular-nums ${
                                slide.theme === "dark"
                                  ? "border-black/20 bg-[#1C1C1C] text-[#D94F2B]"
                                  : "border-black/15 bg-[#F2EDE8] text-[#1C1C1C]"
                              }`}
                            >
                              {String(idx + 1).padStart(2, "0")}
                            </div>

                            <div className="max-w-[66ch]">
                              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.07em]">
                                <span className="text-[#fe3619]">{slide.label}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#111111]/60">{slide.kind}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#111111]/60">
                                  {slide.theme === "dark" ? "#1C1C1C" : "#F2EDE8"}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={
                                    slide.published ? "text-[#111111]" : "text-[#111111]/45"
                                  }
                                >
                                  {slide.published ? "Published" : "Hidden"}
                                </span>
                              </div>
                              <p className="mt-1.5 text-[15px] font-medium text-[#111111]">
                                {slide.kind === "metric" || slide.kind === "community"
                                  ? `${slide.metricPrefix}${slide.metricValue}${slide.metricSuffix} — ${slide.body}`
                                  : slide.headline || slide.body || `${slide.items.length} items`}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              aria-label={`Move ${slide.label} up`}
                              onClick={async () => {
                                try {
                                  await swapWrappedSlideOrder(slide, wrappedSlides[idx - 1]);
                                  showToast(`Moved "${slide.label}" up.`);
                                } catch (err) {
                                  setActionError(formatFirestoreErrorMessage(err));
                                }
                              }}
                              className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-[#f7f6f4] text-[#111111] transition-colors hover:bg-[#efeeec] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              disabled={idx === wrappedSlides.length - 1}
                              aria-label={`Move ${slide.label} down`}
                              onClick={async () => {
                                try {
                                  await swapWrappedSlideOrder(slide, wrappedSlides[idx + 1]);
                                  showToast(`Moved "${slide.label}" down.`);
                                } catch (err) {
                                  setActionError(formatFirestoreErrorMessage(err));
                                }
                              }}
                              className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-[#f7f6f4] text-[#111111] transition-colors hover:bg-[#efeeec] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await toggleWrappedSlidePublished(slide);
                                  showToast(
                                    slide.published ? "Slide hidden." : "Slide published.",
                                  );
                                } catch (err) {
                                  setActionError(formatFirestoreErrorMessage(err));
                                }
                              }}
                              className="label-mono inline-flex min-h-[38px] cursor-pointer items-center rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 py-2 text-[#111111] transition-colors hover:bg-[#efeeec]"
                            >
                              {slide.published ? "Hide" : "Publish"}
                            </button>

                            <button
                              type="button"
                              onClick={() => startEditWrappedSlide(slide)}
                              className="label-mono inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 py-2 text-[#111111] transition-colors hover:bg-[#efeeec]"
                            >
                              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Edit</span>
                            </button>

                            {confirmDeleteId === slide.id ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await removeWrappedSlide(slide.id);
                                    setConfirmDeleteId(null);
                                    showToast("Slide deleted.");
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
                                onClick={() => setConfirmDeleteId(slide.id)}
                                aria-label={`Delete ${slide.label}`}
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
                </div>
              </section>
            )}

            {/* TAB 3: SUBSCRIBERS */}
            {tab === "subscribers" && (
              <section className="mt-10">
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

            {/* TAB 4: ANNOUNCEMENT BAR & PUBLIC CHANNELS */}
            {tab === "settings" && (
              <section className="mt-10 max-w-[780px] space-y-8">
                {/* Site-Wide Announcement Bar Control */}
                <form
                  onSubmit={(e) =>
                    void handleSaveLiveSettings(
                      e,
                      undefined,
                      "Site-wide announcement bar updated.",
                    )
                  }
                  className="rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.08] pb-5">
                    <div>
                      <div className="flex items-center gap-2 text-[#fe3619]">
                        <Megaphone className="h-4 w-4" aria-hidden="true" />
                        <span className="label-mono">Header Top Notice</span>
                      </div>
                      <h2 className="mt-2 text-xl font-medium tracking-[-0.02em]">
                        Site-Wide Announcement Bar
                      </h2>
                      <p className="mt-1 text-[14px] leading-relaxed text-[#111111]/70">
                        Display a subtle single-line notice directly above the floating site header
                        (for next session registration, Year Wrapped, or deadlines).
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={savingLiveSettings}
                      onClick={() =>
                        void handleSaveLiveSettings(
                          undefined,
                          { announcementEnabled: !liveSettingsForm.announcementEnabled },
                          !liveSettingsForm.announcementEnabled
                            ? "Announcement bar turned ON."
                            : "Announcement bar hidden.",
                        )
                      }
                      className={`label-mono inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
                        liveSettingsForm.announcementEnabled ? "bg-[#fe3619]" : "bg-[#111111]"
                      }`}
                    >
                      <span>
                        {liveSettingsForm.announcementEnabled ? "Bar: Active" : "Bar: Off"}
                      </span>
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium">
                        <input
                          type="checkbox"
                          checked={liveSettingsForm.announcementEnabled}
                          onChange={(e) =>
                            setLiveSettingsForm((f) => ({
                              ...f,
                              announcementEnabled: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 accent-[#fe3619]"
                        />
                        <span>Show subtle announcement bar above the header</span>
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="label-mono block text-[#111111]/65">
                        Notice Copy ({liveSettingsForm.announcementText.length}/
                        {BLUEPRINT_LIMITS.liveSettings.announcementText.max})
                      </label>
                      <input
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.liveSettings.announcementText.max}
                        value={liveSettingsForm.announcementText}
                        onChange={(e) =>
                          setLiveSettingsForm((f) => ({
                            ...f,
                            announcementText: e.target.value,
                          }))
                        }
                        placeholder="Next Think Session registration is open — reserve your seat."
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">
                        Link Label (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.liveSettings.announcementLinkLabel.max}
                        value={liveSettingsForm.announcementLinkLabel}
                        onChange={(e) =>
                          setLiveSettingsForm((f) => ({
                            ...f,
                            announcementLinkLabel: e.target.value,
                          }))
                        }
                        placeholder="Reserve seat"
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="label-mono block text-[#111111]/65">
                        Link Target (/path or https://...)
                      </label>
                      <input
                        type="text"
                        maxLength={BLUEPRINT_LIMITS.liveSettings.announcementLinkHref.max}
                        value={liveSettingsForm.announcementLinkHref}
                        onChange={(e) =>
                          setLiveSettingsForm((f) => ({
                            ...f,
                            announcementLinkHref: e.target.value,
                          }))
                        }
                        placeholder="/sessions or https://tally.so/..."
                        className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                      />
                    </div>

                    {liveSettingsForm.announcementText.trim() && (
                      <div className="sm:col-span-2">
                        <p className="label-mono mb-2 text-[#111111]/55">Header Preview</p>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/15 bg-[#1C1C1C] px-4 py-2 text-[12.5px] text-[#F2EDE8]">
                          <div className="flex min-w-0 items-center gap-2">
                            <Megaphone
                              className="h-3.5 w-3.5 shrink-0 text-[#D94F2B]"
                              aria-hidden="true"
                            />
                            <span className="truncate text-[#F2EDE8]/90">
                              {liveSettingsForm.announcementText}
                            </span>
                            {liveSettingsForm.announcementLinkLabel.trim() &&
                              liveSettingsForm.announcementLinkHref.trim() && (
                                <span className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.07em] text-[#D94F2B]">
                                  {liveSettingsForm.announcementLinkLabel}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {liveSettingsError && (
                    <p role="alert" className="mt-4 text-[13px] font-medium text-[#fe3619]">
                      {liveSettingsError}
                    </p>
                  )}

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={savingLiveSettings}
                      className="label-mono inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-[#fe3619] px-6 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {savingLiveSettings ? "Saving..." : "Save Announcement Bar"}
                    </button>
                  </div>
                </form>

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
