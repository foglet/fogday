/* SF Tides — fogday.com/tides. Predictions computed in the browser from NOAA harmonic constants
   (stations 9414290 and 9414275) with the Neaps tide predictor (neaps.min.js, MIT). */
const STATIONS = {"ref":{"id":"noaa/9414290","name":"SAN FRANCISCO (Golden Gate)","latitude":37.80630555555555,"longitude":-122.4658888888889,"region":"CA","country":"United States","continent":"Americas","timezone":"America/Los_Angeles","type":"reference","disclaimers":"","chart_datum":"MLLW","source":{"name":"US National Oceanic and Atmospheric Administration","id":"9414290","published_harmonics":true,"url":"https://tidesandcurrents.noaa.gov/stationhome.html?id=9414290"},"harmonic_constituents":[{"name":"M2","amplitude":0.576,"phase":208.2},{"name":"S2","amplitude":0.137,"phase":216.2},{"name":"N2","amplitude":0.122,"phase":183.2},{"name":"K1","amplitude":0.37,"phase":225.4},{"name":"M4","amplitude":0.022,"phase":136.8},{"name":"O1","amplitude":0.23,"phase":208.4},{"name":"M6","amplitude":0.002,"phase":7.3},{"name":"MK3","amplitude":0.018,"phase":124.1},{"name":"S4","amplitude":0,"phase":0},{"name":"MN4","amplitude":0.008,"phase":112},{"name":"NU2","amplitude":0.026,"phase":189.9},{"name":"S6","amplitude":0,"phase":0},{"name":"MU2","amplitude":0.007,"phase":100.2},{"name":"2N2","amplitude":0.013,"phase":153.3},{"name":"OO1","amplitude":0.012,"phase":260},{"name":"LAM2","amplitude":0.007,"phase":214.3},{"name":"S1","amplitude":0.007,"phase":282.6},{"name":"M1","amplitude":0.011,"phase":237.5},{"name":"J1","amplitude":0.019,"phase":244.3},{"name":"MM","amplitude":0,"phase":0},{"name":"SSA","amplitude":0.03,"phase":272.3},{"name":"SA","amplitude":0.044,"phase":200.2},{"name":"MSF","amplitude":0,"phase":0},{"name":"MF","amplitude":0.015,"phase":153.1},{"name":"RHO","amplitude":0.009,"phase":200},{"name":"Q1","amplitude":0.041,"phase":202.4},{"name":"T2","amplitude":0.009,"phase":204.6},{"name":"R2","amplitude":0.001,"phase":126.8},{"name":"2Q1","amplitude":0.006,"phase":208.6},{"name":"P1","amplitude":0.114,"phase":222.1},{"name":"2SM2","amplitude":0.003,"phase":37.3},{"name":"M3","amplitude":0.003,"phase":37.6},{"name":"L2","amplitude":0.018,"phase":229.6},{"name":"2MK3","amplitude":0.014,"phase":92.2},{"name":"K2","amplitude":0.04,"phase":206},{"name":"M8","amplitude":0.001,"phase":108.5},{"name":"MS4","amplitude":0.01,"phase":149}],"datums":{"LAT":1.2268009,"HAT":4.027801,"STND":0,"MHHW":3.602,"MHW":3.416,"DTL":2.712,"MTL":2.792,"MSL":2.773,"MLW":2.168,"MLLW":1.822,"GT":1.78,"MN":1.248,"DHQ":0.186,"DLQ":0.346,"HWI":7.535,"LWI":0.848,"NAVD88":1.804}},"ob":{"id":"noaa/9414275","name":"Ocean Beach, outer coast","latitude":37.775,"longitude":-122.513,"region":"CA","country":"United States","continent":"Americas","timezone":"America/Los_Angeles","type":"subordinate","chart_datum":"MLLW","source":{"name":"US National Oceanic and Atmospheric Administration","id":"9414275","published_harmonics":true,"url":"https://tidesandcurrents.noaa.gov/stationhome.html?id=9414275"},"offsets":{"reference":"noaa/9414290","height":{"type":"fixed","high":0.03,"low":0},"time":{"high":-49,"low":-35}},"harmonic_constituents":[{"name":"M2","amplitude":0.576,"phase":208.2},{"name":"S2","amplitude":0.137,"phase":216.2},{"name":"N2","amplitude":0.122,"phase":183.2},{"name":"K1","amplitude":0.37,"phase":225.4},{"name":"M4","amplitude":0.022,"phase":136.8},{"name":"O1","amplitude":0.23,"phase":208.4},{"name":"M6","amplitude":0.002,"phase":7.3},{"name":"MK3","amplitude":0.018,"phase":124.1},{"name":"S4","amplitude":0,"phase":0},{"name":"MN4","amplitude":0.008,"phase":112},{"name":"NU2","amplitude":0.026,"phase":189.9},{"name":"S6","amplitude":0,"phase":0},{"name":"MU2","amplitude":0.007,"phase":100.2},{"name":"2N2","amplitude":0.013,"phase":153.3},{"name":"OO1","amplitude":0.012,"phase":260},{"name":"LAM2","amplitude":0.007,"phase":214.3},{"name":"S1","amplitude":0.007,"phase":282.6},{"name":"M1","amplitude":0.011,"phase":237.5},{"name":"J1","amplitude":0.019,"phase":244.3},{"name":"MM","amplitude":0,"phase":0},{"name":"SSA","amplitude":0.03,"phase":272.3},{"name":"SA","amplitude":0.044,"phase":200.2},{"name":"MSF","amplitude":0,"phase":0},{"name":"MF","amplitude":0.015,"phase":153.1},{"name":"RHO","amplitude":0.009,"phase":200},{"name":"Q1","amplitude":0.041,"phase":202.4},{"name":"T2","amplitude":0.009,"phase":204.6},{"name":"R2","amplitude":0.001,"phase":126.8},{"name":"2Q1","amplitude":0.006,"phase":208.6},{"name":"P1","amplitude":0.114,"phase":222.1},{"name":"2SM2","amplitude":0.003,"phase":37.3},{"name":"M3","amplitude":0.003,"phase":37.6},{"name":"L2","amplitude":0.018,"phase":229.6},{"name":"2MK3","amplitude":0.014,"phase":92.2},{"name":"K2","amplitude":0.04,"phase":206},{"name":"M8","amplitude":0.001,"phase":108.5},{"name":"MS4","amplitude":0.01,"phase":149}],"datums":{"LAT":1.2268009,"HAT":4.027801,"STND":0,"MHHW":3.602,"MHW":3.416,"DTL":2.712,"MTL":2.792,"MSL":2.773,"MLW":2.168,"MLLW":1.822,"GT":1.78,"MN":1.248,"DHQ":0.186,"DLQ":0.346,"HWI":7.535,"LWI":0.848,"NAVD88":1.804}}};
const TZ = 'America/Los_Angeles';
const SITE = {lat: 37.79, lon: -122.48};
const BEACHES = {
  baker: {name: 'Baker Beach', st: 'ref', place: 'Outer Golden Gate, below the Presidio bluffs'},
  east:  {name: 'East Beach',  st: 'ref', place: 'Crissy Field, just inside the Golden Gate'},
  ocean: {name: 'Ocean Beach', st: 'ob',  place: 'Pacific shore, from the Cliff House to Fort Funston'}
};
const SOURCE = {
  ref: 'Computed from NOAA harmonic constants for station 9414290, San Francisco (Golden Gate).',
  ob:  'Computed from NOAA station 9414275, Ocean Beach (time and height offsets from 9414290, San Francisco).'
};

