// Start with the actual physical buffer. The default 300x150 canvas followed
// by setPixelRatio and an observer resize creates unnecessary GPU reallocations.
export function createHobbyRenderer(Renderer,button,pixelRatio){
  const width=Math.max(1,button.clientWidth),height=Math.max(1,button.clientHeight);
  const canvas=document.createElement('canvas');canvas.style.display='block';
  canvas.width=Math.floor(width*pixelRatio);canvas.height=Math.floor(height*pixelRatio);
  const renderer=new Renderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setDrawingBufferSize(width,height,pixelRatio);
  return renderer;
}
