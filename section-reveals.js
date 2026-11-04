const motion = matchMedia('(prefers-reduced-motion: reduce)');
if (!motion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      if (location.hash || motion.matches || target.contains(document.activeElement)) continue;
      target.classList.add('section-arriving');
      const settle = () => {
        target.classList.remove('section-arriving');
        target.removeEventListener('animationend', settle);
        target.removeEventListener('animationcancel', settle);
      };
      target.addEventListener('animationend', settle);
      target.addEventListener('animationcancel', settle);
    }
  }, { threshold: 0.08 });
  document.querySelectorAll('#about, #projects').forEach(section => observer.observe(section));
}
