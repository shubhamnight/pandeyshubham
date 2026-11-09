import { hydrateRoot } from 'react-dom/client';
import { GooeyLoader } from '@/components/ui/loader-10';

export function IntroLoading() {
  return <GooeyLoader primaryColor="#a3a3a3" secondaryColor="#ffffff" borderColor="#a3a3a3" />;
}

export function mountMessageLoading(host: HTMLElement) {
  // Reuse the server-rendered waves so hydration never restarts their phase.
  const root = hydrateRoot(host, <IntroLoading />, { identifierPrefix: 'intro-' });
  return () => root.unmount();
}
