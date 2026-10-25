/* SF Tides — fogday.com/tides
   Tides: computed in the browser from NOAA harmonic constants (stations.js) with the Neaps predictor (neaps.min.js, MIT).
   Weather: live from the National Weather Service API (api.weather.gov), fetched by the visitor's browser. */
(function () {
const STATIONS = window.TIDE_STATIONS;
const TZ = 'America/Los_Angeles';
const BEACHES = {
  baker:   {name: 'Baker Beach',  st: 'ref', lat: 37.7936, lon: -122.4836, place: 'Below the Presidio bluffs, the outer Golden Gate'},
  china:   {name: 'China Beach',  st: 'ob',  lat: 37.7883, lon: -122.4915, place: 'A delightful small cove in Sea Cliff, facing the Golden Gate'},
  east:    {name: 'East Beach',   st: 'ref', lat: 37.8055, lon: -122.4535, place: 'At Crissy Field, just inside the Golden Gate'},
  funston: {name: 'Fort Funston', st: 'ob',  lat: 37.7146, lon: -122.5023, place: 'Below the Fort Funston bluffs, south of Lake Merced'},
  ocean:   {name: 'Ocean Beach',  st: 'ob',  lat: 37.7594, lon: -122.5107, place: 'The Pacific shore from the Cliff House to Sloat Boulevard'}
};
const STATION_LINE = {ref: 'NOAA 9414290 · San Francisco · MLLW', ob: 'NOAA 9414275 · Ocean Beach · MLLW'};
const SOURCE = {
  ref: 'Tides computed from NOAA harmonic constants for station 9414290, San Francisco (Golden Gate), the nearest NOAA station to this beach.',
  ob:  'Tides computed from NOAA station 9414275, Ocean Beach, outer coast (time and height offsets from 9414290, San Francisco), the nearest NOAA station to this beach.'
};
const DAYS_IN_STRIP = 1;  // one day, fitted to the card (no sideways scroll)

const predictors = {};
const pred = k => predictors[k] || (predictors[k] = Neaps.useStation(STATIONS[k]));
const opts = {datum: 'MLLW', units: 'feet'};
// Missing elements get a detached stand-in, so one stale or removed part of the page can't stop the rest from drawing.
const $ = id => document.getElementById(id) || document.createElement('div');

/* ---- Pacific time helpers (always SF time, whatever the visitor's clock says) ---- */
const dtf = new Intl.DateTimeFormat('en-US', {timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
function parts(ms){ const o={}; for (const p of dtf.formatToParts(new Date(ms))) o[p.type]=p.value; return {y:+o.year, m:+o.month, d:+o.day, h:+o.hour % 24, mi:+o.minute}; }
function tzOffset(ms){ const p=parts(ms); return Date.UTC(p.y,p.m-1,p.d,p.h,p.mi) - Math.floor(ms/60000)*60000; }
function laTime(y,m,d,h=0){ const base=Date.UTC(y,m-1,d,h); let t=base-tzOffset(base); t=base-tzOffset(t); return t; }
const dayStart = day => laTime(day.y, day.m, day.d);
function addDays(day,n){ const t=new Date(Date.UTC(day.y,day.m-1,day.d+n)); return {y:t.getUTCFullYear(), m:t.getUTCMonth()+1, d:t.getUTCDate()}; }
function todayKey(){ const p=parts(Date.now()); return {y:p.y,m:p.m,d:p.d}; }
const same = (a,b) => a.y===b.y && a.m===b.m && a.d===b.d;
const fTime = new Intl.DateTimeFormat('en-US', {timeZone: TZ, hour:'numeric', minute:'2-digit'});
const fShort = ms => fTime.format(new Date(ms)).replace(' AM','a').replace(' PM','p');
const fDay = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', weekday:'long', month:'long', day:'numeric'});
const fWk = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', weekday:'short'});
const fMd = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', month:'short', day:'numeric'});
const fStripDay = new Intl.DateTimeFormat('en-US', {timeZone:'UTC', weekday:'short', month:'short', day:'numeric'});
const fMoonDay = new Intl.DateTimeFormat('en-US', {timeZone: TZ, weekday:'short', month:'short', day:'numeric'});
const fFull = new Intl.DateTimeFormat('en-US', {timeZone: TZ, weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'});
const dayDate = day => new Date(Date.UTC(day.y,day.m-1,day.d,12));
// Tide heights: predictions are in feet; tap the big number to switch to meters (remembered per visitor).
let units = 'ft';
try { if (localStorage.getItem('sf-tides-units') === 'm') units = 'm'; } catch(e){}
const ft = v => { const x = units==='m' ? v*0.3048 : v; return (x < 0 ? '−' : '') + Math.abs(x).toFixed(units==='m'?2:1); };
const U = () => units==='m' ? 'm' : 'ft';
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
  return {p, lit, name, nextFull, age:(now-prevNew)/864e5};
}


/* ---- Coordinates (same format as /transit/) ---- */
// 37°47′37″N 122°29′01″W — degrees, minutes, seconds, rounded to the second
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

/* ---- Durations, in words: "shortly" under 45 min; "in about six hours" within 15 min of a whole hour;
   "in a little more than six hours" from 16 to 44 min past it ---- */
const NUM_WORDS=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four'];
function hoursText(h){ return h===1 ? 'an hour' : `${NUM_WORDS[h]||h} hours`; }
function inDur(mins){
  if (mins<45) return 'shortly';
  const h=Math.round(mins/60);
  if (Math.abs(mins-h*60)<=15) return `in about ${hoursText(h)}`;
  return `in a little more than ${hoursText(Math.floor(mins/60))}`;
}

/* ---- Tide now ---- */
function renderNow(){
  const now=Date.now(), lv=levelAt(beach, now);
  const nx=pred(BEACHES[beach].st).getExtremesPrediction({start:new Date(now-3*36e5), end:new Date(now+30*36e5), ...opts}).extremes
    .filter(e=>+new Date(e.time)>now);
  const n1=nx[0], rising=!!(n1 && n1.high);
  const mins=n1 ? Math.round((+new Date(n1.time)-now)/6e4) : 0;
  const nLow=nx.find(e=>e.low), nHigh=nx.find(e=>e.high);
  const line=(lab,e)=> e ? `<div class="nrow"><span class="label">${lab}</span><span><b class="num">${fTime.format(new Date(e.time))}</b> <span class="num muted">${fh(e.level)}${e===n1?` · ${inDur(mins)}`:''}</span></span></div>` : '';
  // Negative (minus) tide: shown only if one is still to come later today
  const neg = extremes(beach, now, dayStart(addDays(todayKey(),1))).find(e=>!e.high && e.v<0);
  // If the next low is itself the negative tide, it takes the low's place instead of appearing twice
  const negIsNext = !!(neg && nLow && Math.abs(+new Date(nLow.time)-neg.t)<6e4);
  const negIsN1 = !!(neg && n1 && Math.abs(+new Date(n1.time)-neg.t)<6e4);
  const negLine = neg ? `<div class="nrow neg"><span class="label">Negative tide</span><span><b class="num">${fTime.format(new Date(neg.t))}</b> <span class="num muted">${fh(neg.v)}${negIsN1?` · ${inDur(mins)}`:''}</span></span></div>` : '';
  // Listed in order of time: whichever comes first (low, high or negative) is shown first
  const rows = [];
  if (nLow && !negIsNext) rows.push([+new Date(nLow.time), line('Next low tide',nLow)]);
  if (nHigh) rows.push([+new Date(nHigh.time), line('Next high tide',nHigh)]);
  if (neg) rows.push([neg.t, negLine]);
  rows.sort((a,b)=>a[0]-b[0]);
  // Slack tide: only while it is happening (within 15 minutes either side of a high or low), never predicted ahead; always the first line
  const SLACK_MS=15*6e4;
  if (extremes(beach, now-SLACK_MS, now+SLACK_MS).length) rows.unshift([now, '<div class="nrow slack"><span class="label">Slack tide</span></div>']);
  const arrow = rising ? '<path d="M9 2 16 10h-4.5v6h-5v-6H2z"/>' : '<path d="M9 16 2 8h4.5V2h5v6H16z"/>';
  $('tideNow').innerHTML = `
    <button class="big" id="unitToggle" type="button" aria-label="Tide ${ft(lv)} ${units==='m'?'meters':'feet'}, ${rising?'rising':'falling'}. Tap to show ${units==='m'?'feet':'meters'}." title="Tap to show ${units==='m'?'feet':'meters'}">
      <svg class="arrow" viewBox="0 0 18 18" aria-hidden="true">${arrow}</svg>
      <span class="slab grad num">${ft(lv)}</span><span class="unit">${U()}</span>
    </button>
    <div class="hero-side"><div class="nlist">${rows.map(r=>r[1]).join('')}</div></div>`;
}

/* ---- Moon tile ---- */
function moonIcon(p){
  const r=15, waning=p>.5, q=waning?1-p:p, rx=(r*Math.abs(Math.cos(2*Math.PI*q))).toFixed(2), sweep=q<.25?0:1;
  return `<svg class="moonicon" viewBox="-17 -17 34 34" aria-hidden="true"><circle r="${r}" fill="var(--moon-dark)"/>`+
    `<path transform="${waning?'scale(-1,1)':''}" d="M0,-${r} A${r},${r} 0 0 1 0,${r} A${rx},${r} 0 0 ${sweep} 0,-${r}Z" fill="var(--moon-lit)"/>`+
    `<circle r="${r}" fill="none" stroke="var(--line)" stroke-width="1"/></svg>`;
}
function renderMoon(){
  const now=Date.now(), m=moonInfo(now), full=m.nextFull;
  // Moonrise / moonset for today, same format as sunrise / sunset; each greys out once it has happened, "—" if none today
  const mrs=moonTimes(todayKey());
  const mt=(lab,ms,n)=>`<div class="${ms!==null&&n>=ms?'past':''}"><span class="label">${lab}</span><span class="time">${ms===null?'—':tm(ms)}</span></div>`;
  // Calendar days in SF time. Tomorrow's date reads "is tomorrow"; on the day itself, hours and minutes.
  const pf=parts(full), pn=parts(now);
  const days=Math.round((Date.UTC(pf.y,pf.m-1,pf.d)-Date.UTC(pn.y,pn.m-1,pn.d))/864e5);
  let when;
  if (days<=0){ const mins=Math.max(0,Math.round((full-now)/6e4)); when = inDur(mins); }
  else if (days===1) when = 'is tomorrow';
  else when = `in ${days} days`;
  // Tomorrow, after that day's sunset: "The full moon is tomorrow night."
  const tmrwNight = days===1 && full>=sunTimes({y:pf.y,m:pf.m,d:pf.d}).set;
  // Howl only in the 28 hours before the full moon.
  const howl = full-now <= 28*3.6e6 ? ' Ahhh-wooooooo!!!' : '';
  // Full moon day: the howl alone (always within the 28 hours)
  const head = days<=0 ? howl.trim()
    : (tmrwNight ? 'The full moon is tomorrow night.' : `Next full moon ${when}`) + howl;
  const dateTxt = days===1 ? 'at ' + fTime.format(new Date(full))  // tomorrow: the heading already says so
    // Today, by when the moment falls: after sunset "Tonight at 9:11 PM", noon to sunset "This afternoon at …", morning "Today at …"
    : (days<=0 ? (full>=sunTimes({y:pn.y,m:pn.m,d:pn.d}).set ? 'Tonight' : pf.h>=12 ? 'This afternoon' : 'Today') : fMoonDay.format(new Date(full))) + ' at ' + fTime.format(new Date(full));
  $('moon').innerHTML=`<span class="label">Moon</span>
    <div class="moonrow">${moonIcon(m.p)}
      <div class="stack"><span class="slab moonname">${m.name}</span>
        <span class="muted num">${Math.round(m.lit*100)}% lit</span>
        <span class="nextfull"><b>${head}</b><br><span class="muted num">${dateTxt}</span></span></div>
      <div class="suntimes num moontimes" aria-label="Moonrise and moonset">${mt('Moonrise',mrs.rise,now)}${mt('Moonset',mrs.set,now)}</div>
    </div>`;
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
  const h0 = hourly && hourly.properties.periods && hourly.properties.periods[0];
  const data = {obs, prev, stationName, hi: today && today.temperature, lo: tonight && tonight.temperature,
    short: h0 && h0.shortForecast, rain: h0 && h0.probabilityOfPrecipitation ? h0.probabilityOfPrecipitation.value : null,
    hourlyTemp: h0 && h0.temperature, hourlyWind: h0 && h0.windSpeed, hourlyDir: h0 && h0.windDirection, isDay: h0 ? h0.isDaytime : true};
  wxCache[key] = {at: Date.now(), data};
  return data;
}
const cToF = c => c*9/5+32, kmhToMph = k => k/1.609344;
const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const compass = deg => COMPASS[Math.round(((deg%360)+360)%360/22.5)%16];
function skyIcon(text, isDay){
  const t=(text||'').toLowerCase();
  const sun='<circle cx="18" cy="18" r="6"/><path d="M18 4v4M18 28v4M4 18h4M28 18h4M8 8l2.8 2.8M25.2 25.2 28 28M8 28l2.8-2.8M25.2 10.8 28 8"/>';
  const moon='<path d="M24 22.5A9 9 0 1 1 15.5 9a7 7 0 0 0 8.5 13.5z"/>';
  const cloud='<path d="M11 27h15a5.5 5.5 0 0 0 .5-11A8 8 0 0 0 11.2 18 4.5 4.5 0 0 0 11 27z"/>';
  const fog='<path d="M6 13h24M4 18h28M8 23h20M6 28h24"/>';
  const rain=cloud.replace('27h15','23h15').replace('0 0 0 11 27z','0 0 0 11 23z')+'<path d="M13 27l-2 4M19 27l-2 4M25 27l-2 4"/>';
  let g = /rain|shower|drizzle|storm/.test(t) ? rain : /fog|haze|mist|smoke/.test(t) ? fog : /cloud|overcast/.test(t) && !/partly|mostly sunny|mostly clear/.test(t) ? cloud
    : /partly|mostly/.test(t) ? (isDay?sun:moon).replace('cx="18" cy="18" r="6"','cx="14" cy="13" r="5"') + cloud : (isDay?sun:moon);
  return `<svg class="sky" viewBox="0 0 36 36" aria-hidden="true">${g}</svg>`;
}
function compassSvg(deg){
  const ticks=[0,90,180,270].map(a=>`<line x1="0" y1="-22" x2="0" y2="-18" transform="rotate(${a})"/>`).join('');
  const arrow = deg==null ? '' : `<g transform="rotate(${deg+180})"><path d="M0,-17 L5,-4 L0,-7 L-5,-4 Z" class="needle"/><line x1="0" y1="-7" x2="0" y2="14" class="tail"/></g>`;
  return `<svg class="compass" viewBox="-28 -28 56 56" aria-hidden="true"><circle r="22" class="ring"/>${ticks}<text y="-23.5" text-anchor="middle">N</text>${arrow}</svg>`;
}
let wxToken = 0;
async function renderWeather(){
  const token = ++wxToken, key = beach;
  try {
    const w = await loadWeather(key);
    if (token !== wxToken) return;
    const o = w.obs || {};
    const val = x => x && x.value != null ? x.value : null;
    const tF = val(o.temperature) != null ? Math.round(cToF(val(o.temperature))) : w.hourlyTemp;
    const desc = o.textDescription || w.short || '—';
    $('weather').innerHTML = `<span class="label">Weather</span>
      <div class="trow"><span class="slab mid num">${tF!=null?tF+'°':'—'}</span>${skyIcon(desc, w.isDay)}</div>
      <div class="sub"><b>${esc(desc)}</b><span class="muted num">${w.hi!=null?`H ${w.hi}°`:''}${w.lo!=null?` · L ${w.lo}°`:''}</span></div>`;
    let spd = val(o.windSpeed) != null ? Math.round(kmhToMph(val(o.windSpeed))) : (w.hourlyWind ? parseInt(w.hourlyWind,10) : null);
    let dir = val(o.windDirection);
    const gust = val(o.windGust) != null ? Math.round(kmhToMph(val(o.windGust))) : null;
    const dirTxt = dir!=null ? compass(dir) : (w.hourlyDir || '');
    if (dir==null && w.hourlyDir) dir = COMPASS.indexOf(w.hourlyDir)*22.5;
    $('wind').innerHTML = `<span class="label">Wind</span>
      <div class="trow"><span class="slab mid num">${spd!=null?spd:'—'}<span class="unit">mph</span></span>${compassSvg(spd===0?null:dir)}</div>
      <div class="sub"><b>${spd===0?'Calm':dirTxt?'From '+dirTxt:'—'}</b><span class="muted num">${gust?`Gusts ${gust} mph`:'No gusts reported'}</span></div>`;
  } catch(e) {
    if (token !== wxToken) return;
    const msg = '<p class="muted">Live weather isn’t available right now. It comes from the National Weather Service; try again in a few minutes.</p>';
    $('weather').innerHTML = '<span class="label">Weather</span>' + msg;
    $('wind').innerHTML = '<span class="label">Wind</span>';
  }
}

/* ---- Multi-day tide strip (swipe sideways) ---- */
const Y0=-2.5, Y1=8;
// Axis ticks as [height in feet, label in the current unit]
const ticks = () => units==='m'
  ? [-0.5,0,0.5,1,1.5,2].map(m=>[m/0.3048, m<0?'−'+(-m):String(m)])
  : [-2,0,2,4,6,8].map(f=>[f, f<0?'−'+(-f):String(f)]);
function chartGeom(){ const dayW=Math.max(260, $('strip').clientWidth); const H=dayW<520?240:290; return {dayW, H, pt:22, pb:14}; }  // room above for the "now" label, below for low-tide labels
function drawStrip(){
  const g=chartGeom(), {dayW, H, pt, pb}=g, ih=H-pt-pb;
  const start=dayStart(view), days=[...Array(DAYS_IN_STRIP+1)].map((_,i)=>addDays(view,i));
  const bounds=days.map(dayStart), end=bounds[DAYS_IN_STRIP];
  const W=dayW*DAYS_IN_STRIP;
  // each day gets the same width even across a DST change
  const x=t=>{ let i=0; while(i<DAYS_IN_STRIP-1 && t>=bounds[i+1]) i++; return i*dayW + (t-bounds[i])/(bounds[i+1]-bounds[i])*dayW; };
  const y=v=>pt+(Y1-v)/(Y1-Y0)*ih;
  // top and bottom padding of 2.5% of the card height, so the chart fills 95% of it
  const day=$('strip').closest('.day'); if (day) day.style.paddingBlock = (H*0.025/0.95).toFixed(1)+'px';

  let s=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Tide height over ${DAYS_IN_STRIP} days">`;
  for (let i=0;i<DAYS_IN_STRIP;i++){
    const sun=sunTimes(days[i]), x0=i*dayW;
    s+=`<rect x="${x0}" y="${pt}" width="${Math.max(0,x(sun.rise)-x0)}" height="${ih}" fill="var(--night)"/>`;
    s+=`<rect x="${x(sun.set)}" y="${pt}" width="${Math.max(0,x0+dayW-x(sun.set))}" height="${ih}" fill="var(--night)"/>`;
    if (i>0) s+=`<line x1="${x0}" x2="${x0}" y1="${pt-30}" y2="${pt+ih}" stroke="var(--line)" stroke-width="1"/>`;
  }
  for (const [v] of ticks()) s+=`<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="${Math.abs(v)<1e-9?1.4:1}" ${Math.abs(v)<1e-9?'':'stroke-dasharray="2 5"'}/>`;
  const tl=timeline(beach, start, end, 600);
  const pts=tl.map(p=>`${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`);
  const waterD=`M0,${y(Y0)} L${pts.join(' L')} L${W},${y(Y0)} Z`;
  s+=`<path d="${waterD}" fill="var(--water-fill)"/>`;
  // Horizontal waves inside the water: flat sine lines, 3 px apart (24 px wavelength, ±0.6 px swell)
  s+=`<defs><pattern id="tideWaves" width="24" height="3" patternUnits="userSpaceOnUse"><path d="M0 1.5 C4 0.9 8 0.9 12 1.5 S20 2.1 24 1.5" fill="none" stroke="var(--water)" stroke-width="0.8" stroke-opacity="0.35"/></pattern></defs>`;
  s+=`<path d="${waterD}" fill="url(#tideWaves)"/>`;
  s+=`<path d="M${pts.join(' L')}" fill="none" stroke="var(--water)" stroke-width="2.4" stroke-linejoin="round"/>`;
  for (const e of extremes(beach, start, end)){
    const ex=x(e.t), ey=y(e.v), anchor = ex<36?'start':ex>W-36?'end':'middle';
    s+=`<circle cx="${ex}" cy="${ey}" r="4.5" fill="var(--surface)" stroke="${e.high?'var(--water)':'var(--sand)'}" stroke-width="2.2"/>`;
    const dy = e.high ? [-21,-8] : [20,32];
    s+=`<text class="lab" x="${ex}" y="${ey+dy[0]}" text-anchor="${anchor}">${fShort(e.t)}</text><text class="labt" x="${ex}" y="${ey+dy[1]}" text-anchor="${anchor}">${fh(e.v)}</text>`;
  }
  const now=Date.now();
  if (now>=start && now<end){
    const nx=x(now), lv=levelAt(beach, now);
    s+=`<line x1="${nx}" x2="${nx}" y1="${pt-2}" y2="${pt+ih}" stroke="var(--buoy)" stroke-width="1.6"/>`;
    s+=`<circle cx="${nx}" cy="${y(lv)}" r="6" fill="var(--buoy)" stroke="var(--surface)" stroke-width="2.2"/>`;
    s+=`<text class="nowl" x="${nx}" y="${pt-6}" text-anchor="middle">now</text>`;
  }
  $('stripInner').style.width = W+'px';
  $('stripSvg').innerHTML = s+'</svg>';
  return {x, now, start, end, dayW};
}



// "6:17 PM" with a smaller "PM", as in the sunrise / sunset and moonrise / moonset columns
const tm=ms=>{ const ps=new Intl.DateTimeFormat('en-US',{timeZone:TZ,hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(new Date(ms));
  return esc(ps.filter(p=>p.type!=='dayPeriod').map(p=>p.value).join('').trim())+' <span class="ampm">'+esc(ps.filter(p=>p.type==='dayPeriod').map(p=>p.value).join(''))+'</span>'; };

/* Sunrise / sunset, top right. Each greys out once it has happened today; after sunset the sunrise slot shows tomorrow's. */
function renderSun(){
  const now=Date.now(), t=todayKey(), sun=sunTimes(t);
  const afterSet = now>=sun.set, rise = afterSet ? sunTimes(addDays(t,1)).rise : sun.rise;
  const riseDone = !afterSet && now>=sun.rise;
  // Sunset greys out once it has happened, until the next sunrise
  $('sun').innerHTML=`<div class="${riseDone?'past':''}"><span class="label">Sunrise</span><span class="time">${tm(rise)}</span></div><div class="${afterSet?'past':''}"><span class="label">Sunset</span><span class="time">${tm(sun.set)}</span></div>`;
}

/* ---- Page ---- */
function render(opts2){
  const b=BEACHES[beach], t=todayKey(), isToday=same(view,t);
  $('place').textContent=b.place;
  $('beachName').textContent=b.name;
  { const i=ORDER.indexOf(beach), n=BEACHES[ORDER[(i+1)%ORDER.length]].name; $('beachBtn').setAttribute('aria-label', `${b.name}, beach ${i+1} of ${ORDER.length}. Tap for ${n}.`); $('beachBtn').title=`Next: ${n}`; }
  $('coords').textContent=dms(b.lat,'N','S')+' '+dms(b.lon,'E','W');
  $('station').textContent=STATION_LINE[b.st];
  $('source').textContent=SOURCE[b.st];
  renderNow(); renderMoon();
  drawStrip();
  const s=dayStart(view), e=dayStart(addDays(view,1));
  renderSun();
  if (!opts2 || opts2.weather !== false) renderWeather();
}

$('tideNow').addEventListener('click', e=>{
  if (!e.target.closest('#unitToggle')) return;
  units = units==='m' ? 'ft' : 'm';
  try { localStorage.setItem('sf-tides-units', units); } catch(err){}
  render({weather:false});
  const b=$('unitToggle'); if (b.focus) b.focus();
});
/* Tap the beach name for the next beach (five, in order, then back to the first) */
const ORDER=Object.keys(BEACHES);
$('beachBtn').addEventListener('click', ()=>{
  beach=ORDER[(ORDER.indexOf(beach)+1)%ORDER.length];
  render();
});
let rt, lastW=0; addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>{ const w=$('strip').clientWidth; if (w!==lastW){ lastW=w; drawStrip(); } }, 150); });
setInterval(()=>{ if (!same(view,todayKey())) { view=todayKey(); render({weather:false}); } else { renderNow(); renderMoon(); renderSun(); drawStrip(); } }, 60000);  // rolls over to the new day at midnight
setInterval(()=>{ renderWeather(); }, 10*60000);
lastW=$('strip').clientWidth;
try { render(); } catch (err) { console.error('SF Tides:', err); try { renderNow(); drawStrip(); } catch (e2) { console.error(e2); } }
})();
