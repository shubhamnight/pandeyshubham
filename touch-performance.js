// Select touch devices, not a small laptop window. No appearance or motion
// settings are changed by this flag, including when a phone rotates.
export const touchPerformance = matchMedia('(pointer: coarse)').matches ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Measure the same resting center without clearing a live translate first.
// During the hero's rotated transition, retain the original measurement path.
export function layoutCenter(element, ancestor, bounds) {
  const matrix=new DOMMatrix(getComputedStyle(ancestor.parentElement).transform);
  if(matrix.a!==1||matrix.b!==0||matrix.c!==0||matrix.d!==1)return null;
  const translate=element.style.translate;
  if(translate&&translate!=='none'&&!/^-?[\d.]+px(?: -?[\d.]+px)?$/.test(translate))return null;
  const [x=0,y=0]=translate&&translate!=='none'?translate.split(' ').map(parseFloat):[];
  const rect=element.getBoundingClientRect();
  return {x:(rect.left-bounds.left+rect.width/2-x)*ancestor.clientWidth/Math.max(1,bounds.width),
    y:(rect.top-bounds.top+rect.height/2-y)*ancestor.clientHeight/Math.max(1,bounds.height)};
}

// Animation controllers need notifications only for inputs they consume.
// Exclude their own output fields so a completed mobile handoff stays idle.
export function watchInputs(object, keys, callback) {
  const previous=keys.map(key=>object[key]);
  return () => {
    let changed=false;
    for(let i=0;i<keys.length;i++){
      const value=object[keys[i]];
      if(previous[i]!==value){previous[i]=value;changed=true;}
    }
    if(changed)callback();
  };
}

// These transition values are consumed on the element that owns them. Their
// changing values must not invalidate the entire hero and Skills/Hobbies tree
// on every scroll frame. Unsupported engines keep the original CSS fallback.
if (typeof CSS !== 'undefined' && typeof CSS.registerProperty === 'function') {
  const properties=[
    ['--exit-scale', '<number>', '1'],
    ['--exit-rotation', '<angle>', '0deg'],
    ['--enter-scale', '<number>', '1'],
    ['--enter-rotation', '<angle>', '0deg'],
  ];
  if(touchPerformance)properties.push(
    ['--edge-x', '<length>', '0px'],
    ['--edge-y', '<length>', '3px'],
    ['--tilt-shadow-x', '<length>', '0px'],
    ['--tilt-shadow-y', '<length>', '0px'],
    ['--tilt-shadow-blur', '<length>', '40px'],
  );
  for (const [name, syntax, initialValue] of properties) {
    try { CSS.registerProperty({name, syntax, initialValue, inherits:false}); }
    catch { /* Another island may have registered this property already. */ }
  }
}