const predictors = {};
const pred = k => predictors[k] || (predictors[k] = Neaps.useStation(STATIONS[k]));
const opts = {datum: 'MLLW', units: 'feet'};

/* ---- Pacific time helpers (always SF time, whatever the viewer's clock says) ---- */
const dtf = new Intl.DateTimeFormat('en-US', {timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
function parts(ms){ const o={}; for (const p of dtf.formatToParts(new Date(ms))) o[p.type]=p.value; return {y:+o.year, m:+o.month, d:+o.day, h:+o.hour % 24, mi:+o.minute}; }
function tzOffset(ms){ const p=parts(ms); return Date.UTC(p.y,p.m-1,p.d,p.h,p.mi) - Math.floor(ms/60000)*60000; }
function laTime(y,m,d,h=0){ const base=Date.UTC(y,m-1,d,h); let t=base-tzOffset(base); t=base-tzOffset(t); return t; }
function addDays(day,n){ const t=new Date(Date.UTC(day.y,day.m-1,day.d+n)); return {y:t.getUTCFullYear(), m:t.getUTCMonth()+1, d:t.getUTCDate()}; }
function todayKey(){ const p=parts(Date.now()); return {y:p.y,m:p.m,d:p.d}; }
const same = (a,b) => a.y===b.y && a.m===b.m && a.d===b.d;
const fTime = new Intl.DateTimeFormat('en-US', {timeZone: TZ, hour:'numeric', minute:'2-digit'});
const fShort = ms => fTime.format(new Date(ms)).replace(' AM','a').replace(' PM','p');
const fDay = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday:'long', month:'long', day:'numeric'});
const fWk = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday:'short'});
const fMd = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', month:'short', day:'numeric'});
const dayDate = day => new Date(Date.UTC(day.y,day.m-1,day.d,12));
const ft = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(1);

