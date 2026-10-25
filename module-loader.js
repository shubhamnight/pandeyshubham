// Failed module fetches remain in the browser's module map. Retry a transient
// fetch once with a fresh URL; never re-run a module that threw during execution.
const pending=new Map(),generations=new Map();
export function importPortfolioModule(path){
  const base=new URL(path,document.baseURI).href;
  if(pending.has(base))return pending.get(base);
  const attempt=()=>{
    const generation=generations.get(base)||0,url=new URL(base);
    if(generation)url.searchParams.set('portfolio-retry',String(generation));
    return import(url.href);
  };
  const retryable=error=>error instanceof TypeError&&
    /fetch dynamically imported|error loading dynamically imported|importing a module script|load module script/i.test(error.message);
  const request=attempt().catch(error=>{
    if(!retryable(error))throw error;
    generations.set(base,(generations.get(base)||0)+1);
    return attempt();
  }).catch(error=>{
    if(!retryable(error))throw error;
    const url=new URL(base);
    if(!/\/assets\/ui\/(?:skills-icons|photography-carousel|gaming-overlay|travel-overlay|music-overlay)\.js$/.test(url.pathname))throw error;
    // A failed shared dependency stays cached even with a fresh entry URL.
    // This build of the same component has no shared import dependencies and
    // is requested only on recovery, preserving the normal lightweight path.
    url.pathname=url.pathname.replace(/\.js$/,'-recovery.js');url.search='';url.hash='';
    const generation=generations.get(base)||0;
    if(generation>1)url.searchParams.set('portfolio-retry',String(generation));
    return import(url.href);
  }).catch(error=>{
    pending.delete(base);
    generations.set(base,(generations.get(base)||0)+1);
    throw error;
  });
  pending.set(base,request);return request;
}
