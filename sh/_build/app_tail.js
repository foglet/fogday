/* ---------- state ---------- */
const state = { user:null, focus:null, live:null, vehicles:[] };   // every load starts with all routes
const $ = id => document.getElementById(id);
function setText(el, t){ if(el.textContent!==t) el.textContent=t }
function esc(s){ return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])) }
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
/* The whole-map view: the routes of the operator that is on (Mission Bay, or UCSF's San Francisco campuses) */
function home(){
  if(AG==="ucsf") return [[-122.512, 37.745], [-122.385, 37.795]];
  let w=180, s=90, e=-180, n=-90;
  ROUTES.filter(r=>agOk(r.i)).forEach(r=>routeShapes[r.i].forEach(si=>SHAPES[si].pts.forEach(p=>{ w=Math.min(w,p[1]); e=Math.max(e,p[1]); s=Math.min(s,p[0]); n=Math.max(n,p[0]) })));
  return [[w,s],[e,n]];
}

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
/* routes serving each stop, A–Z by name (for the stop's ring color) */
const stopRoutes=STOPS.map(()=>[]);
D.trips.forEach(t=>D.patterns[t[3]].forEach(p=>{ if(!stopRoutes[p[0]].includes(t[0])) stopRoutes[p[0]].push(t[0]) }));
stopRoutes.forEach(a=>a.sort((x,y)=>ROUTES[x].name.localeCompare(ROUTES[y].name)));
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
  style(){ return THEME.get()==="light" ? "mapbox://styles/mapbox/light-v11" : "mapbox://styles/fogfish/cilhmh2ah00959gm3fy54zuik" },   // dark: the Spy map style (/spy/)
  ink(){ return THEME.get()==="light" ? {stopFill:"#ffffff", stopLine:"#1c2830", hollow:"#ffffff", casing:"#ffffff", casingOp:0.9, rail:{metro:"#3a4650", rail:"#d92020", light:"#31ad90", cable:"#d95520"}} : {stopFill:"#021724", stopLine:"#e3eaee", hollow:"#021724", casing:"#c5ced5", casingOp:0.35, rail:{metro:"#edeff5", rail:"#d92020", light:"#31ad90", cable:"#d95520"}} }
};
/* The Spy map draws some of its own lines (paths, tunnels) in lime green, which pull the eye from the shuttles.
   In dark mode, any basemap line in the lime-to-green range is muted (less saturated) and faded. */
const cv=document.createElement("canvas").getContext("2d");
function rgbOf(c){ if(typeof c!=="string") return null; cv.fillStyle="#000"; cv.fillStyle=c; const v=cv.fillStyle;
  if(v[0]==="#") return [parseInt(v.slice(1,3),16), parseInt(v.slice(3,5),16), parseInt(v.slice(5,7),16)];
  const m=v.match(/rgba?\(([^)]+)\)/); return m ? m[1].split(",").slice(0,3).map(Number) : null }
function isLime(c){ const x=rgbOf(c); if(!x) return false; const [r,g,b]=x.map(v=>v/255), mx=Math.max(r,g,b), mn=Math.min(r,g,b);
  if(mx-mn<0.25 || g<mx) return false; let h=(mx===g ? 2+(b-r)/(mx-mn) : 0)*60; return h>=60 && h<=160 }