/* ---- Sunrise / sunset (NOAA sunrise equation, ±1–2 min) ---- */
function sunTimes(day){
  const r=Math.PI/180, noon=laTime(day.y,day.m,day.d,12);
  const n=Math.floor(noon/864e5+2440587.5-2451545+0.0008);
  const Js=n-SITE.lon/360;
  const M=(357.5291+0.98560028*Js)%360;
  const C=1.9148*Math.sin(M*r)+0.02*Math.sin(2*M*r)+0.0003*Math.sin(3*M*r);
  const L=(M+C+180+102.9372)%360;
  const Jt=2451545+Js+0.0053*Math.sin(M*r)-0.0069*Math.sin(2*L*r);
  const dec=Math.asin(Math.sin(L*r)*Math.sin(23.4397*r));
  const w=Math.acos((Math.sin(-0.833*r)-Math.sin(SITE.lat*r)*Math.sin(dec))/(Math.cos(SITE.lat*r)*Math.cos(dec)))/r;
  const toMs=J=>(J-2440587.5)*864e5;
  return {rise:toMs(Jt-w/360), set:toMs(Jt+w/360)};
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
  return {p, lit, name, nextFull, age:(now-prevNew)/864e5};
}

function moonIcon(p){
  const r=15, waning=p>.5, q=waning?1-p:p, rx=(r*Math.abs(Math.cos(2*Math.PI*q))).toFixed(2), sweep=q<.25?0:1;
  return `<svg viewBox="-17 -17 34 34" aria-hidden="true"><circle r="${r}" fill="var(--moon-dark)"/>`+
    `<path transform="${waning?'scale(-1,1)':''}" d="M0,-${r} A${r},${r} 0 0 1 0,${r} A${rx},${r} 0 0 ${sweep} 0,-${r}Z" fill="var(--moon-lit)"/>`+
    `<circle r="${r}" fill="none" stroke="var(--line)" stroke-width="1"/></svg>`;
}
const fFull=new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
function renderMoon(){
  const m=moonInfo(Date.now());
  $('moon').innerHTML=`${moonIcon(m.p)}<div class="mtxt"><b>${m.name}</b><span class="num">${Math.round(m.lit*100)}% lit · day ${Math.floor(m.age)+1} of 29.5</span></div>
    <div class="mfull"><span>Next full moon</span><b class="num">${fFull.format(new Date(m.nextFull))}</b></div>`;
}

/* ---- Data ---- */
function dayData(key, day){
  const start=laTime(day.y,day.m,day.d), end=laTime(...Object.values(addDays(day,1)));
  const p=pred(BEACHES[key].st);
  // Pad the window: subordinate stations shift reference extremes by up to ±2 h.
  const ext=p.getExtremesPrediction({start:new Date(start-3*36e5), end:new Date(end+3*36e5), ...opts}).extremes
    .map(e=>({t:+new Date(e.time), v:e.level, high:e.high}))
    .filter(e=>e.t>=start && e.t<end);
  const tl=p.getTimelinePrediction({start:new Date(start-36e5), end:new Date(end+36e5), timeFidelity:600, ...opts}).timeline
    .map(x=>({t:+new Date(x.time), v:x.level}));
  return {start, end, ext, tl};
}

/* ---- State ---- */
let beach = 'baker';
const hashBeach = (location.hash||'').slice(1);
if (BEACHES[hashBeach]) beach = hashBeach;
else { try { const s=localStorage.getItem('sf-tides-beach'); if (BEACHES[s]) beach=s; } catch(e){} }
let view = todayKey();
const $ = id => document.getElementById(id);
$('beach').value = beach;

/* ---- Rendering ---- */
const NS='http://www.w3.org/2000/svg';
const Y0=-2.5, Y1=8;

