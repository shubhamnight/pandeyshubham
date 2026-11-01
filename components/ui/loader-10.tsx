import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GooeyLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  primaryColor?: string;
  secondaryColor?: string;
  borderColor?: string;
}

const GooeyLoader = React.forwardRef<HTMLDivElement, GooeyLoaderProps>(
  ({ className, primaryColor, secondaryColor, borderColor, style, ...props }, ref) => {
    const filterId = `gooey-loader-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const variables = {
      '--gooey-primary-color': primaryColor || 'hsl(var(--primary))',
      '--gooey-secondary-color': secondaryColor || 'hsl(var(--secondary))',
      '--gooey-border-color': borderColor || 'hsl(var(--border))',
      '--gooey-filter': `url(#${filterId})`,
      ...style,
    } as React.CSSProperties;

    return (
      <div ref={ref} data-gooey-loader="" className={cn('relative flex items-center justify-center text-sm', className)}
        style={variables} role="status" aria-label="Loading" {...props}>
        <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true" focusable="false">
          <defs>
            <filter id={filterId} x="-25%" y="-100%" width="150%" height="300%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation={5} result="blur" />
              <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
            </filter>
          </defs>
        </svg>
        <style>{`
          [data-gooey-loader]{position:relative;display:flex;align-items:center;justify-content:center;font-size:14px}
          .gooey-loader{box-sizing:border-box;width:12em;height:3em;position:relative;overflow:hidden;border:0 solid transparent;border-radius:12px;isolation:isolate}
          .gooey-loader-waves{position:absolute;inset:0;filter:var(--gooey-filter);opacity:var(--gooey-wave-opacity,1);pointer-events:none}
          .gooey-loader-base{position:absolute;left:0;right:0;bottom:0;height:8px;border-radius:999px;background:var(--gooey-border-color);opacity:var(--gooey-base-opacity,1);pointer-events:none}
          .gooey-loader-waves::before,.gooey-loader-waves::after{content:'';position:absolute;border-radius:50%;pointer-events:none}
          .gooey-loader-waves::before{width:22em;height:18em;background-color:var(--gooey-primary-color);left:-2em;bottom:-18em;animation:gooey-loader-spin 4s linear infinite,gooey-loader-sway1 4s cubic-bezier(.37,0,.63,1) infinite}
          .gooey-loader-waves::after{width:16em;height:12em;background-color:var(--gooey-secondary-color);left:-4em;bottom:-12em;animation:gooey-loader-spin 4s linear infinite -.75s,gooey-loader-sway2 4s cubic-bezier(.37,0,.63,1) infinite -.75s}
          @keyframes gooey-loader-spin{from{rotate:0deg}to{rotate:360deg}}
          @keyframes gooey-loader-sway1{0%,100%{translate:-6em calc(-1 * var(--gooey-wave-rise,0px))}50%{translate:3em calc(-1 * var(--gooey-wave-rise,0px))}}
          @keyframes gooey-loader-sway2{0%,100%{translate:-1em calc(-1 * var(--gooey-wave-rise,0px))}50%{translate:5em calc(-1 * var(--gooey-wave-rise,0px))}}
          .intro-loader-paused .gooey-loader-waves::before,.intro-loader-paused .gooey-loader-waves::after{animation-play-state:paused}
          @media(prefers-reduced-motion:reduce){.gooey-loader-waves::before{animation:none;rotate:90deg;translate:-3em 0}.gooey-loader-waves::after{animation:none;rotate:90deg;translate:1em 0}}
        `}</style>
        <div className="gooey-loader"><div className="gooey-loader-waves"><div className="gooey-loader-base" /></div></div>
      </div>
    );
  }
);
GooeyLoader.displayName = 'GooeyLoader';
export { GooeyLoader };
