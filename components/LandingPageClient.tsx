"use client";

import { useState } from "react";
import { triggerTallyPopup } from "../lib/tally";
import ClosingSection from "./ClosingSection";
import FaqSection from "./FaqSection";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import HeroSection from "./HeroSection";
import HowItWorksGrid from "./HowItWorksGrid";
import JoinModal from "./JoinModal";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import StageRailSection from "./StageRailSection";
import TracksGrid from "./TracksGrid";
import WrappedSpotlightBanner from "./WrappedSpotlightBanner";

export default function LandingPageClient() {
  const [joinOpen, setJoinOpen] = useState(false);

  const handleOpenJoin = () => {
    triggerTallyPopup(() => setJoinOpen(true));
  };

  return (
    <FirestoreErrorBoundary>
      <SiteHeader onOpenJoin={handleOpenJoin} />
      <main id="top" className="relative flex flex-col">
        <HeroSection onOpenJoin={handleOpenJoin} />
        <TracksGrid onOpenJoin={handleOpenJoin} />
        <WrappedSpotlightBanner onOpenJoin={handleOpenJoin} />
        <StageRailSection />
        <HowItWorksGrid onOpenJoin={handleOpenJoin} />
        <FaqSection />
        <ClosingSection onOpenJoin={handleOpenJoin} />
      </main>
      <SiteFooter />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </FirestoreErrorBoundary>
  );
}
