/* ---------- state ---------- */
const state = { user:null, focus:(store.get("route")||null), live:null, vehicles:[] };
if(state.focus!=null && !ROUTES[+state.focus]) state.focus=null;
const $ = id => document.getElementById(id);
function setText(el, t){ if(el.textContent!==t) el.textContent=t }
function esc(s){ return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])) }
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const HOME = [[-122.512, 37.745], [-122.385, 37.795]];   // San Francisco campuses

/* ---------- map ---------- */
let map=null, mapReady=false;
/* side-by-side spacing: one line width, growing with zoom */
const OFFSET=["interpolate",["linear"],["zoom"],11,["*",["get","off"],2],13,["*",["get","off"],3],15,["*",["get","off"],4.5],17,["*",["get","off"],6.5]];
const WIDTH=["interpolate",["linear"],["zoom"],11,2,13,3,15,4.5,17,6.5];
/* Routes that share a street are drawn side by side, each in its own color, as on a transit map.
   Every route is sampled every 12 m; each sample looks for other routes within about 30 m. A stretch of route
   where the same routes run together gets one slot each (alphabetical, centered on the street). Slots are
   measured against one compass direction, so two routes running opposite ways on a street keep their sides. */
function routeFeatures(){
  const STEP=12, CELL=20, slotOrder={}; byName.forEach((r,k)=>slotOrder[r.i]=k);
  const cellOf=ll=>[Math.round(ll[0]*KY/CELL), Math.round(ll[1]*KX/CELL)];
  const grid=new Map(), samples=[];
  ROUTES.forEach(r => routeShapes[r.i].forEach(si => {
    const sh=SHAPES[si], pts=[];
    for(let d=0; d<sh.len; d+=STEP) pts.push(pointAt(sh, d));
    pts.push(pointAt(sh, sh.len));
    pts.forEach(ll => { const [a,o]=cellOf(ll), k=a+":"+o; let set=grid.get(k); if(!set) grid.set(k, set=new Set()); set.add(r.i) });
    samples.push({r:r.i, pts});
  }));
  const f=[];
  samples.forEach(({r, pts}) => {
    const keys=pts.map((ll, k) => {
      const [a,o]=cellOf(ll), near=new Set();
      for(let da=-1; da<=1; da++) for(let db=-1; db<=1; db++){ const g=grid.get((a+da)+":"+(o+db)); if(g) g.forEach(x=>near.add(x)) }
      const set=[...near].sort((x,y)=>slotOrder[x]-slotOrder[y]);
      const A=pts[Math.max(0,k-1)], B=pts[Math.min(pts.length-1,k+1)];
      const dx=(B[1]-A[1])*KX, dy=(B[0]-A[0])*KY, flip = dx<-1e-6 || (Math.abs(dx)<=1e-6 && dy<0);
      const n=set.length, off=n>1 ? (set.indexOf(r)-(n-1)/2)*(flip?-1:1) : 0;
      return off;
    });
    for(let k=1;k<keys.length-1;k++) if(keys[k-1]===keys[k+1] && keys[k]!==keys[k-1]) keys[k]=keys[k-1];   // smooth one-sample flickers
    let start=0;
    for(let k=1;k<=pts.length;k++){
      if(k===pts.length || keys[k]!==keys[start]){
        const run=pts.slice(start, Math.min(k+1, pts.length));
        if(run.length>1) f.push({type:"Feature", properties:{r, color:ROUTES[r].color, off:keys[start]}, geometry:{type:"LineString", coordinates:run.map(p=>[p[1],p[0]])}});
        start=k;
      }
    }
  });
  return {type:"FeatureCollection", features:f};
}
function stopFeatures(){
  return {type:"FeatureCollection", features:STOPS.map((s,i)=>({type:"Feature", properties:{i}, geometry:{type:"Point", coordinates:[s.ll[1], s.ll[0]]}}))};
}
function vehicleFeatures(){
  return {type:"FeatureCollection", features:state.vehicles.map((v,k)=>({type:"Feature", properties:{k, r:v.route, color:ROUTES[v.route].color, live:v.live?1:0, hd:v.hd==null?0:v.hd, hasHd:v.hd==null?0:1}, geometry:{type:"Point", coordinates:[v.ll[1], v.ll[0]]}}))};
}
function arrowImage(){
  const s=48, c=document.createElement("canvas"); c.width=c.height=s; const g=c.getContext("2d");
  g.fillStyle="#ffffff"; g.strokeStyle="rgba(2,23,36,.8)"; g.lineWidth=2;
  g.beginPath(); g.moveTo(s/2,3); g.lineTo(s/2+9,17); g.lineTo(s/2-9,17); g.closePath(); g.fill(); g.stroke();
  return {width:s, height:s, data:g.getImageData(0,0,s,s).data};
}
/* Light or dark: the site's own choice (fogday-theme, shared with the header toggle on fogday.com), else the system's */
const THEME = {
  get(){ return document.documentElement.dataset.theme === "light" ? "light" : "dark" },
  style(){ return THEME.get()==="light" ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/mapbox/dark-v11" },
  ink(){ return THEME.get()==="light" ? {stopFill:"#ffffff", stopLine:"#1c2830", hollow:"#ffffff", casing:"#ffffff", casingOp:0.9} : {stopFill:"#021724", stopLine:"#e3eaee", hollow:"#021724", casing:"#c5ced5", casingOp:0.35} }
};
function addLayers(){
  if(map.getSource("routes")) return;
  const k=THEME.ink();
  if(!map.hasImage("arrow")) map.addImage("arrow", arrowImage(), {pixelRatio:2});
  map.addSource("routes", {type:"geojson", data:ROUTE_FC || (ROUTE_FC=routeFeatures())});
  map.addSource("stops", {type:"geojson", data:stopFeatures()});
  map.addSource("veh", {type:"geojson", data:vehicleFeatures()});
  map.addLayer({id:"route-casing", type:"line", source:"routes", layout:{"line-cap":"round","line-join":"round"}, paint:{"line-color":k.casing,"line-width":["interpolate",["linear"],["zoom"],11,2.6,15,7],"line-opacity":k.casingOp,"line-offset":OFFSET}});
  map.addLayer({id:"route-line", type:"line", source:"routes", layout:{"line-cap":"round","line-join":"round"}, paint:{"line-color":["get","color"],"line-width":WIDTH,"line-opacity":0.95,"line-offset":OFFSET}});
  map.addLayer({id:"route-hit", type:"line", source:"routes", paint:{"line-color":"#000","line-width":["interpolate",["linear"],["zoom"],11,8,15,14],"line-opacity":0.001,"line-offset":OFFSET}});   // a finger-wide tap area along each line
  map.addLayer({id:"stop-dot", type:"circle", source:"stops", paint:{"circle-radius":["interpolate",["linear"],["zoom"],11,2.5,15,6],"circle-color":k.stopFill,"circle-stroke-color":k.stopLine,"circle-stroke-width":1.6}});
  map.addLayer({id:"veh-halo", type:"circle", source:"veh", paint:{"circle-radius":["interpolate",["linear"],["zoom"],11,10,15,15],"circle-color":["get","color"],"circle-opacity":["case",["==",["get","live"],1],0.3,0.15]}});
  map.addLayer({id:"veh-dot", type:"circle", source:"veh", paint:{"circle-radius":["interpolate",["linear"],["zoom"],11,6,15,9],"circle-color":["case",["==",["get","live"],1],["get","color"],k.hollow],"circle-stroke-color":["get","color"],"circle-stroke-width":["case",["==",["get","live"],1],2,3]}});
  map.addLayer({id:"veh-arrow", type:"symbol", source:"veh", filter:["==",["get","hasHd"],1], layout:{"icon-image":"arrow","icon-rotate":["get","hd"],"icon-rotation-alignment":"map","icon-allow-overlap":true,"icon-size":["interpolate",["linear"],["zoom"],11,0.8,15,1.15]}});
  mapReady=true; applyFocus(false); paintVehicles();
}
let ROUTE_FC=null;
/* A control from a page element, in the bottom-right stack (as on /treesf/) */
function asControl(el){ map.addControl({onAdd(){ el.classList.add("mapboxgl-ctrl"); el.hidden=false; return el }, onRemove(){ el.remove() }}, "bottom-right") }
function initMap(){
  if(!window.mapboxgl) return;
  try{
    mapboxgl.accessToken=CFG.token;
    map=new mapboxgl.Map({container:"map", style:THEME.style(), bounds:HOME, fitBoundsOptions:{padding:pad()},
      pitchWithRotate:false, maxPitch:0,
      customAttribution:'<a href="https://fogday.com/">© Fogday Studios</a> | <a href="https://www.instagram.com/fogfish/">@fogfish</a>'});
  }catch(e){ map=null; return }
  map.touchPitch && map.touchPitch.disable();
  /* Bottom-right stack, as on /treesf/, top to bottom: light/dark, location (here), then + − and compass.
     Mapbox stacks bottom-corner controls upward in the order added, so they're added bottom first. */
  map.addControl(new mapboxgl.NavigationControl({visualizePitch:false}), "bottom-right");
  asControl($("here")); asControl($("themeCtl"));
  map.on("style.load", addLayers);
  map.on("click","stop-dot", ev => stopPopup(ev.features[0].properties.i));
  map.on("click","veh-dot", ev => vehPopup(ev.features[0].properties.k));
  /* Tap a route line: highlight that route (tap it again for all). Stops and shuttles on top win the tap. */
  map.on("click","route-hit", ev => {
    if(map.queryRenderedFeatures(ev.point, {layers:["stop-dot","veh-dot"]}).length) return;
    const f=state.focus==null ? null : +state.focus;
    const hits=[...new Set(ev.features.map(x=>x.properties.r))];
    const r = hits.includes(f) && hits.length>1 ? hits[(hits.indexOf(f)+1)%hits.length] : hits[0];   // shared street: each tap steps to the next route
    pickRoute(r===f && hits.length===1 ? null : r, false);
  });
  ["stop-dot","veh-dot","route-hit"].forEach(l => { map.on("mouseenter",l,()=>map.getCanvas().style.cursor="pointer"); map.on("mouseleave",l,()=>map.getCanvas().style.cursor="") });
  map.on("load", startLocation);
}

/* ---------- location: starts by itself; the crosshair flies back to you ---------- */
let hereDot=null, hereT=0, firstFix=true;
function hereSay(t, ms){ const m=$("hereMsg"); clearTimeout(hereT); m.textContent=t; m.hidden=false; hereT=setTimeout(()=>m.hidden=true, ms||4000) }
function onFix(p){
  state.user=[p.coords.latitude, p.coords.longitude];
  $("hereBtn").removeAttribute("aria-busy");
  if(map){
    if(!hereDot){ const el=document.createElement("div"); el.className="here-dot"; el.setAttribute("aria-label","You are here"); hereDot=new mapboxgl.Marker({element:el}) }
    hereDot.setLngLat([state.user[1], state.user[0]]).addTo(map);
  }
  const near=Math.min(...STOPS.map(s=>meters(state.user, s.ll)));
  if(firstFix && map && near<30000) map.flyTo({center:[state.user[1], state.user[0]], zoom:Math.max(map.getZoom(),14.5), padding:pad(), duration:900});
  if(firstFix && near>=30000) hereSay("You're "+dist(near)+" from the nearest UCSF shuttle stop.", 6000);
  firstFix=false; render();
}
function onFixErr(err){
  $("hereBtn").removeAttribute("aria-busy");
  if(err.code===1){ hereSay("Location is off. Info says how to turn it on.", 6000) }
  else if(!state.user) hereSay("Couldn't find your location.");
}
let watching=false;
function startLocation(){
  if(!navigator.geolocation){ $("here").hidden=true; return }
  if(watching) return; watching=true;
  $("hereBtn").setAttribute("aria-busy","true");
  navigator.geolocation.watchPosition(onFix, e=>{ watching=false; onFixErr(e) }, {enableHighAccuracy:true, timeout:15000, maximumAge:30000});
}
$("hereBtn").addEventListener("click", ()=>{
  if(state.user && map){ map.flyTo({center:[state.user[1], state.user[0]], zoom:Math.max(map.getZoom(),15.5), padding:pad(), duration:700}) }
  else { firstFix=true; startLocation() }
});

/* ---------- light / dark ---------- */
function setTheme(t){
  document.documentElement.dataset.theme=t;
  try{ localStorage.setItem("fogday-theme", t) }catch(e){}
  const b=$("themeBtn"), dark=t==="dark";
  b.setAttribute("aria-pressed", String(dark));
  b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode"); b.title=b.getAttribute("aria-label");
  document.querySelector('meta[name="theme-color"]').content = dark ? "#021724" : "#edf1f2";
  if(map){ mapReady=false; map.setStyle(THEME.style(), {diff:false}) }   // style.load re-adds the routes, stops and shuttles
}
$("themeBtn").addEventListener("click", ()=>setTheme(THEME.get()==="dark" ? "light" : "dark"));

/* Fit routes into the part of the map the legend leaves clear: above it on phones, right of it on wide screens */
function pad(){
  const lg=document.querySelector(".controls").getBoundingClientRect(), open=$("legend").open;
  if(innerWidth>=760) return {top:70, bottom:50, right:70, left: open ? Math.round(lg.right)+30 : 40};
  return {top:70, left:24, right:60, bottom: Math.max(60, Math.round(innerHeight-lg.top)+16)};
}
function stopPopup(i){
  const now=sfNow(Date.now()); const deps=departures(i, now, 3600).slice(0,5);
  const html="<h3>"+esc(STOPS[i].name)+"</h3>"+(deps.length ? deps.map(d=>"<p>"+esc(ROUTES[d.route].name)+": "+mins(d.at)+"</p>").join("") : "<p>No departures in the next hour.</p>");
  new mapboxgl.Popup({offset:10, maxWidth:"260px"}).setLngLat([STOPS[i].ll[1], STOPS[i].ll[0]]).setHTML(html).addTo(map);
}
function vehPopup(k){
  const v=state.vehicles[k]; if(!v) return; const r=ROUTES[v.route];
  const line = v.next!=null ? "To "+STOPS[v.next].short+", "+mins(v.eta) : (v.label ? "Shuttle "+v.label : "");
  new mapboxgl.Popup({offset:12, maxWidth:"260px"}).setLngLat([v.ll[1], v.ll[0]]).setHTML("<h3>"+esc(r.long)+"</h3><p>"+esc(line)+"</p><p>"+(v.live?"Live position":"Scheduled position")+"</p>").addTo(map);
}
function paintVehicles(){ if(mapReady) map.getSource("veh").setData(vehicleFeatures()) }
function applyFocus(fly){
  if(!mapReady) return;
  const f = state.focus==null ? null : +state.focus;
  map.setPaintProperty("route-line","line-opacity", f==null ? 0.95 : ["case",["==",["get","r"],f],1,0.12]);
  map.setPaintProperty("route-casing","line-opacity", f==null ? 0.35 : ["case",["==",["get","r"],f],0.6,0]);
  const on=["==",["get","r"],f==null?-1:f];   // the highlighted route draws wider, on top of the rest
  map.setPaintProperty("route-line","line-width", ["interpolate",["linear"],["zoom"],11,["case",on,3.5,2],13,["case",on,5,3],15,["case",on,7,4.5],17,["case",on,9,6.5]]);
  map.setPaintProperty("route-casing","line-width", ["interpolate",["linear"],["zoom"],11,["case",on,5,2.6],15,["case",on,11,7]]);
  map.setLayoutProperty("route-line","line-sort-key", ["case",on,1,0]);
  const vf = f==null ? null : ["==",["get","r"],f];
  map.setFilter("veh-dot", vf); map.setFilter("veh-halo", vf);
  map.setFilter("veh-arrow", vf ? ["all",["==",["get","hasHd"],1], vf] : ["==",["get","hasHd"],1]);
  if(fly){
    if(f==null){ map.fitBounds(HOME, {padding:pad(), duration:600}); return }
    const b=new mapboxgl.LngLatBounds(); routeShapes[f].forEach(si=>SHAPES[si].pts.forEach(p=>b.extend([p[1],p[0]])));
    if(!b.isEmpty()) map.fitBounds(b, {padding:pad(), maxZoom:15, duration:600});
  }
}

/* ---------- legend ---------- */
function pickRoute(i, fly){
  state.focus = i==null ? null : String(i);
  store.set("route", state.focus==null ? "" : state.focus); applyFocus(fly); render();
}
function buildRoutes(){
  const ul=$("routes");
  byName.forEach(r => {
    const li=document.createElement("li"); const b=document.createElement("button"); b.type="button"; b.className="pick"; b.dataset.r=r.i;
    b.innerHTML='<span class="line" aria-hidden="true"></span><span class="name"></span><span class="cnt"></span>';
    b.firstChild.style.setProperty("--c", r.color); b.children[1].textContent=r.long;
    b.addEventListener("click", ()=>pickRoute(state.focus!=null && +state.focus===r.i ? null : r.i, true));
    li.append(b); ul.append(li);
  });
}

/* ---------- render (updates text in place, so focus stays put) ---------- */
function render(){
  const nowMs=Date.now(), now=sfNow(nowMs);
  const sched=scheduledVehicles(now);
  const liveRoutes=new Set((state.live||[]).map(v=>v.route));
  state.vehicles=(state.live||[]).concat(sched.filter(v=>!liveRoutes.has(v.route)));
  paintVehicles();

  const n=state.vehicles.length, st=$("status");
  let mode, txt;
  if(state.live && state.live.length){ mode="live"; txt="Live, "+clock.format(new Date(nowMs)) }
  else if(n){ mode="sched"; txt="Schedule estimate, "+clock.format(new Date(nowMs)) }
  else { mode="none"; txt="No service now" }
  if(st.dataset.mode!==mode) st.dataset.mode=mode; setText($("statusText"), txt);

  if(n) setText($("summary"), n+(n===1?" shuttle":" shuttles")+" running");
  else {
    const ns=nextService(nowMs);
    setText($("summary"), ns ? "None running. Next: "+(ns.day===0?"today":ns.day===1?"tomorrow":DAYS[ns.wd])+" "+hhmm(ns.sec)+", "+ROUTES[ns.route].name : "None running this week");
  }
  const counts=ROUTES.map(()=>0); state.vehicles.forEach(v=>counts[v.route]++);
  document.querySelectorAll("#routes .pick").forEach(b => {
    const i=+b.dataset.r; b.setAttribute("aria-pressed", String(state.focus!=null && +state.focus===i));
    setText(b.querySelector(".cnt"), counts[i] ? String(counts[i]) : "");
    b.setAttribute("aria-label", ROUTES[i].long+(counts[i] ? ", "+counts[i]+" running" : ", none running"));
  });

  setText($("srcNote"), state.live ? "Filled dots are live GPS; hollow dots are estimated from the timetable, for routes without live data. The arrow shows the direction of travel." : "Shuttles are placed where the timetable says they are now (hollow dots), not by live GPS. The arrow shows the direction of travel.");

  const nn=$("nearNote");
  if(state.user){
    const near=STOPS.map((s,i)=>({i, d:meters(state.user, s.ll)})).sort((a,b)=>a.d-b.d).slice(0,3);
    if(near[0].d>8000){ nn.hidden=false; setText(nn, "Nearest UCSF shuttle stop: "+STOPS[near[0].i].short+", "+dist(near[0].d)+" away."); }
    else {
      const parts=near.map(s => {
        const seen={}, list=[];
        departures(s.i, now, 5400).forEach(d=>{ seen[d.route]=(seen[d.route]||0)+1; if(seen[d.route]<=2 && list.length<4) list.push(ROUTES[d.route].name+" "+mins(d.at)) });
        return "<b>"+esc(STOPS[s.i].short)+"</b>, "+dist(s.d)+": "+(list.length ? esc(list.join(", ")) : "no departures in the next 90 min");
      });
      const html="Near you. "+parts.join(". ")+".";
      if(nn.innerHTML!==html) nn.innerHTML=html; nn.hidden=false;
    }
  }
}

/* ---------- loop ---------- */
async function pollLive(){
  try{ state.live=await fetchLive() } catch(e){ state.live=null }
  render();
}
/* Maps menu, as on /transit/ */
(function(){
  const btn=$("mapsBtn"), menu=$("maps-menu");
  const shut=()=>{ menu.hidden=true; btn.setAttribute("aria-expanded","false") };
  btn.addEventListener("click", e=>{ e.stopPropagation(); const open=menu.hidden; menu.hidden=!open; btn.setAttribute("aria-expanded", String(open)) });
  document.addEventListener("click", e=>{ if(!menu.hidden && !menu.contains(e.target)) shut() });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape" && !menu.hidden){ shut(); btn.focus() } });
})();
$("home").addEventListener("click", ()=>pickRoute(null, true));
/* Info opens below the routes: bring it into view inside the legend */
$("info").addEventListener("toggle", ()=>{ if($("info").open) $("info").scrollIntoView({block:"nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}) });
/* Legend starts open on every screen: it is compact enough to leave the map in view; tap its title to shut it */
if(store.get("legend")!=="0") $("legend").open=true;
$("legend").addEventListener("toggle", ()=>store.set("legend", $("legend").open ? "1" : "0"));
setText($("genDate"), new Date(D.gen).toLocaleDateString("en-US",{month:"short", day:"numeric", year:"numeric"}));
(function(){ const dark=THEME.get()==="dark", b=$("themeBtn"); b.setAttribute("aria-pressed", String(dark)); b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode"); b.title=b.getAttribute("aria-label"); document.querySelector('meta[name="theme-color"]').content = dark ? "#021724" : "#edf1f2" })();
buildRoutes(); initMap(); render();
if(!window.mapboxgl) startLocation();
setInterval(render, 5000);
if(LIVE){ pollLive(); setInterval(pollLive, 10000) }
