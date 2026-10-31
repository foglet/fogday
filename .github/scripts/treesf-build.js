#!/usr/bin/env node
/* Builds treesf/trees.json, the file fogday.com/treesf/ reads, from treesf/trees.csv (the DataSF Street Tree List),
   and rounds treesf/neighborhoods.geojson to 1 m. Run by .github/workflows/treesf-refresh.yml after each download;
   run it by hand after changing anything here:   node .github/scripts/treesf-build.js
   This is the one place the tree data is cleaned: non-trees dropped, misspelled botanical names fixed, spellings of
   one species joined, each species given its green, California natives and deciduous trees marked. The page only
   draws the result. */
'use strict';
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..', '..'), DIR = path.join(ROOT, 'treesf');
var info = [], hoodSum = {};

function greens(dark) {   // dark: one true/false per species (true = evergreen)
  var out = [], seen = {}, nd = 0, nl = 0;
  function hex(h, s, l) {
    s /= 100; l /= 100;
    var k = function (m) { return (m + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (m) { return Math.round(255 * (l - a * Math.max(-1, Math.min(k(m) - 3, Math.min(9 - k(m), 1))))).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  }
  dark.forEach(function (d) {
    var i = d ? nd++ : nl++, lo = d ? 26 : 50, span = d ? 20 : 28;   // evergreens 26–46% (any darker vanishes on the navy map)
    var h = 80 + ((i * 0.618034) % 1) * 80, sat = 40 + ((i * 0.754878 + 0.3) % 1) * 45, l = lo + ((i * 0.381966 + 0.5) % 1) * span, c = hex(h, sat, l);
    while (seen[c]) { l = l >= lo + span ? lo : l + 0.4; c = hex(h, sat, l); }   // every species gets a hex of its own
    seen[c] = 1; out.push(c);
  });
  return out;
}
var NATIVE = /^(Quercus (agrifolia|lobata|kelloggii|douglasii|chrysolepis|wislizeni|wislizenii|engelmannii|tomentella\b|garryana)|Arbutus menziesii|Aesculus californica|Platanus racemosa|Heteromeles|Umbellularia|Cercis occidentalis|Sequoia sempervirens|Sequoiadendron|(Cupressus|Hesperocyparis) (macrocarpa|forbesii|arizonica|sargentii|goveniana|abramsiana|macnabiana)|Pinus (radiata|torreyana|coulteri|attenuata|sabiniana|muricata|contorta|ponderosa|jeffreyi|lambertiana|monophylla)|Acer (macrophyllum|circinatum)|Alnus (rhombifolia|rubra)|Populus (fremontii|trichocarpa|tremuloides)|Juglans (hindsii|californica)|Lyonothamnus|Ceanothus|(Rhamnus|Frangula) californica|Prunus (ilicifolia|lyonii)|Fremontodendron|Sambucus (mexicana|cerulea|caerulea)|Cercocarpus|Garrya|(Myrica|Morella) californica|Calocedrus|Pseudotsuga menziesii|Salix lasiolepis|Cornus nuttallii(?! x)|Chilopsis|Washingtonia filifera|Torreya californica|Thuja plicata|Chamaecyparis lawsoniana|Fraxinus (latifolia|velutina|dipetala)|Lithocarpus densiflorus|Notholithocarpus|Arctostaphylos)/i;
var NOT_NATIVE = /tomentellaocarpa/i;   // a garbled name in the data (an Indian laurel fig), not an island oak
function isNative(key) { var latin = key.split('::')[0].trim(); return NATIVE.test(latin) && !NOT_NATIVE.test(latin); }
var DECIDUOUS = /^(Platanus|Ginkgo|Pyrus(?! kawakamii)|Ulmus|Acer|Liquidambar|Gleditsia|Fraxinus(?! uhdei)|Betula|Malus|Crataegus|Cercis|Lagerstroemia|Jacaranda|Tilia|Zelkova|Aesculus|Koelreuteria|Pistacia chinensis|Celtis|Styphnolobium|Sophora japonica|Robinia|Catalpa|Morus|Populus|Salix|Alnus|Juglans|Liriodendron|Cornus|Carpinus|Fagus|Nyssa|Cotinus|Parrotia|Albizia|Erythrina|Tabebuia|Handroanthus|Chitalpa|Chilopsis|Melia|Ailanthus|Sapium|Triadica|Metasequoia|Taxodium|Larix|Punica|Ficus carica|Diospyros|Halesia|Amelanchier|Sorbus|Syringa|Paulownia|Toona|Sambucus|Cercidiphyllum|Hamamelis|Ostrya|Gymnocladus|Cladrastis|Laburnum|Firmiana|Hovenia|Idesia|Prunus (cerasifera|serrulata|blireiana|x ?blireiana|yedoensis|x ?yedoensis|subhirtella|sargentii|avium|persica|armeniaca|domestica|mume|cerasus|virginiana|padus|dulcis|campanulata|'|x |sp|spp|serotina|incisa|okame|×)|Quercus (lobata|douglasii|rubra|coccinea|palustris|robur|frainetto|garryana|kelloggii|macrocarpa|phellos|shumardii|alba|bicolor|cerris|velutina|texana|nuttallii|muehlenbergii|acutissima|imbricaria|x)|Magnolia (soulangeana|soulangiana|x ?soulang|stellata|kobus|denudata|liliiflora|'Ann'|'Butterflies'|acuminata|x ?loebneri|loebneri|sprengeri|campbellii|'Galaxy'|'Jane'|'Elizabeth')|Davidia|Cydonia|Mespilus|Eucommia|Pterocarya|Carya|Castanea|Sassafras|Maclura|Broussonetia|Kalopanax|Phellodendron|Tamarix|Ziziphus|Asimina|Oxydendrum|Stewartia|Styrax japonicus|Aralia|Rhus typhina|Clerodendrum trichotomum|Poncirus|Xanthoceras|Tetradium)/i;
function isDeciduous(key) { return DECIDUOUS.test(key.split('::')[0].trim()); }
function parseCSV(text) {
  var rows = [], row = [], field = '', i = 0, q = false, c, n = text.length;
  while (i < n) {
    c = text.charCodeAt(i);
    if (q) {
      if (c === 34) { if (text.charCodeAt(i + 1) === 34) { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += text[i]; i++; continue;
    }
    if (c === 34) { q = true; i++; continue; }
    if (c === 44) { row.push(field); field = ''; i++; continue; }
    if (c === 10 || c === 13) {
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      if (c === 13 && text.charCodeAt(i + 1) === 10) i++;
      i++; continue;
    }
    field += text[i]; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}
var FIX_WORDS = { plantanus: 'Platanus', patanus: 'Platanus', gingko: 'Ginkgo', pistachia: 'Pistacia', michaelia: 'Michelia',
  leucodendron: 'Leucadendron', casurina: 'Casuarina', canandensis: 'canadensis', europea: 'europaea', persicaum: 'persica',
  buergeranum: 'buergerianum', gracilor: 'gracilior', patersonia: 'patersonii', pattersonia: 'patersonii', chinesis: 'chinensis',
  soulangiana: 'soulangeana', aspleniifolius: 'asplenifolius', chitalpatashkentensis: 'Chitalpa tashkentensis' };
var FIX_CULTIVARS = { fastigata: 'Fastigiata', vannessa: 'Vanessa' };
function fixLatin(latin) {
  var t = latin.replace(/[\u2018\u2019\u201c\u201d"]/g, "'")
    .replace(/('[^']*')[a-z].*$/, '$1')                                // junk run onto a closing quote ('Musashino'l site), not O'Neill
    .replace(/'\s*([^']*?)\s*'/g, "'$1'")                              // stray spaces inside quotes
    .replace(/\s+/g, ' ').trim();
  t = t.replace(/[A-Za-z]+/g, function (w) { var f = FIX_WORDS[w.toLowerCase()]; return f || w; });
  t = t.replace(/'([^']*)'/g, function (m, cv) { var f = FIX_CULTIVARS[cv.toLowerCase()]; return f ? "'" + f + "'" : m; });
  t = t.replace(/^Platanus hispanica\b/i, 'Platanus x hispanica')
       .replace(/^Chionanthus retusa\b/i, 'Chionanthus retusus')
       .replace(/^Lyonothamnus floribundus (?:ssp\.?|subsp\.?)?\s*asplenifolius/i, 'Lyonothamnus floribundus subsp. asplenifolius');
  return t;
}
function fixSpecies(raw) {
  var k = (raw || '').trim(); if (!k) return '';
  var i = k.indexOf('::'), latin = i >= 0 ? k.slice(0, i) : k, rest = i >= 0 ? k.slice(i) : '';
  var f = fixLatin(latin); return rest ? f + ' ' + rest : f;
}
var NOT_A_TREE = /planting site|potential site|\bstump\b|\bpaved?\b|pavedtemp|\bshrub\b/i;
function build(rows) {
  var h = rows[0], ix = {};
  h.forEach(function (k, i) { ix[k] = i; });
  var feats = [], perYear = {}, spCount = {}, spOf = [];
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    var pt = (row[ix.planttype] || '').toLowerCase();
    if (pt && pt !== 'tree') continue;
    var lat = +row[ix.latitude], lon = +row[ix.longitude];
    if (!(lat > 37.6 && lat < 37.85 && lon > -122.53 && lon < -122.34)) continue;   // inside San Francisco
    if (NOT_A_TREE.test((row[ix.species] || '').trim())) continue;   // no tree here
    var y = 0;   // planting dates aren't used on the map
    var id = info.length;
    info.push({ sp: row[ix.species] || '', ad: row[ix.description] || '', d: row[ix.planteddate] || '',
                st: row[ix.legalstatus] || '', dbh: row[ix.mapdbh] || '', nb: row[ix.analysis_neighborhood] || '' });
    var sk = fixSpecies(row[ix.species]) || 'Unknown'; spCount[sk] = (spCount[sk] || 0) + 1; spOf.push(sk);
    feats.push({ type: 'Feature', id: id, geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { y: y, b: +row[ix.mapdbh] > 24 ? 1 : 0 } });   // b: trunk over two feet across (mapdbh is in inches)
    if (y) perYear[y] = (perYear[y] || 0) + 1;
    var nb = row[ix.analysis_neighborhood];
    if (nb) { var hs = hoodSum[nb] || (hoodSum[nb] = [0, 0, 0]); hs[0] += lon; hs[1] += lat; hs[2]++; }
  }
  /* One species, one entry: the data writes some species several ways ("Eriobotrya deflexa :: Bronze Loquat",
     "eriobotrya deflexa", "Eriobotrya deflexa"; "Agonis flexuosa :: Peppermint Willow", "agonis flexuosa").
     Spellings with the same botanical name (ignoring case, curly quotes and spacing) join the most common
     spelling that has a common name. */
  function latinKey(k) { return k.split('::')[0].replace(/[\u2018\u2019\u201c\u201d"]/g, "'").replace(/\bssp\.?(?=\s)/gi, 'subsp.').replace(/\s+/g, ' ').trim().toLowerCase(); }
  var best = {};
  Object.keys(spCount).forEach(function (k) {
    if (k === 'Unknown') return;
    function nameOf(x) { var n = x && x.indexOf('::') > 0 && x.split('::')[1].trim(); return n && !/^planting site/i.test(n) ? n : ''; }   // "Planting Site (plant)" is not a name
    var lk = latinKey(k), b = best[lk], named = nameOf(k), bNamed = nameOf(b);
    if (!b || (named && !bNamed) || (!!named === !!bNamed && spCount[k] > spCount[b])) best[lk] = k;
  });
  var merged = {};
  spOf = spOf.map(function (k) { var m = k === 'Unknown' ? k : best[latinKey(k)]; merged[m] = (merged[m] || 0) + 1; return m; });
  spCount = merged;
  spOf.forEach(function (k, i) { info[i].sp = k === 'Unknown' ? '' : k; });   // the tree panel shows the joined name too
  // Species, most trees first; each gets its green, stored on its trees for the map to draw
  var list = Object.keys(spCount).sort(function (a, b) { return spCount[b] - spCount[a] || (a < b ? -1 : 1); });
  var gs = greens(list.map(function (k) { return !isDeciduous(k); })), colorOf = {};
  list.forEach(function (k, i) { colorOf[k] = gs[i]; });
  var rank = {}, ext = {};
  list.forEach(function (k, i) { rank[k] = i; ext[k] = [Infinity, Infinity, -Infinity, -Infinity]; });
  feats.forEach(function (f, i) {
    var k = spOf[i], c = f.geometry.coordinates, e = ext[k];
    f.properties.c = colorOf[k]; f.properties.k = rank[k];   // k: the species' number, for the legend's pick
    if (k !== 'Unknown' && isNative(k)) f.properties.n = 1;   // n: California native
    if (k === 'Unknown') f.properties.u = 1;                  // u: species not recorded (neither native nor non-native)
    e[0] = Math.min(e[0], c[0]); e[1] = Math.min(e[1], c[1]); e[2] = Math.max(e[2], c[0]); e[3] = Math.max(e[3], c[1]);
  });
  var species = list.map(function (k, i) { return { key: k, i: i, n: spCount[k], color: colorOf[k], native: isNative(k), deciduous: isDeciduous(k), bounds: [[ext[k][0], ext[k][1]], [ext[k][2], ext[k][3]]] }; });
  return { fc: { type: 'FeatureCollection', features: feats }, perYear: perYear, species: species };
}

/* ---- Write ---- */
var built = build(parseCSV(fs.readFileSync(path.join(DIR, 'trees.csv'), 'utf8')));
var feats = built.fc.features, S = built.species;
// Neighborhoods A–Z, each with the middle of its trees; a tree points to its neighborhood by number
var hoods = Object.keys(hoodSum).sort(), hoodIx = {};
hoods.forEach(function (n, i) { hoodIx[n] = i; });
// Trees in a spatial order, so each one's position is a small step from the last (the file compresses well)
var LON0 = -122.6, LAT0 = 37.6, Q = 1e5;   // positions in 1e-5 degrees (about 1 m) from this corner
var order = feats.map(function (f, i) { return i; }).sort(function (a, b) {
  var A = feats[a].geometry.coordinates, B = feats[b].geometry.coordinates;
  return Math.floor(A[1] * 200) - Math.floor(B[1] * 200) || A[0] - B[0];
});
var out = { v: 1, built: new Date().toISOString().slice(0, 10), lon0: LON0, lat0: LAT0, q: Q,
  species: S.map(function (s) { var b = s.bounds; return [s.key, s.n, s.color, s.native ? 1 : 0, s.deciduous ? 1 : 0,
    +b[0][0].toFixed(5), +b[0][1].toFixed(5), +b[1][0].toFixed(5), +b[1][1].toFixed(5)]; }),
  hoods: hoods.map(function (n) { var h = hoodSum[n]; return [n, +(h[0] / h[2]).toFixed(5), +(h[1] / h[2]).toFixed(5)]; }),
  dx: [], dy: [], k: [], h: [], big: [] };
var px = 0, py = 0;
order.forEach(function (i, j) {
  var f = feats[i], c = f.geometry.coordinates, x = Math.round((c[0] - LON0) * Q), y = Math.round((c[1] - LAT0) * Q);
  out.dx.push(x - px); out.dy.push(y - py); px = x; py = y;
  out.k.push(f.properties.k);
  var nb = info[i].nb; out.h.push(nb in hoodIx ? hoodIx[nb] : -1);
  if (f.properties.b) out.big.push(j);
});
fs.writeFileSync(path.join(DIR, 'trees.json'), JSON.stringify(out));

// Neighborhood boundaries, rounded to 1e-5 degrees (about 1 m): far smaller, no visible change
var gp = path.join(DIR, 'neighborhoods.geojson');
if (fs.existsSync(gp)) {
  var g = JSON.parse(fs.readFileSync(gp, 'utf8'));
  (function walk(c) { for (var i = 0; i < c.length; i++) { if (typeof c[i] === 'number') c[i] = +c[i].toFixed(5); else walk(c[i]); } })(g.features.map(function (f) { return f.geometry && f.geometry.coordinates; }).filter(Boolean));
  g.features.forEach(function (f) { f.properties = { nhood: f.properties.nhood }; });
  fs.writeFileSync(gp, JSON.stringify(g));
}
console.log('trees=' + feats.length + ' species=' + S.length + ' neighborhoods=' + hoods.length +
  ' trees.json=' + fs.statSync(path.join(DIR, 'trees.json')).size + ' bytes');
