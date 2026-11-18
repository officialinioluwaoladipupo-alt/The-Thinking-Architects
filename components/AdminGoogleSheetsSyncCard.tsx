"use client";

import { Check, Eye, EyeOff, FileSpreadsheet, RefreshCw, Unlink } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  saveCommunityStats,
  saveGoogleSheetsConfig,
  saveWrappedConfig,
  type CommunityStatsInput,
  type CommunityStatsRecord,
  type GoogleSheetsConfigRecord,
  type WrappedConfigInput,
} from "../lib/firebaseContent";
import {
  analyzeMemberSheetRows,
  detectSheetColumns,
  extractSpreadsheetId,
  fetchSpreadsheetMetadata,
  fetchSpreadsheetRows,
  type SheetColumnMapping,
  type SpreadsheetTabInfo,
} from "../lib/googleSheets";
import { useFirebase } from "./FirebaseProvider";

type AdminGoogleSheetsSyncCardProps = {
  communityStats: CommunityStatsRecord;
  sheetsConfig: GoogleSheetsConfigRecord;
  wrappedForm: WrappedConfigInput;
  onSaved: (message: string) => void;
};

export default function AdminGoogleSheetsSyncCard({
  communityStats,
  sheetsConfig,
  wrappedForm,
  onSaved,
}: AdminGoogleSheetsSyncCardProps) {
  const {
    sheetsToken,
    connectingSheets,
    sheetsAuthError,
    connectGoogleSheets,
    clearSheetsToken,
  } = useFirebase();

  const [sheetInput, setSheetInput] = useState(sheetsConfig.spreadsheetId);
  const [spreadsheetId, setSpreadsheetId] = useState(sheetsConfig.spreadsheetId);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState(sheetsConfig.spreadsheetTitle);
  const [tabs, setTabs] = useState<SpreadsheetTabInfo[]>([]);
  const [selectedTab, setSelectedTab] = useState(sheetsConfig.sheetName);

  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<SheetColumnMapping>({
    emailColumn: sheetsConfig.emailColumn,
    stageColumn: sheetsConfig.stageColumn,
    locationColumn: sheetsConfig.locationColumn,
  });

  const [statsDraft, setStatsDraft] = useState<CommunityStatsInput>({
    showOnCommunity: communityStats.showOnCommunity,
    communityTotal: communityStats.communityTotal,
    studentsCount: communityStats.studentsCount,
    graduatesCount: communityStats.graduatesCount,
    professionalsCount: communityStats.professionalsCount,
    countriesCount: communityStats.countriesCount,
    topLocations: communityStats.topLocations,
    sourceLabel: communityStats.sourceLabel || "Community Directory",
    lastSyncedIso: communityStats.lastSyncedIso,
  });

  const [alsoUpdateWrapped, setAlsoUpdateWrapped] = useState(true);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [readingRows, setReadingRows] = useState(false);
  const [savingStats, setSavingStats] = useState(false);
  const [error, setError] = useState("");
  const [sheetPreviewNote, setSheetPreviewNote] = useState("");

  useEffect(() => {
    if (sheetsConfig.spreadsheetId) {
      setSheetInput((prev) => prev || sheetsConfig.spreadsheetId);
      setSpreadsheetId((prev) => prev || sheetsConfig.spreadsheetId);
    }
    if (sheetsConfig.spreadsheetTitle) {
      setSpreadsheetTitle((prev) => prev || sheetsConfig.spreadsheetTitle);
    }
    if (sheetsConfig.sheetName) {
      setSelectedTab((prev) => prev || sheetsConfig.sheetName);
    }
    if (sheetsConfig.emailColumn || sheetsConfig.stageColumn || sheetsConfig.locationColumn) {
      setMapping((prev) => {
        if (prev.emailColumn || prev.stageColumn || prev.locationColumn) return prev;
        return {
          emailColumn: sheetsConfig.emailColumn,
          stageColumn: sheetsConfig.stageColumn,
          locationColumn: sheetsConfig.locationColumn,
        };
      });
    }
  }, [
    sheetsConfig.spreadsheetId,
    sheetsConfig.spreadsheetTitle,
    sheetsConfig.sheetName,
    sheetsConfig.emailColumn,
    sheetsConfig.stageColumn,
    sheetsConfig.locationColumn,
  ]);

  const topLocationsKey = communityStats.topLocations.join("|");

  useEffect(() => {
    setStatsDraft({
      showOnCommunity: communityStats.showOnCommunity,
      communityTotal: communityStats.communityTotal,
      studentsCount: communityStats.studentsCount,
      graduatesCount: communityStats.graduatesCount,
      professionalsCount: communityStats.professionalsCount,
      countriesCount: communityStats.countriesCount,
      topLocations: topLocationsKey ? topLocationsKey.split("|") : [],
      sourceLabel: communityStats.sourceLabel || "Community Directory",
      lastSyncedIso: communityStats.lastSyncedIso,
    });
  }, [
    communityStats.showOnCommunity,
    communityStats.communityTotal,
    communityStats.studentsCount,
    communityStats.graduatesCount,
    communityStats.professionalsCount,
    communityStats.countriesCount,
    communityStats.sourceLabel,
    communityStats.lastSyncedIso,
    topLocationsKey,
  ]);

  const applyAnalyzedRows = (rows: string[][], nextMapping: SheetColumnMapping) => {
    const analyzed = analyzeMemberSheetRows(rows, nextMapping);
    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    setStatsDraft((prev) => ({
      ...prev,
      communityTotal: analyzed.communityTotal,
      studentsCount: analyzed.studentsCount,
      graduatesCount: analyzed.graduatesCount,
      professionalsCount: analyzed.professionalsCount,
      countriesCount: analyzed.countriesCount,
      topLocations: analyzed.topLocations,
      sourceLabel: "Community Directory",
      lastSyncedIso: nowIso,
    }));
    setSheetPreviewNote(
      `Read ${analyzed.totalRows} rows (${analyzed.communityTotal} unique members, ${analyzed.studentsCount} students, ${analyzed.graduatesCount} graduates, ${analyzed.professionalsCount} practitioners across ${analyzed.countriesCount} countries/locations).`,
    );
  };

  const handleLoadTabs = async (tokenOverride?: string) => {
    const token = tokenOverride || sheetsToken;
    if (!token) {
      setError("Connect Google Sheets first to read your spreadsheet tabs.");
      return;
    }

    const parsedId = extractSpreadsheetId(sheetInput);
    if (!parsedId) {
      setError("Paste a valid Google Sheets URL or Spreadsheet ID.");
      return;
    }

    setError("");
    setSheetPreviewNote("");
    setLoadingTabs(true);
    try {
      const meta = await fetchSpreadsheetMetadata(token, parsedId);
      setSpreadsheetId(parsedId);
      setSpreadsheetTitle(meta.spreadsheetTitle);
      setTabs(meta.tabs);

      const matchedTab =
        meta.tabs.find((t) => t.title === selectedTab)?.title ?? meta.tabs[0]?.title ?? "";
      setSelectedTab(matchedTab);

      if (meta.tabs.length === 0) {
        setError("No readable tabs found in this spreadsheet.");
      }
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        clearSheetsToken();
      }
      setError(err instanceof Error ? err.message : "Unable to load spreadsheet metadata.");
    } finally {
      setLoadingTabs(false);
    }
  };

  const handleReadRows = async () => {
    if (!sheetsToken) {
      setError("Connect Google Sheets first.");
      return;
    }
    const targetId = extractSpreadsheetId(sheetInput) || spreadsheetId;
    if (!targetId) {
      setError("Paste a valid Google Sheets URL or Spreadsheet ID.");
      return;
    }
    if (!selectedTab) {
      setError("Load and select a sheet tab first.");
      return;
    }

    setError("");
    setReadingRows(true);
    try {
      const rows = await fetchSpreadsheetRows(sheetsToken, targetId, selectedTab);
      if (rows.length === 0) {
        setRawRows([]);
        setHeaders([]);
        setError(`Tab "${selectedTab}" returned zero rows.`);
        return;
      }

      const rowHeaders = (rows[0] ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean);
      setRawRows(rows);
      setHeaders(rowHeaders);

      const detected = detectSheetColumns(rowHeaders);
      const nextMapping: SheetColumnMapping = {
        emailColumn:
          mapping.emailColumn && rowHeaders.includes(mapping.emailColumn)
            ? mapping.emailColumn
            : detected.emailColumn,
        stageColumn:
          mapping.stageColumn && rowHeaders.includes(mapping.stageColumn)
            ? mapping.stageColumn
            : detected.stageColumn,
        locationColumn:
          mapping.locationColumn && rowHeaders.includes(mapping.locationColumn)
            ? mapping.locationColumn
            : detected.locationColumn,
      };
      setMapping(nextMapping);
      applyAnalyzedRows(rows, nextMapping);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        clearSheetsToken();
      }
      setError(err instanceof Error ? err.message : "Unable to read rows from sheet.");
    } finally {
      setReadingRows(false);
    }
  };

  const handleMappingChange = (field: keyof SheetColumnMapping, value: string) => {
    const next = { ...mapping, [field]: value };
    setMapping(next);
    if (rawRows.length > 0) {
      applyAnalyzedRows(rawRows, next);
    }
  };

  const handleSaveLiveNumbers = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSavingStats(true);
    try {
      const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      const finalSyncIso = statsDraft.lastSyncedIso || nowIso;

      await saveCommunityStats({
        ...statsDraft,
        lastSyncedIso: finalSyncIso,
      });

      const resolvedId = extractSpreadsheetId(sheetInput) || spreadsheetId;
      if (resolvedId) {
        await saveGoogleSheetsConfig({
          spreadsheetId: resolvedId,
          spreadsheetTitle,
          sheetName: selectedTab,
          emailColumn: mapping.emailColumn,
          stageColumn: mapping.stageColumn,
          locationColumn: mapping.locationColumn,
          lastSyncedIso: finalSyncIso,
        });
      }

      if (alsoUpdateWrapped) {
        const primaryLoc = statsDraft.topLocations[0] || wrappedForm.locationPrimary;
        const secondaryLoc = statsDraft.topLocations[1] ?? wrappedForm.locationSecondary;
        const extraLocs = statsDraft.topLocations.slice(2, 10);
        await saveWrappedConfig(
          {
            ...wrappedForm,
            communityTotal: statsDraft.communityTotal,
            studentsCount: statsDraft.studentsCount,
            professionalsCount:
              statsDraft.graduatesCount + statsDraft.professionalsCount ||
              wrappedForm.professionalsCount,
            locationPrimary: primaryLoc,
            locationSecondary: secondaryLoc,
            extraLocations: extraLocs.length > 0 ? extraLocs : wrappedForm.extraLocations,
          },
          "public",
        );
      }

      onSaved(
        alsoUpdateWrapped
          ? "Saved live community numbers to /community and synced Wrapped metrics."
          : "Saved live community numbers to /community.",
      );
    } catch (err) {
      setError(formatFirestoreErrorMessage(err));
    } finally {
      setSavingStats(false);
    }
  };

  const handleToggleCommunityStatsVisibility = async () => {
    const nextShow = !statsDraft.showOnCommunity;
    setStatsDraft((prev) => ({ ...prev, showOnCommunity: nextShow }));
    setError("");
    try {
      await saveCommunityStats({
        ...statsDraft,
        showOnCommunity: nextShow,
      });
      onSaved(
        nextShow
          ? "Community numbers band enabled on /community."
          : "Community numbers band hidden on /community.",
      );
    } catch (err) {
      setStatsDraft((prev) => ({ ...prev, showOnCommunity: !nextShow }));
      setError(formatFirestoreErrorMessage(err));
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-black/[0.08] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#fe3619]">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span className="label-mono">Google Sheets Member Sync</span>
          </div>
          <h3 className="mt-1.5 text-[1.25rem] font-medium tracking-[-0.02em]">
            Live Community Numbers for /community
          </h3>
          <p className="mt-1 max-w-[65ch] text-[13.5px] leading-relaxed text-[#111111]/68">
            Connect your Google Sheets member directory to calculate deduplicated member totals,
            career stages, and countries—publishing only aggregate numbers to /community with zero
            personal details exposed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleToggleCommunityStatsVisibility()}
            className={`label-mono inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 transition-colors ${
              statsDraft.showOnCommunity
                ? "border-[#111111] bg-[#111111] text-white"
                : "border-black/15 bg-[#f7f6f4] text-[#111111]/70 hover:text-[#111111]"
            }`}
          >
            {statsDraft.showOnCommunity ? (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{statsDraft.showOnCommunity ? "Visible on /community" : "Hidden on /community"}</span>
          </button>

          {!sheetsToken ? (
            <button
              type="button"
              disabled={connectingSheets}
              onClick={async () => {
                const token = await connectGoogleSheets();
                if (token && sheetInput.trim()) {
                  void handleLoadTabs(token);
                }
              }}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2 text-[13px] font-medium text-[#111111] shadow-xs transition-colors hover:bg-[#f7f6f4] disabled:opacity-50"
            >
              <span>{connectingSheets ? "Connecting..." : "Connect Google Sheets"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={clearSheetsToken}
              className="label-mono inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/12 bg-[#f7f6f4] px-3.5 py-2 text-[#111111]/70 hover:text-[#111111]"
            >
              <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Disconnect Sheet Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Sheet Picker & Column Analyzer */}
      <div className="mt-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-[1.6fr_auto]">
          <div>
            <label htmlFor="gs-url-input" className="label-mono block text-[#111111]/65">
              Google Sheet URL or Spreadsheet ID
            </label>
            <input
              id="gs-url-input"
              type="text"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1ABC.../edit"
              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={loadingTabs || connectingSheets}
              onClick={async () => {
                let token = sheetsToken;
                if (!token) {
                  token = await connectGoogleSheets();
                }
                if (token) {
                  await handleLoadTabs(token);
                }
              }}
              className="label-mono inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#111111] px-5 text-white transition-opacity hover:opacity-85 disabled:opacity-50 md:w-auto"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingTabs ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>{loadingTabs ? "Loading Tabs..." : "Load Sheet Tabs"}</span>
            </button>
          </div>
        </div>

        {(tabs.length > 0 || selectedTab) && (
          <div className="grid gap-3 rounded-xl border border-black/[0.08] bg-[#f7f6f4] p-4 md:grid-cols-[1.2fr_auto] md:items-end">
            <div>
              <label htmlFor="gs-tab-select" className="label-mono block text-[#111111]/65">
                Sheet Tab {spreadsheetTitle ? `— ${spreadsheetTitle}` : ""}
              </label>
              {tabs.length > 0 ? (
                <select
                  id="gs-tab-select"
                  value={selectedTab}
                  onChange={(e) => setSelectedTab(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-white px-3.5 text-[14px]"
                >
                  {tabs.map((tab) => (
                    <option key={tab.sheetId} value={tab.title}>
                      {tab.title}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="gs-tab-select"
                  type="text"
                  value={selectedTab}
                  onChange={(e) => setSelectedTab(e.target.value)}
                  placeholder="Select or type tab name"
                  className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-white px-3.5 text-[14px]"
                />
              )}
            </div>

            <button
              type="button"
              disabled={readingRows || !selectedTab}
              onClick={() => void handleReadRows()}
              className="label-mono inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#fe3619] px-5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${readingRows ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>{readingRows ? "Reading Rows..." : "Read & Count Members"}</span>
            </button>
          </div>
        )}

        {headers.length > 0 && (
          <div className="grid gap-3 rounded-xl border border-black/[0.08] bg-[#f7f6f4] p-4 sm:grid-cols-3">
            <div>
              <label htmlFor="gs-col-email" className="label-mono block text-[#111111]/65">
                Email Column (Deduplicate)
              </label>
              <select
                id="gs-col-email"
                value={mapping.emailColumn}
                onChange={(e) => handleMappingChange("emailColumn", e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-[13.5px]"
              >
                <option value="">None (count every row)</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gs-col-stage" className="label-mono block text-[#111111]/65">
                Stage / Journey Column
              </label>
              <select
                id="gs-col-stage"
                value={mapping.stageColumn}
                onChange={(e) => handleMappingChange("stageColumn", e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-[13.5px]"
              >
                <option value="">Not mapped</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gs-col-loc" className="label-mono block text-[#111111]/65">
                Country / Location Column
              </label>
              <select
                id="gs-col-loc"
                value={mapping.locationColumn}
                onChange={(e) => handleMappingChange("locationColumn", e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-[13.5px]"
              >
                <option value="">Not mapped</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {sheetPreviewNote && (
          <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-[#f7f6f4] px-4 py-2.5 text-[13px] font-medium text-[#111111]">
            <Check className="h-4 w-4 shrink-0 text-[#fe3619]" aria-hidden="true" />
            <span>{sheetPreviewNote}</span>
          </div>
        )}

        {(error || sheetsAuthError) && (
          <p role="alert" className="text-[13px] font-medium text-[#fe3619]">
            {error || sheetsAuthError}
          </p>
        )}
      </div>

      {/* Live / Editable Aggregate Preview Form */}
      <form onSubmit={handleSaveLiveNumbers} className="mt-6 border-t border-black/[0.08] pt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label-mono block text-[#111111]/65">Total Members</label>
            <input
              type="number"
              min={0}
              max={10000000}
              value={statsDraft.communityTotal}
              onChange={(e) =>
                setStatsDraft((s) => ({
                  ...s,
                  communityTotal: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[15px] font-medium tabular-nums"
            />
          </div>

          <div>
            <label className="label-mono block text-[#111111]/65">Students</label>
            <input
              type="number"
              min={0}
              max={10000000}
              value={statsDraft.studentsCount}
              onChange={(e) =>
                setStatsDraft((s) => ({
                  ...s,
                  studentsCount: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[15px] font-medium tabular-nums"
            />
          </div>

          <div>
            <label className="label-mono block text-[#111111]/65">Graduates</label>
            <input
              type="number"
              min={0}
              max={10000000}
              value={statsDraft.graduatesCount}
              onChange={(e) =>
                setStatsDraft((s) => ({
                  ...s,
                  graduatesCount: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[15px] font-medium tabular-nums"
            />
          </div>

          <div>
            <label className="label-mono block text-[#111111]/65">Practising</label>
            <input
              type="number"
              min={0}
              max={10000000}
              value={statsDraft.professionalsCount}
              onChange={(e) =>
                setStatsDraft((s) => ({
                  ...s,
                  professionalsCount: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[15px] font-medium tabular-nums"
            />
          </div>

          <div>
            <label className="label-mono block text-[#111111]/65">Countries</label>
            <input
              type="number"
              min={0}
              max={1000}
              value={statsDraft.countriesCount}
              onChange={(e) =>
                setStatsDraft((s) => ({
                  ...s,
                  countriesCount: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[15px] font-medium tabular-nums"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1.5fr_1fr]">
          <div>
            <label className="label-mono block text-[#111111]/65">
              Top Locations (comma separated)
            </label>
            <input
              type="text"
              value={statsDraft.topLocations.join(", ")}
              onChange={(e) =>
                setStatsDraft((s) => ({
                  ...s,
                  topLocations: e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .slice(0, 10),
                }))
              }
              placeholder="Nigeria, United Kingdom, Canada"
              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
            />
          </div>

          <div>
            <label className="label-mono block text-[#111111]/65">Source Label</label>
            <input
              type="text"
              maxLength={80}
              value={statsDraft.sourceLabel}
              onChange={(e) => setStatsDraft((s) => ({ ...s, sourceLabel: e.target.value }))}
              placeholder="Community Directory"
              className="mt-1.5 h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] px-3.5 text-[14px]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-[#111111]/80">
            <input
              type="checkbox"
              checked={alsoUpdateWrapped}
              onChange={(e) => setAlsoUpdateWrapped(e.target.checked)}
              className="h-4 w-4 accent-[#fe3619]"
            />
            <span>Also update Year Wrapped community numbers</span>
          </label>

          <button
            type="submit"
            disabled={savingStats}
            className="label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {savingStats ? "Publishing Numbers..." : "Publish Numbers to /community"}
          </button>
        </div>
      </form>
    </div>
  );
}
