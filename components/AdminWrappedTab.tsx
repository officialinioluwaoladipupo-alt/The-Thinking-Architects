"use client";

import {
  CalendarClock,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  BLUEPRINT_LIMITS,
  DEFAULT_WRAPPED_CONFIG,
  saveWrappedConfig,
  validateWrappedConfigInput,
  type WrappedConfigInput,
} from "../lib/firebaseContent";
import { WrappedBannerCard } from "./WrappedHomeBanner";

type AdminWrappedTabProps = {
  form: WrappedConfigInput;
  setForm: React.Dispatch<React.SetStateAction<WrappedConfigInput>>;
  onSaved: (message: string) => void;
};

function isoToLocalInputValue(iso: string): string {
  if (!iso || !iso.trim()) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function localInputValueToIso(localVal: string): string {
  if (!localVal || !localVal.trim()) return "";
  const d = new Date(localVal);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export default function AdminWrappedTab({ form, setForm, onSaved }: AdminWrappedTabProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newCity, setNewCity] = useState("");

  const L = BLUEPRINT_LIMITS.wrapped;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErr = validateWrappedConfigInput(form);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setError("");
    setSaving(true);
    try {
      await saveWrappedConfig(form);
      onSaved("Wrapped configuration saved to Firestore.");
    } catch (err) {
      setError(formatFirestoreErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleQuickToggle = async (
    field: "enabled" | "showInFooter" | "homeBannerEnabled" | "homeCountdownEnabled",
    label: string,
  ) => {
    const next = { ...form, [field]: !form[field] };
    setForm(next);
    setError("");
    setSaving(true);
    try {
      await saveWrappedConfig(next);
      onSaved(`${label} ${next[field] ? "enabled" : "turned off"}.`);
    } catch (err) {
      setError(formatFirestoreErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Highlight rows helpers ("Date | Title")
  const parsedHighlights = form.sessionHighlights.map((raw) => {
    const idx = raw.indexOf("|");
    if (idx === -1) return { date: "Session", title: raw.trim() };
    return { date: raw.slice(0, idx).trim(), title: raw.slice(idx + 1).trim() };
  });

  const updateHighlightRow = (idx: number, date: string, title: string) => {
    const next = [...parsedHighlights];
    next[idx] = { date, title };
    setForm((f) => ({
      ...f,
      sessionHighlights: next.map((row) =>
        `${row.date.trim()} | ${row.title.trim()}`.slice(0, L.sessionHighlightMaxLength),
      ),
    }));
  };

  const addHighlightRow = () => {
    if (form.sessionHighlights.length >= L.maxSessionHighlights) return;
    setForm((f) => ({
      ...f,
      sessionHighlights: [...f.sessionHighlights, "Dec 12 | New Think Session highlight"],
    }));
  };

  const removeHighlightRow = (idx: number) => {
    if (form.sessionHighlights.length <= 1) return;
    setForm((f) => ({
      ...f,
      sessionHighlights: f.sessionHighlights.filter((_, i) => i !== idx),
    }));
  };

  // Custom Stat rows helpers ("Value | Label | Detail")
  const parsedCustomStats = form.customStats.map((raw) => {
    const parts = raw.split("|");
    return {
      value: (parts[0] ?? "").trim(),
      label: (parts[1] ?? "").trim(),
      detail: parts.slice(2).join("|").trim(),
    };
  });

  const updateCustomStatRow = (idx: number, value: string, label: string, detail: string) => {
    const next = [...parsedCustomStats];
    next[idx] = { value, label, detail };
    setForm((f) => ({
      ...f,
      customStats: next.map((row) =>
        `${row.value.trim()} | ${row.label.trim()} | ${row.detail.trim()}`.slice(
          0,
          L.customStatMaxLength,
        ),
      ),
    }));
  };

  const addCustomStatRow = () => {
    if (form.customStats.length >= L.maxCustomStats) return;
    setForm((f) => ({
      ...f,
      customStats: [...f.customStats, "12 | Live Sessions | Hosted monthly across the year"],
    }));
  };

  const removeCustomStatRow = (idx: number) => {
    setForm((f) => ({
      ...f,
      customStats: f.customStats.filter((_, i) => i !== idx),
    }));
  };

  const addExtraCity = () => {
    const clean = newCity.trim().slice(0, L.extraLocationMaxLength);
    if (!clean) return;
    if (form.extraLocations.length >= L.maxExtraLocations) return;
    if (form.extraLocations.includes(clean)) {
      setNewCity("");
      return;
    }
    setForm((f) => ({ ...f, extraLocations: [...f.extraLocations, clean] }));
    setNewCity("");
  };

  return (
    <section className="mt-10 space-y-8">
      {/* Header & Instant Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6">
        <div>
          <div className="flex items-center gap-2 text-[#fe3619]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span className="label-mono">Wrapped Console · Primary Firestore</span>
          </div>
          <h2 className="mt-1.5 text-[1.45rem] font-medium tracking-[-0.02em]">
            Manage {form.yearLabel || "2026"} Year Wrapped &amp; Home Countdown
          </h2>
          <p className="mt-1 text-[13.5px] text-[#111111]/68">
            Toggle the /wrapped page live or offline, control the Home page countdown banner, edit
            every slide, and add custom milestone stats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/wrapped"
            target="_blank"
            className="label-mono inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-black/12 bg-[#f7f6f4] px-4 py-2 text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
          >
            <span>Preview /wrapped</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => {
              setForm(DEFAULT_WRAPPED_CONFIG);
              setError("");
            }}
            className="label-mono inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-xl border border-black/12 bg-[#f7f6f4] px-4 py-2 text-[#111111] transition-colors hover:bg-black/5"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Quick Toggle Switches */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleQuickToggle("enabled", "Wrapped page")}
          className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            form.enabled
              ? "border-[#111111] bg-[#111111] text-white"
              : "border-black/12 bg-[#efeeec] text-[#111111]"
          }`}
        >
          <div>
            <p className="label-mono opacity-70">Wrapped Page</p>
            <p className="mt-1 text-[15px] font-medium">
              {form.enabled ? "Live on /wrapped" : "Turned Off"}
            </p>
          </div>
          {form.enabled ? (
            <Eye className="h-5 w-5 text-[#fe3619]" aria-hidden="true" />
          ) : (
            <EyeOff className="h-5 w-5 opacity-55" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleQuickToggle("homeBannerEnabled", "Home page banner")}
          className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            form.homeBannerEnabled
              ? "border-[#111111] bg-[#111111] text-white"
              : "border-black/12 bg-[#efeeec] text-[#111111]"
          }`}
        >
          <div>
            <p className="label-mono opacity-70">Home Page Banner</p>
            <p className="mt-1 text-[15px] font-medium">
              {form.homeBannerEnabled ? "Visible on Home" : "Hidden on Home"}
            </p>
          </div>
          <Check
            className={`h-5 w-5 ${form.homeBannerEnabled ? "text-[#fe3619]" : "opacity-25"}`}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleQuickToggle("homeCountdownEnabled", "Home countdown")}
          className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            form.homeCountdownEnabled
              ? "border-[#111111] bg-[#111111] text-white"
              : "border-black/12 bg-[#efeeec] text-[#111111]"
          }`}
        >
          <div>
            <p className="label-mono opacity-70">Countdown Clock</p>
            <p className="mt-1 text-[15px] font-medium">
              {form.homeCountdownEnabled ? "Countdown Active" : "Countdown Off"}
            </p>
          </div>
          <CalendarClock
            className={`h-5 w-5 ${form.homeCountdownEnabled ? "text-[#fe3619]" : "opacity-45"}`}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleQuickToggle("showInFooter", "Footer Wrapped link")}
          className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-colors ${
            form.showInFooter
              ? "border-[#111111] bg-[#111111] text-white"
              : "border-black/12 bg-[#efeeec] text-[#111111]"
          }`}
        >
          <div>
            <p className="label-mono opacity-70">Footer Nav Link</p>
            <p className="mt-1 text-[15px] font-medium">
              {form.showInFooter ? "Shown in Footer" : "Hidden in Footer"}
            </p>
          </div>
          <Check
            className={`h-5 w-5 ${form.showInFooter ? "text-[#fe3619]" : "opacity-25"}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Live Preview of Home Banner */}
      {form.homeBannerEnabled && (
        <div className="space-y-2.5">
          <p className="label-mono text-[#111111]/60">Live Home Page Banner Preview</p>
          <WrappedBannerCard config={form} isAdminPreview />
        </div>
      )}

      {/* Full Editor Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. Home Banner, Countdown & Offline Mode */}
        <div className="rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8">
          <h3 className="text-lg font-medium tracking-[-0.02em]">
            1. Home Page Banner, Countdown &amp; Offline Holding Screen
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-mono block text-[#111111]/65">Home Banner Eyebrow</label>
              <input
                type="text"
                required
                maxLength={L.homeBannerEyebrow.max}
                value={form.homeBannerEyebrow}
                onChange={(e) => setForm((f) => ({ ...f, homeBannerEyebrow: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Home Banner CTA Label</label>
              <input
                type="text"
                required
                maxLength={L.homeBannerCtaLabel.max}
                value={form.homeBannerCtaLabel}
                onChange={(e) => setForm((f) => ({ ...f, homeBannerCtaLabel: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Home Banner Headline</label>
              <input
                type="text"
                required
                maxLength={L.homeBannerTitle.max}
                value={form.homeBannerTitle}
                onChange={(e) => setForm((f) => ({ ...f, homeBannerTitle: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Countdown Target Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={isoToLocalInputValue(form.launchDateIso)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, launchDateIso: localInputValueToIso(e.target.value) }))
                }
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Offline Headline (when Wrapped is OFF)
              </label>
              <input
                type="text"
                required
                maxLength={L.offlineTitle.max}
                value={form.offlineTitle}
                onChange={(e) => setForm((f) => ({ ...f, offlineTitle: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Offline Message (when Wrapped is OFF)
              </label>
              <input
                type="text"
                required
                maxLength={L.offlineMessage.max}
                value={form.offlineMessage}
                onChange={(e) => setForm((f) => ({ ...f, offlineMessage: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>
          </div>
        </div>

        {/* 2. Page Header & Share Caption */}
        <div className="rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8">
          <h3 className="text-lg font-medium tracking-[-0.02em]">
            2. Page Header, Year Label &amp; Share Caption
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-mono block text-[#111111]/65">Year Label (e.g. 2026)</label>
              <input
                type="text"
                required
                maxLength={L.yearLabel.max}
                value={form.yearLabel}
                onChange={(e) => setForm((f) => ({ ...f, yearLabel: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Eyebrow</label>
              <input
                type="text"
                required
                maxLength={L.eyebrow.max}
                value={form.eyebrow}
                onChange={(e) => setForm((f) => ({ ...f, eyebrow: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Page Title</label>
              <input
                type="text"
                required
                maxLength={L.pageTitle.max}
                value={form.pageTitle}
                onChange={(e) => setForm((f) => ({ ...f, pageTitle: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Page Subtitle</label>
              <input
                type="text"
                required
                maxLength={L.pageSubtitle.max}
                value={form.pageSubtitle}
                onChange={(e) => setForm((f) => ({ ...f, pageSubtitle: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label-mono block text-[#111111]/65">
                Share Caption ({form.shareCaption.length}/{L.shareCaption.max})
              </label>
              <textarea
                rows={2}
                required
                maxLength={L.shareCaption.max}
                value={form.shareCaption}
                onChange={(e) => setForm((f) => ({ ...f, shareCaption: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-black/10 bg-[#f7f6f4] p-3.5 text-[14px]"
              />
            </div>
          </div>
        </div>

        {/* 3. Numbers & Audience Metrics */}
        <div className="rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8">
          <h3 className="text-lg font-medium tracking-[-0.02em]">
            3. Numbers &amp; Community Breakdown
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label-mono block text-[#111111]/65">Registrations Count</label>
              <input
                type="number"
                min={0}
                max={10000000}
                required
                value={form.audienceCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, audienceCount: Number(e.target.value) || 0 }))
                }
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 font-mono text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Prefix (e.g. ~)</label>
              <input
                type="text"
                maxLength={L.prefixSuffixMax}
                value={form.audiencePrefix}
                onChange={(e) => setForm((f) => ({ ...f, audiencePrefix: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 font-mono text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Suffix (e.g. +)</label>
              <input
                type="text"
                maxLength={L.prefixSuffixMax}
                value={form.audienceSuffix}
                onChange={(e) => setForm((f) => ({ ...f, audienceSuffix: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 font-mono text-[14px]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="label-mono block text-[#111111]/65">Audience Caption</label>
              <input
                type="text"
                required
                maxLength={L.audienceCaption.max}
                value={form.audienceCaption}
                onChange={(e) => setForm((f) => ({ ...f, audienceCaption: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Returning Count</label>
              <input
                type="number"
                min={0}
                max={10000000}
                required
                value={form.returningCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, returningCount: Number(e.target.value) || 0 }))
                }
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 font-mono text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Returning Suffix</label>
              <input
                type="text"
                maxLength={L.prefixSuffixMax}
                value={form.returningSuffix}
                onChange={(e) => setForm((f) => ({ ...f, returningSuffix: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 font-mono text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Returning Caption</label>
              <input
                type="text"
                required
                maxLength={L.returningCaption.max}
                value={form.returningCaption}
                onChange={(e) => setForm((f) => ({ ...f, returningCaption: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Community Total</label>
              <input
                type="number"
                min={0}
                max={10000000}
                required
                value={form.communityTotal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, communityTotal: Number(e.target.value) || 0 }))
                }
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 font-mono text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Students Count</label>
              <input
                type="number"
                min={0}
                max={10000000}
                required
                value={form.studentsCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, studentsCount: Number(e.target.value) || 0 }))
                }
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 font-mono text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Professionals Count</label>
              <input
                type="number"
                min={0}
                max={10000000}
                required
                value={form.professionalsCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, professionalsCount: Number(e.target.value) || 0 }))
                }
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 font-mono text-[14px]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="label-mono block text-[#111111]/65">Community Caption</label>
              <input
                type="text"
                required
                maxLength={L.communityCaption.max}
                value={form.communityCaption}
                onChange={(e) => setForm((f) => ({ ...f, communityCaption: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Discovery Highlight</label>
              <input
                type="text"
                required
                maxLength={L.discoveryHighlight.max}
                value={form.discoveryHighlight}
                onChange={(e) => setForm((f) => ({ ...f, discoveryHighlight: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Discovery Body</label>
              <input
                type="text"
                required
                maxLength={L.discoveryBody.max}
                value={form.discoveryBody}
                onChange={(e) => setForm((f) => ({ ...f, discoveryBody: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Discovery Bar ({form.discoveryPercent}%)
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={form.discoveryPercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discoveryPercent: Number(e.target.value) || 50 }))
                }
                className="mt-4 w-full accent-[#fe3619]"
              />
            </div>
          </div>
        </div>

        {/* 4. Session Highlights, Locations & Custom Data */}
        <div className="rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8">
          <h3 className="text-lg font-medium tracking-[-0.02em]">
            4. Session Highlights, Locations &amp; Custom Milestones
          </h3>

          {/* Session Highlights */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="label-mono text-[#111111]/65">
                Slide 05 · Session Highlights ({form.sessionHighlights.length}/
                {L.maxSessionHighlights})
              </label>
              <button
                type="button"
                disabled={form.sessionHighlights.length >= L.maxSessionHighlights}
                onClick={addHighlightRow}
                className="label-mono inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/12 bg-[#f7f6f4] px-3 py-1.5 text-[#111111] hover:bg-white disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add Session</span>
              </button>
            </div>

            <div className="mt-3">
              <label className="label-mono block text-[#111111]/55">Sessions Slide Heading</label>
              <input
                type="text"
                required
                maxLength={L.sessionsHeading.max}
                value={form.sessionsHeading}
                onChange={(e) => setForm((f) => ({ ...f, sessionsHeading: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div className="mt-3 space-y-2.5">
              {parsedHighlights.map((row, idx) => (
                <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={row.date}
                    onChange={(e) => updateHighlightRow(idx, e.target.value, row.title)}
                    placeholder="Apr 18"
                    className="h-10 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3 font-mono text-[13px] sm:w-32"
                  />
                  <input
                    type="text"
                    value={row.title}
                    onChange={(e) => updateHighlightRow(idx, row.date, e.target.value)}
                    placeholder="Session title & speaker"
                    className="h-10 flex-1 rounded-lg border border-black/10 bg-[#f7f6f4] px-3 text-[13.5px]"
                  />
                  <button
                    type="button"
                    disabled={parsedHighlights.length <= 1}
                    onClick={() => removeHighlightRow(idx)}
                    aria-label="Remove highlight"
                    className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-[#f7f6f4] text-[#111111]/60 hover:text-[#fe3619] disabled:opacity-35"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div className="mt-7 border-t border-black/[0.08] pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label-mono block text-[#111111]/65">Locations Intro</label>
                <input
                  type="text"
                  required
                  maxLength={L.locationsLead.max}
                  value={form.locationsLead}
                  onChange={(e) => setForm((f) => ({ ...f, locationsLead: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                />
              </div>
              <div>
                <label className="label-mono block text-[#111111]/65">Top City / State</label>
                <input
                  type="text"
                  required
                  maxLength={L.locationPrimary.max}
                  value={form.locationPrimary}
                  onChange={(e) => setForm((f) => ({ ...f, locationPrimary: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                />
              </div>
              <div>
                <label className="label-mono block text-[#111111]/65">Second City / State</label>
                <input
                  type="text"
                  maxLength={L.locationSecondary.max}
                  value={form.locationSecondary}
                  onChange={(e) => setForm((f) => ({ ...f, locationSecondary: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="label-mono block text-[#111111]/65">
                Extra Cities / Chapters ({form.extraLocations.length}/{L.maxExtraLocations})
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.extraLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-[#f7f6f4] px-3 py-1.5 font-mono text-[12px]"
                  >
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          extraLocations: f.extraLocations.filter((c) => c !== loc),
                        }))
                      }
                      aria-label={`Remove ${loc}`}
                      className="cursor-pointer text-[#111111]/50 hover:text-[#fe3619]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  value={newCity}
                  maxLength={L.extraLocationMaxLength}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addExtraCity();
                    }
                  }}
                  placeholder="Add city (e.g. Abuja, Rivers, Enugu)"
                  className="h-10 max-w-xs flex-1 rounded-lg border border-black/10 bg-[#f7f6f4] px-3 text-[13.5px]"
                />
                <button
                  type="button"
                  onClick={addExtraCity}
                  disabled={form.extraLocations.length >= L.maxExtraLocations}
                  className="label-mono cursor-pointer rounded-lg border border-black/12 bg-[#f7f6f4] px-4 text-[#111111] hover:bg-white disabled:opacity-40"
                >
                  Add City
                </button>
              </div>
            </div>
          </div>

          {/* Custom Stats / Extra Data */}
          <div className="mt-7 border-t border-black/[0.08] pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="label-mono block text-[#111111]/65">
                  Extra Custom Milestone Cards ({form.customStats.length}/{L.maxCustomStats})
                </label>
                <p className="mt-0.5 text-[12.5px] text-[#111111]/60">
                  Adding any milestone cards automatically unlocks a dedicated Milestones slide in
                  Wrapped and displays them below the deck.
                </p>
              </div>
              <button
                type="button"
                disabled={form.customStats.length >= L.maxCustomStats}
                onClick={addCustomStatRow}
                className="label-mono inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/12 bg-[#f7f6f4] px-3 py-1.5 text-[#111111] hover:bg-white disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add Milestone</span>
              </button>
            </div>

            {parsedCustomStats.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {parsedCustomStats.map((row, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-[120px_180px_1fr_40px]">
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) =>
                        updateCustomStatRow(idx, e.target.value, row.label, row.detail)
                      }
                      placeholder="12"
                      className="h-10 rounded-lg border border-black/10 bg-[#f7f6f4] px-3 font-mono text-[13px]"
                    />
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) =>
                        updateCustomStatRow(idx, row.value, e.target.value, row.detail)
                      }
                      placeholder="Live Sessions"
                      className="h-10 rounded-lg border border-black/10 bg-[#f7f6f4] px-3 text-[13.5px]"
                    />
                    <input
                      type="text"
                      value={row.detail}
                      onChange={(e) =>
                        updateCustomStatRow(idx, row.value, row.label, e.target.value)
                      }
                      placeholder="Optional short detail"
                      className="h-10 rounded-lg border border-black/10 bg-[#f7f6f4] px-3 text-[13.5px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomStatRow(idx)}
                      aria-label="Remove milestone"
                      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-[#f7f6f4] text-[#111111]/60 hover:text-[#fe3619]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. Slide Editorial Copy */}
        <div className="rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8">
          <h3 className="text-lg font-medium tracking-[-0.02em]">
            5. Editorial Slide Copy (Cover, Thesis, Spotlight, Closing)
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-mono block text-[#111111]/65">Slide 01 · Cover Title</label>
              <input
                type="text"
                required
                maxLength={L.coverTitle.max}
                value={form.coverTitle}
                onChange={(e) => setForm((f) => ({ ...f, coverTitle: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Slide 01 · Cover Subtitle
              </label>
              <input
                type="text"
                required
                maxLength={L.coverSubtitle.max}
                value={form.coverSubtitle}
                onChange={(e) => setForm((f) => ({ ...f, coverSubtitle: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">Slide 02 · Start Lead</label>
              <input
                type="text"
                required
                maxLength={L.startLead.max}
                value={form.startLead}
                onChange={(e) => setForm((f) => ({ ...f, startLead: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Slide 02 · Start Thesis Statement
              </label>
              <input
                type="text"
                required
                maxLength={L.startStatement.max}
                value={form.startStatement}
                onChange={(e) => setForm((f) => ({ ...f, startStatement: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Slide 06 · Awareness Date
              </label>
              <input
                type="text"
                required
                maxLength={L.awarenessDate.max}
                value={form.awarenessDate}
                onChange={(e) => setForm((f) => ({ ...f, awarenessDate: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 font-mono text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Slide 06 · Program Title
              </label>
              <input
                type="text"
                required
                maxLength={L.awarenessProgramTitle.max}
                value={form.awarenessProgramTitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, awarenessProgramTitle: e.target.value }))
                }
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Slide 06 · Intro Copy
              </label>
              <input
                type="text"
                required
                maxLength={L.awarenessPrefix.max}
                value={form.awarenessPrefix}
                onChange={(e) => setForm((f) => ({ ...f, awarenessPrefix: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Slide 06 · Speaker Attribution
              </label>
              <input
                type="text"
                required
                maxLength={L.awarenessSpeaker.max}
                value={form.awarenessSpeaker}
                onChange={(e) => setForm((f) => ({ ...f, awarenessSpeaker: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label-mono block text-[#111111]/65">
                Slide 10 · Welcome Statement
              </label>
              <input
                type="text"
                required
                maxLength={L.welcomeStatement.max}
                value={form.welcomeStatement}
                onChange={(e) => setForm((f) => ({ ...f, welcomeStatement: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label-mono block text-[#111111]/65">
                Slide 11 · Thank You Statement
              </label>
              <input
                type="text"
                required
                maxLength={L.thankYouStatement.max}
                value={form.thankYouStatement}
                onChange={(e) => setForm((f) => ({ ...f, thankYouStatement: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Closing Slide · Statement
              </label>
              <input
                type="text"
                required
                maxLength={L.closingStatement.max}
                value={form.closingStatement}
                onChange={(e) => setForm((f) => ({ ...f, closingStatement: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>

            <div>
              <label className="label-mono block text-[#111111]/65">
                Closing Slide · CTA Button
              </label>
              <input
                type="text"
                required
                maxLength={L.closingCtaLabel.max}
                value={form.closingCtaLabel}
                onChange={(e) => setForm((f) => ({ ...f, closingCtaLabel: e.target.value }))}
                className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
              />
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-[13.5px] font-medium text-[#fe3619]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="label-mono inline-flex min-h-[48px] cursor-pointer items-center rounded-xl bg-[#fe3619] px-7 py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving Wrapped..." : "Save Wrapped Configuration"}
          </button>
        </div>
      </form>
    </section>
  );
}
