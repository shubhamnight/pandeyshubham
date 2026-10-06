"use client";

import { createContext, forwardRef, useContext, useEffect, useMemo, useRef,
  type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface DockItemData {
  link?: string;
  Icon: ReactNode;
  target?: string;
  ariaLabel?: string;
}
export interface AnimatedDockProps extends HTMLAttributes<HTMLUListElement> {
  items?: DockItemData[];
  /** Disable dock magnification when composing it with an existing icon animation. */
  magnify?: boolean;
}
const DockPointer = createContext<{ mouseX: MotionValue<number>; magnify: boolean } | null>(null);

/** Native links work in this portfolio without Next.js or another motion dependency. */
export const AnimatedDock = forwardRef<HTMLUListElement, AnimatedDockProps>(
  ({ className, items = [], children, magnify = true, onPointerMove, onPointerLeave, ...props }, ref) => {
    const mouseX = useMotionValue(Infinity);
    const reduce = useReducedMotion();
    const enabled = magnify && !reduce;
    const context = useMemo(() => ({ mouseX, magnify: enabled }), [mouseX, enabled]);
    useEffect(() => { if (!enabled) mouseX.set(Infinity); }, [enabled, mouseX]);
    return <DockPointer.Provider value={context}><ul ref={ref} {...props} className={cn('animated-dock', className)}
      onPointerMove={event => {
        if (magnify && !reduce && event.pointerType !== 'touch') mouseX.set(event.clientX);
        onPointerMove?.(event);
      }} onPointerLeave={event => { if (magnify) mouseX.set(Infinity); onPointerLeave?.(event); }}>
      {children ?? items.map((item, index) => <DockItem key={item.link ?? index}
        mouseX={mouseX} magnify={enabled}>
        {item.link ? <a href={item.link} target={item.target}
          rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
          aria-label={item.ariaLabel ?? `Dock item ${index + 1}`}>{item.Icon}</a>
          : <button type="button" aria-disabled="true" aria-label={item.ariaLabel ?? `Dock item ${index + 1}`}>
            {item.Icon}
          </button>}
      </DockItem>)}
    </ul></DockPointer.Provider>;
  },
);
AnimatedDock.displayName = 'AnimatedDock';

export function DockItem({ mouseX, children, magnify, baseSize = 40, className, style }: {
  mouseX?: MotionValue<number>;
  children: ReactNode | ((iconScale: MotionValue<number> | number) => ReactNode);
  magnify?: boolean; baseSize?: number; className?: string; style?: CSSProperties;
}) {
  const context = useContext(DockPointer);
  const fallback = useMotionValue(Infinity);
  const pointer = mouseX ?? context?.mouseX ?? fallback;
  const enabled = magnify ?? context?.magnify ?? true;
  const ref = useRef<HTMLLIElement>(null);
  const distance = useTransform(pointer, value => {
    if (!Number.isFinite(value)) return Infinity;
    const bounds = ref.current?.getBoundingClientRect();
    return bounds ? value - bounds.left - bounds.width / 2 : Infinity;
  });
  const widthSync = useTransform(distance, [-150, 0, 150], [baseSize, baseSize * 2, baseSize]);
  const width = useSpring(widthSync, { mass: .1, stiffness: 150, damping: 12 });
  const iconScale = useTransform(width, [baseSize, baseSize * 2], [1, 1.5]);
  const iconSpring = useSpring(iconScale, { mass: .1, stiffness: 150, damping: 12 });
  return <motion.li ref={ref} className={cn('dock-item', className)}
    style={{ ...style, width: enabled ? width : baseSize, height: enabled ? width : baseSize }}>
    {typeof children === 'function' ? children(enabled ? iconSpring : 1) :
      <motion.div className="dock-item-content" style={{ scale: enabled ? iconSpring : 1 }}>
        {children}
      </motion.div>}
  </motion.li>;
}
