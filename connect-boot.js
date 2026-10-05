// Load the shared Aether background and social links near the contact section.
let componentModule = null;
function loadComponent() {
  return componentModule ??= import('./assets/ui/connect-page.js').catch(error => {
    componentModule = null;
    throw error;
  });
}
const contactStage = document.querySelector('#contact');
const backgroundHost = contactStage?.querySelector('.connect-aether-mount');
if (contactStage && backgroundHost) {
  let disposeBackground = null;
  let disposed = false;
  const backgroundObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    backgroundObserver.disconnect();
    loadComponent()
      .then(module => disposed ? null : module.mountConnectBackground(backgroundHost))
      .then(cleanup => { if (disposed) cleanup?.(); else disposeBackground = cleanup; })
      .catch(error => { console.error('Aether background could not load; keeping the contact background.', error); });
  }, { rootMargin: '450px 0px' });
  backgroundObserver.observe(contactStage);
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    disposed = true;
    backgroundObserver.disconnect();
    disposeBackground?.();
  });
}
const socialStage = document.querySelector('.footer-socials');
const socialHost = socialStage?.querySelector('.social-icons-mount');
if (socialStage && socialHost) {
  let disposeSocials = null;
  const controller = new AbortController();
  const socialObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    socialObserver.disconnect();
    Promise.all([
      loadComponent(),
      fetch('./social-links.json', { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error('Social links could not load.');
        return response.json();
      }),
    ])
      .then(([module, links]) => controller.signal.aborted ? null : module.mountSocialIcons(socialHost, links))
      .then(cleanup => { if (controller.signal.aborted) cleanup?.(); else disposeSocials = cleanup; })
      .catch(error => {
        if (error.name !== 'AbortError') console.error('Social icons could not load; using the static fallback.', error);
      });
  }, { rootMargin: '450px 0px' });
  socialObserver.observe(socialStage);
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    socialObserver.disconnect();
    controller.abort();
    disposeSocials?.();
  });
}
