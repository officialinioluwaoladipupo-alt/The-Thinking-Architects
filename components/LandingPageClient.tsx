"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_WRAPPED_CONFIG,
  subscribeWrappedConfig,
  type WrappedConfigRecord,
} from "../lib/firebaseContent";
import { triggerTallyPopup } from "../lib/tally";
import ClosingSection from "./ClosingSection";
import FaqSection from "./FaqSection";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import HeroSection from "./HeroSection";
import HowItWorksGrid from "./HowItWorksGrid";
import JoinModal from "./JoinModal";
import PitchModal from "./PitchModal";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import StageRailSection from "./StageRailSection";
import TracksGrid from "./TracksGrid";
import WrappedHomeBanner from "./WrappedHomeBanner";

export default function LandingPageClient() {
  const [joinOpen, setJoinOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [wrappedConfig, setWrappedConfig] = useState<WrappedConfigRecord>({
    ...DEFAULT_WRAPPED_CONFIG,
    exists: false,
  });

  useEffect(() => {
    const unsub = subscribeWrappedConfig(
      (data) => setWrappedConfig(data),
      () => {
        // Keep default fallback silently if Wrapped config listener hits transient error
      },
    );
    return () => unsub();
  }, []);

  const handleOpenJoin = () => {
    triggerTallyPopup(() => setJoinOpen(true));
  };

  return (
    <FirestoreErrorBoundary>
      <SiteHeader onOpenJoin={handleOpenJoin} />
      <main id="top" className="relative flex flex-col">
        <HeroSection onOpenJoin={handleOpenJoin} />
        <WrappedHomeBanner onOpenJoin={handleOpenJoin} config={wrappedConfig} />
        <TracksGrid
          onOpenJoin={handleOpenJoin}
          hasWrappedBanner={wrappedConfig.homeBannerEnabled}
        />
        <StageRailSection />
        <HowItWorksGrid onOpenJoin={handleOpenJoin} />
        <FaqSection onOpenPitch={() => setPitchOpen(true)} />
        <ClosingSection onOpenJoin={handleOpenJoin} />
      </main>
      <SiteFooter />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      <PitchModal
        open={pitchOpen}
        onClose={() => setPitchOpen(false)}
        defaultPitchType="speaker"
      />
    </FirestoreErrorBoundary>
  );
}
