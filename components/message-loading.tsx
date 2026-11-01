import { hydrateRoot } from 'react-dom/client';
import { GooeyLoader } from '@/components/ui/loader-10';

export function IntroLoading() {
  return <GooeyLoader primaryColor="#0297de" secondaryColor="#66c8f5" borderColor="#0297de" />;
}

export function mountMessageLoading(host: HTMLElement) {
  // Reuse the server-rendered waves so hydration never restarts their phase.
  const root = hydrateRoot(host, <IntroLoading />, { identifierPrefix: 'intro-' });
  return () => root.unmount();
}
