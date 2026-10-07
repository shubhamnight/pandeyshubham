'use client';

import { MusicOverlay } from '@/components/music-overlay';
import { musicCards } from '@/music-overlay-data';

export default function StackingCardsDemo() {
  return <div className="h-[620px] w-full"><MusicOverlay songs={musicCards.slice(0,5)} /></div>;
}
