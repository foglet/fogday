/* SF Tides — fogday.com/tides
   Tides: computed in the browser from NOAA harmonic constants (stations.js) with the Neaps predictor (neaps.min.js, MIT).
   Weather: live from the National Weather Service API (api.weather.gov), fetched by the visitor's browser. */
(function () {
const STATIONS = window.TIDE_STATIONS;
const TZ = 'America/Los_Angeles';
const BEACHES = {
  baker:   {name: 'Baker Beach',  st: 'ref', lat: 37.7936, lon: -122.4836},
  china:   {name: 'China Beach',  st: 'ob',  lat: 37.7883, lon: -122.4915},
  east:    {name: 'East Beach',   st: 'ref', lat: 37.8055, lon: -122.4535},
  funston: {name: 'Fort Funston', st: 'ob',  lat: 37.7146, lon: -122.5023},
  ocean:   {name: 'Ocean Beach',  st: 'ob',  lat: 37.7594, lon: -122.5107}
};
const STATION_LINE = {ref: 'NOAA 9414290 · San Francisco · MLLW', ob: 'NOAA 9414275 · Ocean Beach · MLLW'};
// Tide chart: 20 hours wide, centered on the viewed moment (now, or up to 36 hours ahead once dragged)
const HALF_MS = 10*36e5, SPAN_MS = 2*HALF_MS, MAX_AHEAD_MS = 36*36e5;
/* ---- Language: EN (default), FR, ES, ZH, from i18n.js; tap the code left of Info to cycle (remembered per visitor) ---- */
const I18N = window.TIDE_I18N;
let lang = 'en';
try { const l=localStorage.getItem('sf-tides-lang'); if (I18N[l]) lang=l; } catch(e){}
let L = I18N[lang];
const tr = (k, v) => I18N.fill(L[k], v);
const beachName = k => L.beaches[k] || BEACHES[k].name;
// Dates and times in the page's language, always in San Francisco time. English keeps "5:12 PM" / "5:12p"; the others use 17:12.
let fDayName, fTime, fWkMd, fFull;
function setFormatters(){
  const loc=L.locale, h=L.h12 ? {} : {hourCycle:'h23'};
  fDayName = new Intl.DateTimeFormat(loc, {timeZone: TZ, weekday: 'long'});
  fTime = new Intl.DateTimeFormat(loc, {timeZone: TZ, hour:'numeric', minute:'2-digit', ...h});
  fWkMd = new Intl.DateTimeFormat(loc, {timeZone: TZ, weekday:'long', month:'long', day:'numeric'});   // "Wednesday, October 28"
  fFull = new Intl.DateTimeFormat(loc, {timeZone: TZ, weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', ...h});
}
setFormatters();

const predictors = {};
const pred = k => predictors[k] || (predictors[k] = Neaps.useStation(STATIONS[k]));
const opts = {datum: 'MLLW', units: 'feet'};
// Missing elements get a detached stand-in, so one stale or removed part of the page can't stop the rest from drawing.
const $ = id => document.getElementById(id) || document.createElement('div');

/* ---- Smooth updates: redraw a panel in place instead of replacing it, so icons crossfade, arrows turn and greys fade.
   Text and attributes are patched in place; only a part whose layout changed is replaced. ---- */
function iconPatch(a,b){
  // Rotation (the wind arrow) turns the short way round, from where it is now
  const rot=s=>{ const m=/rotate\((-?[\d.]+)deg\)/.exec(s||''); return m?+m[1]:null; };
  const nr=rot(b.getAttribute('style'));
  if (nr!=null){ const or=a._rot!=null?a._rot:rot(a.getAttribute('style')); const r=or==null?nr:or+(((nr-or)%360+540)%360-180); a._rot=r; a.style.transform=`rotate(${r}deg)`; }
  else if (a._rot!=null || a.style.transform){ a._rot=null; a.style.transform=''; }
  // A different glyph: fade out, swap, fade in (the latest glyph wins if it changes again mid-fade)
  a._next=b.className; a._nextHTML=b.innerHTML;
  if (a._fading || a.className===a._next) return;
  a._fading=true; a.style.opacity='0';
  setTimeout(()=>{ a.className=a._next; a.innerHTML=a._nextHTML; a.style.opacity=''; a._fading=false; }, 160);
}
function patch(a,b){
  if (a.nodeType===3){ if (a.nodeValue!==b.nodeValue) a.nodeValue=b.nodeValue; return; }
  if (a.nodeType!==1) return;
  if (a.matches('i.wi, i.ph, i.aiga')) return iconPatch(a,b);
  for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  for (const at of [...b.attributes]) if (a.getAttribute(at.name)!==at.value) a.setAttribute(at.name, at.value);
  patchKids(a,b);
}
// Children in the same order and kind are patched one by one; where they differ, only that part is replaced
function patchKids(a,b){
  const A=[...a.childNodes], B=[...b.childNodes];
  if (A.length!==B.length || A.some((n,i)=>n.nodeType!==B[i].nodeType || n.nodeName!==B[i].nodeName)) { a.innerHTML=b.innerHTML; return; }
  A.forEach((n,i)=>patch(n,B[i]));
}
function morph(el, html){ const t=document.createElement(el.tagName); t.innerHTML=html; patchKids(el,t); queueAlign(); }
// Next-tide line: put its left edge on the weather descriptions (measured), beside the big reading when it fits, else below it
let alignQueued=false;
function queueAlign(){ if (alignQueued) return; alignQueued=true; requestAnimationFrame(()=>{ alignQueued=false; alignHero(); }); }
function alignHero(){
  const hero=document.querySelector('.tides .hero'), big=document.getElementById('unitToggle'), sub=document.querySelector('.tides .tiles .trow.inline .sub');
  if (!hero || !big || !sub) return;
  // The reading's natural width (unwrapped), not its width squeezed into the column, so a wide value (−0.5) drops below instead of wrapping
  const fw=big.style.flexWrap, wd=big.style.width; big.style.flexWrap='nowrap'; big.style.width='max-content';
  const need=big.getBoundingClientRect().width; big.style.flexWrap=fw; big.style.width=wd;
  // Beside only if every line of the tide text fits on one line there; otherwise it goes below, where it has the full width
  const room=hero.getBoundingClientRect().width-(sub.getBoundingClientRect().left-hero.getBoundingClientRect().left);
  const widest=Math.max(0, ...[...hero.querySelectorAll('.hero-side .nrow:not(.kingalert) .label')].map(l=>{
    const ws=l.style.whiteSpace; l.style.whiteSpace='nowrap'; const r=document.createRange(); r.selectNodeContents(l); const w=r.getBoundingClientRect().width; l.style.whiteSpace=ws; return w; }));
  const x=sub.getBoundingClientRect().left-hero.getBoundingClientRect().left, fits=need+6<=x && widest<=room;
  hero.style.setProperty('--desc-x', x.toFixed(1)+'px');
  hero.classList.toggle('inline', fits);
}
addEventListener('resize', ()=>{ queueAlign(); fitPlace(); });
// Beach description on one line where it can be: tighten the letter spacing, then shrink the text a little (to 85%);
// only if it still doesn't fit does it wrap as before
function fitPlace(){
  const el=$('place'), box=document.querySelector('.tides .top'); if (!el || !box) return;
  el.style.letterSpacing=''; el.style.fontSize=''; el.style.whiteSpace='nowrap';
  const room=box.clientWidth, cs=getComputedStyle(el), fs=parseFloat(cs.fontSize), ls0=parseFloat(cs.letterSpacing)||0;
  const w=()=>el.scrollWidth;
  if (w()<=room) return;
  for (let ls=ls0; ls>=fs*0.02-1e-6; ls-=fs*0.01){ el.style.letterSpacing=ls.toFixed(2)+'px'; if (w()<=room) return; }
  for (let k=0.98; k>=0.85-1e-6; k-=0.01){ el.style.fontSize=(fs*k).toFixed(2)+'px'; if (w()<=room) return; }
  el.style.letterSpacing=''; el.style.fontSize=''; el.style.whiteSpace='';   // too long: wrap at the normal size
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ queueAlign(); fitPlace(); });

/* ---- Pacific time helpers (always SF time, whatever the visitor's clock says) ---- */
const dtf = new Intl.DateTimeFormat('en-US', {timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
function parts(ms){ const o={}; for (const p of dtf.formatToParts(new Date(ms))) o[p.type]=p.value; return {y:+o.year, m:+o.month, d:+o.day, h:+o.hour % 24, mi:+o.minute}; }
function tzOffset(ms){ const p=parts(ms); return Date.UTC(p.y,p.m-1,p.d,p.h,p.mi) - Math.floor(ms/60000)*60000; }
function laTime(y,m,d,h=0){ const base=Date.UTC(y,m-1,d,h); let t=base-tzOffset(base); t=base-tzOffset(t); return t; }
const dayStart = day => laTime(day.y, day.m, day.d);
function addDays(day,n){ const t=new Date(Date.UTC(day.y,day.m-1,day.d+n)); return {y:t.getUTCFullYear(), m:t.getUTCMonth()+1, d:t.getUTCDate()}; }
function dayOf(ms){ const p=parts(ms); return {y:p.y,m:p.m,d:p.d}; }
const todayKey = () => dayOf(Date.now());
const same = (a,b) => a.y===b.y && a.m===b.m && a.d===b.d;
// Chart labels: always 12-hour with AM / PM ("5:12 PM"), in every language; the rest of the page keeps its own format
const fChart = new Intl.DateTimeFormat('en-US', {timeZone: TZ, hour:'numeric', minute:'2-digit', hour12:true});
const fShort = ms => fChart.format(new Date(ms)).replace(/\s+/,' ');
const fDay = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', weekday:'long', month:'long', day:'numeric'});
const fWk = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', weekday:'short'});
const fMd = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', month:'short', day:'numeric'});
const fStripDay = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', weekday:'short', month:'short', day:'numeric'});
const dayDate = day => new Date(Date.UTC(day.y,day.m-1,day.d,12));
// Tide heights: predictions are in feet; tap the big number to switch to meters (remembered per visitor).
let units = 'ft';
try { if (localStorage.getItem('sf-tides-units') === 'm') units = 'm'; } catch(e){}
const ft = v => { const x = units==='m' ? v*0.3048 : v; return (x < 0 ? '−' : '') + Math.abs(x).toFixed(units==='m'?2:1); };
const U = () => units==='m' ? 'm' : 'FT';   // feet always written FT (chart labels "6.4 FT", the tide unit)
const fh = v => ft(v) + ' ' + U();
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---- Sunrise / sunset (NOAA sunrise equation, ±1–2 min) ---- */
function sunTimes(day){
  const r=Math.PI/180, lat=37.79, lon=-122.48, noon=laTime(day.y,day.m,day.d,12);
  const n=Math.floor(noon/864e5+2440587.5-2451545+0.0008);
  const Js=n-lon/360;
  const M=(357.5291+0.98560028*Js)%360;
  const C=1.9148*Math.sin(M*r)+0.02*Math.sin(2*M*r)+0.0003*Math.sin(3*M*r);
  const L=(M+C+180+102.9372)%360;
  const Jt=2451545+Js+0.0053*Math.sin(M*r)-0.0069*Math.sin(2*L*r);
  const dec=Math.asin(Math.sin(L*r)*Math.sin(23.4397*r));
  const w=Math.acos((Math.sin(-0.833*r)-Math.sin(lat*r)*Math.sin(dec))/(Math.cos(lat*r)*Math.cos(dec)))/r;
  const toMs=J=>(J-2440587.5)*864e5;
  return {rise:toMs(Jt-w/360), set:toMs(Jt+w/360)};
}

/* ---- Moonrise / moonset (low-precision lunar position, after SunCalc / Astronomy Answers; ±2–5 min) ---- */
function moonAlt(ms){
  const r=Math.PI/180, lat=37.79*r, lw=122.48*r, d=ms/864e5-0.5+2440588-2451545, e=23.4397*r;
  const L=r*(218.316+13.176396*d), M=r*(134.963+13.064993*d), F=r*(93.272+13.22935*d);
  const l=L+r*6.289*Math.sin(M), b=r*5.128*Math.sin(F);
  const ra=Math.atan2(Math.sin(l)*Math.cos(e)-Math.tan(b)*Math.sin(e), Math.cos(l));
  const dec=Math.asin(Math.sin(b)*Math.cos(e)+Math.cos(b)*Math.sin(e)*Math.sin(l));
  const H=r*(280.16+360.9856235*d)-lw-ra;
  let h=Math.asin(Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(H));
  if (h>=0) h+=0.0002967/Math.tan(h+0.00312536/(h+0.08901179));  // refraction
  return h;
}
// Today's moonrise and moonset in SF (either can be null: the moon skips one of them about once a month)
function moonTimes(day){
  const t0=dayStart(day), hr=36e5, hc=0.133*Math.PI/180;
  let h0=moonAlt(t0)-hc, rise=null, set=null;
  for (let i=1;i<=24;i+=2){
    const h1=moonAlt(t0+i*hr)-hc, h2=moonAlt(t0+(i+1)*hr)-hc;
    const a=(h0+h2)/2-h1, b=(h2-h0)/2, xe=-b/(2*a), ye=(a*xe+b)*xe+h1, disc=b*b-4*a*h1;
    let roots=0, x1=0, x2=0;
    if (disc>=0){ const dx=Math.sqrt(disc)/(Math.abs(a)*2); x1=xe-dx; x2=xe+dx; if (Math.abs(x1)<=1) roots++; if (Math.abs(x2)<=1) roots++; if (x1<-1) x1=x2; }
    if (roots===1){ if (h0<0) rise=i+x1; else set=i+x1; }
    else if (roots===2){ rise=i+(ye<0?x2:x1); set=i+(ye<0?x1:x2); }
    if (rise!==null && set!==null) break;
    h0=h2;
  }
  return {rise: rise===null?null:t0+rise*hr, set: set===null?null:t0+set*hr};
}

/* ---- Moon (Meeus, Astronomical Algorithms ch. 49; accurate to ~1 min) ---- */
function moonPhaseJDE(k){ // k integer = new moon, k+0.5 = full moon
  const r=Math.PI/180, T=k/1236.85, T2=T*T, T3=T2*T, T4=T3*T, full=(k%1)!==0;
  let jde=2451550.09766+29.530588861*k+0.00015437*T2-0.00000015*T3+0.00000000073*T4;
  const E=1-0.002516*T-0.0000074*T2;
  const M=(2.5534+29.1053567*k-0.0000014*T2-0.00000011*T3)*r;
  const Mp=(201.5643+385.81693528*k+0.0107582*T2+0.00001238*T3-0.000000058*T4)*r;
  const F=(160.7108+390.67050284*k-0.0016118*T2-0.00000227*T3+0.000000011*T4)*r;
  const O=(124.7746-1.56375588*k+0.0020672*T2+0.00000215*T3)*r;
  const s=Math.sin;
  const c = full
    ? [-0.40614*s(Mp), 0.17302*E*s(M), 0.01614*s(2*Mp), 0.01043*s(2*F), 0.00734*E*s(Mp-M), -0.00515*E*s(Mp+M), 0.00209*E*E*s(2*M)]
    : [-0.40720*s(Mp), 0.17241*E*s(M), 0.01608*s(2*Mp), 0.01039*s(2*F), 0.00739*E*s(Mp-M), -0.00514*E*s(Mp+M), 0.00208*E*E*s(2*M)];
  jde += c.reduce((a,b)=>a+b,0)
    -0.00111*s(Mp-2*F) -0.00057*s(Mp+2*F) +0.00056*E*s(2*Mp+M) -0.00042*s(3*Mp) +0.00042*E*s(M+2*F)
    +0.00038*E*s(M-2*F) -0.00024*E*s(2*Mp-M) -0.00017*s(O) -0.00007*s(Mp+2*M) +0.00004*s(2*Mp-2*F)
    +0.00004*s(3*M) +0.00003*s(Mp+M-2*F) +0.00003*s(2*Mp+2*F) -0.00003*s(Mp+M+2*F) +0.00003*s(Mp-M+2*F)
    -0.00002*s(Mp-M-2*F) -0.00002*s(3*Mp+M) +0.00002*s(4*Mp);
  const A=[[299.77+0.107408*k-0.009173*T2,325],[251.88+0.016321*k,165],[251.83+26.651886*k,164],[349.42+36.412478*k,126],
    [84.66+18.206239*k,110],[141.74+53.303771*k,62],[207.14+2.453732*k,60],[154.84+7.30686*k,56],[34.52+27.261239*k,47],
    [207.19+0.121824*k,42],[291.34+1.844379*k,40],[161.72+24.198154*k,37],[239.56+25.513099*k,35],[331.55+3.592518*k,23]];
  for (const [a,w] of A) jde += w*1e-6*s(a*r);
  return jde;
}
const jdeToMs = jde => (jde-2440587.5)*864e5 - 69e3; // TT → UTC (ΔT ≈ 69 s)
function moonInfo(now){
  const jd=now/864e5+2440587.5;
  let k=Math.floor((jd-2451550.09766)/29.530588861);
  let prevNew=jdeToMs(moonPhaseJDE(k)); if (prevNew>now){ k--; prevNew=jdeToMs(moonPhaseJDE(k)); }
  let nextNew=jdeToMs(moonPhaseJDE(k+1)); if (nextNew<=now){ k++; prevNew=nextNew; nextNew=jdeToMs(moonPhaseJDE(k+1)); }
  let fk=k+0.5, nextFull=jdeToMs(moonPhaseJDE(fk)); if (nextFull<=now){ fk++; nextFull=jdeToMs(moonPhaseJDE(fk)); }
  const p=(now-prevNew)/(nextNew-prevNew);
  // Illuminated fraction from the Moon's phase angle (Meeus ch. 48, low-precision terms)
  const T=(jd-2451545)/36525, rr=Math.PI/180;
  const De=(297.8501921+445267.1114034*T)*rr, Ms=(357.5291092+35999.0502909*T)*rr, Mm=(134.9634114+477198.8675055*T)*rr;
  const i=180-De/rr-6.289*Math.sin(Mm)+2.1*Math.sin(Ms)-1.274*Math.sin(2*De-Mm)-0.658*Math.sin(2*De)-0.214*Math.sin(2*Mm)-0.11*Math.sin(De);
  const lit=(1+Math.cos(i*rr))/2;
  const day=1/29.53;
  const prevFull=jdeToMs(moonPhaseJDE(fk-1)), D=864e5;
  const nearNew=Math.min(now-prevNew,nextNew-now)<D, nearFull=Math.min(now-prevFull,nextFull-now)<D;
  const name = nearNew ? 'New moon' : nearFull ? 'Full moon' : Math.abs(p-.25)<day ? 'First quarter'
    : Math.abs(p-.75)<day ? 'Last quarter' : p<.25 ? 'Waxing crescent' : p<.5 ? 'Waxing gibbous' : p<.75 ? 'Waning gibbous' : 'Waning crescent';
  const ph = ['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'].indexOf(name);
  return {p, lit, name, ph, nextFull, age:(now-prevNew)/864e5};
}


/* ---- Coordinates (same format as /transit/) ---- */
// 37°47′37″N, 122°29′01″W — degrees, minutes, seconds, rounded to the second
function dms(v, pos, neg){
  const t=Math.round(Math.abs(v)*3600), d=Math.floor(t/3600), m=Math.floor(t%3600/60), sec=t%60, two=n=>(n<10?'0':'')+n;
  return two(d)+'°'+two(m)+'′'+two(sec)+'″'+(v<0?neg:pos);
}


/* ---- Tide data ---- */
function extremes(key, start, end){
  // Pad the window: subordinate stations shift reference extremes by up to ±2 h.
  return pred(BEACHES[key].st).getExtremesPrediction({start:new Date(start-3*36e5), end:new Date(end+3*36e5), ...opts}).extremes
    .map(e=>({t:+new Date(e.time), v:e.level, high:e.high}))
    .filter(e=>e.t>=start && e.t<end);
}
function timeline(key, start, end, step){
  return pred(BEACHES[key].st).getTimelinePrediction({start:new Date(start), end:new Date(end), timeFidelity:step, ...opts}).timeline
    .map(x=>({t:+new Date(x.time), v:x.level}));
}
const levelAt = (key, t) => pred(BEACHES[key].st).getWaterLevelAtTime({time:new Date(t), ...opts}).level;

/* ---- State ---- */
let beach = 'baker';
const hashBeach = (location.hash||'').slice(1);
if (BEACHES[hashBeach]) beach = hashBeach;
// Baker Beach on every load (a #china, #east, #funston or #ocean link still opens that beach)
let view = todayKey();

/* ---- Durations in words ("in about six hours") come from i18n.js, in each language, with the same thresholds ---- */

/* ---- Viewed moment: now, or a time up to 36 hours ahead picked by dragging the chart.
   scrub is null while live (the chart follows the clock); otherwise the absolute time being viewed. ---- */
let scrub = null;
const cursor = () => scrub===null ? Date.now() : Math.min(Math.max(scrub, Date.now()), Date.now()+MAX_AHEAD_MS);
const isLive = () => scrub===null;

/* ---- Tide cache: 36 hours (plus the chart's margins) of highs, lows and the curve, rebuilt each hour (and per beach), so dragging is smooth ---- */
let tideCache = null;
function tideData(){
  const hr=Math.floor(Date.now()/36e5);
  if (tideCache && tideCache.beach===beach && tideCache.hr===hr) return tideCache;
  const from=hr*36e5-HALF_MS-36e5, to=hr*36e5+MAX_AHEAD_MS+HALF_MS+2*36e5;
  tideCache = {beach, hr, ex: extremes(beach, from, to), tl: timeline(beach, from, to, 600)};
  return tideCache;
}

/* ---- Tide now (always the live tide; dragging the chart doesn't change it) ---- */
/* King tides: the California King Tides Project's dates (coastal.ca.gov/kingtides), the highest predicted tides of the year.
   Northern California days included (Dec 22, Jan 20, Jan 23). On these days the day's higher high is the king tide.
   Update each autumn when the Coastal Commission publishes the next winter's dates. */
const KING_DAYS = new Set(['2026-11-24','2026-11-25','2026-11-26','2026-12-22','2026-12-23','2026-12-24','2026-12-25',
  '2027-01-20','2027-01-21','2027-01-22','2027-01-23']);
const dayKey = ms => { const d=dayOf(ms); return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; };
function isKing(e){
  if (!e.high || !KING_DAYS.has(dayKey(e.t))) return false;
  const k=dayKey(e.t); return !tideData().ex.some(o => o.high && o!==e && dayKey(o.t)===k && o.v>e.v);
}
function renderNow(){
  // The tide at the viewed moment (now, or wherever the chart has been slid to); the next high or low after it
  const now=cursor(), lv=levelAt(beach, now), ex=tideData().ex;
  const n1=ex.find(e=>e.t>now), rising=!!(n1 && n1.high);
  // Which tide: the next one after the viewed moment. How long until it: always from the real clock (Date.now()),
  // so "Low tide occurs in about four hours" is true when read, even with the chart slid ahead.
  const real=Date.now(), mins=n1 ? Math.max(0, Math.round((n1.t-real)/6e4)) : 0;
  const neg=e=>!e.high && e.v<0;
  const kind=e=>neg(e)?L.negTide:isKing(e)?L.kingTide:e.high?L.highTide:L.lowTide;
  const row=(lab,e)=>`<div class="nrow${neg(e)?' neg':''}"><span class="label">${lab}</span></div>`;
  // One line only: the next tide. Slack while it is happening (within 15 minutes either side of a high or low);
  // otherwise the next high or low: "High tide occurs in about two hours" (or Low / Negative tide); no time or height.
  // More than a day away (only when slid ahead): its date and time instead, "High tide occurs Wednesday, October 28 at 6:30 AM"
  const SLACK_MS=15*6e4;
  const slack=ex.some(e=>Math.abs(e.t-now)<=SLACK_MS);
  // Within four hours: the countdown. On the day after today (SF calendar, real clock): just "tomorrow", no date or time.
  // Otherwise "in N hours". (The date and time are only a fallback; the next tide is never a day away.)
  const tomorrow = e => same(dayOf(e.t), addDays(dayOf(real), 1));
  const when = e => mins<240 ? L.dur(mins) : tomorrow(e) ? L.tomorrow
    : mins<1440 ? L.dur(mins) : tr('dateAt', {date: fWkMd.format(new Date(e.t)), time: fTime.format(new Date(e.t))});
  // While the water is below zero at the viewed moment (slack at a negative low, or any time it's negative), the line runs on:
  // "… Visit a tide pool. Respect Mother Nature." Not shown ahead of time just because the next low is negative,
  // and only within four hours of the real now (not when the chart has been slid days ahead).
  const negNow = lv < 0 && now - Date.now() <= 4*36e5;
  // Beyond a day from the real now (slid ahead), no countdown: "This tidal event is more than a day away." / "Come back later."
  const far = (slack ? now : n1 ? n1.t : now) - Date.now() > 864e5;
  const nextLine = far ? `<div class="nrow"><span class="label">${esc(L.farTide)}</span></div><div class="nrow"><span class="label">${esc(L.comeBack)}</span></div>` : slack ? `<div class="nrow slack${negNow?' neg':''}"><span class="label">${esc(L.slack+(negNow?L.stop.trim():''))}</span></div>`
    : n1 ? row(esc(tr('next', {kind: kind(n1), when: when(n1)})+(negNow?L.stop.trim():'')), n1) : '';
  // Second line while the tide is below zero: "Visit a tide pool. Respect Mother Nature."
  // NWS king tide / coastal flood alert, above the next-tide line (in #FF5500)
  // English: the NWS headline as issued. Other languages: the same alert written from its type and end time.
  // A coastal flood advisory in effect until a time reads as a king tide notice: "King tides. Coastal flood advisory now through 6 PM PDT Saturday"
  // (English keeps the NWS's own end time; other languages format the alert's end time)
  const advUntil = a => a.t==='adv' && /coastal flood advisory (?:is )?(?:now |remains )?in effect until (.+?)[.\s]*$/i.exec(a.head.replace(/^[.\s]+/, ''));
  const alertWhen = a => tr('dateAt', {date: fWkMd.format(new Date(a.ends)), time: fTime.format(new Date(a.ends))});
  const alertText = a => { const m = advUntil(a);
    if (lang==='en') return m ? tr('advKing', {when: m[1]}) : a.head;
    if (m && a.ends) return tr('advKing', {when: alertWhen(a)});
    return a.ends ? tr('alertUntil', {ev: L.alertEv[a.t], when: alertWhen(a)}) : L.alertEv[a.t]; };
  const alertLine = ((kingAlert[beach]||{}).list||[]).map(a=>`<div class="nrow kingalert"><span class="label">${esc(alertText(a))}</span></div>`).join('');
  const poolLine = negNow ? `<div class="nrow neg"><span class="label">${esc(L.tidePool)}</span></div>` : '';
  // AIGA symbol-sign arrows (public domain, Wikimedia Commons: Aiga_uparrow.svg / Aiga_downarrow.svg), drawn in a -500 -600 1000 1200 box
  // (drawn rising; falling turns it over with a CSS rotation, so a change of direction animates)
  const arrow = '<polygon points="100,600 100,-200 500,200 500,-100 0,-600 -500,-100 -500,200 -100,-200 -100,600"/>';
  const ar=document.querySelector('#tideNow .arrow'), wasUp = ar ? ar.classList.contains('up') : null;
  const fromTop = ar ? parseFloat(getComputedStyle(ar).top)||0 : 0;
  morph($('tideNow'), `
    <button class="big" id="unitToggle" type="button" aria-label="${esc(tr('unitAria', {v: ft(lv), unit: units==='m'?L.meters:L.feet, dir: rising?L.rising:L.falling, other: units==='m'?L.feet:L.meters}))}" title="${esc(tr('unitTitle', {other: units==='m'?L.feet:L.meters}))}">
      <svg class="arrow ${rising?'up':'down'}" data-fd="${ft(lv).charAt(0)==='−'?'m':ft(lv).charAt(0)}" viewBox="-500 -600 1000 1200" aria-hidden="true">${arrow}</svg>
      <span class="slab grad num">${ft(lv)}</span><span class="label spdunit" data-ld="${String(ft(lv)).slice(-1)}">${U()}</span>
    </button>
    <div class="hero-side"><div class="nlist">${alertLine}${nextLine}${poolLine}</div></div>`);
  if (ar && wasUp!==rising) flipArrow(ar, fromTop);
}
/* Tide arrow changing direction: a smooth half turn (always clockwise), then it drops or rises to its resting spot
   and lands with a soft bounce: a small rebound, a smaller one, then still. */
function flipArrow(el, fromTop){
  if (!el.animate) return;
  el.getAnimations().forEach(a=>a.cancel());
  // Start from where it pointed before this change (it has just been switched): up was 0°, down 180°
  const a0=el._ang!=null ? el._ang : (el.classList.contains('up') ? 180 : 0), a1=a0+180; el._ang=a1%360;
  const T=(y,a)=>`translateY(${y.toFixed(2)}px) rotate(${a}deg)`;
  // Reduce Motion: still turn (quick, no drop or bounce)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches){
    el.animate([{transform:T(0,a0)},{transform:T(0,a1)}], {duration:250, easing:'ease-out'}); return;
  }
  // The arrow already sits at its new spot (top); start it at the old one with a translate and bring it home.
  // Moved by transform only (no layout), so it runs smoothly on phones, even mid-drag.
  const toTop=parseFloat(getComputedStyle(el).top)||0, d=toTop-fromTop, s0=-d;   // s0: offset back to where it was
  el.animate([
    {offset:0,    transform:T(s0,a0),       easing:'cubic-bezier(.45,.05,.55,.95)'},   // spin in place: ease in and out
    {offset:.48,  transform:T(s0,a1),       easing:'cubic-bezier(.55,.055,.675,.19)'}, // then drop or rise: eases in (gathers speed, like falling)
    {offset:.72,  transform:T(0,a1),        easing:'cubic-bezier(.2,.6,.35,1)'},       // land
    {offset:.8,   transform:T(-d*.10,a1),   easing:'cubic-bezier(.55,0,.6,1)'},        // soft rebound
    {offset:.9,   transform:T(0,a1),        easing:'cubic-bezier(.2,.6,.35,1)'},
    {offset:.95,  transform:T(-d*.03,a1),   easing:'cubic-bezier(.55,0,.6,1)'},        // smaller rebound
    {offset:1,    transform:T(0,a1)}
  ], {duration:1400});
}

/* ---- Moon tile ---- */
// Weather Icons has 28 moon phases: new, 6 waxing crescents, first quarter, 6 waxing gibbous, full, 6 waning gibbous, third quarter, 6 waning crescents.
// p is the phase fraction (0 new, .25 first quarter, .5 full, .75 third quarter).
const MOON_PHASES = (()=>{ const s=n=>[1,2,3,4,5,6].map(i=>`${n}-${i}`);
  return ['new',...s('waxing-crescent'),'first-quarter',...s('waxing-gibbous'),'full',...s('waning-gibbous'),'third-quarter',...s('waning-crescent')]; })();
function moonIcon(p){
  const i = Math.round((((p%1)+1)%1)*28) % 28;
  return `<i class="wi wi-moon-alt-${MOON_PHASES[i]} moonicon" aria-hidden="true"></i>`;
}
function renderMoon(){
  // Phase and light at the viewed moment; the countdown to the next full moon from the real clock
  const now=Date.now(), m=moonInfo(cursor()), full=m.nextFull;
  // Calendar days in SF time. Tomorrow's date reads "is tomorrow"; on the day itself, hours and minutes.
  const pf=parts(full), pn=parts(now);
  const days=Math.round((Date.UTC(pf.y,pf.m-1,pf.d)-Date.UTC(pn.y,pn.m-1,pn.d))/864e5);
  let when;
  if (days<=0){ const mins=Math.max(0,Math.round((full-now)/6e4)); when = L.dur(mins); }
  else if (days===1) when = L.tomorrow;
  else when = L.inDays(days);
  // Tomorrow, after that day's sunset: "The next full moon occurs tomorrow night."
  const tmrwNight = days===1 && full>=sunTimes({y:pf.y,m:pf.m,d:pf.d}).set;
  // Howl only in the 28 hours before the full moon.
  const howl = full-now <= 28*3.6e6 ? L.howl : '';
  // No date or time: "The next full moon occurs in thirty days." / "… tomorrow (night)." / on the day "… in about two hours."
  const head = esc(tr('fullMoon', {when: tmrwNight ? L.tomorrowNight : when}) + howl);
  morph($('moon'), `<span class="label">${esc(L.moon)}</span>
    <div class="trow inline"><span class="ri"><span class="slab mid num">${Math.round(m.lit*100)}%</span>${moonIcon(m.p)}</span><div class="sub"><b>${esc(L.phases[m.ph])}</b>
      <span class="nextfull"><span class="label">${head}</span></span></div></div>`);
}

/* ---- Weather (National Weather Service) ---- */
const wxCache = {};
async function nws(url){
  const r = await fetch(url, {headers:{'Accept':'application/geo+json'}});
  if (!r.ok) throw new Error('NWS ' + r.status);
  return r.json();
}
/* King tides: while the NWS has an active coastal flood (or king tide) alert for the beach, its headline shows in #FF5500
   above the next-tide line. Checked with the weather and every 10 minutes; nothing shows if there is none or the NWS is unreachable. */
const kingAlert = {};
async function loadKingAlert(key){
  const c=kingAlert[key]; if (c && Date.now()-c.at < 10*6e4) return;
  const b=BEACHES[key];
  try {
    const j=await nws(`https://api.weather.gov/alerts/active?point=${(+b.lat).toFixed(4)},${(+b.lon).toFixed(4)}`);
    // Kept as data (type and end time) as well as the NWS headline, so the line can be written in each language
    const seen=new Set(), list=(j.features||[]).map(f=>f.properties||{})
      .filter(p=>/coastal flood/i.test(p.event||'') || /king tide/i.test((p.headline||'')+' '+(p.description||'')))
      .filter(p=>!p.ends || new Date(p.ends) > Date.now())
      .map(p=>{ const ev=p.event||'', t=/coastal flood warning/i.test(ev)?'warn':/coastal flood watch/i.test(ev)?'watch':/coastal flood advisory/i.test(ev)?'adv':/coastal flood/i.test(ev)?'stmt':'king';
        return {t, ends:p.ends||p.expires||null, head:String((p.parameters && p.parameters.NWSheadline && p.parameters.NWSheadline[0]) || p.headline || ev).trim()}; })
      .filter(a=>!seen.has(a.t+a.ends) && seen.add(a.t+a.ends));
    kingAlert[key]={at:Date.now(), list};
  } catch(e){ if (!c) kingAlert[key]={at:Date.now()-8*6e4, list:[]}; return; }   // offline: try again in a couple of minutes
  if (key===beach) renderNow();
}
async function loadWeather(key){
  const c = wxCache[key];
  if (c && Date.now()-c.at < 10*6e4) return c.data;
  const b = BEACHES[key];
  const pt = (await nws(`https://api.weather.gov/points/${b.lat},${b.lon}`)).properties;
  const [daily, hourly, stations, grid] = await Promise.all([
    nws(pt.forecast).catch(()=>null), nws(pt.forecastHourly).catch(()=>null), nws(pt.observationStations).catch(()=>null),
    nws(pt.forecastGridData).catch(()=>null)
  ]);
  let obs = null, prev = null, stationName = '';
  for (const f of (stations && stations.features || []).slice(0, 3)) {
    try {
      const list = (await nws(`https://api.weather.gov/stations/${f.properties.stationIdentifier}/observations?limit=6`)).features || [];
      const good = list.filter(o => o.properties.temperature && o.properties.temperature.value != null);
      if (good.length && Date.now()-new Date(good[0].properties.timestamp) < 3*36e5) {
        obs = good[0].properties; stationName = f.properties.name;
        prev = good.find(o => new Date(good[0].properties.timestamp)-new Date(o.properties.timestamp) >= 2.5*36e5);
        prev = prev && prev.properties; break;
      }
    } catch(e) {}
  }
  // Pressure: the temperature station often has none (SF Downtown reports neither pressure nor visibility), so take it
  // from the nearest station that does, skipping hilltop stations (station pressure up there reads far too low);
  // the trend compares that same station's reading about 3 hours earlier.
  let pres = presOf(obs), presPrev = presOf(prev);
  if (pres == null) {
    for (const f of (stations && stations.features || []).slice(0, 10)) {
      const el = f.properties.elevation && f.properties.elevation.value;
      if (el != null && el > 300) continue;
      try {
        const list = ((await nws(`https://api.weather.gov/stations/${f.properties.stationIdentifier}/observations?limit=24`)).features || [])
          .map(o => o.properties).filter(o => presOf(o) != null);
        if (list.length && Date.now()-new Date(list[0].timestamp) < 3*36e5) {
          const t0 = +new Date(list[0].timestamp), p3 = list.find(o => t0-new Date(o.timestamp) >= 2.5*36e5);
          pres = presOf(list[0]); presPrev = p3 ? presOf(p3) : null; break;
        }
      } catch(e) {}
    }
  }
  // Visibility: the station's reading when it has one, otherwise the NWS forecast grid for the beach itself
  // (closer to the beach's own fog than an airport miles away)
  const gridAt = (layer, t) => { for (const v of (layer && layer.values) || []) { const [s, d] = String(v.validTime).split('/');
    const m = /P(?:(\d+)D)?(?:T(?:(\d+)H)?)?/.exec(d||'') || [], s0 = +new Date(s), e0 = s0 + ((+m[1]||0)*24 + (+m[2]||0))*36e5;
    if (t >= s0 && t < e0) return v.value; } return null; };
  const ov = obs && obs.visibility && obs.visibility.value != null ? obs.visibility.value : null;
  const vis = ov != null ? ov : gridAt(grid && grid.properties.visibility, Date.now());
  const periods = daily && daily.properties.periods || [];
  const today = periods.find(p=>p.isDaytime), tonight = periods.find(p=>!p.isDaytime);
  const hperiods = hourly && hourly.properties.periods || [];
  const h0 = hperiods[0];
  // Forecast periods kept for dragging ahead: hourly (about 6½ days), then the twice-daily periods (about 7 days)
  const slim = p => ({s:+new Date(p.startTime), e:+new Date(p.endTime), temp:p.temperature, short:p.shortForecast,
    isDay:p.isDaytime, wind:p.windSpeed, dir:p.windDirection,
    rain:p.probabilityOfPrecipitation ? p.probabilityOfPrecipitation.value : null});
  const data = {hourly: hperiods.map(slim), daily: periods.map(slim),
    obs, prev, stationName, vis, pres, presPrev, hi: today && today.temperature, lo: tonight && tonight.temperature,
    short: h0 && h0.shortForecast, rain: h0 && h0.probabilityOfPrecipitation ? h0.probabilityOfPrecipitation.value : null,
    hourlyTemp: h0 && h0.temperature, hourlyWind: h0 && h0.windSpeed, hourlyDir: h0 && h0.windDirection, isDay: h0 ? h0.isDaytime : true};
  wxCache[key] = {at: Date.now(), data};
  return data;
}
const cToF = c => c*9/5+32, kmhToMph = k => k/1.609344;
const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const compass = deg => COMPASS[Math.round(((deg%360)+360)%360/22.5)%16];
// NWS text description ("Mostly Cloudy", "Fog/Mist", "Light Rain"…) → a Phosphor icon (https://phosphoricons.com, regular weight)
function skyClass(text, isDay){
  const t=(text||'').toLowerCase(), dn=(d,n)=>isDay?d:n;
  if (/thunder|t-storm|tstorm/.test(t)) return 'ph-cloud-lightning';
  if (/snow|flurr|sleet|freezing|ice pellet|hail/.test(t)) return 'ph-cloud-snow';
  if (/drizzle|shower|rain/.test(t)) return 'ph-cloud-rain';
  if (/smoke|haze|dust|fog|mist/.test(t)) return 'ph-cloud-fog';
  if (/overcast/.test(t) || (/cloud/.test(t) && !/partly|mostly/.test(t))) return 'ph-cloud';
  if (/mostly cloudy|partly|mostly sunny|mostly clear|few clouds/.test(t)) return dn('ph-cloud-sun','ph-cloud-moon');
  if (/sunny|clear|fair/.test(t)) return dn('ph-sun','ph-moon');
  if (/wind|breez|gust/.test(t)) return 'ph-wind';
  return dn('ph-sun','ph-moon');
}
const skyIcon = (text, isDay) => `<i class="ph ${skyClass(text, isDay)} sky" aria-hidden="true"></i>`;
// Wind arrow: Phosphor arrow-circle-up (points north), same icon set as the weather icons; "from" deg blows toward deg+180.
// Calm shows an empty circle; a wind with no reported direction shows a question mark.
function windIcon(deg, calm){
  if (calm) return '<i class="ph ph-circle windicon" aria-hidden="true"></i>';
  if (deg==null) return '<i class="ph ph-question windicon" aria-hidden="true"></i>';
  return `<i class="ph ph-arrow-circle-up windicon" style="transform:rotate(${Math.round(deg+180)}deg)" aria-hidden="true"></i>`;
}
let wxToken = 0, wxLast = null;
// Weather in the tide units: feet → °F and mph; meters → °C and km/h
const tempTxt = f => f==null ? '—' : units==='m' ? Math.round((f-32)*5/9)+'°C' : Math.round(f)+'°F';
const tempNum = f => units==='m' ? Math.round((f-32)*5/9) : Math.round(f);   // H / L: number only
// Tap the wind unit (mph / km/h) to switch to knots, tap "kn" to switch back; remembered like the tide units
let knots = false;
try { knots = localStorage.getItem('sf-tides-knots') === '1'; } catch(e){}
// Tap the wind number to switch between whole speeds and 0.1 readings (any unit); remembered like the units
let windDec = false;
try { windDec = localStorage.getItem('sf-tides-winddec') === '1'; } catch(e){}
const spdNum = mph => { if (mph==null) return null; const v = knots ? mph*1609.344/1852 : units==='m' ? mph*1.609344 : mph;
  return windDec ? Math.round(v*10)/10 : Math.round(v); };
const fmtSpd = n => n==null ? '—' : windDec ? n.toFixed(1) : String(n);   // 0.1 mode always shows the decimal, 12.0
const spdValTag = n => `<span class="spdval" role="button" tabindex="0" title="${esc(windDec ? L.wholeSpd : L.decSpd)}">${fmtSpd(n)}</span>`;
const spdUnit = n => knots ? (n===1 ? L.knot : L.knots) : units==='m' ? 'km/h' : 'mph';   // knots spelled out, in the page's language
// Beaufort force from the sustained wind (WMO bands in whole knots: 1, 4, 7, 11, 17, 22, 28, 34, 41, 48, 56, 64)
const BFT = [1,4,7,11,17,22,28,34,41,48,56,64];
const beaufort = mph => mph==null ? null : BFT.filter(k => Math.round(mph*1609.344/1852) >= k).length;
const bftTag = mph => { const b=beaufort(mph); return b ? `<span class="label">${esc(L.beaufort[b])}</span>` : ''; };   // calm already reads "Calm"
const spdUnitTag = n => `<span class="label spdunit" role="button" tabindex="0" title="${esc(knots ? (units==='m'?'km/h':'mph') : L.knots)}">${esc(spdUnit(n))}</span>`;
async function renderWeather(){
  const token = ++wxToken, key = beach;
  try {
    const w = await loadWeather(key);
    if (token !== wxToken) return;
    wxLast = {key, w};
    drawWeather(w);
  } catch(e) {
    if (token !== wxToken) return;
    wxLast = null;
    const msg = `<p class="muted">${esc(L.wxDown)}</p>`;
    $('weather').innerHTML = `<span class="label">${esc(L.weather)}</span>` + msg;
    $('wind').innerHTML = `<span class="label">${esc(L.wind)}</span>`;
  }
}
// Draw from loaded data (also on the feet / meters toggle, without refetching)
// Ahead of now: the NWS forecast for the viewed hour (hourly periods, else the twice-daily ones), and that day's high and low
function drawForecast(w, t){
  const inP = p => t>=p.s && t<p.e;
  const p = (w.hourly||[]).find(inP) || (w.daily||[]).find(inP);
  if (!p){
    $('weather').innerHTML = `<span class="label">${esc(L.forecast)}</span><p class="muted">${esc(L.noForecast)}</p>`;
    $('wind').innerHTML = `<span class="label">${esc(L.wind)}</span><p class="muted">${esc(L.noForecast)}</p>`;
    return;
  }
  const d = dayOf(t), onDay = q => same(dayOf(q.s), d);
  const hi = (w.daily||[]).find(q=>q.isDay && onDay(q)), lo = (w.daily||[]).find(q=>!q.isDay && onDay(q));
  morph($('weather'), `<span class="label">${esc(L.forecast)}</span>
    <div class="trow inline"><span class="ri"><span class="slab mid num">${tempTxt(p.temp)}</span>${skyIcon(p.short, p.isDay)}</span><div class="sub"><b>${esc(wxT(p.short)||'—')}</b><span class="label num hilo">${hiLo(hi&&hi.temp, lo&&lo.temp)}</span>${wxExtra(p.rain, null, null, null)}</div></div>`);
  // windSpeed is "12 mph" (hourly) or "10 to 15 mph" (daily): show the low end, and the top of a range below it
  const nums = String(p.wind||'').match(/\d+/g) || [];
  const spd = nums.length ? spdNum(+nums[0]) : null, top = nums.length>1 ? spdNum(+nums[nums.length-1]) : null;
  const dir = p.dir ? COMPASS.indexOf(p.dir)*22.5 : null;
  morph($('wind'), `<span class="label">${esc(L.wind)}</span>
    <div class="trow inline"><span class="ri"><span class="slab mid num">${spdValTag(spd)}${spdUnitTag(spd)}</span>${windIcon(dir!=null&&dir>=0?dir:null, spd===0)}</span><div class="sub"><b>${esc(spd===0?L.calm:p.dir?tr('from',{d:dirName(p.dir)}):'—')}</b><span class="wline">${nums.length?bftTag(+nums[0]):''}${top?`<span class="label num">${esc(tr('upTo',{n:fmtSpd(top),u:spdUnit(top)}))}</span>`:''}</span></div></div>`);
}
// Weather words in the page's language (icons still read the original English); high / low, compass points
const wxT = t => I18N.wxText(t, lang);
const hiLo = (hi, lo) => { const deg=units==='m'?'°C':'°F';   // "High 64°F Low 52°F", same units as the temperature
  // No letter spacing after the °, so the label's tracking doesn't open a gap: 64°F, not 64° F
  return esc([hi!=null?tr('high',{n:tempNum(hi),deg}):'', lo!=null?tr('low',{n:tempNum(lo),deg}):''].filter(Boolean).join(' ')).replace(/°/g,'<span class="deg">°</span>'); };
// Rain chance, visibility and pressure: each on its own small line under the high / low, in the same label style.
// Visibility arrives in meters, pressure in pascals; shown in miles and inches of mercury (feet) or km and hPa (meters).
// Pressure trend from the reading about 3 hours earlier: rising / falling at 0.5 hPa or more, otherwise steady.
const presOf = o => o ? (o.barometricPressure && o.barometricPressure.value != null ? o.barometricPressure.value
  : o.seaLevelPressure && o.seaLevelPressure.value != null ? o.seaLevelPressure.value : null) : null;
function wxExtra(rain, visM, pa, paPrev){
  const m = units==='m', parts = [];
  if (rain!=null) parts.push(tr('rain',{n:Math.round(rain)}));
  if (visM!=null) { const v = m ? visM/1000 : visM/1609.344; parts.push(tr('vis',{n:v<10?(Math.round(v*10)/10).toString():String(Math.round(v)), u:m?'km':'mi'})); }
  if (pa!=null) { const d = paPrev!=null ? (pa-paPrev)/100 : null, arr = d==null ? '' : d>=0.5 ? ' ↑' : d<=-0.5 ? ' ↓' : ' →';
    parts.push(tr('pres',{n:m?String(Math.round(pa/100)):(pa/3386.389).toFixed(2), u:m?'hPa':'in'})+arr); }
  return parts.map(t=>`<span class="label num">${esc(t)}</span>`).join('');   // one per line, under the high / low
}
const dirName = d => { const i=COMPASS.indexOf(d); return i<0 ? d : L.compass[i]; };
function drawWeather(w){
  if (!isLive()) return drawForecast(w, cursor());
  const o = w.obs || {};
  const val = x => x && x.value != null ? x.value : null;
  // Exact °F and mph; rounded only for display. Observations come in °C and km/h; the forecast in °F and mph.
  const f = val(o.temperature) != null ? cToF(val(o.temperature)) : w.hourlyTemp;
  const desc = o.textDescription || w.short || '—';
  morph($('weather'), `<span class="label">${esc(L.weather)}</span>
    <div class="trow inline"><span class="ri"><span class="slab mid num">${tempTxt(f)}</span>${skyIcon(desc, w.isDay)}</span><div class="sub"><b>${esc(wxT(desc))}</b><span class="label num hilo">${hiLo(w.hi, w.lo)}</span>${wxExtra(w.rain, w.vis, w.pres, w.presPrev)}</div></div>`);
  const mph = val(o.windSpeed) != null ? kmhToMph(val(o.windSpeed)) : (w.hourlyWind ? parseInt(w.hourlyWind,10) : null);
  const spd = spdNum(mph);
  let dir = val(o.windDirection);
  const gust = val(o.windGust) != null ? spdNum(kmhToMph(val(o.windGust))) : null;
  const dirTxt = dir!=null ? compass(dir) : (w.hourlyDir || '');
  if (dir==null && w.hourlyDir) dir = COMPASS.indexOf(w.hourlyDir)*22.5;
  morph($('wind'), `<span class="label">${esc(L.wind)}</span>
    <div class="trow inline"><span class="ri"><span class="slab mid num">${spdValTag(spd)}${spdUnitTag(spd)}</span>${windIcon(dir, spd===0)}</span><div class="sub"><b>${esc(spd===0?L.calm:dirTxt?tr('from',{d:dirName(dirTxt)}):'—')}</b><span class="wline">${bftTag(mph)}${gust?`<span class="label num">${esc(tr('gusts',{n:fmtSpd(gust),u:spdUnit(gust)}))}</span>`:''}</span></div></div>`);
}

/* ---- Multi-day tide strip (swipe sideways) ---- */
const Y0=-2.5, Y1=8;
// Axis ticks as [height in feet, label in the current unit]
const ticks = () => units==='m'
  ? [-0.5,0,0.5,1,1.5,2].map(m=>[m/0.3048, m<0?'−'+(-m):String(m)])
  : [-2,0,2,4,6,8].map(f=>[f, f<0?'−'+(-f):String(f)]);
function chartGeom(){ const dayW=Math.max(260, $('strip').clientWidth); const H=(dayW<520?240:290)+RS_BAND; return {dayW, H, pt:22, pb:14+RS_BAND}; }  // room above for the "now" label, below for low-tide labels and the sun / moon row
// Below the tide: a band with sunrise / sunset (top line) and moonrise / moonset (bottom line)
const RS_BAND=38, RS_GLYPH={sun:'\uf00d', moon:'\uf02e', up:'\uf058', down:'\uf044'};
/* The whole week is drawn once (per beach, units, width and hour) as one wide picture; dragging only slides it
   sideways with a GPU transform, so moving through time stays smooth. The center line and its dot are a separate
   layer that never moves sideways; the dot rides up and down with the tide. */
/* Sea life in the chart: in each screen-width of time a random mix of great white sharks at different depths (0-3, no more than two on screen at a time), sea otters
   floating at the surface (removed for now), gulls removed (one gull only, the one resting on the timeline pole; restore: gull:upTo(3)) and crabs on the floor (0-1, and only one on screen at a time), at least two creatures in all;
   about half also get a flock of 1-12 pelicans (brown, or about 40% American white; one color per flock) in a loose line on a fixed heading, flying in from far out (small, high) to
   close and back, sometimes skimming just above the water; off screen they come back from either side; flocks that meet join.
   Drawn with a 2px border in the card color so they read against the waves. A new random draw (seaSeed) on each page load,
   beach change and return to now; language, units and resizing keep the same draw.
   clear of the day names and of the low-tide labels, and the fish always under the surface. */
let seaSeed = 1 + Math.floor(Math.random()*2147483646);
/* Motion: while the chart scrolls, each creature wanders freely (no set path or axis), at a pace that differs by kind and by
   creature and keeps changing (speeding up and slowing down), and holds still when the chart does. It rides the tide:
   otters on the surface, sharks under it, gulls above it, crabs along the floor, each facing the way it moves.
   They also swim slowly on their own, roaming off screen and back; moveSea() runs from placeStrip() and a ~30 fps clock. */
let seaOn={crab:new Set(), shark:new Set(), gull:new Set()}, seaPelOn=false, seaPelXY=[], seaPelDir=1, seaHi=0, seaM=[], seaFlocks=[], seaSZ=1, seaTW=1, seaPts=[];
// Swimming on their own, slowly: [wander pace, top roam speed in px/s]; gulls quickest, otters laziest
const SEA_IDLE={gull:[22,24], pelican:[14,18], shark:[15,15], crab:[9,9], otter:[6,6]};
// Speeds differ by kind and by creature: gulls dart, sharks cruise, crabs scuttle, otters drift (about 6x from fastest to slowest)
const SEA_CAP={crab:1, shark:2};
const SEA_LAM={gull:[150,280], pelican:[300,560], shark:[220,460], crab:[320,600], otter:[560,900]};
function seaLife(td, start, end, TW, W, x, y, floor, pt0){
  let seed = seaSeed; seaM=[]; seaFlocks=[]; seaPelDir = seaSeed%2 ? 1 : -1; seaOn={crab:new Set(), shark:new Set(), gull:new Set()}; seaPelOn=false; seaPelXY=[];
  const rnd = () => (seed = seed*16807 % 2147483647) / 2147483647;
  const k = TW/(end-start), tAt = px => start + px/k;
  const surf = px => { const t=tAt(px), tl=td.tl; let i=tl.findIndex(p=>p.t>=t); if (i<0) i=tl.length-1; if (i<1) i=1;
    const a=tl[i-1], b=tl[i], f=(t-a.t)/((b.t-a.t)||1); return y(a.v+(b.v-a.v)*f); };
  // Keep clear: each day name (bottom left of its midnight line) and each low whose time label sits near the floor
  const busy=[];
  for (let d=dayOf(start), m=dayStart(addDays(d,1)); m<end; d=addDays(d,1), m=dayStart(addDays(d,1))) busy.push([+x(m)-6, +x(m)+80]);
  for (const e of td.ex) if (!e.high && y(e.v)+30 > floor-40) busy.push([+x(e.t)-34, +x(e.t)+34]);
  const free = (a,b) => !busy.some(([l,r]) => b>l && a<r);
  // Boxes around every high / low: its marker, the height above it and the time below it (plus 4px), which sharks keep clear of
  const labelBox = e => { const ex=+x(e.t), ey=y(e.v); return [ex-38, ex+38, ey-27, ey+30]; };
  const LB = td.ex.map(labelBox);
  // Day names sit on the floor (bottom left of each midnight line): only creatures that low need to avoid them
  for (let d=dayOf(start), m=dayStart(addDays(d,1)); m<end; d=addDays(d,1), m=dayStart(addDays(d,1))) LB.push([+x(m)-6, +x(m)+80, floor-20, floor+2]);
  const sharkFree = (cx,cy) => !LB.some(([l,r,t,b]) => cx+27*SZ>l && cx-27*SZ<r && cy+12*SZ>t && cy-15*SZ<b);
  let g = `<defs><filter id="seaRim" x="-30%" y="-30%" width="160%" height="160%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="r"/>
      <feFlood style="flood-color:var(--surface)"/><feComposite in2="r" operator="in" result="rim"/>
      <feMerge><feMergeNode in="rim"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g class="sealife">`;
  // Alive: claws wave and snap (each its own rhythm), legs shuffle, eyes on stalks each wink now and then
  const crab = (cx,cy) => { const a=`animation-delay:-${(rnd()*3).toFixed(2)}s;animation-duration:${(2.2+rnd()*1.6).toFixed(2)}s`, b=`animation-delay:-${(rnd()*3).toFixed(2)}s;animation-duration:${(2.2+rnd()*1.6).toFixed(2)}s`;
    return `<g class="sl-crab" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) scale(${SZ})" filter="url(#seaRim)" fill="#d9603b" stroke="#d9603b" stroke-linecap="round">
      <g class="clegs" style="animation-delay:-${(rnd()).toFixed(2)}s"><path d="M-6,1 l-4,3 M-5,2.5 l-3,4 M6,1 l4,3 M5,2.5 l3,4" stroke-width="1.4" fill="none"/></g>
      <g class="claw l" style="${a}"><path d="M-5,-2 l-3,-5" stroke-width="1.6" fill="none"/><circle cx="-8.5" cy="-8" r="2.6" stroke="none"/>
        <path class="pinch" d="M-9.6,-10.2 l-1.6,-2.4" stroke-width="1.3" fill="none" style="${a}"/></g>
      <g class="claw r" style="${b}"><path d="M5,-2 l3,-5" stroke-width="1.6" fill="none"/><circle cx="8.5" cy="-8" r="2.6" stroke="none"/>
        <path class="pinch" d="M9.6,-10.2 l1.6,-2.4" stroke-width="1.3" fill="none" style="${b}"/></g>
      <ellipse cx="0" cy="0" rx="7.5" ry="4.8" stroke="none"/>
      <path d="M-2,-4 L-2.6,-7.6 M2,-4 L2.6,-7.6" stroke-width="1.1" fill="none"/>
      ${[-1,1].map(sd=>`<g class="ceye" style="animation-delay:-${(rnd()*9).toFixed(2)}s;animation-duration:${(4+rnd()*5).toFixed(2)}s">
        <circle cx="${sd*2.7}" cy="-8.4" r="1.55" fill="#ffffff" stroke="#b9472a" stroke-width=".4"/><circle cx="${sd*2.9}" cy="-8.6" r=".8" fill="#1b2a33" stroke="none"/></g>`).join('')}</g>`; };
  // Great white shark, facing left (scale -1 turns it): slate-grey back, white underside, dorsal and pectoral fins, forked tail
  // Alive: the tail swishes from its base and the body sways a little with it
  const shark = (cx,cy,dir) => { const t=`animation-delay:-${(rnd()*1.4).toFixed(2)}s;animation-duration:${(.9+rnd()*.6).toFixed(2)}s`;
    return `<g class="sl-shark" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) scale(${dir*SZ},${SZ})" filter="url(#seaRim)"><g class="sbody" style="${t}">
      <g class="stail" style="${t}"><path d="M14.6,-1.6 L23.5,-8.5 L21,0 L23.5,6.5 L14.6,2.6 Z" fill="#6f8191"/></g>
      <path d="M-1,-5.8 L3,-12.5 L6.5,-5.4 Z" fill="#5d6f7d"/>
      <path d="M-18,0 C-15,-4 -8,-6 0,-6 C8,-6 13,-3 16,-1 L16,2 C10,5 -6,6 -13,4 C-16,3 -18,1 -18,0 Z" fill="#6f8191"/>
      <path d="M-17.4,1.3 C-10,5.6 6,5.2 15.2,2.2 C8,6.2 -8,6.4 -13,4.2 C-15.6,3.2 -17.2,2.2 -17.4,1.3 Z" fill="#f2f4f5"/>
      <path d="M-4,3.6 L-0.5,9.5 L2.6,4.1 Z" fill="#5d6f7d"/>
      <path d="M-8.6,-2.2 v3 M-7.2,-2.4 v3 M-5.8,-2.5 v3" stroke="#3e4c57" stroke-width=".6" fill="none"/>
      <path d="M-17,1.6 q3,1.1 6.2,.5" stroke="#3e4c57" stroke-width=".6" fill="none"/>
      <circle cx="-12.2" cy="-1.6" r=".95" fill="#1b2a33"/></g></g>`; };
  // Spread out, not grouped: at least 44px (24px on phones) sideways between any two creatures (a crab never sits under a shark)
  const SZ = W<520 ? .8 : 1; seaSZ=SZ; seaTW=TW;   // phones: creatures drawn 20% smaller, so a narrow screen still fits them
  const GAP = W<520 ? 24 : 44;   // phones are narrow: a smaller gap still keeps them apart
  const taken=[], clear=(l,r) => !taken.some(([L,R]) => r+GAP>L && l-GAP<R);
  // Sea otter floating on its back at the surface (head left): brown body, pale face, paws up on its chest, tail and a hind foot
  const otter = (cx,cy,dir,ang) => `<g class="sl-otter" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${dir*SZ},${SZ})" filter="url(#seaRim)">
      <ellipse cx="15" cy="0.5" rx="5.5" ry="2" fill="#5a3d2a" transform="rotate(-8 15 0.5)"/>
      <ellipse cx="0" cy="0" rx="13" ry="4.6" fill="#6b4a33"/>
      <ellipse cx="10.5" cy="-4" rx="2.2" ry="1.4" fill="#5a3d2a"/>
      <ellipse cx="-5.5" cy="-4.8" rx="2" ry="1.5" fill="#5a3d2a"/><ellipse cx="-1.8" cy="-5.2" rx="2" ry="1.5" fill="#5a3d2a"/>
      <circle cx="-13.5" cy="-1.6" r="4.4" fill="#cdb79c"/>
      <circle cx="-16.6" cy="-2.6" r=".8" fill="#1b2a33"/><circle cx="-13.6" cy="-4.4" r=".7" fill="#1b2a33"/>
      <path d="M-17.6,-1.4 l-2.4,-.6 M-17.6,-.9 l-2.6,.4" stroke="#3a2a1d" stroke-width=".4" fill="none"/></g>`;
  // Gull in flight (head left): white body, grey wings with dark tips, yellow beak
  // Brown pelican gliding (head left): long straight wings, grey-brown body, pale head, long yellow bill with its pouch
  // Pelican gliding (head left): brown pelican (grey-brown, pale head, yellow bill) or American white pelican
  // (white, black wingtips and trailing edge, orange bill, a thin grey outline so it shows on a light page)
  const PEL = {brown:{wing:'#6f6252', tip:'#3b332b', body:'#8a7a66', head:'#f1e7c6', hs:'#8a7a66', bill:'#d9a640', pouch:'#b78a3a', ol:'none'},
               white:{wing:'#f7f7f4', tip:'#1d1d1d', body:'#fbfbf8', head:'#fbfbf8', hs:'#9aa3a8', bill:'#f0962e', pouch:'#e07f22', ol:'#9aa3a8'}};
  const pelican = (cx,cy,dir,col,dl,du) => { const c=PEL[col]; return `<g class="sl-pelican" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) scale(${dir*SZ},${SZ})" filter="url(#seaRim)">
      <g class="wing slow" style="animation-delay:-${dl.toFixed(2)}s;animation-duration:${du.toFixed(2)}s"><path d="M-2,-1 Q3,-7.5 15,-7.2 L19,-6.2 Q9,-4.2 5,0 Z" fill="${c.wing}" stroke="${c.ol}" stroke-width=".5"/>
      <path d="M15,-7.2 L19,-6.2 L14.6,-5.6 Z" fill="${c.tip}"/>${col==='white' ? '<path d="M9,-6.9 L15,-7.2 L14.6,-5.6 Q11.5,-5.3 9.2,-4.6 Z" fill="#1d1d1d"/>' : ''}</g>
      <ellipse cx="3" cy="0" rx="9" ry="2.9" fill="${c.body}" stroke="${c.ol}" stroke-width=".5"/>
      <path d="M11.6,-.8 l4.2,-.9 l-.3,2.2 Z" fill="${c.wing}" stroke="${c.ol}" stroke-width=".5"/>
      <path d="M-5,-1.6 Q-6.5,-1 -8,-2.4 L-5.8,-3.4 Z" fill="${c.body}"/>
      <circle cx="-7.2" cy="-2.4" r="2.3" fill="${c.head}" stroke="${c.hs}" stroke-width=".5"/>
      <path d="M-9.2,-2.8 L-20,-1.2 L-9.2,-1.2 Z" fill="${c.bill}"/>
      <path d="M-9.2,-1.2 Q-14,1.4 -19,-1 Z" fill="${c.pouch}"/><circle cx="-7.8" cy="-2.9" r=".5" fill="#1b2a33"/></g>`; };
  const gull = (cx,cy,dir) => `<g class="sl-gull" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) scale(${dir*SZ},${SZ})" filter="url(#seaRim)">
      <g class="wing" style="animation-delay:-${(rnd()*2.6).toFixed(2)}s;animation-duration:${(2.3+rnd()*.7).toFixed(2)}s"><path d="M-12,-5 Q-7,-10 -1,-1.5 Q5,-10 11,-5.5 Q5,-7.4 0,0.5 Q-6,-7 -12,-5 Z" fill="#8f9aa3"/>
      <path d="M-12,-5 l2.6,-1.6 l.6,2 Z M11,-5.5 l-2.4,-1.8 l-.8,1.9 Z" fill="#2f3a42"/></g>
      <ellipse cx="0" cy="0" rx="6" ry="2.3" fill="#ffffff" stroke="#8f9aa3" stroke-width=".5"/>
      <circle cx="-5.6" cy="-0.6" r="2" fill="#ffffff" stroke="#8f9aa3" stroke-width=".5"/>
      <path d="M-7.4,-0.6 l-2.4,.5 l2.3,.5 Z" fill="#f2b632"/><circle cx="-6.2" cy="-1.1" r=".55" fill="#1b2a33"/>
      <path d="M5.5,0 l3.4,-1 l-.2,2.2 Z" fill="#ffffff" stroke="#8f9aa3" stroke-width=".5"/></g>`;
  // Each screen-width: random counts; otters at the surface and gulls in the air first (so even a narrow phone shows them),
  // then sharks, then crabs. Sharks each get their own depth band; every creature keeps its sideways distance from the rest.
  const SH = {half:26*SZ, topPad:18*SZ};
  const upTo = n => Math.floor(rnd()*(n+1));
  const wHi = Math.min(...td.tl.map(p=>y(p.v)));   // the highest the water gets on this chart
  const slope = px => Math.atan2(surf(px+6)-surf(px-6), 12)*180/Math.PI;
  // Free wander: x and the vertical (depth share for sharks, height above water for gulls) each follow their own mix of
  // three waves with random lengths and phases, so no two creatures share a path and none repeats a set line.
  const waves = (l0,l1) => [0,1,2].map(j => ({a:[.55,.3,.15][j], l:(l0+rnd()*(l1-l0))*[1,.53,.29][j], p:rnd()*6.283}));
  const move = (k, cx, cy, dir) => {
    const [l0,l1]=SEA_LAM[k], s0=surf(cx), [v,rv]=SEA_IDLE[k];
    // The long roam, mixed: most wander 20-90% of a screen-width; about a third range 1.2-2.5 screens, gone for long stretches
    const R=W*(rnd()<.35 ? 1.2+rnd()*1.3 : .2+rnd()*.7);
    const m={k, cx, cy, dir, face:dir, last:cx, el:null, i:0, ox:0, oy:0, bp:rnd()*6.283, bt:2+rnd()*2, ax:35+rnd()*15, wx:waves(l0,l1), wy:waves(l0,l1), floor, top:pt0+14,
      gl:(l0+rnd()*(l1-l0))*(.6+rnd()*.8), gp:rnd()*6.283,    // its own pace rhythm: 0.2x to 1.8x of its speed
      v:v*(.7+rnd()*.6), R, P:6.2832*R/(rv*(.7+rnd()*.6)), rp:rnd()*6.283, t0:performance.now(),
      dP:40+rnd()*50, p2:.23+rnd()*.3, rp2:rnd()*6.283};   // pelicans: one far-to-near-and-back cycle, in seconds (start far)
    if (k==='shark') m.f0=(cy-s0)/Math.max(1,floor-16-s0);   // share of the depth below the surface
    if (k==='gull' || k==='pelican') m.h0=s0-cy;              // height above the water
    seaM.push(m); return m;
  };
  for (let seg=0; seg<TW; seg+=W){
    let sharks=0, n;
    do n={otter:0, gull:0 /* only the pole gull for now */, shark:upTo(3), crab:upTo(1)}; while (n.otter+n.gull+n.shark+n.crab < 2);
    // About half the screen-widths get a group of 1-12 pelicans in a loose line, low over the water, leader in front
    if (rnd()<.5) for (let tries=0; tries<60; tries++){
      const cnt=[1,2,3,3,4,4,5,6,7,8,10,12][Math.floor(rnd()*12)], d=seaPelDir, gap=40*SZ, span=(cnt-1)*gap;   // 1-12, mixed; all flocks share one heading
      const cx=seg+40+rnd()*(W-80), x0=Math.min(cx, cx+d*span), x1=Math.max(cx, cx+d*span);
      if (cx<20 || cx>TW-20 || !clear(cx-18*SZ, cx+18*SZ)) continue;   // room for the leader; a long line may trail off screen
      const h=(10+rnd()*20)*SZ, oy=[...Array(cnt)].map((_,i)=> i? (rnd()-.5)*6*SZ - i*1.2*SZ : 0);
      const ys=[...Array(cnt)].map((_,i)=> surf(cx+d*i*gap)-h+oy[i]);
      if (ys[0]<pt0+14 || !sharkFree(cx, ys[0])) continue;
      taken.push([cx-18*SZ, cx+18*SZ]);
      const P=move('pelican', cx, surf(cx)-h, d); seaM.pop();   // the flock's path; the birds below follow it
      P.sP=25+rnd()*40; P.sp=rnd()*6.283; P.sth=.15+rnd()*.55;   // its own random rhythm of skimming the water
      const F={P, birds:[], dead:false, col: rnd()<.4 ? 'white' : 'brown'}; seaFlocks.push(F);   // one color per flock
      const du=4.2+rnd()*1.6, d0=rnd()*du;   // one flap-and-glide rhythm per flock, rippling from the leader back
      for (let i=0; i<cnt; i++){ g+=pelican(cx+d*i*gap, ys[i], d, F.col, (d0 - i*.16 + 99*du)%du, du);
        const b={k:'pelican', el:null, ox:d*i*gap, oy:oy[i], bp:rnd()*6.283, bt:2+rnd()*2, flock:F, jt:0}; seaM.push(b); F.birds.push(b); }
      break;
    }
    const kinds=[...Array(n.otter).fill('otter'), ...Array(n.gull).fill('gull'), ...Array(n.shark).fill('shark')];
    for (const kind of kinds){
      for (let tries=0; tries<200; tries++){
        const cx=seg+30+rnd()*(W-60); if (cx>TW-30) continue;   // label and day-name boxes are checked with each creature's height below
        if (kind==='shark'){
          const top=surf(cx)+SH.topPad, bot=floor-16, band=[(sharks+.05)/n.shark, (sharks+.95)/n.shark]; if (bot-top < 32) continue;
          const cy=top+(bot-top)*(band[0]+rnd()*(band[1]-band[0]));
          if (!sharkFree(cx,cy) || !clear(cx-SH.half,cx+SH.half)) continue;
          taken.push([cx-SH.half,cx+SH.half]); { const d=rnd()<.5?1:-1; g+=shark(cx, cy, d); move('shark',cx,cy,d); } sharks++; break;
        }
        if (kind==='otter'){   // floating: belly up, riding the surface line and tilted with it
          const cy=surf(cx)-3*SZ, a=slope(cx), h=20*SZ;
          if (Math.abs(a)>(W<520?68:40) || !sharkFree(cx,cy) || !clear(cx-h,cx+h)) continue;
          taken.push([cx-h,cx+h]); { const d=rnd()<.5?1:-1; g+=otter(cx, cy, d, a); move('otter',cx,cy,d); } break;
        }
        if (kind==='gull'){    // in the air, at least 22px above the water, clear of the height labels
          const hi=8*SZ, lo=Math.max(hi+14*SZ, Math.min(pt0+14+.3*(floor-pt0-14), wHi-22*SZ));   // high up, above the highest water on the chart
          const cy=hi+(lo-hi)*rnd(), h=13*SZ;
          if (!sharkFree(cx,cy) || !clear(cx-h,cx+h)) continue;
          taken.push([cx-h,cx+h]);
          { const d=rnd()<.5?1:-1; g+=gull(cx, cy, d); const L=move('gull',cx,cy,d);
            // Gulls fly mostly alone; now and then a loose pair shares a path
            const cnt = rnd()<.15 ? 2 : 1;
            for (let j=1; j<cnt; j++){
              const ox = d*(26+rnd()*30)*SZ, oy = (rnd()-.5)*14*SZ;
              const y0=Math.max(8*SZ, cy-oy);
              g+=gull(cx+ox, y0, d);
              seaM.push(Object.assign({}, L, {ox, oy, bp:rnd()*6.283, bt:2.5+rnd()*3, el:null, lx:undefined, lag:undefined}));
            } }
          break;
        }
      }
    }
    // then the crabs on the floor, where they fit between the others
    for (let c=0; c<n.crab; c++) for (let tries=0; tries<12; tries++){ const cx=seg+20+rnd()*(W-40), cy=floor-9*SZ; if (cx>TW-15 || !free(cx-14,cx+14) || !clear(cx-14*SZ,cx+14*SZ)) continue; taken.push([cx-14*SZ,cx+14*SZ]); g+=crab(cx, cy); move('crab',cx,cy,1); break; }
  }
  return g+'</g>';
}
let stripKey='', strip0=0, stripK=1, stripG=null, stripTl=null;
function buildStrip(){
  const g=chartGeom(), {dayW:W, H, pt, pb}=g, ih=H-pt-pb, td=tideData();
  const key=[beach, units, lang, W, td.hr, seaSeed].join('|');
  if (key===stripKey) return;
  stripKey=key; stripW=W; stripG={W, H, pt, ih};
  const start=td.tl[0].t, end=td.tl[td.tl.length-1].t, k=W/SPAN_MS, TW=Math.ceil((end-start)*k);
  strip0=start; stripK=k; stripTl=td.tl;
  const x=t=>((t-start)*k).toFixed(1), y=v=>pt+(Y1-v)/(Y1-Y0)*ih;
  // top and bottom padding of 2.5% of the card height, so the chart fills 95% of it
  const day=$('strip').closest('.day'); if (day) day.style.paddingBlock = (H*0.025/0.95).toFixed(1)+'px';

  let s=`<svg viewBox="0 0 ${TW} ${H}" width="${TW}" height="${H}" aria-hidden="true">`;
  // Midnight: a divider (its day name is added over the waves, below)
  for (let d=dayOf(start), m=dayStart(addDays(d,1)); m<end; d=addDays(d,1), m=dayStart(addDays(d,1))){
    s+=`<line x1="${x(m)}" x2="${x(m)}" y1="${pt-2}" y2="${pt+ih}" stroke="var(--line)" stroke-width="1"/>`;
  }
  const pts=td.tl.map(p=>`${x(p.t)},${y(p.v).toFixed(1)}`);
  seaPts=td.tl.map(p=>[+x(p.t), y(p.v)]); seaHi=Math.min(...seaPts.map(p=>p[1]));   // the tide line, for creatures roaming anywhere along it
  // Height lines (dotted, and the solid zero line) only in the air: clipped to the area above the water, so below the surface you see only waves
  s+=`<defs><clipPath id="tideAir"><path d="M0,0 L0,${y(td.tl[0].v).toFixed(1)} L${pts.join(' L')} L${TW},${y(td.tl[td.tl.length-1].v).toFixed(1)} L${TW},0 Z"/></clipPath></defs>`;
  for (const [v] of ticks()) s+= Math.abs(v)<1e-9
    ? `<line x1="0" x2="${TW}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1.4" clip-path="url(#tideAir)"/>`
    : `<line x1="0" x2="${TW}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 5" clip-path="url(#tideAir)"/>`;
  const waterD=`M0,${y(Y0)} L${pts.join(' L')} L${TW},${y(Y0)} Z`;
  s+=`<path d="${waterD}" fill="var(--water-fill)"/>`;
  // Horizontal waves inside the water: flat sine lines, 3 px apart (24 px wavelength, ±0.6 px swell)
  s+=`<defs><pattern id="tideWaves" width="24" height="3" patternUnits="userSpaceOnUse"><path d="M0 1.5 C4 0.9 8 0.9 12 1.5 S20 2.1 24 1.5" fill="none" stroke="var(--water)" stroke-width="0.8" stroke-opacity="0.35"/></pattern></defs>`;
  s+=`<path d="${waterD}" fill="url(#tideWaves)"/>`;
  // Day names at the foot of each midnight divider, drawn over the water and waves so they stay on top
  for (let d=dayOf(start), m=dayStart(addDays(d,1)); m<end; d=addDays(d,1), m=dayStart(addDays(d,1)))
    s+=`<text class="dayl" x="${(+x(m)+5).toFixed(1)}" y="${pt+ih-6}">${fDayName.format(new Date(m))}</text>`;
  s+=`<path d="M${pts.join(' L')}" fill="none" stroke="var(--water)" stroke-width="2.4" stroke-linejoin="round"/>`;
  s+=seaLife(td, start, end, TW, W, x, y, pt+ih, pt);   // after the tide line, so the otter floats on top of it
  // Highs and lows: markers in the picture; height above, time below, in a top layer over the center line
  let labels=`<svg viewBox="0 0 ${TW} ${H}" width="${TW}" height="${H}" aria-hidden="true">`;
  for (const e of td.ex){
    const ex=x(e.t), ey=y(e.v);
    s+=`<circle cx="${ex}" cy="${ey}" r="4.5" fill="var(--surface)" stroke="var(--water)" stroke-width="1.6"/>`;
    // Highs and lows: a light bead set into the line, 9 px across (3x the old 3 px), ringed in the water color, same for both
    // Height above, time below, each at least 2 px clear of the slider dot (radius 7.1 px with its ring) when it sits on this point
    labels+=`<text class="labt" x="${ex}" y="${ey-12.5}" text-anchor="middle">${fh(e.v)}</text><text class="lab" x="${ex}" y="${ey+22}" text-anchor="middle">${fShort(e.t)}</text>`;
  }
  // Sun and moon rise / set under the tide: icon centered on the moment, up / down arrow, then the time in light text
  const rsY={sun:pt+ih+16, moon:pt+ih+33};
  const rsItem=(kind, up, ms)=>{ if (ms==null || ms<start || ms>end) return '';
    return `<text class="rs" x="${x(ms)}" y="${rsY[kind]}"><tspan class="rsi" dx="-6">${RS_GLYPH[kind]}</tspan><tspan class="rsi rsa" dx="2">${RS_GLYPH[up?'up':'down']}</tspan><tspan dx="3">${esc(fTime.format(new Date(ms)))}</tspan></text>`; };
  for (let d=addDays(dayOf(start),-1); dayStart(d)<end; d=addDays(d,1)){
    const sn=sunTimes(d), mn=moonTimes(d);
    s+=rsItem('sun',true,sn.rise)+rsItem('sun',false,sn.set)+rsItem('moon',true,mn.rise)+rsItem('moon',false,mn.set);
  }
  $('stripSvg').innerHTML = s+'</svg>';
  { const els=$('stripSvg').querySelectorAll('.sealife > g'); seaM.forEach((m,i)=>{ m.el=els[i]||null; }); }
  $('stripLab').innerHTML = labels+'</svg>';
  $('stripCur').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
    ${POLE_GULL}
    <path id="stripLine" d="" fill="none" stroke="var(--buoy)" stroke-width="1.6"/>
    <circle id="stripDot" cx="${W/2}" cy="0" r="6" fill="var(--buoy)" stroke="var(--surface)" stroke-width="2.2"/></svg>`;
  $('stripInner').style.height = H+'px';
  // Every label's box in the week picture (high / low heights and times, day names), so the center line can skip them
  stripBoxes = [...document.querySelectorAll('#stripSvg text, #stripLab text')].map(t => { const b=t.getBBox(); return [b.x, b.x+b.width, b.y, b.y+b.height]; });
}
let stripBoxes = [];
// The center line, drawn in pieces: it never runs through text. Wherever a label crosses it, the line stops 3 px short
// of the label's box and starts again 3 px past it.
let stripPoleTop=0; const POLE_TRIM=12;
function lineAround(cx){
  const {W, pt, ih}=stripG, M=3, gaps=[];
  for (const [x0,x1,y0,y1] of stripBoxes) if (cx>=x0-M && cx<=x1+M) gaps.push([y0-M, y1+M]);
  gaps.sort((a,b)=>a[0]-b[0]);
  let y=pt-2+POLE_TRIM*seaSZ, d='', top=null;   // pole shortened at the top so the resting gull fits beneath the chart's top edge
  for (const [g0,g1] of gaps){ if (g0>y){ d+=`M${W/2},${y.toFixed(1)}V${g0.toFixed(1)}`; if (top===null) top=y; } y=Math.max(y,g1); }
  stripPoleTop = top!==null ? top : y;   // where the visible pole starts: the resting gull stands here
  if (y<pt+ih) d+=`M${W/2},${y.toFixed(1)}V${pt+ih}`;
  return d;
}
// Tide height on the drawn curve (straight lines between its 10-minute points), so the dot sits exactly on the line
function curveAt(t){
  const tl=stripTl, f=(t-tl[0].t)/6e5, i=Math.max(0, Math.min(tl.length-2, Math.floor(f))), r=Math.min(1, Math.max(0, f-i));
  return tl[i].v + (tl[i+1].v-tl[i].v)*r;
}
// Slide the week so the viewed moment sits under the center line, and move the dot to the tide there
function placeStrip(){
  const now=cursor(), {W, pt, ih}=stripG;
  const tx=`translate3d(${(-((now-HALF_MS)-strip0)*stripK).toFixed(2)}px,0,0)`;
  $('stripSvg').style.transform = tx; $('stripLab').style.transform = tx;
  moveSea(now);
  $('stripLine').setAttribute('d', lineAround(((now-strip0)*stripK)));   // the center, in week-picture coordinates
  pgDraw();
  $('stripDot').setAttribute('cy', (pt+(Y1-curveAt(now))/(Y1-Y0)*ih).toFixed(2));
  $('strip').setAttribute('aria-valuetext', isLive() ? L.now : fFull.format(new Date(now)));
}
// Water surface (y) and its tilt (degrees) anywhere along the strip, from the tide line
function seaSurf(px){ const P=seaPts; let lo=0, hi=P.length-1; if (hi<1) return 0;
  while (hi-lo>1){ const m=(lo+hi)>>1; if (P[m][0]<px) lo=m; else hi=m; }
  const a=P[lo], b=P[hi]; return a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,(px-a[0])/((b[0]-a[0])||1))); }
const seaSlope = px => Math.atan2(seaSurf(px+6)-seaSurf(px-6), 12)*180/Math.PI;
const SEA_Wv=(w,t)=>w.reduce((v,c)=>v+c.a*(Math.sin(6.2832*t/c.l+c.p)-Math.sin(c.p)),0);
// Where a creature's path puts it now: x (before clamping), the vertical wander, and seconds since it appeared
function seaPath(m, sc, ms){
  const tau=(ms-m.t0)/1000;
  const t = sc + .8*m.gl/6.2832*(Math.sin(6.2832*sc/m.gl+m.gp)-Math.sin(m.gp)) + m.v*tau;   // scroll (warped pace) plus its own slow swim
  // Two roams of unrelated lengths, so creatures leave and pop back in at irregular times
  const roam = m.R*(.7*(Math.sin(6.2832*tau/m.P+m.rp)-Math.sin(m.rp)) + .3*(Math.sin(6.2832*tau/(m.P*m.p2)+m.rp2)-Math.sin(m.rp2)));
  const base=m.cx + m.ax*SEA_Wv(m.wx,t) + roam;
  if (Math.abs(base-m.last)>0.05) m.face = base<m.last ? 1 : -1;   // drawn facing left at +1
  m.last=base;
  return {base, v:SEA_Wv(m.wy,t), tau};
}
function moveSea(now){
  const sc=(now-Date.now())*stripK, ms=performance.now(), z=seaSZ;
  const left=((now-HALF_MS)-strip0)*stripK, vw=stripW;   // the screen's left edge in strip coordinates, and its width
  for (const m of seaM){ if (!m.el || m.k==='pelican') continue;
    const {base, v}=seaPath(m, sc, ms);
    // Not glued to the chart: on screen each creature eases toward its place, so it lags behind a scroll (each by its own amount)
    const tau=(ms-m.t0)/1000, wob = m.ox!==undefined && m.k==='gull' ? 6*z*Math.sin(6.2832*tau/m.bt+m.bp) : 0;   // grouped gulls: own wobble
    // Gulls and pelicans don't mix: a gull that comes near a pelican on screen climbs and flies off, away from it, at speed.
    // It keeps that distance (m.fx) once off screen, then slowly drifts back on its own wandering.
    if (m.k==='gull'){
      const dtf=Math.min(.1,(ms-(m.ft||ms))/1000); m.ft=ms; m.fx=m.fx||0;
      if (!m.flee && m.lx!==undefined){ const gx=m.lx+left, gy=m.ly||m.cy;
        const nb=seaPelXY.find(([x,y])=>Math.abs(x-gx)<110*z && Math.abs(y-gy)<70*z);
        if (nb){ m.flee = gx>=nb[0] ? 1 : -1; m.fl=0; } }
      if (m.flee){ m.fx += m.flee*110*z*dtf; m.fl=Math.min(1, m.fl+dtf/1.2);
        if (m.lx<-60 || m.lx>vw+60) m.flee=0; }                         // gone off screen: done fleeing
      else if (m.fx) m.fx *= Math.exp(-dtf/150);                         // wander back over a few minutes
    }
    const tgt=Math.max(-80, Math.min(seaTW+80, base+(m.k==='gull' ? (m.ox||0)+wob+m.fx : 0)))-left;
    if (m.lx===undefined || m.lag===undefined){ m.lx=tgt; m.lag=.2+Math.random()*.6; m.lt=ms; }
    const dt=Math.min(.25,(ms-m.lt)/1000); m.lt=ms; m.lx += (tgt-m.lx)*(1-Math.exp(-dt/m.lag));
    const px=m.lx+left, sx=seaSurf(px);
    // At most 1 crab and 2 great whites on screen, and while pelicans are on screen only 1 gull: another shows only by
    // coming in from an edge once there's room (gulls already showing finish their flight)
    if (seaOn[m.k]){
      const on = m.lx>-30 && m.lx<vw+30, S=seaOn[m.k], cap = m.k==='gull' ? (seaPelOn ? 1 : 99) : SEA_CAP[m.k];
      if (S.has(m)){ if (!on) S.delete(m); }
      else if (on && !m.wasOn && S.size<cap) S.add(m);
      m.wasOn=on; m.el.style.visibility = (S.has(m) || !on) ? '' : 'hidden';
    }
    let y=m.cy, rot='';
    if (m.k==='otter'){ y=sx-3*z; rot=` rotate(${seaSlope(px).toFixed(1)})`; }
    else if (m.k==='shark'){ const f=Math.max(.05, Math.min(.95, m.f0+.45*v)); y=Math.min(m.floor-6*z, Math.max(sx+17*z, sx+f*(m.floor-16-sx))); }
    else if (m.k==='gull'){   // high and level: a gentle drift up and down in the top of the sky, no diving; never near the water
      // their own band near the top of the sky, ending 22 px above the highest water on the chart, so gulls never follow the tide down
      const gt=8*z, band=Math.max(14*z, Math.min(m.top+.3*(m.floor-m.top), seaHi-22*z)-gt), alt=m.cy-(m.oy||0)-gt;
      y=gt+Math.max(0, Math.min(band, alt+3*z*v+1.5*z*Math.sin(6.2832*tau/(m.bt*1.3||4)+(m.bp||0))));
      if (m.flee){ y=y+(gt-y)*(m.fl||0); m.face = m.flee>0 ? -1 : 1; }    // climbing away, facing the way it flies
      m.ly=y; }
    const sz=m.k==='crab' ? `scale(${z})` : `scale(${m.face*z},${z})`;
    m.el.setAttribute('transform', `translate(${px.toFixed(1)},${y.toFixed(1)})${rot} ${sz}`);
  }
  // Pelican flocks: each keeps one heading (never turns) and flies straight across at its own speed, far out and small then close
  // in and low and back. Once the whole line is off screen it waits 5-40 s, then comes back in from the left or the right, at random.
  const F=seaFlocks.filter(f=>!f.dead);
  for (const f of F){ const P=f.P, r=seaPath(P, sc, ms);
    if (f.x===undefined){ f.x=P.cx-left; f.d=P.dir; f.spd=14+Math.random()*14; f.lms=ms; f.gone=0; }
    const dt=Math.min(.1,(ms-f.lms)/1000); f.lms=ms;
    f.v=r.v; f.tau=r.tau;
    f.dep=.5-.5*Math.cos(6.2832*r.tau/P.dP);                          // 0 far out, 1 close in
    const ds=.35+.65*f.dep, L=(f.birds.length-1)*40*z*ds;
    const sw=Math.sin(6.2832*r.tau/P.sP+P.sp), q=Math.max(0, Math.min(1, (sw-P.sth)/.35));
    f.skim=q*q*(3-2*q)*Math.max(0, (f.dep-.6)/.4);                    // skimming the water, only when close in
    if (f.gone){ if (ms<f.gone) continue; f.gone=0;
      // Pelicans never fly opposite ways at once: a returning flock takes the shared heading; only with no other flock
      // in the air can it come back from either side (turned while away). d=1 flies left, so it enters at the right edge.
      if (!F.some(o=>o!==f && !o.dead && !o.gone)) seaPelDir = Math.random()<.5 ? 1 : -1;
      f.d = seaPelDir; f.x = f.d>0 ? vw+30 : -30; }
    f.x -= f.d*f.spd*ds*dt;                                           // far birds look slower
    const tail=f.x+f.d*L;
    if ((f.d>0 && Math.max(f.x,tail) < -40) || (f.d<0 && Math.min(f.x,tail) > vw+40)) f.gone=ms+(5+Math.random()*35)*1000;
    f.base=f.x+left;
  }
  // Two flocks that meet (same heading and color, close together, about the same distance out) join into one line, up to 12 birds
  for (const a of F) for (const b of F){ if (a===b || a.dead || b.dead || a.gone || b.gone || a.d!==b.d || a.col!==b.col) continue;   // white and brown never join
    if (Math.abs(a.x-b.x) < 70*z && Math.abs(a.dep-b.dep) < .25 && a.birds.length+b.birds.length <= 12){
      for (const bd of b.birds){ bd.jt = bd.lx===undefined ? 0 : ms; bd.jx=bd.lx; bd.jy=bd.ly; bd.js=bd.ls; bd.flock=a; a.birds.push(bd); }
      b.birds=[]; b.dead=true; }
  }
  let pelOn=false; const pxy=[];
  for (const f of F){ if (f.dead) continue; const P=f.P, ds=.35+.65*f.dep, k=f.skim;
    for (const bd of f.birds) if (bd.el) bd.el.style.visibility = f.gone ? 'hidden' : '';
    if (f.gone) continue;
    const lead=seaSurf(f.base);
    f.birds.forEach((bd, i) => { if (!bd.el) return;
      const want=i*40*z*ds*f.d; bd.ox += (want-bd.ox)*.08;            // the line behind the leader, closer together when far out
      let px=f.base+bd.ox; const sx=seaSurf(px);
      const bob=1.2*(1-.75*k)*Math.sin(6.2832*f.tau/bd.bt+bd.bp);
      const h=Math.max(8*z, P.h0+10*f.v)*(1-k) + 3.5*z*k;               // skimming: just above the waves
      const near=Math.max(P.top, Math.min(sx-(8*(1-k)+3*k)*z, (k>.5?sx:lead)-h+bd.oy*(1-k)+bob));
      const far=P.top+4+bd.oy*.4+.6*Math.sin(6.2832*f.tau/bd.bt+bd.bp);  // far out: small, high near the horizon
      let y=far+(near-far)*f.dep, s=ds;
      if (bd.jt){ const e=Math.min(1,(ms-bd.jt)/2500), u=e*e*(3-2*e);      // a joining bird glides into its place in the line
        px=bd.jx+(px-bd.jx)*u; y=bd.jy+(y-bd.jy)*u; s=bd.js+(s-bd.js)*u; if (e>=1) bd.jt=0; }
      bd.lx=px; bd.ly=y; bd.ls=s; if (px-left>-20 && px-left<vw+20){ pelOn=true; pxy.push([px,y]); }
      bd.el.setAttribute('transform', `translate(${px.toFixed(1)},${y.toFixed(1)}) scale(${(f.d*z*s).toFixed(3)},${(z*s).toFixed(3)})`);
    });
  }
  seaPelOn=pelOn; seaPelXY=pxy;
}
// The slow swim runs on its own at ~30 frames a second (paused in background tabs; off for reduced motion)
{ let last=0; const still = matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  const tick = ts => { requestAnimationFrame(tick); if (ts-last<33 || (still && still.matches) || !stripG || !seaM.length) return; last=ts; moveSea(cursor()); };
  requestAnimationFrame(tick); }
function drawStrip(){ buildStrip(); placeStrip(); }
/* A gull resting on top of the orange timeline pole. Sliding the timeline startles it: after a moment it hops off to one side,
   gathering speed and climbing, and flies off screen. Once the timeline has been left alone for 4 s it flies back in at an
   easy pace and slows smoothly to land.
   Drawn in the fixed overlay (stripCur), so it stays with the pole; counts as a gull for the flip-flops. */
const POLE_GULL = `<g id="poleGull" class="sl-gull" filter="url(#seaRim)">
  <g id="pgSit">
    <path d="M-1.2,-6.1 L-1,0 M1.4,-6.2 L1.2,0" stroke="#e39a82" stroke-width="1.05" stroke-linecap="round" fill="none"/>
    <path d="M-2.6,0 h2.9 M-.1,0 h2.9" stroke="#e39a82" stroke-width=".9" stroke-linecap="round" fill="none"/>
    <path d="M-8.7,-15.6 C-8.4,-17.8 -6.2,-18.6 -4.6,-18.1 C-3.1,-17.6 -2.6,-16.2 -2.3,-14.8 C-1.5,-13.6 2,-12.6 6,-11.8 L12.6,-10.4 L11.8,-9.6 C9,-9.2 6.6,-7.4 3,-6.3 C-.5,-5.6 -4.2,-6.2 -6.6,-8.2 C-8.3,-9.6 -9,-11.6 -8.9,-13.4 C-8.9,-14.3 -8.8,-15 -8.7,-15.6 Z" fill="#ffffff" stroke="#9aa4ab" stroke-width=".5"/>
    <path d="M-2.2,-14.2 C1,-13.2 5,-12.4 8.6,-11.4 L13.6,-10.6 C10.4,-9.4 7.6,-8.6 4.6,-8.4 C1.6,-8.2 -.8,-9.4 -2,-11.2 C-2.6,-12.2 -2.6,-13.4 -2.2,-14.2 Z" fill="#8f9aa3"/>
    <path d="M-1.4,-10.4 C1.2,-8.9 4.6,-8.5 8,-9.3" stroke="#ffffff" stroke-width=".6" fill="none"/>
    <path d="M8.4,-11.3 L14.8,-10.4 L9.4,-9.1 Z" fill="#2b343b"/><circle cx="13.1" cy="-10.35" r=".45" fill="#ffffff"/>
    <path d="M-8.6,-15.5 L-11.9,-14.9 C-12.2,-14.8 -12.2,-14.2 -11.8,-14.1 L-8.7,-14.1 Z" fill="#f2b632"/><circle cx="-11.1" cy="-14.3" r=".45" fill="#d9472b"/>
    <circle cx="-6.4" cy="-15.9" r=".62" fill="#1b2a33"/></g>
  <g id="pgFly" style="display:none">
    <g class="pgw far"><path d="M-1.6,-2 C0,-5.6 3.4,-8.4 7.6,-10.2 L9.2,-9.8 C6.4,-7.6 4,-4.8 2.2,-1.6 Z" fill="#7d8891"/></g>
    <path d="M-9,-1.2 C-8.6,-3 -6.6,-3.6 -5,-3 C-2,-2.4 4,-2.2 9,-1.6 L12.6,-1.2 L9,.2 C5,1.6 -1,2.2 -5,1.6 C-7.4,1.2 -8.8,.2 -9,-1.2 Z" fill="#ffffff" stroke="#9aa4ab" stroke-width=".5"/>
    <path d="M9.4,-1.5 L12.6,-1.2 L9.6,-.4 Z" fill="#2b343b"/>
    <path d="M-8.9,-1.7 L-12,-1.1 L-8.8,-.6 Z" fill="#f2b632"/><circle cx="-6.6" cy="-1.9" r=".55" fill="#1b2a33"/>
    <g class="pgw near"><path d="M-2.4,-2.2 C-.6,-6.6 3.4,-10.6 9,-13.2 L11.6,-12.6 C7.6,-9.6 4.6,-5.6 2.4,-1.6 Z" fill="#8f9aa3" stroke="#7d8891" stroke-width=".3"/>
      <path d="M8.2,-12.8 L11.6,-12.6 L9.6,-10.6 Z" fill="#2b343b"/><path d="M-1.6,-2.4 C.4,-6.2 3.6,-9.4 7.6,-11.6" stroke="#ffffff" stroke-width=".5" fill="none"/></g></g></g>`;
const PG={st:'perch', x:0, y:0, dir:1, face:1, v:0, vy:0, wait:0, slideAt:0, raf:0, lt:0, t0:0, sx:0, sy:0};
function pgDraw(){
  const g=document.getElementById('poleGull'); if (!g || !stripG) return;
  const z=seaSZ, W=stripG.W, perch=PG.st==='perch' || PG.st==='wary';   // still standing while wary
  if (perch){ PG.x=W/2; PG.y=stripPoleTop; }   // stands facing the way it flew in
  g.style.visibility = PG.st==='gone' ? 'hidden' : '';
  g.querySelector('#pgSit').style.display = perch ? '' : 'none';
  const fly=g.querySelector('#pgFly'); fly.style.display = perch ? 'none' : '';
  fly.classList.toggle('glide', PG.st==='in' && PG.v<40);   // wings held out on the final glide to the pole
  g.setAttribute('transform', `translate(${PG.x.toFixed(1)},${PG.y.toFixed(1)}) scale(${(PG.face*z).toFixed(2)},${z})`);
}
function poleGullScare(){
  PG.slideAt=performance.now();
  // Not straight away: a moment on the pole first (0.4-0.9 s), then a hop and an easy start; a bird coming in turns away gently
  if (PG.st==='perch'){ PG.st='wary'; PG.t0=performance.now(); PG.wait=400+Math.random()*500; PG.lt=0; pgRun(); }
  else if (PG.st==='in'){ PG.st='off'; PG.dir = PG.x<stripG.W/2 ? -1 : 1; PG.lt=0; pgRun(); }
}
function pgRun(){ if (!PG.raf) PG.raf=requestAnimationFrame(pgTick); }
function pgTick(ts){
  PG.raf=0; if (!stripG) return;
  const W=stripG.W, dt=PG.lt ? Math.min(.05,(ts-PG.lt)/1000) : 0; PG.lt=ts;
  const still = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (PG.st==='wary'){                                     // still on the pole for a moment, then a hop and off
    if (ts-PG.t0 > PG.wait){ if (still) PG.st='gone'; else { PG.st='off'; PG.dir=Math.random()<.5?1:-1; PG.v=12; PG.vy=-28; } }
  } else if (PG.st==='off'){                               // take off: an easy start, gathering speed, climbing toward the top
    if (still){ PG.st='gone'; }
    else { PG.v=Math.min(140, PG.v+75*dt); PG.x+=PG.dir*PG.v*dt;
      PG.vy=(PG.vy||0)+(((6-PG.y)*.9)-(PG.vy||0))*Math.min(1,dt*2); PG.y=Math.max(4, PG.y+PG.vy*dt); PG.face = PG.dir>0 ? -1 : 1;
      if (PG.x<-30 || PG.x>W+30) PG.st='gone'; }
  } else if (PG.st==='gone'){                              // away until the timeline has been left alone for 4 s
    if (performance.now()-PG.slideAt > 4000){
      if (still){ PG.st='perch'; }
      else { const side=Math.random()<.5?1:-1; PG.st='in'; PG.sx = side>0 ? W+30 : -30; PG.sy=8; PG.x=PG.sx; PG.y=PG.sy; PG.v=70; PG.face = side>0 ? 1 : -1; }
    }
  } else if (PG.st==='in'){                                // fly back in at an easy 70 px/s, then slow steadily to land
    const tx=W/2, d=Math.abs(tx-PG.x), A=30;                  // gentle braking (px/s²): speed falls smoothly to zero at the pole
    PG.v=Math.max(4, Math.min(PG.v, 70, Math.sqrt(2*A*d)));
    const step=Math.min(d, PG.v*dt); PG.x += Math.sign(tx-PG.x)*step;
    const done=1-Math.min(1, Math.abs(tx-PG.x)/Math.abs(tx-PG.sx)), e=done*done*(3-2*done);   // glide down along the way
    PG.y=PG.sy+(stripPoleTop-PG.sy)*e;
    if (Math.abs(tx-PG.x)<.3){ PG.x=tx; PG.y=stripPoleTop; PG.st='perch'; }
  }
  pgDraw();
  if (PG.st!=='perch') pgRun();
}

/* ---- Page ---- */
/* Maps on Apple devices: iOS doesn't tell a web page which map app the visitor prefers, so the first tap asks
   (Apple Maps or Google Maps) and remembers it; a long press asks again. Google's link opens the Google Maps app when installed. */
const APPLE_DEV=/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
let mapLinks={};
const mapPref=()=>{ try { const v=localStorage.getItem('sf-tides-maps'); return v==='apple'||v==='google' ? v : null; } catch(e){ return null; } };
function mapChooser(){
  let m=document.getElementById('mapPick'); if (m){ m.remove(); return; }   // ($() would hand back a blank div)
  m=document.createElement('div'); m.id='mapPick'; m.className='mappick'; m.setAttribute('role','group');
  m.innerHTML=`<button type="button" data-m="apple">Apple Maps</button><button type="button" data-m="google">Google Maps</button>`;
  $('coords').after(m);
  m.addEventListener('click', e=>{ const k=e.target.dataset && e.target.dataset.m; if (!k) return;
    try { localStorage.setItem('sf-tides-maps', k); } catch(err){}
    m.remove(); const c=$('coords'); c.href=mapLinks[k]; location.href=mapLinks[k]; });
  setTimeout(()=>document.addEventListener('pointerdown', function off(e){ if (!m.contains(e.target) && e.target!==$('coords')){ m.remove(); document.removeEventListener('pointerdown', off); } }), 0);
}
if (APPLE_DEV){
  const c=$('coords'); let hold=0, held=false;
  c.addEventListener('click', e=>{ e.preventDefault(); if (held){ held=false; return; }
    const p=mapPref(); if (p) location.href=mapLinks[p]; else mapChooser(); });
  c.addEventListener('pointerdown', ()=>{ held=false; clearTimeout(hold); hold=setTimeout(()=>{ held=true; const o=document.getElementById('mapPick'); if (o) o.remove(); mapChooser(); }, 600); });
  ['pointerup','pointerleave','pointercancel'].forEach(t=>c.addEventListener(t, ()=>clearTimeout(hold)));
}
function render(opts2){
  const b=BEACHES[beach], t=todayKey(), isToday=same(view,t);
  $('place').textContent=L.place[beach]; fitPlace();
  $('beachName').textContent=beachName(beach);
  { const i=ORDER.indexOf(beach), n=beachName(ORDER[(i+1)%ORDER.length]); $('beachBtn').setAttribute('aria-label', tr('beachAria', {b: beachName(beach), i: i+1, n: ORDER.length, next: n})); $('beachBtn').title=tr('nextBeach', {n}); }
  $('coords').textContent=dms(b.lat,'N','S')+', '+dms(b.lon,'E','W');
  { // Tap the coordinates: the beach in the visitor's own map app (Apple Maps on iPhone / iPad / Mac, the default
    // map app on Android via geo:, Google Maps in the browser elsewhere)
    const c=$('coords'), n=beachName(beach), ll=`${(+b.lat).toFixed(5)},${(+b.lon).toFixed(5)}`, ua=navigator.userAgent;
    mapLinks={apple:`https://maps.apple.com/?ll=${ll}&q=${encodeURIComponent(n)}`, google:`https://www.google.com/maps/search/?api=1&query=${ll}`};
    const href = APPLE_DEV ? mapLinks[mapPref()||'apple']
      : /Android/i.test(ua) ? `geo:${ll}?q=${ll}(${encodeURIComponent(n)})`
      : mapLinks.google;
    c.href=href; if (href.startsWith('http')) c.target='_blank'; else c.removeAttribute('target');
    c.setAttribute('aria-label', tr('mapAria', {b: n})); c.title=tr('mapAria', {b: n});
  }
  $('station').textContent=STATION_LINE[b.st];
  $('source').textContent=L.source[b.st];
  applyStatic();
  renderNow(); renderMoon();
  drawStrip();
  const s=dayStart(view), e=dayStart(addDays(view,1));
  if (!opts2 || opts2.weather !== false) renderWeather();
  loadKingAlert(beach);
}

$('tideNow').addEventListener('click', e=>{
  if (!e.target.closest('#unitToggle')) return;
  units = units==='m' ? 'ft' : 'm';
  try { localStorage.setItem('sf-tides-units', units); } catch(err){}
  render({weather:false});
  if (wxLast && wxLast.key===beach) drawWeather(wxLast.w);  // weather follows the units too
  const b=$('unitToggle'); if (b.focus) b.focus();
});
// Wind unit: mph / km/h ⇄ knots (click, or Enter / Space when focused)
function toggleKnots(e){
  if (!e.target.closest('.spdunit')) return;
  if (e.type==='keydown' && e.key!=='Enter' && e.key!==' ') return;
  e.preventDefault();
  knots = !knots;
  try { localStorage.setItem('sf-tides-knots', knots?'1':'0'); } catch(err){}
  if (wxLast && wxLast.key===beach) drawWeather(wxLast.w);
  const u=$('wind').querySelector('.spdunit'); if (u && u.focus) u.focus();
}
$('wind').addEventListener('click', toggleKnots);
$('wind').addEventListener('keydown', toggleKnots);
// Wind number: whole ⇄ 0.1 readings (click, or Enter / Space when focused)
function toggleDec(e){
  if (!e.target.closest('.spdval')) return;
  if (e.type==='keydown' && e.key!=='Enter' && e.key!==' ') return;
  e.preventDefault();
  windDec = !windDec;
  try { localStorage.setItem('sf-tides-winddec', windDec?'1':'0'); } catch(err){}
  if (wxLast && wxLast.key===beach) drawWeather(wxLast.w);
  const v=$('wind').querySelector('.spdval'); if (v && v.focus) v.focus();
}
$('wind').addEventListener('click', toggleDec);
$('wind').addEventListener('keydown', toggleDec);
/* ---- Text that isn't drawn by a panel: page title, header, Info notes, credit, section labels, the language button ---- */
function applyStatic(){
  document.documentElement.lang = L.html;
  document.title = L.title+' · Fogday Studios';
  const h=document.querySelector('.map-heading'); if (h) h.textContent = L.title;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = L[el.dataset.i18n]; });   // trusted text from i18n.js (the credit has a link)
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', L[el.dataset.i18nAria]));
  $('strip').setAttribute('aria-label', L.chartAria);
  const next=I18N.order[(I18N.order.indexOf(lang)+1)%I18N.order.length], b=$('langBtn');
  b.textContent = lang.toUpperCase();
  b.setAttribute('aria-label', tr('langAria', {next: I18N[next].name})); b.title = I18N[next].name;
  applySea();
}
/* Flip-flops beside "Made at Baker Beach": count fast taps (within 350 ms of each other).
   1 tap: all sea life (hide all if every kind is showing, else show all); 2: crabs; 4: sharks (3 was the otters, removed for now).
   Only toggles classes on the chart (no redraw); the hidden kinds are remembered per visitor. */
const SEA_KINDS=['crab','otter','shark','gull','pelican'], SEA_TAP={2:'crab',4:'shark'};   // otters removed for now (restore: 3:'otter', otter:upTo(2) in seaLife, and the labels)
let seaHidden=new Set();
try { const v=localStorage.getItem('sf-tides-sea');
  if (v==='0') seaHidden=new Set(SEA_KINDS);   // the first version stored on / off
  else if (v && v!=='1') seaHidden=new Set(v.split(',').filter(k=>SEA_KINDS.includes(k)));
} catch(e){}
function applySea(){
  const st=$('strip'); for (const k of SEA_KINDS) st.classList.toggle('no-'+k, seaHidden.has(k));
  const b=$('seaBtn'), n=seaHidden.size;
  b.setAttribute('aria-pressed', n===0?'true': n===SEA_KINDS.length?'false':'mixed');
  b.setAttribute('aria-label', L.seaHelp); b.title=L.seaHelp;
}
let seaTaps=0, seaTimer=0;
$('seaBtn').addEventListener('click', ()=>{
  seaTaps++; clearTimeout(seaTimer);
  seaTimer=setTimeout(()=>{
    const n=seaTaps; seaTaps=0;
    if (n===1) seaHidden = seaHidden.size ? new Set() : new Set(SEA_KINDS);
    else { const k=SEA_TAP[Math.min(n,4)]; if (!k) return; if (seaHidden.has(k)) seaHidden.delete(k); else seaHidden.add(k); }
    try { localStorage.setItem('sf-tides-sea', seaHidden.size ? [...seaHidden].join(',') : '1'); } catch(err){}
    applySea();
  }, 350);
});
/* Tap the language code (EN → FR → ES → ZH → EN), like the units: the whole page redraws in the new language */
$('langBtn').addEventListener('click', ()=>{
  lang = I18N.order[(I18N.order.indexOf(lang)+1)%I18N.order.length]; L = I18N[lang];
  try { localStorage.setItem('sf-tides-lang', lang); } catch(err){}
  setFormatters(); tileKey='';
  render({weather:false});
  if (wxLast && wxLast.key===beach) drawWeather(wxLast.w); else renderWeather();
  const b=$('langBtn'); if (b.focus) b.focus();
});
/* Tap the beach name for the next beach (five, in order, then back to the first) */
const ORDER=Object.keys(BEACHES);
$('beachBtn').addEventListener('click', ()=>{
  beach=ORDER[(ORDER.indexOf(beach)+1)%ORDER.length];
  newSea(); render();
});
/* ---- Drag the chart sideways to look ahead, up to 36 hours; it stops at now going back.
   The tide panel, sun, moon and forecast follow the center line. ---- */
let stripW=1, frame=0, tileAt=0, tileTimer=0, tileKey='';
// Tiles (sun, moon, forecast) redraw at most ten times a second while sliding, and once more when it settles
function updateTiles(){
  tileAt=performance.now(); tileTimer=0;
  const k=isLive()+'|'+Math.floor(cursor()/6e4);
  if (k===tileKey) return; tileKey=k;
  renderNow(); renderMoon();
  if (wxLast && wxLast.key===beach) drawWeather(wxLast.w);
}
function redrawViewed(){
  frame=0;
  placeStrip();
  const wait=100-(performance.now()-tileAt);
  if (wait<=0) updateTiles(); else if (!tileTimer) tileTimer=setTimeout(updateTiles, wait);
}
function setCursor(t){
  poleGullScare();   // sliding the timeline: the gull on the pole flies off
  const now=Date.now();
  t=Math.min(t, now+MAX_AHEAD_MS);
  scrub = t <= now+6e4 ? null : t;   // within a minute of now is live again
  if (scrub!==null) seaAway=true;
  if (!frame) frame=requestAnimationFrame(redrawViewed);
  return t>now && t<now+MAX_AHEAD_MS;   // false once it hits an end
}
/* New sea life when the chart comes back to now (tap, Home, or a drag / fling / glide that ends at now), and on a beach change */
let seaAway=false;
function newSea(){ seaSeed = 1 + Math.floor(Math.random()*2147483646); stripKey=''; }
function settled(){ if (scrub===null && seaAway){ seaAway=false; newSea(); drawStrip(); } }
/* Motion: a fling keeps gliding and slows to a stop; keys and Home / End glide to their target */
let anim=0;
const stopAnim=()=>{ if (anim) cancelAnimationFrame(anim); anim=0; };
function fling(v){            // v: time per millisecond of real time
  stopAnim(); let last=performance.now();
  const step=ts=>{ const dt=Math.min(40, ts-last); last=ts;
    v*=Math.exp(-dt/325);       // the same easing as an iPhone list fling
    const moving=setCursor(cursor()+v*dt);
    if (moving && Math.abs(v*stripK)>0.02) anim=requestAnimationFrame(step);
    else { anim=0; const s=snapTime(cursor()); if (s!==cursor()) glideTo(s); else settled(); } };   // a fling that stops near a high or low settles onto it
  anim=requestAnimationFrame(step);
}
/* Snap: within 8 px of a high or low, the center line locks onto it (dragging on past releases it) */
const SNAP_PX=8;
function snapTime(t){
  const lim=SNAP_PX/stripK; let best=t, bd=lim;
  for (const e of tideData().ex){ const d=Math.abs(e.t-t); if (d<bd && e.t>Date.now()+6e4){ bd=d; best=e.t; } }
  return best;
}
function glideTo(target){
  stopAnim(); const from=cursor(), t0=performance.now(), D=320;
  const step=ts=>{ const p=Math.min(1,(ts-t0)/D), e=1-Math.pow(1-p,3);
    setCursor(from+(target-from)*e); anim = p<1 ? requestAnimationFrame(step) : 0; if (!anim) settled(); };
  anim=requestAnimationFrame(step);
}
{
  const strip=$('strip');
  strip.tabIndex=0;
  strip.setAttribute('role','slider');
  strip.setAttribute('aria-label','Tide chart. Drag sideways, or use the arrow keys, to look up to 36 hours ahead. Tap to return to now.');
  let drag=null;
  strip.addEventListener('pointerdown', e=>{
    if (e.button>0) return;
    stopAnim();
    drag={x:e.clientX, y:e.clientY, t:cursor(), id:e.pointerId, at:performance.now(), moved:0, hist:[[performance.now(), e.clientX]]};
    strip.setPointerCapture && strip.setPointerCapture(e.pointerId);
    strip.classList.add('dragging');
  });
  strip.addEventListener('pointermove', e=>{
    if (!drag || e.pointerId!==drag.id) return;
    const now=performance.now(); drag.hist.push([now, e.clientX]);
    drag.moved=Math.max(drag.moved, Math.hypot(e.clientX-drag.x, e.clientY-drag.y));
    while (drag.hist.length>2 && now-drag.hist[0][0]>100) drag.hist.shift();
    setCursor(snapTime(drag.t - (e.clientX-drag.x)/stripK));   // drag left to move ahead in time; snaps onto a nearby high or low
  });
  const end=e=>{
    if (!drag) return;
    const h=drag.hist, a=h[0], b=h[h.length-1], dt=b[0]-a[0];
    // Released while moving: keep going with the finger's speed (px/ms → time/ms)
    if (e.type==='pointerup' && dt>0 && performance.now()-b[0]<60) { const v=-(b[1]-a[1])/dt/stripK; if (Math.abs(v*stripK)>0.15) fling(v); }
    // A tap (no real movement, quick): glide back to the current time
    if (e.type==='pointerup' && drag.moved<6 && performance.now()-drag.at<500) glideTo(Date.now());
    drag=null; strip.classList.remove('dragging');
    if (!anim) settled();   // let go right at now, with no fling or glide to follow
  };
  strip.addEventListener('pointerup', end); strip.addEventListener('pointercancel', end);
  // Trackpad: a sideways scroll moves through time too (the trackpad supplies its own glide)
  strip.addEventListener('wheel', e=>{
    if (Math.abs(e.deltaX)<=Math.abs(e.deltaY)) return;
    e.preventDefault(); stopAnim();
    setCursor(cursor() + e.deltaX/stripK);
    clearTimeout(wheelEnd); wheelEnd=setTimeout(()=>{ if (!anim) settled(); }, 250);
  }, {passive:false});
  let wheelEnd=0;
  // Keys: ← / → an hour, Shift for a day; Home is now, End 36 hours ahead
  strip.addEventListener('keydown', e=>{
    const step=e.shiftKey?864e5:36e5, k=e.key, base=anim&&glideTarget!=null?glideTarget:cursor();
    let to;
    if (k==='ArrowRight') to=base+step;
    else if (k==='ArrowLeft') to=base-step;
    else if (k==='Home') to=Date.now();
    else if (k==='End') to=Date.now()+MAX_AHEAD_MS;
    else return;
    e.preventDefault();
    glideTarget=Math.min(Math.max(to, Date.now()), Date.now()+MAX_AHEAD_MS); glideTo(glideTarget);
  });
}
let glideTarget=null;
let rt, lastW=0; addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>{ const w=$('strip').clientWidth; if (w!==lastW){ lastW=w; stripKey=''; drawStrip(); } }, 150); });
setInterval(()=>{ if (scrub!==null && scrub<=Date.now()+6e4) scrub=null;  // the clock caught up with the viewed time
  if (!same(view,todayKey())) { view=todayKey(); render({weather:false}); } else { renderNow(); renderMoon(); if (!anim) drawStrip(); } }, 60000);  // rolls over to the new day at midnight
setInterval(()=>{ renderWeather(); loadKingAlert(beach); }, 10*60000);
lastW=$('strip').clientWidth;
if (document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ stripKey=''; drawStrip(); });   // label sizes settle once fonts load
try { render(); } catch (err) { console.error('SF Tides:', err); try { renderNow(); drawStrip(); } catch (e2) { console.error(e2); } }
})();
