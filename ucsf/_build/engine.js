/* ---------- geometry ---------- */
const KX = Math.cos(37.77*Math.PI/180)*111320, KY = 110540;
function meters(a, b){ const dx=(a[1]-b[1])*KX, dy=(a[0]-b[0])*KY; return Math.hypot(dx,dy) }
function bearing(a, b){ const dx=(b[1]-a[1])*KX, dy=(b[0]-a[0])*KY; return (Math.atan2(dx,dy)*180/Math.PI+360)%360 }

const STOPS = D.stops.map(s => ({name:s[0], short:s[0].replace(/\s*\(.*\)\s*$/, ""), ll:[s[1]/1e5, s[2]/1e5]}));
const SHAPES = D.shapes.map((f, i) => {
  const pts=[]; let a=0, o=0;
  for(let k=0;k<f.length;k+=2){ a+=f[k]; o+=f[k+1]; pts.push([a/1e5, o/1e5]) }
  const cum=[0]; for(let k=1;k<pts.length;k++) cum.push(cum[k-1]+meters(pts[k-1], pts[k]));
  return {pts, cum, len:cum[cum.length-1], scale:cum[cum.length-1]/(D.shapeLen[i]||cum[cum.length-1]||1)};
});
function pointAt(sh, d){
  d=Math.max(0, Math.min(sh.len, d));
  let lo=0, hi=sh.cum.length-1;
  while(hi-lo>1){ const m=(lo+hi)>>1; if(sh.cum[m]<=d) lo=m; else hi=m }
  const seg=sh.cum[hi]-sh.cum[lo]||1, t=(d-sh.cum[lo])/seg, a=sh.pts[lo], b=sh.pts[hi];
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
}

/* ---------- routes ---------- */
function lum(hex){ const n=parseInt(hex.slice(1),16); const c=[n>>16&255,n>>8&255,n&255].map(v=>{v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}); return .2126*c[0]+.7152*c[1]+.0722*c[2] }
const ROUTES = D.routes.map((r, i) => ({i, id:r.id, name:r.n, long:r.ln, color:r.c.toUpperCase(), text: lum(r.c) > .35 ? "#1d2421" : "#ffffff"}));
const byName = ROUTES.slice().sort((a,b)=>a.name.localeCompare(b.name));
const routeShapes = ROUTES.map(()=>new Set());
D.trips.forEach(t => { if(t[2] >= 0) routeShapes[t[0]].add(t[2]) });

