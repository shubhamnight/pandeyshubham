/*! Adapted from React Bits AnimatedContent by David Haz. See /assets/React-Bits-LICENSE.txt. */
import { gsap } from 'gsap';

// The page already renders its content. Apply AnimatedContent's entrance
// tween to those nodes and give the observer control of its lifetime.
export function prepareContent(target, distance) {
  const context = gsap.context(() => gsap.set(target, { opacity: 0 }));
  const reveal = {
    started: false,
    play(delay, onComplete) {
      reveal.started = true;
      context.add(() => {
        // The portrait's CSS hover transition would otherwise ease each tween frame again.
        gsap.set(target, { transitionProperty: 'none' });
        gsap.fromTo(target, { y: distance, opacity: 0 }, {
          y: 0,
          opacity: 1,
          duration: .8,
          ease: 'power3.out',
          delay,
          onComplete,
        });
      });
    },
    reset: () => context.revert(),
  };
  return reveal;
}
