import { createRoot } from 'react-dom/client';
import { NotFound } from '@/components/ui/ghost-404-page-1';

const mount = document.getElementById('offline-root');
if (mount) createRoot(mount).render(<NotFound />);