function muted(c){ const [r,g,b]=rgbOf(c), y=Math.round(.3*r+.59*g+.11*b); const m=v=>Math.round((v*.35+y*.65)*.55); return "rgb("+m(r)+","+m(g)+","+m(b)+")" }
function quietBasemap(){
  if(THEME.get()!=="dark") return;
  (map.getStyle().layers||[]).forEach(l => {
    if(l.type!=="line" || /^(route|stop|veh)/.test(l.id)) return;
    const c=map.getPaintProperty(l.id, "line-color");
    const hit = isLime(c) || (c && c.stops && c.stops.some(s=>isLime(s[1])));
    if(!hit) return;
    map.setPaintProperty(l.id, "line-color", c.stops ? Object.assign({}, c, {stops:c.stops.map(s=>[s[0], isLime(s[1]) ? muted(s[1]) : s[1]])}) : muted(c));
    const op=map.getPaintProperty(l.id, "line-opacity");
    map.setPaintProperty(l.id, "line-opacity", typeof op==="number" ? op*0.35 : 0.3);
  });
}
function addLayers(){
  if(map.getSource("routes")) return;
  try{ quietBasemap() }catch(e){}
  const k=THEME.ink();
  if(!map.hasImage("arrow")) map.addImage("arrow", arrowImage(), {pixelRatio:2});
  const libImg="lib-"+THEME.get(); if(!map.hasImage(libImg)) map.addImage(libImg, libImage(), {pixelRatio:2});
  map.addSource("routes", {type:"geojson", data:ROUTE_FC || (ROUTE_FC=routeFeatures())});
  map.addSource("stops", {type:"geojson", data:stopFeatures()});
  map.addSource("veh", {type:"geojson", data:vehicleFeatures()});
  map.addSource("libs", {type:"geojson", data:libFeatures()});
  map.addSource("rail", {type:"geojson", data:railTrack()});
  map.addSource("rail-st", {type:"geojson", data:railStations()});
  /* Routes go under the basemap's first label layer, so place and street names read on top of them;
     stops and shuttles stay above everything */
  const firstLabel=(map.getStyle().layers||[]).find(l=>l.type==="symbol");
  const under=firstLabel ? firstLabel.id : undefined;
  /* Rail, on every view and in every state (not tied to the system or a selected route), not clickable, colored by mode
     as on /transit/: metro (BART) white, passenger rail (Caltrain) red, light rail and streetcar (Muni) green, cable car (Muni) orange.
     On the light map, metro is a dark slate (white would vanish). Below the shuttles. */
  const railColor=["match",["get","m"],"metro",k.rail.metro,"rail",k.rail.rail,"cable",k.rail.cable,k.rail.light];
  map.addLayer({id:"rail-line", type:"line", source:"rail", layout:{"line-cap":"round","line-join":"round","line-sort-key":["match",["get","m"],"metro",3,"rail",2,"cable",1,0]}, paint:{"line-color":railColor,"line-width":["interpolate",["linear"],["zoom"],9,1.5,13,2.5,16,4],"line-opacity":0.85}}, under);
  map.addLayer({id:"route-casing", type:"line", source:"routes", layout:{"line-cap":"round","line-join":"round"}, paint:{"line-color":k.casing,"line-width":["interpolate",["linear"],["zoom"],11,2.6,15,7],"line-opacity":k.casingOp,"line-offset":OFFSET}}, under);
  map.addLayer({id:"route-line", type:"line", source:"routes", layout:{"line-cap":"round","line-join":"round"}, paint:{"line-color":["get","color"],"line-width":WIDTH,"line-opacity":0.95,"line-offset":OFFSET}}, under);
  map.addLayer({id:"route-hit", type:"line", source:"routes", paint:{"line-color":"#000","line-width":["interpolate",["linear"],["zoom"],11,8,15,14],"line-opacity":0.001,"line-offset":OFFSET}}, under);   // a finger-wide tap area along each line
  map.addLayer({id:"rail-st", type:"circle", source:"rail-st", paint:{"circle-radius":2.5,"circle-color":railColor,"circle-opacity":0.85}});   // stations: 5 px dots in their line's color
  map.addLayer({id:"stop-dot", type:"circle", source:"stops", paint:{"circle-color":k.stopFill,"circle-stroke-color":k.stopLine}});   // size and ring color: applyFocus
  map.addLayer({id:"lib", type:"symbol", source:"libs", layout:{"icon-image":libImg,"icon-allow-overlap":true,"icon-size":["interpolate",["linear"],["zoom"],11,0.7,15,1]}});   // libraries: above stops, under shuttles
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
    map=new mapboxgl.Map({container:"map", style:THEME.style(), bounds:home(), fitBoundsOptions:{padding:pad()},
      pitchWithRotate:false, maxPitch:0,
      customAttribution:'<a href="https://fogday.com/">© Fogday Studios</a> | <a href="https://www.instagram.com/fogfish/">@fogfish</a>'});
  }catch(e){ map=null; return }
  map.touchPitch && map.touchPitch.disable();
  /* Bottom-right stack, as on /treesf/, top to bottom: folded map (Systems), zoom readout, location (here), then + − and compass.
     Mapbox stacks bottom-corner controls upward in the order added, so they're added bottom first. */
  map.addControl(new mapboxgl.NavigationControl({visualizePitch:false}), "bottom-right");
  asControl($("here"));
  asControl($("zoomRead"));
  asControl($("systems"));
  /* Zoom readout, live, to one decimal (as on /treesf/) */
  const showZoom=()=>{ const t=(Math.round(map.getZoom()*10)/10).toFixed(1); setText($("zoomRead"), t); $("zoomRead").setAttribute("aria-label","Zoom level "+t) };
  map.on("zoom", showZoom); showZoom();
  map.on("style.load", addLayers);
  map.on("click","stop-dot", ev => stopPopup(ev.features[0].properties.i));
  map.on("click","veh-dot", ev => vehPopup(ev.features[0].properties.k));
  map.on("click","lib", ev => { if(map.queryRenderedFeatures(ev.point,{layers:["veh-dot"]}).length) return; libPopup(ev.features[0].properties.i) });
  /* Tap a route line: that route is selected, and stays selected. Another line's tap picks that one instead;
     a tap elsewhere or on the same line changes nothing. The title (or a reload) brings back all routes. */
  map.on("click","route-hit", ev => {
    if(map.queryRenderedFeatures(ev.point, {layers:["stop-dot","veh-dot","lib"]}).length) return;
    const f=state.focus==null ? null : +state.focus;
    const hits=[...new Set(ev.features.map(x=>x.properties.r))];
    const r = hits.includes(f) && hits.length>1 ? hits[(hits.indexOf(f)+1)%hits.length] : hits[0];   // shared street: each tap steps to the next route
    if(r!==f) pickRoute(r, false);
  });
  ["stop-dot","veh-dot","route-hit","lib"].forEach(l => { map.on("mouseenter",l,()=>map.getCanvas().style.cursor="pointer"); map.on("mouseleave",l,()=>map.getCanvas().style.cursor="") });
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
  if(err.code===1){ hereSay("Location is off. Turn it on in your browser settings to see stops near you.", 6000) }
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
/* The site's theme.js runs the toggle (sets html[data-theme], saves fogday-theme); the map follows it */
function applyTheme(){
  document.querySelector('meta[name="theme-color"]').content = THEME.get()==="dark" ? "#021724" : "#edf1f2";
  ROUTE_FC=null; paintSwatches();
  if(map){ mapReady=false; map.setStyle(THEME.style(), {diff:false}) }   // style.load re-adds the routes, stops and shuttles
}
let lastTheme=THEME.get();
new MutationObserver(()=>{ const t=THEME.get(); if(t!==lastTheme){ lastTheme=t; applyTheme() } }).observe(document.documentElement, {attributes:true, attributeFilter:["data-theme"]});