function drawChart(d, isToday){
  const box=$('chart'), W=Math.max(280, box.clientWidth), H=W<520?230:280;
  const pl=30, pr=8, pt=34, pb=26, iw=W-pl-pr, ih=H-pt-pb;
  const x=t=>pl+(t-d.start)/(d.end-d.start)*iw;
  const y=v=>pt+(Y1-v)/(Y1-Y0)*ih;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Tide height through the day">`;
  s+=`<defs><clipPath id="clip"><rect x="${pl}" y="0" width="${iw}" height="${H}"/></clipPath></defs>`;
  const sun=sunTimes(view);
  s+=`<rect x="${pl}" y="${pt}" width="${Math.max(0,x(sun.rise)-pl)}" height="${ih}" fill="var(--night)"/>`;
  s+=`<rect x="${x(sun.set)}" y="${pt}" width="${Math.max(0,pl+iw-x(sun.set))}" height="${ih}" fill="var(--night)"/>`;
  for (let v=-2; v<=8; v+=2){
    s+=`<line x1="${pl}" x2="${pl+iw}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="${v===0?1.4:1}" ${v===0?'':'stroke-dasharray="2 4"'}/>`;
    s+=`<text class="tick" x="${pl-6}" y="${y(v)+4}" text-anchor="end">${v<0?'−'+(-v):v}</text>`;
  }
  const hrs=[0,6,12,18,24], hl=['12a','6a','12p','6p','12a'];
  const nd=addDays(view,1);
  hrs.forEach((h,i)=>{
    const t = h===24 ? d.end : laTime(view.y,view.m,view.d,h);
    s+=`<text class="tick" x="${x(t)}" y="${H-6}" text-anchor="${i===0?'start':i===4?'end':'middle'}">${hl[i]}</text>`;
  });
  const pts=d.tl.map(p=>`${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`);
  s+=`<g clip-path="url(#clip)"><path class="tide" d="M${pts[0].split(',')[0]},${y(Y0)} L${pts.join(' L')} L${pts[pts.length-1].split(',')[0]},${y(Y0)} Z" fill="var(--water-fill)"/>`;
  s+=`<path d="M${pts.join(' L')}" fill="none" stroke="var(--water)" stroke-width="2.2" stroke-linejoin="round"/></g>`;
  d.ext.forEach(e=>{
    const ex=x(e.t), ey=y(e.v);
    const anchor = ex<pl+40 ? 'start' : ex>pl+iw-40 ? 'end' : 'middle';
    s+=`<circle cx="${ex}" cy="${ey}" r="4" fill="var(--surface)" stroke="${e.high?'var(--water)':'var(--sand)'}" stroke-width="2"/>`;
    if (e.high){
      s+=`<text class="lab" x="${ex}" y="${ey-20}" text-anchor="${anchor}">${ft(e.v)} ft</text><text class="labt" x="${ex}" y="${ey-8}" text-anchor="${anchor}">${fShort(e.t)}</text>`;
    } else {
      s+=`<text class="lab" x="${ex}" y="${ey+19}" text-anchor="${anchor}">${ft(e.v)} ft</text><text class="labt" x="${ex}" y="${ey+31}" text-anchor="${anchor}">${fShort(e.t)}</text>`;
    }
  });
  if (isToday){
    const now=Date.now(), lv=pred(BEACHES[beach].st).getWaterLevelAtTime({time:new Date(now), ...opts}).level;
    s+=`<line x1="${x(now)}" x2="${x(now)}" y1="${pt-6}" y2="${pt+ih}" stroke="var(--buoy)" stroke-width="1.5"/>`;
    s+=`<circle cx="${x(now)}" cy="${y(lv)}" r="5.5" fill="var(--buoy)" stroke="var(--surface)" stroke-width="2"/>`;
    s+=`<text class="tick" x="${x(now)}" y="${pt-10}" text-anchor="${x(now)<pl+30?'start':x(now)>pl+iw-30?'end':'middle'}" style="fill:var(--buoy)">now</text>`;
  }
  box.innerHTML=s+'</svg>';
}

