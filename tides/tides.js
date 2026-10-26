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
// Tide chart: 20 hours wide, centered on the viewed moment (now, or up to a week ahead once dragged)
const HALF_MS = 10*36e5, SPAN_MS = 2*HALF_MS, MAX_AHEAD_MS = 7*864e5;
/* ---- Language: EN (default), FR, ES, ZH, from i18n.js; tap the code beside "Made at Baker Beach." to cycle (remembered per visitor) ---- */
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
  const x=sub.getBoundingClientRect().left-hero.getBoundingClientRect().left, fits=big.getBoundingClientRect().width+12<=x;
  hero.style.setProperty('--desc-x', x.toFixed(1)+'px');
  hero.classList.toggle('inline', fits);
}
addEventListener('resize', queueAlign);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueAlign);

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

/* ---- Viewed moment: now, or a time up to a week ahead picked by dragging the chart.
   scrub is null while live (the chart follows the clock); otherwise the absolute time being viewed. ---- */
let scrub = null;
const cursor = () => scrub===null ? Date.now() : Math.min(Math.max(scrub, Date.now()), Date.now()+MAX_AHEAD_MS);
const isLive = () => scrub===null;

/* ---- Tide cache: a week of highs, lows and the curve, rebuilt each hour (and per beach), so dragging is smooth ---- */
let tideCache = null;
function tideData(){
  const hr=Math.floor(Date.now()/36e5);
  if (tideCache && tideCache.beach===beach && tideCache.hr===hr) return tideCache;
  const from=hr*36e5-HALF_MS-36e5, to=hr*36e5+MAX_AHEAD_MS+HALF_MS+2*36e5;
  tideCache = {beach, hr, ex: extremes(beach, from, to), tl: timeline(beach, from, to, 600)};
  return tideCache;
}

/* ---- Tide now (always the live tide; dragging the chart doesn't change it) ---- */
function renderNow(){
  // The tide at the viewed moment (now, or wherever the chart has been slid to); the next high or low after it
  const now=cursor(), lv=levelAt(beach, now), ex=tideData().ex;
  const n1=ex.find(e=>e.t>now), rising=!!(n1 && n1.high);
  const mins=n1 ? Math.round((n1.t-Date.now())/6e4) : 0;   // counted from the real now
  const neg=e=>!e.high && e.v<0;
  const kind=e=>neg(e)?L.negTide:e.high?L.highTide:L.lowTide;
  const row=(lab,e)=>`<div class="nrow${neg(e)?' neg':''}"><span class="label">${lab}</span></div>`;
  // One line only: the next tide. Slack while it is happening (within 15 minutes either side of a high or low);
  // otherwise the next high or low: "High tide occurs in about two hours" (or Low / Negative tide); no time or height.
  // More than a day away (only when slid ahead): its date and time instead, "High tide occurs Wednesday, October 28 at 6:30 AM"
  const SLACK_MS=15*6e4;
  const slack=ex.some(e=>Math.abs(e.t-now)<=SLACK_MS);
  const when = e => mins<1440 ? L.dur(mins) : tr('dateAt', {date: fWkMd.format(new Date(e.t)), time: fTime.format(new Date(e.t))});
  const nextLine = slack ? `<div class="nrow slack"><span class="label">${esc(L.slack)}</span></div>`
    : n1 ? row(esc(tr('next', {kind: kind(n1), when: when(n1)})), n1) : '';
  // A negative tide (next, or slack at one now): add a second line, "Visit a tide pool. Respect Mother Nature."
  const negNow = slack ? ex.some(e=>Math.abs(e.t-now)<=SLACK_MS && neg(e)) : !!(n1 && neg(n1));
  const poolLine = negNow ? `<div class="nrow neg"><span class="label">${esc(L.tidePool)}</span></div>` : '';
  // AIGA symbol-sign arrows (public domain, Wikimedia Commons: Aiga_uparrow.svg / Aiga_downarrow.svg), drawn in a -500 -600 1000 1200 box
  // (drawn rising; falling turns it over with a CSS rotation, so a change of direction animates)
  const arrow = '<polygon points="100,600 100,-200 500,200 500,-100 0,-600 -500,-100 -500,200 -100,-200 -100,600"/>';
  const ar=document.querySelector('#tideNow .arrow'), wasUp = ar ? ar.classList.contains('up') : null;
  const fromTop = ar ? parseFloat(getComputedStyle(ar).top)||0 : 0;
  morph($('tideNow'), `
    <button class="big" id="unitToggle" type="button" aria-label="${esc(tr('unitAria', {v: ft(lv), unit: units==='m'?L.meters:L.feet, dir: rising?L.rising:L.falling, other: units==='m'?L.feet:L.meters}))}" title="${esc(tr('unitTitle', {other: units==='m'?L.feet:L.meters}))}">
      <svg class="arrow ${rising?'up':'down'}" viewBox="-500 -600 1000 1200" aria-hidden="true">${arrow}</svg>
      <span class="slab grad num">${ft(lv)}</span><span class="label spdunit">${U()}</span>
    </button>
    <div class="hero-side"><div class="nlist">${nextLine}${poolLine}</div></div>`);
  if (ar && wasUp!==rising) flipArrow(ar, fromTop);
}
/* Tide arrow changing direction: a smooth half turn (always clockwise), then it drops or rises to its resting spot
   and lands with a soft bounce: a small rebound, a smaller one, then still. */
