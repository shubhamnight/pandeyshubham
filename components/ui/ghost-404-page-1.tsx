import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { FlowButton } from '@/components/ui/flow-button';
import { OfflineBatman } from '@/components/ui/offline-batman';

const ease = [0.43, 0.13, 0.23, 0.96] as const;
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: .7, ease, delayChildren: .1, staggerChildren: .1 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: .6, ease } },
};
const numberVariants: Variants = {
  hidden: (direction: number) => ({ opacity: 0, x: direction * 40, y: 15, rotate: direction * 5 }),
  visible: { opacity: .7, x: 0, y: 0, rotate: 0, transition: { duration: .8, ease } },
};

function returnTarget() {
  const params = new URLSearchParams(location.search);
  const requested = location.pathname === '/offline.html'
    ? params.get('returnTo') ?? '/'
    : location.pathname + location.search + location.hash;
  try {
    const target = new URL(requested, location.origin);
    if (target.origin === location.origin && target.pathname !== '/offline.html') {
      return target.pathname + target.search + target.hash;
    }
  } catch { /* Ignore invalid return addresses. */ }
  return '/';
}

/** The supplied offline layout, featuring the portfolio's Batman model. */
export function NotFound() {
  const reduce = useReducedMotion();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState('We’ll bring you back when your connection returns.');
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const target = useRef(returnTarget());
  const preview = location.pathname === '/offline.html' && new URLSearchParams(location.search).has('preview');

  async function retry() {
    if (pending.current) return;
    if (!navigator.onLine) {
      setStatus('Still offline. Check your connection and try again.');
      return;
    }
    pending.current = true;
    setChecking(true);
    setStatus('Checking your connection…');
    const request = new AbortController();
    controller.current = request;
    const timeout = window.setTimeout(() => request.abort(), 5000);
    try {
      const response = await fetch(`/favicon.ico?connection-check=${Date.now()}`, {
        cache: 'no-store', signal: request.signal,
      });
      if (!response.ok) throw new Error('Connection unavailable');
      location.replace(target.current);
    } catch {
      if (controller.current === request) setStatus('Couldn’t reconnect. Please try again in a moment.');
    } finally {
      clearTimeout(timeout);
      pending.current = false;
      if (controller.current === request) { controller.current = null; setChecking(false); }
    }
  }

  useEffect(() => {
    const online = () => { if (!preview) void retry(); };
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('online', online);
      const request = controller.current;
      controller.current = null;
      request?.abort();
    };
  }, [preview]);

  return <main className="offline-page" aria-labelledby="offline-heading">
    <motion.div className="offline-content" variants={containerVariants}
      initial={reduce ? false : 'hidden'} animate="visible">
      <div className="offline-art" aria-hidden="true">
        <motion.span className="offline-word" variants={numberVariants} custom={-1}>OFF</motion.span>
        <motion.div initial={reduce ? false : { scale: .8, opacity: 0, rotate: -5 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: reduce ? 0 : .6, ease }}>
          <motion.div animate={reduce ? { y: 0 } : { y: [-5, 5] }}
            transition={reduce ? { duration: 0 } : { duration: 2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
            whileHover={reduce ? undefined : { scale: 1.1 }}>
            <OfflineBatman />
          </motion.div>
        </motion.div>
        <motion.span className="offline-word" variants={numberVariants} custom={1}>LINE</motion.span>
      </div>
      <motion.h1 id="offline-heading" variants={itemVariants}>Connection missing!</motion.h1>
      <motion.p className="offline-description" variants={itemVariants}>
        Looks like your internet disappeared.<br />Reconnect and let’s pick up where we left off.
      </motion.p>
      <motion.div className="offline-action" variants={itemVariants}>
        <FlowButton text={checking ? 'Checking…' : 'Try again'} onClick={() => void retry()} disabled={checking}
          aria-describedby="offline-status" />
      </motion.div>
      <motion.p id="offline-status" className="offline-status" role="status" aria-live="polite" variants={itemVariants}>{status}</motion.p>
    </motion.div>
  </main>;
}