/* Fit routes into the part of the map the legend leaves clear: above it on phones, right of it on wide screens */
function pad(){
  const lg=document.querySelector(".controls").getBoundingClientRect(), open=$("legendBtn").getAttribute("aria-expanded")==="true";
  if(innerWidth>=760) return {top:70, bottom:50, right:70, left: open ? Math.round(lg.right)+30 : 40};
  return {top:70, left:24, right:60, bottom: Math.max(60, Math.round(innerHeight-lg.top)+16)};
}
/* ---------- San Francisco Public Library: Phosphor "book-open-text" (regular, MIT), icon only ---------- */
const BOOK_OPEN_TEXT="M232,48H160a40,40,0,0,0-32,16A40,40,0,0,0,96,48H24a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h72a8,8,0,0,0,8-8V56A8,8,0,0,0,232,48ZM96,192H32V64H96a24,24,0,0,1,24,24V200A39.81,39.81,0,0,0,96,192Zm128,0H160a39.81,39.81,0,0,0-24,8V88a24,24,0,0,1,24-24h64ZM160,88h40a8,8,0,0,1,0,16H160a8,8,0,0,1,0-16Zm48,40a8,8,0,0,1-8,8H160a8,8,0,0,1,0-16h40A8,8,0,0,1,208,128Zm0,32a8,8,0,0,1-8,8H160a8,8,0,0,1,0-16h40A8,8,0,0,1,208,160Z";
function libImage(){
  const light=THEME.get()==="light", S=56, c=document.createElement("canvas"); c.width=c.height=S; const g=c.getContext("2d");
  /* the book alone: no disc, no ring, no halo */
  g.save(); g.translate(S/2-18,S/2-18); g.scale(36/256,36/256);
  g.fillStyle=light?"#2f7fc1":"#7cc4f0"; g.fill(new Path2D(BOOK_OPEN_TEXT)); g.restore();
  return g.getImageData(0,0,S,S);
}
function libFeatures(){ return {type:"FeatureCollection", features:(D.libs||[]).map((l,i)=>({type:"Feature", properties:{i}, geometry:{type:"Point", coordinates:[l[3]/1e5, l[2]/1e5]}}))} }
/* ---------- Rail (BART, Caltrain, Muni Metro): track and stations by mode, no times ---------- */
function railTrack(){
  const line=f=>{ const c=[]; let a=0, o=0; for(let k=0;k<f.length;k+=2){ a+=f[k]; o+=f[k+1]; c.push([o/1e5, a/1e5]) } return c };
  return {type:"FeatureCollection", features:(D.rail||[]).map(r=>({type:"Feature", properties:{m:r.m}, geometry:{type:"MultiLineString", coordinates:r.tr.map(line)}}))};
}
function railStations(){ return {type:"FeatureCollection", features:(D.rail||[]).flatMap(r=>r.st.map(s=>({type:"Feature", properties:{m:r.m}, geometry:{type:"Point", coordinates:[s[2]/1e5, s[1]/1e5]}})))} }
function libPopup(i){
  const l=D.libs[i];
  new mapboxgl.Popup({offset:14, maxWidth:"260px"}).setLngLat([l[3]/1e5, l[2]/1e5]).setHTML("<h3>"+esc(l[0])+"</h3><p>"+esc(l[1])+"</p><p>San Francisco Public Library</p>").addTo(map);
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
  const okR=ROUTES.filter(r=>agOk(r.i)).map(r=>r.i), okS=STOPS.map((s,i)=>i).filter(stopOk);
  const rf = ["in",["get","r"],["literal",okR]];
  ["route-casing","route-line","route-hit"].forEach(l=>map.setFilter(l, rf));
  map.setFilter("stop-dot", ["in",["get","i"],["literal",okS]]);
  /* Stops: twice as wide as their line at every zoom (ring 0.4 of the line's width, fill radius 0.6), ringed in the line's color.
     A stop shared by routes takes the selected route's color if it serves it, else its first route's (A–Z). */
  const pick=okS.map(si=>{ const rs=stopRoutes[si].filter(agOk); return [si, f!=null && rs.includes(f) ? f : rs[0]] }).filter(x=>x[1]!=null);
  const ring=pick.length ? ["match",["get","i"], ...pick.flatMap(([si,r])=>[si, ROUTES[r].color]), THEME.ink().stopLine] : THEME.ink().stopLine;
  const onS=f==null ? false : ["in",["get","i"],["literal",pick.filter(x=>x[1]===f).map(x=>x[0])]];
  const w=(a,b)=>["case",onS,b,a];   // line width: plain, or the selected route's wider line
  const zw=(k)=>["interpolate",["linear"],["zoom"],11,["*",w(2,3.5),k],13,["*",w(3,5),k],15,["*",w(4.5,7),k],17,["*",w(6.5,9),k]];
  map.setPaintProperty("stop-dot","circle-stroke-color", ring);
  map.setPaintProperty("stop-dot","circle-radius", zw(0.6));
  map.setPaintProperty("stop-dot","circle-stroke-width", zw(0.4));
  const vf = f==null ? null : ["==",["get","r"],f];
  map.setFilter("veh-dot", vf); map.setFilter("veh-halo", vf);
  map.setFilter("veh-arrow", vf ? ["all",["==",["get","hasHd"],1], vf] : ["==",["get","hasHd"],1]);
  if(fly){
    if(f==null){ map.fitBounds(home(), {padding:pad(), duration:600}); return }
    const b=new mapboxgl.LngLatBounds(); routeShapes[f].forEach(si=>SHAPES[si].pts.forEach(p=>b.extend([p[1],p[0]])));
    if(!b.isEmpty()) map.fitBounds(b, {padding:pad(), maxZoom:15, duration:600});
  }
}

