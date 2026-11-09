import{a as oe,b as re,c as ae}from"./chunks/shared-KHZ4EYKN.js";import{a as nt,b as _e,d as Ie,e as Rt}from"./chunks/shared-WUVOZALB.js";var le=nt(Ie());var W=nt(_e());var _t=nt(Rt());var Oe=`#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aMotion;
layout(location = 2) in vec2 aState;

uniform vec2 uResolution;
uniform float uSize;
uniform float uSwell;
uniform float uStretch;
uniform float uGlow;

out vec2 vLocal;
out vec2 vPoint;
out float vLength;
out float vRadius;
out float vEnergy;

void main() {
  float energy = aState.x;
  float radius = 0.5 * uSize * aState.y * (1.0 + uSwell * energy);
  float speed = length(aMotion.zw);
  float angle = speed > 0.001 ? atan(aMotion.w, aMotion.z) : 0.0;
  float axis = floor(angle / 1.5707963 + 0.5) * 1.5707963;
  angle = axis + (angle - axis) * smoothstep(8.0, 70.0, speed);
  vec2 dir = vec2(cos(angle), sin(angle));
  float halfLength = min(uSize * 2.0, speed * uStretch * 0.02);
  float pad = radius * (1.0 + uGlow * energy * 2.5) + 2.0;
  vec2 local = aCorner * vec2(halfLength + pad, pad);
  vec2 point = aMotion.xy + dir * local.x + vec2(-dir.y, dir.x) * local.y;
  vLocal = local;
  vPoint = point;
  vLength = halfLength;
  vRadius = radius;
  vEnergy = energy;
  vec2 clip = point / uResolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`,Ye=`#version 300 es
precision highp float;

in vec2 vLocal;
in vec2 vPoint;
in float vLength;
in float vRadius;
in float vEnergy;

uniform vec2 uResolution;
uniform vec3 uBase;
uniform vec3 uActive;
uniform float uGlow;
uniform float uOpacity;
uniform float uFade;
uniform int uShape;

out vec4 outColor;

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  float d;
  if (uShape == 1) {
    float corner = vRadius * 0.3;
    vec2 q = abs(vLocal) - vec2(vLength + vRadius, vRadius) + corner;
    d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner;
  } else {
    d = length(vec2(max(abs(vLocal.x) - vLength, 0.0), vLocal.y)) - vRadius;
  }
  float aa = max(fwidth(d), 0.0001);
  float body = clamp(0.5 - d / aa, 0.0, 1.0);
  float halo = uGlow * vEnergy * 0.5 * exp(-max(d, 0.0) / max(vRadius * 1.3, 0.6));
  float alpha = body + (1.0 - body) * halo;
  vec3 color = mix(uBase, uActive, clamp(vEnergy * 1.2, 0.0, 1.0));
  float fade = 1.0;
  if (uFade > 0.0) {
    vec2 edge = min(vPoint, uResolution - vPoint) / (uFade * 0.4 * min(uResolution.x, uResolution.y));
    fade = smootherstep01(edge.x) * smootherstep01(edge.y);
  }
  alpha *= uOpacity * fade;
  outColor = vec4(color * alpha, alpha);
}
`,ie=g=>{let h=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(g).trim());if(!h)return[1,1,1];let v=h[1].length===3?h[1].replace(/./g,w=>w+w):h[1];return[0,2,4].map(w=>parseInt(v.slice(w,w+2),16)/255)},Tt=g=>{let h=Math.min(1,Math.max(0,g));return h*h*h*(h*(h*6-15)+10)},Ce=g=>{let v=g-1;return 1+v*v*((1.9+1)*v+1.9)},se=(g,h,v)=>{let w=g.createShader(h);return w?(g.shaderSource(w,v),g.compileShader(w),w):null},ze=({dotSize:g=5,gap:h=18,baseColor:v="#3a3446",activeColor:w="#ffffff",proximity:It=140,strength:fe=1,bounce:de=.6,tension:he=.4,returnDuration:me=.8,shockRadius:pe=320,shockStrength:ye=5,swell:Ot=.8,stretch:Yt=.5,glow:Ct=.5,shape:zt="circle",fade:Dt=0,opacity:Gt=1,intro:ge=!0,mouseInteraction:Ut=!0,clickShock:xe=!0,paused:Vt=!1,dpr:ve,className:we="",style:Ae})=>{let Xt=(0,W.useRef)(null),ft=(0,W.useRef)(null),kt={dotSize:g,gap:h,baseColor:v,activeColor:w,proximity:It,strength:fe,bounce:de,tension:he,returnDuration:me,shockRadius:pe,shockStrength:ye,swell:Ot,stretch:Yt,glow:Ct,shape:zt,fade:Dt,opacity:Gt,intro:ge,mouseInteraction:Ut,clickShock:xe,paused:Vt,dpr:ve},B=(0,W.useRef)(kt);return B.current=kt,(0,W.useEffect)(()=>{let b=Xt.current;if(!b)return;let dt=b.closest(".hero-dot-grid"),ht=dt.closest("#home"),t;try{t=b.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1})}catch{return}if(!t)return;let P=t.createProgram();if(!P)return;let mt=[se(t,t.VERTEX_SHADER,Oe),se(t,t.FRAGMENT_SHADER,Ye)];if(mt.some(e=>!e)){mt.forEach(e=>t.deleteShader(e)),t.deleteProgram(P);return}if(mt.forEach(e=>t.attachShader(P,e)),t.linkProgram(P),mt.forEach(e=>t.deleteShader(e)),!t.getProgramParameter(P,t.LINK_STATUS)){t.deleteProgram(P);return}let F={};for(let e of["uResolution","uSize","uSwell","uStretch","uGlow","uBase","uActive","uOpacity","uFade","uShape"])F[e]=t.getUniformLocation(P,e);let ot=t.createVertexArray(),pt=t.createBuffer(),K=t.createBuffer();if(!ot||!pt||!K){t.deleteVertexArray(ot),t.deleteBuffer(pt),t.deleteBuffer(K),t.deleteProgram(P);return}t.bindVertexArray(ot),t.bindBuffer(t.ARRAY_BUFFER,pt),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0),t.bindBuffer(t.ARRAY_BUFFER,K),t.enableVertexAttribArray(1),t.vertexAttribPointer(1,4,t.FLOAT,!1,24,0),t.vertexAttribDivisor(1,1),t.enableVertexAttribArray(2),t.vertexAttribPointer(2,2,t.FLOAT,!1,24,16),t.vertexAttribDivisor(2,1),t.bindVertexArray(null);let yt=window.matchMedia("(prefers-reduced-motion: reduce)").matches,c={width:0,height:0,left:0,top:0,ratio:1},p={count:0,cols:1,rows:1,cell:1,centerX:0,centerY:0,reach:1},O=new Float32Array(0),s=new Float32Array(0),l=new Float32Array(0),rt=new Float32Array(0),gt=new Float32Array(0),A=new Float32Array(0),Ft=new Float32Array(0),Y=new Float32Array(0),n={x:0,y:0,vx:0,vy:0,time:0,inside:!1,presence:0},V=[],S=B.current.intro&&!yt?-1:null,St=!1,C=()=>!St&&!document.hidden&&!ht.classList.contains("hero-idle")&&!B.current.paused&&!t.isContextLost(),Q=0,Et=0,Nt=()=>{let{dotSize:e,gap:o}=B.current,r=Math.max(2,e+o),m=Math.max(1,Math.floor((c.width+o)/r)),R=Math.max(1,Math.floor((c.height+o)/r)),T=(c.width-(m*r-o))/2+e/2,M=(c.height-(R*r-o))/2+e/2,f=m*R;O=new Float32Array(f*2),s=new Float32Array(f*2),l=new Float32Array(f*2),rt=new Float32Array(f*2),gt=new Float32Array(f*2),A=new Float32Array(f*4),Ft=new Float32Array(f),Y=new Float32Array(f*6);for(let x=0;x<R;x++)for(let d=0;d<m;d++){let _=(x*m+d)*2;O[_]=T+d*r,O[_+1]=M+x*r}Object.assign(p,{count:f,cols:m,rows:R,cell:r,centerX:c.width/2,centerY:c.height/2,reach:Math.hypot(c.width,c.height)/2}),t.bindBuffer(t.ARRAY_BUFFER,K),t.bufferData(t.ARRAY_BUFFER,Y.byteLength,t.DYNAMIC_DRAW)},Me=()=>{let e=oe("background",Math.min(B.current.dpr??2,2)),o=Math.max(1,b.clientWidth),r=Math.max(1,b.clientHeight);o===c.width&&r===c.height&&e===c.ratio||(Object.assign(c,{width:o,height:r,ratio:e}),b.width=Math.round(o*e),b.height=Math.round(r*e),Nt(),xt(performance.now()))},be=(e,o)=>{let r=B.current,m=yt?0:1,R=1-.85*Math.min(1,Math.max(0,r.bounce)),T=4/(R*Math.max(.2,r.returnDuration)),M=T*T,f=2*R*T,x=Math.max(1,r.proximity),d=Math.hypot(n.vx,n.vy),_=r.mouseInteraction&&n.inside?6500*Math.tanh(d/900)*r.strength*m:0,vt=d>.001?n.vx/d:0,wt=d>.001?n.vy/d:0,z=p.cell*1.4,ct=650,D=V.map(u=>{let i=(o-u.start)/1e3*ct,y=Tt(1-i/Math.max(1,r.shockRadius));return{...u,front:i,amplitude:y*r.shockStrength*p.cell*.24*m}}),I=(Math.max(0,r.tension)*900)**2/(p.cell*p.cell),$=Math.sqrt(I)*.06,Pe=Math.sqrt(M+8*I)+f+8*$,Jt=Math.min(24,Math.max(1,Math.ceil(e/Math.min(1/120,1.2/Pe)))),Bt=e/Jt;for(let u=0;u<p.count;u++){let i=u*2,y=O[i],a=O[i+1],Z=0,tt=0;if(_>0){let G=y+s[i]-n.x,lt=a+s[i+1]-n.y,U=Math.hypot(G,lt);if(U<x){let j=Tt(1-U/x)*_,et=U>.001?G/U:0,ut=U>.001?lt/U:0;Z+=j*(vt+et*.6),tt+=j*(wt+ut*.6)}}let k=0,N=0,q=0,H=0;for(let G of D){if(G.amplitude<=0)continue;let lt=y-G.x,U=a-G.y,j=Math.hypot(lt,U),et=(j-G.front)/z;if(Math.abs(et)<3&&j>.001){let ut=lt/j,Pt=U/j,ee=Math.exp(-et*et),bt=G.amplitude*ee,ne=G.amplitude*2*et*ee/z*ct;k+=ut*bt,N+=Pt*bt,q+=ut*ne,H+=Pt*ne,Z+=ut*bt*M*.35,tt+=Pt*bt*M*.35}}rt[i]=Z,rt[i+1]=tt;let Mt=u*4;A[Mt]=k,A[Mt+1]=N,A[Mt+2]=q,A[Mt+3]=H}let{cols:At,rows:Zt}=p,X=At*2;for(let u=0;u<Jt;u++){for(let i=0;i<Zt;i++)for(let y=0;y<At;y++){let a=(i*At+y)*2,Z=rt[a]-M*s[a]-f*l[a],tt=rt[a+1]-M*s[a+1]-f*l[a+1];if(I>0){let k=-4*s[a],N=-4*s[a+1],q=-4*l[a],H=-4*l[a+1];y>0&&(k+=s[a-2],N+=s[a-1],q+=l[a-2],H+=l[a-1]),y<At-1&&(k+=s[a+2],N+=s[a+3],q+=l[a+2],H+=l[a+3]),i>0&&(k+=s[a-X],N+=s[a-X+1],q+=l[a-X],H+=l[a-X+1]),i<Zt-1&&(k+=s[a+X],N+=s[a+X+1],q+=l[a+X],H+=l[a+X+1]),Z+=I*k+$*q,tt+=I*N+$*H}gt[a]=l[a]+Z*Bt,gt[a+1]=l[a+1]+tt*Bt}for(let i=0;i<s.length;i++)l[i]=gt[i],s[i]+=l[i]*Bt}for(let u=0;u<p.count;u++){let i=u*2,y=u*4;Ft[u]=Math.min(1,Math.hypot(l[i]+A[y+2],l[i+1]+A[y+3])/380*.85+Math.hypot(s[i]+A[y],s[i+1]+A[y+1])/(p.cell*2.2)*.35)}for(let u=V.length-1;u>=0;u--)D[u].front>r.shockRadius+z*3&&V.splice(u,1);let te=1-Math.exp(-e/.08);n.vx-=n.vx*te,n.vy-=n.vy*te;let Te=r.mouseInteraction&&n.inside?1:0;n.presence+=(Te-n.presence)*(1-Math.exp(-e/.2))},xt=e=>{let o=B.current,r=Math.max(1,o.proximity),R=(S===null?1/0:S<0?0:(e-S)/1e3)*p.reach*1.25,T=p.cell*4;for(let x=0;x<p.count;x++){let d=x*2,_=x*4,vt=O[d]+s[d]+A[_],wt=O[d+1]+s[d+1]+A[_+1],z=Ft[x];if(n.presence>.001){let I=Math.hypot(vt-n.x,wt-n.y);I<r&&(z=Math.max(z,Tt(1-I/r)*.4*n.presence))}let ct=1;if(S!==null){let I=Math.hypot(O[d]-p.centerX,O[d+1]-p.centerY),$=Math.min(1,Math.max(0,(R-I)/T));ct=$>=1?1:Math.max(0,Ce($)),z=Math.max(z,Math.sin($*Math.PI)*.6)}let D=x*6;Y[D]=vt,Y[D+1]=wt,Y[D+2]=l[d]+A[_+2],Y[D+3]=l[d+1]+A[_+3],Y[D+4]=z,Y[D+5]=ct}let M=ie(o.baseColor),f=ie(o.activeColor);t.viewport(0,0,b.width,b.height),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),t.enable(t.BLEND),t.blendFunc(t.ONE,t.ONE_MINUS_SRC_ALPHA),t.useProgram(P),t.uniform2f(F.uResolution,c.width,c.height),t.uniform1f(F.uSize,Math.max(.5,o.dotSize)),t.uniform1f(F.uSwell,yt?0:Math.max(0,o.swell)),t.uniform1f(F.uStretch,yt?0:Math.max(0,o.stretch)),t.uniform1f(F.uGlow,Math.max(0,o.glow)),t.uniform3f(F.uBase,M[0],M[1],M[2]),t.uniform3f(F.uActive,f[0],f[1],f[2]),t.uniform1f(F.uOpacity,Math.min(1,Math.max(0,o.opacity))),t.uniform1f(F.uFade,Math.min(1,Math.max(0,o.fade))),t.uniform1i(F.uShape,o.shape==="square"?1:0),t.bindVertexArray(ot),t.bindBuffer(t.ARRAY_BUFFER,K),t.bufferSubData(t.ARRAY_BUFFER,0,Y),t.drawArraysInstanced(t.TRIANGLE_STRIP,0,4,p.count),t.bindVertexArray(null)},Re=e=>{if(V.length)return!1;if(S!==null){if(S<0||(e-S)/1e3<1.6)return!1;S=null}if(Math.abs(n.vx)+Math.abs(n.vy)>1)return!1;let o=B.current.mouseInteraction&&n.inside?1:0;if(Math.abs(o-n.presence)>.002)return!1;for(let r=0;r<s.length;r++)if(Math.abs(s[r])>.02||Math.abs(l[r])>.5)return!1;return!0},qt=e=>{if(Q=0,!C())return;S!==null&&S<0&&(S=e);let o=Math.min(.05,(e-Et)/1e3||0);Et=e,be(o,e),xt(e),Re(e)||(ae(e),Q=requestAnimationFrame(qt))},J=()=>{Q||!C()||(Et=performance.now(),Q=requestAnimationFrame(qt))},Ht=e=>{let o=b.getBoundingClientRect();return[(e.clientX-o.left)*c.width/o.width,(e.clientY-o.top)*c.height/o.height]},Wt=e=>e instanceof Element&&ht.contains(e)&&!e.closest('.hero-copy, .badge-rig, a, button, input, select, textarea, [role="button"], [contenteditable]'),E,at=new Set,Fe=e=>{if(E?.id===e.pointerId&&Math.hypot(e.clientX-E.x,e.clientY-E.y)>10&&(E=null),!C()||!B.current.mouseInteraction||e.pointerType!=="mouse"||e.buttons)return;if(!ht.contains(e.target)){n.inside&&Lt();return}let[o,r]=Ht(e),m=o>=0&&r>=0&&o<=c.width&&r<=c.height,R=e.timeStamp||performance.now();if(m&&n.inside&&n.time){let T=Math.max(4,R-n.time)/1e3,M=(o-n.x)/T,f=(r-n.y)/T;n.vx+=(M-n.vx)*.6,n.vy+=(f-n.vy)*.6}else n.vx=0,n.vy=0;n.x=o,n.y=r,n.time=R,(m!==n.inside||m)&&(n.inside=m,J())},Lt=()=>{E=null,n.inside&&(n.inside=!1,n.time=0,J())},Se=e=>{e.pointerType==="mouse"&&!e.relatedTarget&&Lt()},Ee=e=>{if(e.pointerType==="touch"&&at.add(e.pointerId),at.size>1){E=null;return}!C()||!B.current.clickShock||e.button!==0||!e.isPrimary||!Wt(e.target)||(E={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp})},Qt=e=>{at.delete(e.pointerId),E?.id===e.pointerId&&(E=null)},Le=e=>{let o=E;if(Qt(e),o?.id!==e.pointerId||!C()||Math.hypot(e.clientX-o.x,e.clientY-o.y)>10||e.pointerType==="touch"&&e.timeStamp-o.time>350||!Wt(document.elementFromPoint(e.clientX,e.clientY)))return;let[r,m]=Ht(e);r<0||m<0||r>c.width||m>c.height||(V.push({x:r,y:m,start:performance.now()}),V.length>6&&V.shift(),J())},$t=new AbortController,L={passive:!0,signal:$t.signal};window.addEventListener("pointermove",Fe,L),window.addEventListener("pointerdown",Ee,L),window.addEventListener("pointerup",Le,L),window.addEventListener("pointercancel",Qt,L),window.addEventListener("pointerout",Se,L),window.addEventListener("blur",()=>{at.clear(),Lt()},L);let it=()=>{C()&&(Me(),t.isContextLost()||dt.setAttribute("data-grid-ready",""),J())},jt=new ResizeObserver(it);jt.observe(b);let Be=re(it),st=()=>{C()?it():(cancelAnimationFrame(Q),Q=0,E=null,at.clear(),Object.assign(n,{inside:!1,time:0,vx:0,vy:0,presence:0}),V.length=0)},Kt=new MutationObserver(st);return Kt.observe(ht,{attributes:!0,attributeFilter:["class"]}),document.addEventListener("visibilitychange",st,L),window.addEventListener("resize",it,L),window.addEventListener("pagehide",()=>{St=!0,st()},L),window.addEventListener("pageshow",()=>{St=!1,st()},L),b.addEventListener("webglcontextlost",()=>{dt.removeAttribute("data-grid-ready"),st()},L),it(),ft.current={rebuild:()=>{!C()||!c.width||(Nt(),xt(performance.now()),J())},refresh:()=>{!C()||!c.width||(xt(performance.now()),J())}},()=>{cancelAnimationFrame(Q),jt.disconnect(),Kt.disconnect(),Be(),$t.abort(),dt.removeAttribute("data-grid-ready"),t.deleteBuffer(pt),t.deleteBuffer(K),t.deleteVertexArray(ot),t.deleteProgram(P),ft.current=null}},[]),(0,W.useEffect)(()=>{ft.current?.rebuild()},[g,h]),(0,W.useEffect)(()=>{ft.current?.refresh()},[v,w,Ot,Yt,Ct,zt,Dt,Gt,Vt,It,Ut]),(0,_t.jsx)("div",{className:`dot-grid ${we}`.trim(),style:Ae,children:(0,_t.jsx)("canvas",{ref:Xt,className:"dot-grid__canvas"})})},ce=ze;var ue=nt(Rt());function Ve(g,h){let v=(0,le.createRoot)(g);return v.render((0,ue.jsx)(ce,{baseColor:"#3a3a3a",activeColor:"#ffffff",intro:h})),()=>v.unmount()}export{Ve as mountHeroDotGrid};
/*! Adapted from React Bits by David Haz. See /assets/React-Bits-LICENSE.txt. */