function flipArrow(el, fromTop){
  if (!el.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.getAnimations().forEach(a=>a.cancel());
  const toTop=parseFloat(getComputedStyle(el).top)||0, d=toTop-fromTop;
  const a0=el._ang||0, a1=a0+180; el._ang=a1%360;
  const up=el.classList.contains('up'), rot=a=>`rotate(${a}deg)`;
  const px=v=>(v).toFixed(2)+'px';
  el.animate([
    {offset:0,    top:px(fromTop),       transform:rot(a0), easing:'cubic-bezier(.45,.05,.55,.95)'},   // spin: ease in and out
    {offset:.5,   top:px(fromTop),       transform:rot(a1), easing:'cubic-bezier(.55,0,.85,.4)'},      // fall: gathering speed
    {offset:.68,  top:px(toTop),         transform:rot(a1), easing:'cubic-bezier(.2,.6,.35,1)'},       // land
    {offset:.8,   top:px(toTop-d*.10),   transform:rot(a1), easing:'cubic-bezier(.55,0,.6,1)'},        // soft rebound
    {offset:.9,   top:px(toTop),         transform:rot(a1), easing:'cubic-bezier(.2,.6,.35,1)'},
    {offset:.95,  top:px(toTop-d*.03),   transform:rot(a1), easing:'cubic-bezier(.55,0,.6,1)'},        // smaller rebound
    {offset:1,    top:px(toTop),         transform:rot(a1)}
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
  const now=cursor(), m=moonInfo(now), full=m.nextFull;
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
async function loadWeather(key){
  const c = wxCache[key];
  if (c && Date.now()-c.at < 10*6e4) return c.data;
  const b = BEACHES[key];
  const pt = (await nws(`https://api.weather.gov/points/${b.lat},${b.lon}`)).properties;
  const [daily, hourly, stations] = await Promise.all([
    nws(pt.forecast).catch(()=>null), nws(pt.forecastHourly).catch(()=>null), nws(pt.observationStations).catch(()=>null)
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
  const periods = daily && daily.properties.periods || [];
  const today = periods.find(p=>p.isDaytime), tonight = periods.find(p=>!p.isDaytime);
  const hperiods = hourly && hourly.properties.periods || [];
  const h0 = hperiods[0];
  // Forecast periods kept for dragging ahead: hourly (about 6½ days), then the twice-daily periods (about 7 days)
  const slim = p => ({s:+new Date(p.startTime), e:+new Date(p.endTime), temp:p.temperature, short:p.shortForecast,
    isDay:p.isDaytime, wind:p.windSpeed, dir:p.windDirection});
  const data = {hourly: hperiods.map(slim), daily: periods.map(slim),
    obs, prev, stationName, hi: today && today.temperature, lo: tonight && tonight.temperature,
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
    <div class="trow inline"><span class="ri"><span class="slab mid num">${tempTxt(p.temp)}</span>${skyIcon(p.short, p.isDay)}</span><div class="sub"><b>${esc(wxT(p.short)||'—')}</b><span class="label num">${hiLo(hi&&hi.temp, lo&&lo.temp)}</span></div></div>`);
  // windSpeed is "12 mph" (hourly) or "10 to 15 mph" (daily): show the low end, and the top of a range below it
  const nums = String(p.wind||'').match(/\d+/g) || [];
  const spd = nums.length ? spdNum(+nums[0]) : null, top = nums.length>1 ? spdNum(+nums[nums.length-1]) : null;
  const dir = p.dir ? COMPASS.indexOf(p.dir)*22.5 : null;
  morph($('wind'), `<span class="label">${esc(L.wind)}</span>
    <div class="trow inline"><span class="ri"><span class="slab mid num">${spdValTag(spd)}${spdUnitTag(spd)}</span>${windIcon(dir!=null&&dir>=0?dir:null, spd===0)}</span><div class="sub"><b>${esc(spd===0?L.calm:p.dir?tr('from',{d:dirName(p.dir)}):'—')}</b><span class="wline">${nums.length?bftTag(+nums[0]):''}<span class="label num">${esc(top?tr('upTo',{n:fmtSpd(top),u:spdUnit(top)}):L.fcSub)}</span></span></div></div>`);
}
// Weather words in the page's language (icons still read the original English); high / low, compass points
const wxT = t => I18N.wxText(t, lang);
const hiLo = (hi, lo) => { const deg=units==='m'?'°C':'°F';   // "High 64°F Low 52°F", same units as the temperature
  return esc([hi!=null?tr('high',{n:tempNum(hi),deg}):'', lo!=null?tr('low',{n:tempNum(lo),deg}):''].filter(Boolean).join(' ')); };
const dirName = d => { const i=COMPASS.indexOf(d); return i<0 ? d : L.compass[i]; };
function drawWeather(w){
  if (!isLive()) return drawForecast(w, cursor());
  const o = w.obs || {};
  const val = x => x && x.value != null ? x.value : null;
  // Exact °F and mph; rounded only for display. Observations come in °C and km/h; the forecast in °F and mph.
  const f = val(o.temperature) != null ? cToF(val(o.temperature)) : w.hourlyTemp;
  const desc = o.textDescription || w.short || '—';
  morph($('weather'), `<span class="label">${esc(L.weather)}</span>
    <div class="trow inline"><span class="ri"><span class="slab mid num">${tempTxt(f)}</span>${skyIcon(desc, w.isDay)}</span><div class="sub"><b>${esc(wxT(desc))}</b><span class="label num">${hiLo(w.hi, w.lo)}</span></div></div>`);
  const mph = val(o.windSpeed) != null ? kmhToMph(val(o.windSpeed)) : (w.hourlyWind ? parseInt(w.hourlyWind,10) : null);
  const spd = spdNum(mph);
  let dir = val(o.windDirection);
  const gust = val(o.windGust) != null ? spdNum(kmhToMph(val(o.windGust))) : null;
  const dirTxt = dir!=null ? compass(dir) : (w.hourlyDir || '');
  if (dir==null && w.hourlyDir) dir = COMPASS.indexOf(w.hourlyDir)*22.5;
  morph($('wind'), `<span class="label">${esc(L.wind)}</span>
    <div class="trow inline"><span class="ri"><span class="slab mid num">${spdValTag(spd)}${spdUnitTag(spd)}</span>${windIcon(dir, spd===0)}</span><div class="sub"><b>${esc(spd===0?L.calm:dirTxt?tr('from',{d:dirName(dirTxt)}):'—')}</b><span class="wline">${bftTag(mph)}<span class="label num">${esc(gust?tr('gusts',{n:fmtSpd(gust),u:spdUnit(gust)}):L.noGusts)}</span></span></div></div>`);
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
let stripKey='', strip0=0, stripK=1, stripG=null, stripTl=null;
function buildStrip(){
  const g=chartGeom(), {dayW:W, H, pt, pb}=g, ih=H-pt-pb, td=tideData();
  const key=[beach, units, lang, W, td.hr].join('|');
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
  for (const [v] of ticks()) s+=`<line x1="0" x2="${TW}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="${Math.abs(v)<1e-9?1.4:1}" ${Math.abs(v)<1e-9?'':'stroke-dasharray="2 5"'}/>`;
  const pts=td.tl.map(p=>`${x(p.t)},${y(p.v).toFixed(1)}`);
  const waterD=`M0,${y(Y0)} L${pts.join(' L')} L${TW},${y(Y0)} Z`;
  s+=`<path d="${waterD}" fill="var(--water-fill)"/>`;
  // Horizontal waves inside the water: flat sine lines, 3 px apart (24 px wavelength, ±0.6 px swell)
  s+=`<defs><pattern id="tideWaves" width="24" height="3" patternUnits="userSpaceOnUse"><path d="M0 1.5 C4 0.9 8 0.9 12 1.5 S20 2.1 24 1.5" fill="none" stroke="var(--water)" stroke-width="0.8" stroke-opacity="0.35"/></pattern></defs>`;
  s+=`<path d="${waterD}" fill="url(#tideWaves)"/>`;
  // Day names at the foot of each midnight divider, drawn over the water and waves so they stay on top
  for (let d=dayOf(start), m=dayStart(addDays(d,1)); m<end; d=addDays(d,1), m=dayStart(addDays(d,1)))
    s+=`<text class="dayl" x="${(+x(m)+5).toFixed(1)}" y="${pt+ih-6}">${fDayName.format(new Date(m))}</text>`;
  s+=`<path d="M${pts.join(' L')}" fill="none" stroke="var(--water)" stroke-width="2.4" stroke-linejoin="round"/>`;
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
  $('stripLab').innerHTML = labels+'</svg>';
  $('stripCur').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
    <path id="stripLine" d="" fill="none" stroke="var(--buoy)" stroke-width="1.6"/>
    <circle id="stripDot" cx="${W/2}" cy="0" r="6" fill="var(--buoy)" stroke="var(--surface)" stroke-width="2.2"/></svg>`;
  $('stripInner').style.height = H+'px';
  // Every label's box in the week picture (high / low heights and times, day names), so the center line can skip them
  stripBoxes = [...document.querySelectorAll('#stripSvg text, #stripLab text')].map(t => { const b=t.getBBox(); return [b.x, b.x+b.width, b.y, b.y+b.height]; });
}
let stripBoxes = [];
// The center line, drawn in pieces: it never runs through text. Wherever a label crosses it, the line stops 3 px short
// of the label's box and starts again 3 px past it.
function lineAround(cx){
  const {W, pt, ih}=stripG, M=3, gaps=[];
  for (const [x0,x1,y0,y1] of stripBoxes) if (cx>=x0-M && cx<=x1+M) gaps.push([y0-M, y1+M]);
  gaps.sort((a,b)=>a[0]-b[0]);
  let y=pt-2, d='';
  for (const [g0,g1] of gaps){ if (g0>y) d+=`M${W/2},${y.toFixed(1)}V${g0.toFixed(1)}`; y=Math.max(y,g1); }
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
  $('stripLine').setAttribute('d', lineAround(((now-strip0)*stripK)));   // the center, in week-picture coordinates
  $('stripDot').setAttribute('cy', (pt+(Y1-curveAt(now))/(Y1-Y0)*ih).toFixed(2));
  $('strip').setAttribute('aria-valuetext', isLive() ? L.now : fFull.format(new Date(now)));
}
function drawStrip(){ buildStrip(); placeStrip(); }

/* ---- Page ---- */
function render(opts2){
  const b=BEACHES[beach], t=todayKey(), isToday=same(view,t);
  $('place').textContent=L.place[beach];
  $('beachName').textContent=beachName(beach);
  { const i=ORDER.indexOf(beach), n=beachName(ORDER[(i+1)%ORDER.length]); $('beachBtn').setAttribute('aria-label', tr('beachAria', {b: beachName(beach), i: i+1, n: ORDER.length, next: n})); $('beachBtn').title=tr('nextBeach', {n}); }
  $('coords').textContent=dms(b.lat,'N','S')+', '+dms(b.lon,'E','W');
  $('station').textContent=STATION_LINE[b.st];
  $('source').textContent=L.source[b.st];
  applyStatic();
  renderNow(); renderMoon();
  drawStrip();
  const s=dayStart(view), e=dayStart(addDays(view,1));
  if (!opts2 || opts2.weather !== false) renderWeather();
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
}
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
  render();
});
/* ---- Drag the chart sideways to look ahead, up to a week; it stops at now going back.
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
  const now=Date.now();
  t=Math.min(t, now+MAX_AHEAD_MS);
  scrub = t <= now+6e4 ? null : t;   // within a minute of now is live again
  if (!frame) frame=requestAnimationFrame(redrawViewed);
  return t>now && t<now+MAX_AHEAD_MS;   // false once it hits an end
}
/* Motion: a fling keeps gliding and slows to a stop; keys and Home / End glide to their target */
let anim=0;
const stopAnim=()=>{ if (anim) cancelAnimationFrame(anim); anim=0; };
function fling(v){            // v: time per millisecond of real time
  stopAnim(); let last=performance.now();
  const step=ts=>{ const dt=Math.min(40, ts-last); last=ts;
    v*=Math.exp(-dt/325);       // the same easing as an iPhone list fling
    const moving=setCursor(cursor()+v*dt);
    if (moving && Math.abs(v*stripK)>0.02) anim=requestAnimationFrame(step);
    else { anim=0; const s=snapTime(cursor()); if (s!==cursor()) glideTo(s); } };   // a fling that stops near a high or low settles onto it
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
    setCursor(from+(target-from)*e); anim = p<1 ? requestAnimationFrame(step) : 0; };
  anim=requestAnimationFrame(step);
}
{
  const strip=$('strip');
  strip.tabIndex=0;
  strip.setAttribute('role','slider');
  strip.setAttribute('aria-label','Tide chart. Drag sideways, or use the arrow keys, to look up to a week ahead.');
  let drag=null;
  strip.addEventListener('pointerdown', e=>{
    if (e.button>0) return;
    stopAnim();
    drag={x:e.clientX, t:cursor(), id:e.pointerId, hist:[[performance.now(), e.clientX]]};
    strip.setPointerCapture && strip.setPointerCapture(e.pointerId);
    strip.classList.add('dragging');
  });
  strip.addEventListener('pointermove', e=>{
    if (!drag || e.pointerId!==drag.id) return;
    const now=performance.now(); drag.hist.push([now, e.clientX]);
    while (drag.hist.length>2 && now-drag.hist[0][0]>100) drag.hist.shift();
    setCursor(snapTime(drag.t - (e.clientX-drag.x)/stripK));   // drag left to move ahead in time; snaps onto a nearby high or low
  });
  const end=e=>{
    if (!drag) return;
    const h=drag.hist, a=h[0], b=h[h.length-1], dt=b[0]-a[0];
    // Released while moving: keep going with the finger's speed (px/ms → time/ms)
    if (e.type==='pointerup' && dt>0 && performance.now()-b[0]<60) { const v=-(b[1]-a[1])/dt/stripK; if (Math.abs(v*stripK)>0.15) fling(v); }
    drag=null; strip.classList.remove('dragging');
  };
  strip.addEventListener('pointerup', end); strip.addEventListener('pointercancel', end);
  // Trackpad: a sideways scroll moves through time too (the trackpad supplies its own glide)
  strip.addEventListener('wheel', e=>{
    if (Math.abs(e.deltaX)<=Math.abs(e.deltaY)) return;
    e.preventDefault(); stopAnim();
    setCursor(cursor() + e.deltaX/stripK);
  }, {passive:false});
  // Keys: ← / → an hour, Shift for a day; Home is now, End a week ahead
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
setInterval(()=>{ renderWeather(); }, 10*60000);
lastW=$('strip').clientWidth;
if (document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ stripKey=''; drawStrip(); });   // label sizes settle once fonts load
try { render(); } catch (err) { console.error('SF Tides:', err); try { renderNow(); drawStrip(); } catch (e2) { console.error(e2); } }
})();
