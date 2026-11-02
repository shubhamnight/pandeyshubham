interface OverlayStyle {
  stylesheet: URL;
  containerClass: string;
  label: string;
  errorLabel?: string;
}

/** The four galleries share stylesheet readiness, cancellation and timeout handling. */
export async function prepareOverlayHost(host: HTMLElement, options: OverlayStyle, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Gallery closed', 'AbortError');
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.replaceChildren();
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = options.stylesheet.href;
  const container = document.createElement('div');
  container.className = options.containerClass;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      stylesheet.onload = stylesheet.onerror = null;
    };
    const abort = () => {
      cleanup(); stylesheet.remove();
      reject(new DOMException('Gallery closed', 'AbortError'));
    };
    const timeout = window.setTimeout(() => {
      cleanup(); reject(new Error(`${options.label} styles took too long to load.`));
    }, 15000);
    stylesheet.onload = () => { cleanup(); resolve(); };
    stylesheet.onerror = () => {
      cleanup(); reject(new Error(`${options.errorLabel ?? options.label} styles could not load.`));
    };
    signal?.addEventListener('abort', abort, { once: true });
    shadow.append(stylesheet, container);
  });
  return { shadow, container };
}
