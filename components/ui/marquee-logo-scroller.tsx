import type { ReactNode } from 'react';

export interface MarqueeLogo {
  name: string;
  src: string;
}

export interface MarqueeLogoScrollerProps {
  title: ReactNode;
  description: ReactNode;
  logos: MarqueeLogo[];
}

/** Static markup; the portfolio controller progressively enables movement. */
export function MarqueeLogoScroller({ title, description, logos }: MarqueeLogoScrollerProps) {
  const rows = [logos.slice(0, 7), logos.slice(7)];
  return <section className="intro section light-section scroll-section" id="about" aria-labelledby="skills-heading">
    <div className="skills-heading" data-animated-content=""><div><span className="editorial-label">Skills</span><h2 id="skills-heading">{title}</h2></div><p>{description}</p></div>
    <div className="skills-orbit-stage">
      {rows.map((row, rowIndex) => <div className="skills-marquee" data-animated-content="" data-direction={rowIndex ? 'reverse' : 'forward'} key={rowIndex}>
        <div className="skills-marquee-track">
          {[false, true].map(copy => <ul className="skills-orbit-list" key={String(copy)}
            data-skills-primary={copy ? undefined : ''} aria-label={copy ? undefined : `Skills, row ${rowIndex + 1}`}
            aria-hidden={copy ? 'true' : undefined}>
            {row.map(logo => {
              const content = <><span className="skills-orbit-symbol" aria-hidden="true">
                <span className="skills-logo-hit"><img className="skill-logo" src={logo.src} width={28} height={28} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} /></span>
              </span><span className="skills-orbit-name">{logo.name}</span></>;
              return <li className="skills-orbit-slot" key={logo.name}>
                {copy ? <span className="skills-orbit-disc" data-skill={logo.name}>{content}</span>
                  : <button className="skills-orbit-disc" type="button" data-skill={logo.name}
                    aria-label={logo.name}>{content}</button>}
              </li>;
            })}
          </ul>)}
        </div>
      </div>)}
    </div>
  </section>;
}
