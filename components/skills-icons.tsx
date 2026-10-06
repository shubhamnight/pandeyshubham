import { createRoot } from 'react-dom/client';
import type { CSSProperties } from 'react';
import FancyButton from '@/components/ui/shiny-button';

// Match the colors in the local SVGs, including both hues for multicolor logos.
const glowColors: Record<string, readonly [string, string]> = {
  Figma: ['162, 89, 255', '10, 207, 131'],
  Sketch: ['253, 179, 0', '234, 108, 0'],
  HTML: ['228, 77, 38', '241, 101, 41'],
  CSS: ['21, 114, 182', '51, 169, 220'],
  JavaScript: ['240, 219, 79', '240, 219, 79'],
  Python: ['90, 159, 212', '255, 212, 59'],
  DBMS: ['77, 182, 172', '128, 203, 196'],
  React: ['97, 218, 251', '97, 218, 251'],
  'Autodesk Maya': ['0, 168, 168', '153, 203, 210'],
  Claude: ['217, 119, 87', '217, 119, 87'],
  ChatGPT: ['255, 255, 255', '255, 255, 255'],
  Antigravity: ['49, 134, 255', '0, 185, 92'],
  Communication: ['129, 140, 248', '56, 189, 248'],
  'Problem solving': ['167, 139, 250', '167, 139, 250'],
};

/** Keep the native orbit holders and tooltip nodes; replace only their icon contents. */
export async function mountSkillsIcons(section: HTMLElement) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./skills-icons.css', import.meta.url).href;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => { clearTimeout(timeout); stylesheet.onload = stylesheet.onerror = null; };
    const timeout = window.setTimeout(() => { cleanup(); stylesheet.remove(); reject(new Error('Skills styles took too long to load.')); }, 15000);
    stylesheet.onload = () => { cleanup(); resolve(); };
    stylesheet.onerror = () => { cleanup(); stylesheet.remove(); reject(new Error('Skills styles could not load.')); };
    document.head.append(stylesheet);
  });
  const roots: ReturnType<typeof createRoot>[] = [];
  section.querySelectorAll<HTMLElement>('.skills-orbit-disc').forEach(disc => {
    const mount = disc.querySelector<HTMLElement>('.skills-orbit-symbol');
    const image = mount?.querySelector('img');
    const name = disc.getAttribute('aria-label');
    if (!mount || !image || !name) return;
    const src = image.getAttribute('src') ?? '';
    const autoFocus = document.activeElement === disc;
    const [glow, secondaryGlow] = glowColors[name] ?? ['231, 235, 240', '231, 235, 240'];
    mount.removeAttribute('aria-hidden');
    disc.removeAttribute('role'); disc.removeAttribute('tabindex');
    const root = createRoot(mount);
    root.render(<FancyButton className="skill-shiny-button" ariaLabel={name}
      autoFocus={autoFocus} style={{
        '--skill-glow': glow,
        '--skill-glow-secondary': secondaryGlow,
      } as CSSProperties} icon={
        <img className="skill-logo" src={src} width={28} height={28} alt="" aria-hidden="true"
          decoding="async" draggable={false} />
      } />);
    roots.push(root);
  });
  return () => { roots.forEach(root => root.unmount()); stylesheet.remove(); };
}