function renderNow(){
  const el=$('now'), now=Date.now(), p=pred(BEACHES[beach].st);
  const lv=p.getWaterLevelAtTime({time:new Date(now), ...opts}).level;
  const nx=p.getExtremesPrediction({start:new Date(now-3*36e5), end:new Date(now+30*36e5), ...opts}).extremes
    .filter(e=>+new Date(e.time)>now);
  const n1=nx[0], n2=nx[1];
  const rising=n1 && n1.high;
  const mins=n1 ? Math.round((+new Date(n1.time)-now)/6e4) : 0;
  const dur = mins>=60 ? `${Math.floor(mins/60)} h ${mins%60} min` : `${mins} min`;
  const arrow = rising ? '<path d="M9 2 16 10h-4.5v6h-5v-6H2z"/>' : '<path d="M9 16 2 8h4.5V2h5v6H16z"/>';
  const nLow=nx.find(e=>e.low), nHigh=nx.find(e=>e.high);
  const line=(lab,e)=> e ? `<span class="next">${lab}: <b class="num">${fTime.format(new Date(e.time))}</b> · <span class="num">${ft(e.level)} ft</span>${e===n1?` · in ${dur}`:''}</span>` : '';
  const order = rising ? [['Next high tide',nHigh],['Next low tide',nLow]] : [['Next low tide',nLow],['Next high tide',nHigh]];
  el.innerHTML = `<div class="level num">${ft(lv)}<small>ft</small></div>
    <div class="state"><span class="dir"><svg viewBox="0 0 18 18" aria-hidden="true">${arrow}</svg>Tide is ${rising?'rising':'falling'}</span>
    ${order.map(([l,e])=>line(l,e)).join('')}</div>`;
}

function spark(d){
  const W=200,H=34, x=t=>(t-d.start)/(d.end-d.start)*W, y=v=>2+(Y1-v)/(Y1-Y0)*(H-4);
  const pts=d.tl.filter((p,i)=>i%3===0).map(p=>`${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' L');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line)" stroke-width="1"/><path d="M${pts}" fill="none" stroke="var(--water)" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}

function renderWeek(){
  const t=todayKey(), list=$('week');
  let html='';
  for (let i=0;i<7;i++){
    const day=addDays(t,i), d=dayData(beach,day);
    const lows=d.ext.filter(e=>!e.high), lo=lows.reduce((a,b)=>b.v<a.v?b:a, lows[0]);
    const label = i===0 ? 'Today' : fWk.format(dayDate(day));
    html+=`<button class="wd" data-off="${i}" ${same(day,view)?'aria-current="date"':''}>
      <span class="dname"><b>${label}</b><span>${fMd.format(dayDate(day))}</span></span>
      ${spark(d)}
      <span class="lo">${lo?`<span>Low <b class="num">${ft(lo.v)}</b> · <span class="num">${fShort(lo.t)}</span></span>${lo.v<0?'<span class="chip">Minus tide</span>':''}`:''}</span>
    </button>`;
  }
  list.innerHTML=html;
}

function render(){
  const b=BEACHES[beach], t=todayKey(), isToday=same(view,t);
  renderMoon();
  $('place').textContent=b.place;
  $('source').textContent=SOURCE[b.st];
  $('dayTitle').textContent = (isToday?'Today, ':'') + fDay.format(dayDate(view));
  $('todayBtn').hidden = isToday;
  $('now').hidden = !isToday;
  if (isToday) renderNow();
  const d=dayData(beach,view);
  drawChart(d,isToday);
  $('events').innerHTML = d.ext.map(e=>`<div class="ev"><span class="pill ${e.high?'H':'L'}">${e.high?'High':'Low'}</span><span class="t num">${fTime.format(new Date(e.t))}</span><span class="h num">${ft(e.v)} ft</span></div>`).join('');
  const s=sunTimes(view);
  $('sun').innerHTML=`<span>Sunrise <b class="num">${fTime.format(new Date(s.rise))}</b></span><span>Sunset <b class="num">${fTime.format(new Date(s.set))}</b></span><span>Shaded areas on the chart are night.</span>`;
  renderWeek();
}

$('beach').addEventListener('change', e=>{
  beach=e.target.value;
  try{ localStorage.setItem('sf-tides-beach', beach); }catch(err){}
  render();
});
$('prev').addEventListener('click', ()=>{ view=addDays(view,-1); render(); });
$('next').addEventListener('click', ()=>{ view=addDays(view,1); render(); });
$('todayBtn').addEventListener('click', ()=>{ view=todayKey(); render(); });
$('week').addEventListener('click', e=>{ const b=e.target.closest('.wd'); if(!b) return; view=addDays(todayKey(), +b.dataset.off); render(); });
let rt; addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>drawChart(dayData(beach,view), same(view,todayKey())), 120); });
setInterval(()=>{ renderMoon(); if (same(view,todayKey())) { renderNow(); drawChart(dayData(beach,view), true); } }, 60000);
render();
