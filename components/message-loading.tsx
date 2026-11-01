import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { MessageLoading } from '@/components/ui/message-loading';

export function mountMessageLoading(host: HTMLElement) {
  const root = createRoot(host);
  // Replace the first-paint copy in one commit, without an empty loading frame.
  flushSync(() => root.render(<MessageLoading />));
  return () => root.unmount();
}
