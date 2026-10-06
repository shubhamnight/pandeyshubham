import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';

export type ShinyButtonVariant = 'default' | 'green' | 'indigo' | 'red';
interface FancyButtonProps {
  icon: ReactNode;
  variant?: ShinyButtonVariant;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  style?: CSSProperties;
}

const variantClasses: Record<ShinyButtonVariant, string> = {
  default: 'border-white/10 hover:border-white/30 focus-visible:border-white/30 hover:from-white/10 focus-visible:from-white/10 hover:shadow-white/20 focus-visible:shadow-white/20',
  green: 'border-green-500/20 hover:border-green-500/50 focus-visible:border-green-500/50 hover:from-green-500/10 focus-visible:from-green-500/10 hover:shadow-green-500/30 focus-visible:shadow-green-500/30',
  indigo: 'border-indigo-500/20 hover:border-indigo-500/50 focus-visible:border-indigo-500/50 hover:from-indigo-500/10 focus-visible:from-indigo-500/10 hover:shadow-indigo-500/30 focus-visible:shadow-indigo-500/30',
  red: 'border-red-500/20 hover:border-red-500/50 focus-visible:border-red-500/50 hover:from-red-500/10 focus-visible:from-red-500/10 hover:shadow-red-500/30 focus-visible:shadow-red-500/30',
};
const glowGradientClasses: Record<ShinyButtonVariant, string> = {
  default: 'via-white/10', green: 'via-green-400/20', indigo: 'via-indigo-400/20', red: 'via-red-400/20',
};

export default function FancyButton({ icon, variant = 'default', onClick, className = '',
  ariaLabel = 'Fancy Button', autoFocus = false, style }: FancyButtonProps) {
  return <button type="button" onClick={onClick} aria-label={ariaLabel} autoFocus={autoFocus} style={style}
    className={clsx(
      'p-5 rounded-full border backdrop-blur-lg shadow-lg cursor-pointer group relative overflow-hidden',
      'bg-[#0c0d10] bg-linear-to-tr from-black/60 to-black/40 transition-[transform,scale,rotate,box-shadow,border-color] duration-300 ease-out',
      'hover:scale-110 active:scale-95 hover:rotate-2 active:rotate-0 hover:shadow-2xl',
      'focus-visible:scale-110 focus-visible:shadow-2xl focus-visible:outline-2 focus-visible:outline-offset-4',
      'motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:rotate-0 motion-reduce:active:scale-100 motion-reduce:focus-visible:scale-100',
      variantClasses[variant], className,
    )}>
    <span aria-hidden="true" className={clsx(
      'fancy-button-shine absolute inset-0 bg-linear-to-r from-transparent to-transparent -translate-x-full',
      'group-hover:translate-x-full group-focus-visible:translate-x-full transition-transform duration-700 ease-out motion-reduce:transition-none',
      glowGradientClasses[variant],
    )} />
    <span className="fancy-button-icon relative z-10">{icon}</span>
  </button>;
}
