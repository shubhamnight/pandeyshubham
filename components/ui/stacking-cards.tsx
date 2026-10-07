// Adapted from Khoa Phan's supplied stacking-cards component.
'use client';

import { createContext, useContext, useMemo, useRef,
  type CSSProperties, type HTMLAttributes, type PropsWithChildren } from 'react';
import { motion, useScroll, useTransform, useReducedMotion,
  type MotionValue, type UseScrollOptions } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StackingCardsProps extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {
  scrollOptions?: UseScrollOptions;
  scaleMultiplier?: number;
  totalCards: number;
  /** Opt in only when the nearest scroller spans the complete stack. */
  nativeScroll?: boolean;
}
interface StackingCardItemProps extends HTMLAttributes<HTMLDivElement>, PropsWithChildren {
  index: number;
  topPosition?: string;
}
const StackingCardsContext = createContext<{
  progress: MotionValue<number> | null;
  scaleMultiplier?: number;
  totalCards: number;
  native?: boolean;
} | null>(null);

export default function StackingCards({ nativeScroll, ...props }: StackingCardsProps) {
  const native = nativeScroll && typeof CSS !== 'undefined' &&
    CSS.supports('animation-timeline', 'scroll(nearest block)') &&
    CSS.supports('animation-range', '0% 100%');
  return native ? <NativeStackingCards {...props} /> : <MotionStackingCards {...props} />;
}

function NativeStackingCards({ children, className, scaleMultiplier, totalCards,
  scrollOptions: _scrollOptions, ...props }: StackingCardsProps) {
  // No useScroll, Motion subscriptions or per-frame JS in the native branch.
  const value = useMemo(() => ({ progress: null,
    scaleMultiplier, totalCards, native: true }), [scaleMultiplier, totalCards]);
  return <StackingCardsContext.Provider value={value}>
    <div className={cn(className)} {...props}>{children}</div>
  </StackingCardsContext.Provider>;
}

function MotionStackingCards({ children, className, scrollOptions,
  scaleMultiplier, totalCards, ...props }: StackingCardsProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ offset: ['start start', 'end end'],
    ...scrollOptions, target: targetRef });
  const value = useMemo(() => ({ progress: scrollYProgress, scaleMultiplier, totalCards }),
    [scrollYProgress, scaleMultiplier, totalCards]);
  return <StackingCardsContext.Provider value={value}>
    <div className={cn(className)} ref={targetRef} {...props}>{children}</div>
  </StackingCardsContext.Provider>;
}

export const useStackingCardsContext = () => {
  const context = useContext(StackingCardsContext);
  if (!context) throw new Error('StackingCardItem must be used within StackingCards');
  return context;
};

export function StackingCardItem({ index, topPosition, className, children,
  ...props }: StackingCardItemProps) {
  const { native, scaleMultiplier, totalCards } = useStackingCardsContext();
  if (!native) return <MotionStackingCardItem index={index} topPosition={topPosition}
    className={className} {...props}>{children}</MotionStackingCardItem>;
  const style = { top: topPosition ?? `${5 + index * 3}%`,
    '--stack-scale-to': 1 - (totalCards - index) * (scaleMultiplier ?? .03),
    animationRange: `${index / Math.max(1, totalCards) * 100}% 100%`,
  } as CSSProperties;
  return <div className={cn('h-full sticky top-0', className)} {...props}>
    <div className="origin-top relative h-full music-native-stack-scale" style={style}>{children}</div>
  </div>;
}

function MotionStackingCardItem({ index, topPosition, className, children,
  ...props }: StackingCardItemProps) {
  const { progress, scaleMultiplier, totalCards } = useStackingCardsContext();
  if (!progress) throw new Error('Motion card requires a Motion stack');
  const reduced = useReducedMotion();
  const scaleTo = 1 - (totalCards - index) * (scaleMultiplier ?? .03);
  const scale = useTransform(progress, [index / Math.max(1, totalCards), 1], [1, scaleTo]);
  return <div className={cn('h-full sticky top-0', className)} {...props}>
    <motion.div className="origin-top relative h-full"
      style={{ top: topPosition ?? `${5 + index * 3}%`, scale: reduced ? 1 : scale }}>
      {children}
    </motion.div>
  </div>;
}