/* ---------- legend ---------- */
function paintSwatches(){ document.querySelectorAll("#routes .pick").forEach(b=>b.firstChild.style.setProperty("--c", ROUTES[+b.dataset.r].color)) }
function pickRoute(i, fly){
  state.focus = i==null ? null : String(i);
  applyFocus(fly); render();
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

/* Next departure from a stop: today first, then the days after (up to a week) */
function nextAtStop(stopIdx, nowMs, only){
  for(let day=0; day<8; day++){
    const n=sfNow(nowMs+day*86400000); let best=null;
    D.trips.forEach(t => {
      if(!agOk(t[0]) || (only!=null && t[0]!==only)) return;
      if(!runsOn(t[1], n.ymd, n.wd)) return;
      const p=D.patterns[t[3]];
      for(let k=0;k<p.length-1;k++){
        if(p[k][0]!==stopIdx) continue;
        const sec=t[4]+p[k][1]; if(day===0 && sec<n.sec-30) continue;
        if(!best || sec<best.sec) best={sec, route:t[0]};
      }
    });
    if(best) return Object.assign(best, {day, wd:n.wd, at: day===0 ? best.sec-n.sec : null});
  }
  return null;
}
function when(x){ return x.day===0 ? (x.at<=5400 ? "in "+mins(x.at).replace("now","under a minute") : "at "+hhmm(x.sec)) : (x.day===1 ? "tomorrow " : DAYS[x.wd]+" ")+hhmm(x.sec) }

/* ---------- render (updates text in place, so focus stays put) ---------- */
function render(){
  const nowMs=Date.now(), now=sfNow(nowMs);
  const sched=scheduledVehicles(now);
  const liveRoutes=new Set((state.live||[]).map(v=>v.route));
  state.vehicles=(state.live||[]).filter(v=>agOk(v.route)).concat(sched.filter(v=>!liveRoutes.has(v.route)));
  paintVehicles();

  /* A selected line narrows the service lines to that line: its shuttles running, or No Service and when it next runs */
  const only = state.focus==null ? null : +state.focus;
  const shown = only==null ? state.vehicles : state.vehicles.filter(v=>v.route===only);
  const n=shown.length, st=$("status"), who = only==null ? "" : ROUTES[only].name+": ";
  const mode = state.live && state.live.length ? "live" : n ? "sched" : "none";
  if(st.dataset.mode!==mode) st.dataset.mode=mode;
  /* Service, one message per line: what is running now, then when the next shuttle comes
     (at the stop nearest you once location is allowed, else the next service anywhere) */
  /* Weekends (no service at all): that one line only, nothing else */
  const weekend = !state.vehicles.length && now.wd>=5 && !D.trips.some(t=>agOk(t[0]) && runsOn(t[1], now.ymd, now.wd));   // this operator has no service today at all
  setText($("statusText"), n ? who+n+(n===1?" shuttle":" shuttles")+" running"+(mode==="live" ? ", live" : "") : weekend ? "No weekend service" : who+"No Service");
  const nl=$("nextLine"); let next=null, here=false;
  const servesOnly = si => only==null || D.trips.some(t=>t[0]===only && D.patterns[t[3]].some(p=>p[0]===si));
  const st0 = state.user ? STOPS.map((s,i)=>({i, d:meters(state.user, s.ll)})).filter(s=>stopOk(s.i) && servesOnly(s.i)).sort((a,b)=>a.d-b.d)[0] : null;
  if(st0 && st0.d<=8000){
    const nx=nextAtStop(st0.i, nowMs, only);
    if(nx){ next="Next at "+STOPS[st0.i].short+" ("+dist(st0.d)+"): "+ROUTES[nx.route].name+" "+when(nx); here=true }
  } else if(st0){
    next="Nearest stop: "+STOPS[st0.i].short+", "+dist(st0.d)+" away";
  }
  if(!next && !n){
    const ns=nextService(nowMs, only);
    next = ns ? "Next service: "+(ns.day===0?"today ":ns.day===1?"tomorrow ":DAYS[ns.wd]+" ")+hhmm(ns.sec)+", "+ROUTES[ns.route].name : (only==null ? "No service this week" : "Not running this week");
  }
  if(weekend) next=null;
  nl.hidden=!next; if(next) setText($("nextText"), next);
  $("nextMe").hidden=!here;
  const counts=ROUTES.map(()=>0); state.vehicles.forEach(v=>counts[v.route]++);
  document.querySelectorAll("#routes .pick").forEach(b => {
    const i=+b.dataset.r; b.setAttribute("aria-pressed", String(state.focus!=null && +state.focus===i));
    setText(b.querySelector(".cnt"), counts[i] ? String(counts[i]) : "");
    b.setAttribute("aria-label", ROUTES[i].long+(counts[i] ? ", "+counts[i]+" running" : ", none running"));
  });
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
/* Shuttle system: tap the name for the next one, as the beach name on /tides/ (not remembered; a reload is Mission Bay again) */
const OPS=[["mbtma","Mission Bay"],["ucsf","UCSF"],["presidio","Presidio"],["ggp","Golden Gate Park"],["oyster","Oyster Point"],["ssf","South City"],["daly","Daly City"],["brisbane","Brisbane"]];
function showOp(){
  const i=OPS.findIndex(o=>o[0]===AG), nx=OPS[(i+1)%OPS.length][1];
  setText($("opName"), OPS[i][1]);
  inkAlign();
  $("opBtn").setAttribute("aria-label", OPS[i][1]+" shuttles, "+(i+1)+" of "+OPS.length+". Tap for "+nx+".");
  $("opBtn").title="Next: "+nx;
}
/* Left-align the name's ink (not its letter box) with the edges of Info and the service pills: each first letter
   (M, U, P, G, O, S) has its own side bearing, so measure it and pull the button left by that much */
const inkCtx=document.createElement("canvas").getContext("2d");
function inkAlign(){
  const b=$("opBtn"), cs=getComputedStyle(b); inkCtx.font=cs.fontWeight+" "+cs.fontSize+" "+cs.fontFamily;
  const m=inkCtx.measureText($("opName").textContent); b.style.marginLeft=(m.actualBoundingBoxLeft||0).toFixed(1)+"px";
}
if(document.fonts) document.fonts.ready.then(inkAlign);
function setOp(ag){
  AG=ag; showOp(); markSys();
  state.focus=null;   // a new system shows all its routes, zoomed to fit
  applyFocus(true); render();
}
$("opBtn").addEventListener("click", () => setOp(OPS[(OPS.findIndex(o=>o[0]===AG)+1)%OPS.length][0]));
/* Systems menu: the folded-map button (as /treesf/'s Neighborhoods) lists every system; a tap shows that one.
   The same choice as tapping the name, all at once. */
const sysPin=$("sysBtn"), sysPop=$("sys-pop"), sysList=sysPop.querySelector("ul");
/* As /treesf/: opening, the lines run up into place one by one; shutting, the menu eases out as one */
const calm=matchMedia("(prefers-reduced-motion: reduce)");
const LINE_IN=[{opacity:0, transform:"translateY(18px)", easing:"cubic-bezier(.2,.7,.35,1)"}, {opacity:1, transform:"translateY(-2px)", offset:.78, easing:"ease-in-out"}, {opacity:1, transform:"none"}];
const POP_OUT=[{opacity:1, transform:"none"}, {opacity:0, transform:"translateY(10px)"}];
let sysAnims=[];
function slideLines(els){
  const gap=els.length>1 ? Math.min(60, 380/(els.length-1)) : 0; let at=0;
  return els.map((el,i)=>{ if(i) at+=gap+(Math.random()*2-1)*Math.min(15, gap/3); return el.animate(LINE_IN, {duration:420, delay:Math.max(0,at), fill:"backwards"}) });
}
function setSys(open){
  if(open===(sysPin.getAttribute("aria-expanded")==="true")) return;
  sysPin.setAttribute("aria-expanded", String(open));
  sysAnims.forEach(a=>a.cancel()); sysAnims=[];
  sysPop.hidden=false;
  if(calm.matches || !sysPop.animate){ sysPop.hidden=!open; return }
  if(open) sysAnims=slideLines([sysPop.querySelector(".oa-sys-title"), ...sysPop.querySelectorAll("li")]);
  else { const a=sysPop.animate(POP_OUT, {duration:240, easing:"cubic-bezier(0,0,.2,1)", fill:"forwards"}); sysAnims=[a]; a.onfinish=()=>{ sysAnims=[]; sysPop.hidden=true; a.cancel() } }
}
function markSys(){ sysList.querySelectorAll("button").forEach(b=>{ if(b.dataset.ag===AG) b.setAttribute("aria-current","true"); else b.removeAttribute("aria-current") }) }
OPS.forEach(([ag,name])=>{
  const li=document.createElement("li"), b=document.createElement("button"), sp=document.createElement("span");
  b.type="button"; b.dataset.ag=ag; sp.textContent=name; b.appendChild(sp); li.appendChild(b); sysList.appendChild(li);
  b.addEventListener("click", ()=>{ setSys(false); if(ag!==AG) setOp(ag) });
});
markSys();
sysPin.addEventListener("click", e=>{ e.stopPropagation(); setSys(sysPin.getAttribute("aria-expanded")!=="true") });
document.addEventListener("click", e=>{ if(sysPin.getAttribute("aria-expanded")==="true" && !$("systems").contains(e.target)) setSys(false) });
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && sysPin.getAttribute("aria-expanded")==="true"){ setSys(false); sysPin.focus() } });
showOp();   // the title clears the selection: all routes, the whole map
/* Shuttle Legend: a button at the bottom of the panel; open, the routes and Info sit above the service line */
function setLegend(open){ $("legendBtn").setAttribute("aria-expanded", String(open)); document.querySelector(".controls").dataset.open=String(open); store.set("info", open?"1":"0") }
$("legendBtn").addEventListener("click", ()=>setLegend($("legendBtn").getAttribute("aria-expanded")!=="true"));
/* Info opens below the routes: bring it into view inside the legend */
/* Legend starts open on every screen: it is compact enough to leave the map in view; tap its title to shut it */
setLegend(store.get("info")==="1");   // Info starts shut
document.querySelector('meta[name="theme-color"]').content = THEME.get()==="dark" ? "#021724" : "#edf1f2";
initMap(); render();
if(!window.mapboxgl) startLocation();
setInterval(render, 5000);
if(LIVE){ pollLive(); setInterval(pollLive, 10000) }

try{ localStorage.removeItem("ucsf:route") }catch(e){}   // retire the old remembered route