/* ---------- time in San Francisco ---------- */
const fmtParts = new Intl.DateTimeFormat("en-US",{timeZone:TZ, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23", weekday:"short"});
function sfNow(ms){
  const p={}; fmtParts.formatToParts(new Date(ms)).forEach(x=>p[x.type]=x.value);
  const wd=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(p.weekday);
  return {ymd:p.year+p.month+p.day, wd, sec:(+p.hour)*3600+(+p.minute)*60+(+p.second)};
}
function runsOn(svcIdx, ymd, wd){
  const s=D.services[svcIdx]; if(!s) return false;
  if(s.x.includes(ymd)) return false;
  if(s.a.includes(ymd)) return true;
  return s.d[wd]==="1" && ymd>=s.s && ymd<=s.e;
}
const clock = new Intl.DateTimeFormat("en-US",{timeZone:TZ, hour:"numeric", minute:"2-digit"});
function hhmm(sec){ const h=Math.floor(sec/3600)%24, m=Math.floor(sec%3600/60); const d=new Date(Date.UTC(2000,0,1,h,m)); return new Intl.DateTimeFormat("en-US",{timeZone:"UTC",hour:"numeric",minute:"2-digit"}).format(d) }
function mins(s){ const m=Math.round(s/60); return m<=0 ? "now" : m+" min" }
function dist(m){ const mi=m/1609.34; return mi<0.1 ? Math.round(m*3.281/10)*10+" ft" : mi.toFixed(1)+" mi" }

/* ---------- schedule engine ---------- */
function scheduledVehicles(now){
  const out=[];
  D.trips.forEach((t, ti) => {
    if(!runsOn(t[1], now.ymd, now.wd)) return;
    const p=D.patterns[t[3]], t0=t[4], e=now.sec-t0;
    if(e<0 || e>p[p.length-1][1]) return;
    let i=0; while(i<p.length-2 && p[i+1][1]<e) i++;
    const a=p[i], b=p[i+1]; const span=b[1]-a[1]; const f=span>0 ? (e-a[1])/span : 1;
    let ll, hd;
    const sh=SHAPES[t[2]];
    if(sh && b[2]>=a[2]){
      const d=(a[2]+(b[2]-a[2])*f)*sh.scale;
      ll=pointAt(sh, d); hd=bearing(pointAt(sh, d-15), pointAt(sh, d+15));
    } else {
      const A=STOPS[a[0]].ll, B=STOPS[b[0]].ll; ll=[A[0]+(B[0]-A[0])*f, A[1]+(B[1]-A[1])*f]; hd=bearing(A,B);
    }
    out.push({id:"s"+ti, route:t[0], ll, hd, live:false, next:b[0], eta:t0+b[1]-now.sec});
  });
  return out;
}
function departures(stopIdx, now, horizon){
  const out=[];
  D.trips.forEach(t => {
    if(!runsOn(t[1], now.ymd, now.wd)) return;
    const p=D.patterns[t[3]];
    for(let k=0;k<p.length-1;k++){
      if(p[k][0]!==stopIdx) continue;
      const at=t[4]+p[k][1]-now.sec;
      if(at>=-30 && at<=horizon) out.push({route:t[0], at});
    }
  });
  return out.sort((a,b)=>a.at-b.at);
}
function nextService(nowMs){
  for(let day=0; day<8; day++){
    const n=sfNow(nowMs+day*86400000); let best=null;
    D.trips.forEach(t => {
      if(!runsOn(t[1], n.ymd, n.wd)) return;
      if(day===0 && t[4]<=n.sec) return;
      if(!best || t[4]<best[4]) best=t;
    });
    if(best) return {day, sec:best[4], route:best[0], wd:n.wd};
  }
  return null;
}

/* ---------- live feed (GTFS-realtime, through an optional proxy) ---------- */
function pb(buf){
  let i=0; const u=buf, dv=new DataView(u.buffer, u.byteOffset, u.byteLength);
  const varint=()=>{ let r=0, s=0, b; do{ b=u[i++]; r+= (b&127)*Math.pow(2,s); s+=7 }while(b&128); return r };
  return function read(end, fields){
    const o={}; end = end==null ? u.length : end;
    while(i<end){
      const key=varint(), f=Math.floor(key/8), w=key&7; let v;
      if(w===0) v=varint();
      else if(w===1){ v=dv.getFloat64(i,true); i+=8 }
      else if(w===5){ v=dv.getFloat32(i,true); i+=4 }
      else if(w===2){ const L=varint(), e=i+L; if(fields && fields[f]){ v=read(e, fields[f]); i=e } else { v=new TextDecoder().decode(u.subarray(i,e)); i=e } }
      else break;
      (o[f]=o[f]||[]).push(v);
    }
    return o;
  };
}
const FV = {1:{}, 2:{}, 8:{}};                 // VehiclePosition: trip, position, vehicle
const FE = {4:FV};                              // FeedEntity: vehicle
const FM = {1:{}, 2:FE};                        // FeedMessage: header, entity
const routeIdx = {}; ROUTES.forEach(r=>routeIdx[r.id]=r.i);
function routeFromLabel(label){
  if(!label) return -1;
  const L=label.toLowerCase();
  const hit=byName.slice().sort((a,b)=>b.name.length-a.name.length).find(r=>L.startsWith(r.name.toLowerCase()));
  return hit ? hit.i : -1;
}
async function fetchLive(){
  if(!LIVE) return null;
  const r=await fetch(LIVE+"/vehiclePositions", {cache:"no-store"});
  if(!r.ok) throw new Error("HTTP "+r.status);
  const msg=pb(new Uint8Array(await r.arrayBuffer()))(null, FM);
  const nowS=Date.now()/1000, out=[];
  (msg[2]||[]).forEach((ent, k) => {
    const vp=(ent[4]||[])[0]; if(!vp) return;
    const pos=(vp[2]||[])[0], trip=(vp[1]||[])[0]||{}, veh=(vp[8]||[])[0]||{};
    if(!pos || !pos[1] || !pos[2]) return;
    const ts=(vp[5]||[0])[0]; if(ts && nowS-ts>600) return;   // stale over 10 minutes
    const rid=(trip[5]||[])[0]; let ri = rid!=null && rid in routeIdx ? routeIdx[rid] : -1;
    const label=(veh[2]||[])[0]||(veh[1]||[])[0]||"";
    if(ri<0) ri=routeFromLabel(label);
    if(ri<0) return;
    out.push({id:"v"+((veh[1]||[])[0]||k), route:ri, ll:[pos[1][0], pos[2][0]], hd:(pos[3]||[null])[0], live:true, label, ts});
  });
  return out;
}

