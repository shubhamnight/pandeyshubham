"use client";

import React from 'react';
import { cn } from '@/lib/utils';

export interface SocialItem {
  href?: string;
  ariaLabel: string;
  tooltip: string;
  svgUrl?: string;
  icon?: React.ReactNode;
  color: string;
  iconColor?: string;
  external?: boolean;
}

export interface SocialTooltipProps extends React.HTMLAttributes<HTMLUListElement> {
  items: SocialItem[];
}

/** Supplied circular fill interaction, with local SVGs and keyboard support. */
const SocialTooltip = React.forwardRef<HTMLUListElement, SocialTooltipProps>(
  ({ className, items, ...props }, ref) => (
    <ul ref={ref} className={cn('social-links', className)} {...props}>
      {items.map(item => {
        const contents = <>
          <span className="social-fill" aria-hidden="true" />
          <span className="social-symbol">
            {item.icon ?? <img src={item.svgUrl} alt="" width="28" height="28" />}
          </span>
        </>;
        return <li key={item.ariaLabel} className="social-item"
          style={{ '--social-fill': item.color, '--social-icon-color': item.iconColor ?? '#a4aab3' } as React.CSSProperties}>
          {item.href
            ? <a className="social-link" href={item.href} aria-label={item.ariaLabel}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}>{contents}</a>
            : <button className="social-link" type="button" aria-label={item.ariaLabel}
                aria-disabled="true">{contents}</button>}
          <span className="social-tooltip" aria-hidden="true">{item.tooltip}</span>
        </li>;
      })}
    </ul>
  ),
);

SocialTooltip.displayName = 'SocialTooltip';
export { SocialTooltip };
export default SocialTooltip;
