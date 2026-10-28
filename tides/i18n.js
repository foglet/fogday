/* SF Tides — translations: EN (default), FR, ES, ZH. Tap the language code left of Info to cycle.
   Each language: locale for dates and times, page text, and the few phrases built from numbers
   (tide durations, days to the full moon). Weather descriptions from the National Weather Service arrive in English;
   common ones are translated here, anything unknown is shown as sent. */
(function () {
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v && v[k] != null ? v[k] : m);

/* ---- Number words ---- */
const EN_N = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one'];
const FR_N = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf','vingt','vingt-et-un','vingt-deux','vingt-trois','vingt-quatre','vingt-cinq','vingt-six','vingt-sept','vingt-huit','vingt-neuf','trente','trente-et-un'];
const ES_N = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve','treinta','treinta y uno'];
// Chinese: 2 before a measure word is 两 (两小时, 两天), but 十二, 二十二 keep 二
const zhN = n => { const d='零一二三四五六七八九'; if (n<10) return d[n]; if (n<20) return '十'+(n%10?d[n%10]:''); return d[Math.floor(n/10)]+'十'+(n%10?d[n%10]:''); };
const zhM = n => n===2 ? '两' : zhN(n);
const fem = w => w.replace(/^uno$/,'una').replace(/iuno$/,'iuna').replace(/y uno$/,'y una');   // Spanish: una hora, veintiuna horas
const masc = w => w.replace(/^uno$/,'un').replace(/iuno$/,'iún').replace(/y uno$/,'y un');     // Spanish: un día, veintiún días
const frF = w => w.replace(/^un$/,'une').replace(/-un$/,'-une');                                 // French: une heure, vingt-et-une heures

/* Shared duration shape (same thresholds in every language):
   under 10 min → soon; 10–19 / 20–29 / 30–37 / 38–44 min → about ten / twenty / thirty / forty-five minutes;
   2:00–3:59 → a few hours; under 2 hours, "about an hour" within 15 min of it, else "a little more than an hour";
   4 hours or more → plainly "in N hours" (nearest hour): "about" and "a little more" only for tides within four hours */
function durWith(w){
  return mins => {
    if (mins<10) return w.soon;
    if (mins<20) return w.m10; if (mins<30) return w.m20; if (mins<38) return w.m30; if (mins<45) return w.m45;
    if (mins>=120 && mins<240) return w.few;
    if (mins>=240) return w.hrs(Math.round(mins/60));
    const h=Math.round(mins/60);
    if (Math.abs(mins-h*60)<=15) return w.about(h);
    return w.more(Math.floor(mins/60));
  };
}

/* ---- National Weather Service phrases ---- */
const WX = {
  'sunny':['Ensoleillé','Soleado','晴'], 'mostly sunny':['Plutôt ensoleillé','Mayormente soleado','大部晴朗'],
  'partly sunny':['Partiellement ensoleillé','Parcialmente soleado','局部晴'], 'clear':['Dégagé','Despejado','晴朗'],
  'mostly clear':['Plutôt dégagé','Mayormente despejado','大部晴朗'], 'fair':['Beau temps','Buen tiempo','晴好'],
  'partly cloudy':['Partiellement nuageux','Parcialmente nublado','局部多云'], 'a few clouds':['Quelques nuages','Algunas nubes','少云'],
  'mostly cloudy':['Plutôt nuageux','Mayormente nublado','大部多云'], 'cloudy':['Nuageux','Nublado','多云'],
  'overcast':['Couvert','Cubierto','阴'], 'fog':['Brouillard','Niebla','雾'], 'fog/mist':['Brouillard','Niebla','雾'],
  'patchy fog':['Brouillard par endroits','Niebla dispersa','局部有雾'], 'areas of fog':['Bancs de brouillard','Zonas de niebla','局部雾'],
  'dense fog':['Brouillard dense','Niebla densa','浓雾'], 'mist':['Brume','Neblina','薄雾'], 'haze':['Brume sèche','Calima','霾'],
  'smoke':['Fumée','Humo','烟'], 'rain':['Pluie','Lluvia','雨'], 'light rain':['Pluie faible','Lluvia ligera','小雨'],
  'heavy rain':['Forte pluie','Lluvia intensa','大雨'], 'rain showers':['Averses','Chubascos','阵雨'], 'showers':['Averses','Chubascos','阵雨'],
  'drizzle':['Bruine','Llovizna','毛毛雨'], 'light drizzle':['Bruine légère','Llovizna ligera','小毛毛雨'],
  'patchy drizzle':['Bruine par endroits','Llovizna dispersa','局部毛毛雨'], 'thunderstorms':['Orages','Tormentas','雷暴'],
  'showers and thunderstorms':['Averses et orages','Chubascos y tormentas','阵雨和雷暴'], 'breezy':['Brise','Con brisa','有微风'],
  'windy':['Venteux','Ventoso','有风'], 'snow':['Neige','Nieve','雪']
};
const WX_I = {fr:0, es:1, zh:2};
const lower1 = s => s.charAt(0).toLowerCase()+s.slice(1);
function wxCore(p, l){
  const k=p.trim().toLowerCase(), e=WX[k];
  if (e) return e[WX_I[l]];
  let m;
  const wrap = {
    slight: {fr:x=>'Faible risque de '+lower1(x), es:x=>'Ligera posibilidad de '+lower1(x), zh:x=>'略有可能'+x},
    chance: {fr:x=>'Risque de '+lower1(x), es:x=>'Posibilidad de '+lower1(x), zh:x=>'可能'+x},
    likely: {fr:x=>x+' probable', es:x=>x+' probable', zh:x=>'很可能'+x}
  };
  if ((m=/^slight chance (.+)$/.exec(k))) { const c=wxCore(m[1], l); return c && wrap.slight[l](c); }
  if ((m=/^chance (.+)$/.exec(k))) { const c=wxCore(m[1], l); return c && wrap.chance[l](c); }
  if ((m=/^(.+) likely$/.exec(k))) { const c=wxCore(m[1], l); return c && wrap.likely[l](c); }
  return null;
}
function wxText(text, l){
  if (l==='en' || !text) return text;
  const J = {fr:[' puis ',' et '], es:[' luego ',' y '], zh:['，转','和']}[l];
  const parts = String(text).split(/ then /i).map(seg => {
    const whole = wxCore(seg, l); if (whole) return whole;
    const sub = seg.split(/ and /i).map(x => wxCore(x, l));
    return sub.every(Boolean) ? sub.join(J[1]) : null;
  });
  return parts.every(Boolean) ? parts.join(J[0]) : text;   // anything unknown: the original English
}

const PH = '<a href="https://phosphoricons.com">Phosphor Icons</a>';
const ICONS = '<a href="https://erikflowers.github.io/weather-icons/">Weather Icons</a>';

window.TIDE_I18N = {
  order: ['en','fr','es','zh'],
  wxText,
  en: {
    locale:'en-US', html:'en', name:'English', h12:true,
    title:'Tides of San Francisco',
    beaches:{}, place:{
      baker:'Below the Presidio bluffs, the outer Golden Gate', china:'A delightful small cove in Sea Cliff, facing the Golden Gate',
      east:'At Crissy Field, just inside the Golden Gate', funston:'Below the Fort Funston bluffs, south of Lake Merced',
      ocean:'The Pacific shore from the Cliff House to Sloat Boulevard'},
    source:{
      ref:'Tides computed from NOAA harmonic constants for station 9414290, San Francisco (Golden Gate), the nearest NOAA station to this beach.',
      ob:'Tides computed from NOAA station 9414275, Ocean Beach, outer coast (time and height offsets from 9414290, San Francisco), the nearest NOAA station to this beach.'},
    notes:'Heights above mean lower low water (MLLW); tap the tide height to switch between US and metric units (feet / meters, °F / °C, mph / km/h). A minus tide drops below that line, the best time for tidepools. Tides are astronomical predictions; wind and swell change the real water level. Weather from the National Weather Service. Not for navigation.',
    decSpd:'Show tenths',wholeSpd:'Show whole numbers',
    credit:'Weather and wind icons: '+PH+'. Tide arrow: AIGA symbol signs. Moon icons: '+ICONS+' by Erik Flowers.',
    madeat:'Made at Baker Beach', info:'Info',
    weather:'Weather', forecast:'Forecast', wind:'Wind', moon:'Moon',
    sunrise:'Sunrise', sunset:'Sunset', moonrise:'Moonrise', moonset:'Moonset',
    loadingWx:'Loading live weather…', loading:'Loading…',
    wxDown:'Live weather isn’t available right now. It comes from the National Weather Service; try again in a few minutes.',
    noForecast:'No forecast this far ahead yet.',
    high:'High {n}{deg}', low:'Low {n}{deg}', calm:'Calm', from:'From {d}', gusts:'Gusts to {n} {u}', noGusts:'No gusts reported',
    upTo:'Up to {n} {u}', rain:'Rain {n}%', vis:'Visibility {n} {u}', pres:'Pressure {n} {u}', fcSub:'Forecast',
    knot:'knot', knots:'knots',
    beaufort:['Calm','Light air','Light breeze','Gentle breeze','Moderate breeze','Fresh breeze','Strong breeze','Near gale','Gale','Strong gale','Storm','Violent storm','Hurricane force'],
    compass:['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'],
    slack:'Slack tide', highTide:'High tide', kingTide:'King tide', lowTide:'Low tide', negTide:'Negative tide', stop:'. ', tidePool:'Visit a tide pool. Respect Mother Nature.',
    next:'{kind} occurs {when}', dateAt:'{date} at {time}', mapAria:'Open {b} in Maps',
    alertUntil:'{ev} in effect until {when}', advKingTag:'King tides', advKing:'Coastal flood advisory now through {when}', alertEv:{adv:'Coastal flood advisory', warn:'Coastal flood warning', watch:'Coastal flood watch', stmt:'Coastal flood statement', king:'King tide statement'},
    dur: durWith({soon:'any time now', m10:'in about ten minutes', m20:'in about twenty minutes', m30:'in about thirty minutes',
      m45:'in about forty-five minutes', few:'in a few hours',
      hrs:h=>'in '+EN_N[h]+' hours', about:h=>'in about '+(h===1?'an hour':EN_N[h]+' hours'), more:h=>'in a little more than '+(h===1?'an hour':EN_N[h]+' hours')}),
    phases:['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'],
    fullMoon:'The next full moon occurs {when}.', tomorrow:'tomorrow', tomorrowNight:'tomorrow night',
    inDays:n=>'in '+EN_N[n]+' days', howl:' Ahhh-wooooooo!!!',
    beachAria:'{b}, beach {i} of {n}. Tap for {next}.', nextBeach:'Next: {n}',
    unitAria:'Tide {v} {unit}, {dir}. Tap to show {other}.', feet:'feet', meters:'meters', rising:'rising', falling:'falling',
    unitTitle:'Tap to show {other}',
    chartAria:'Tide chart. Drag sideways, or use the arrow keys, to look up to 36 hours ahead.', farTide:'This tidal event is more than a day away.', comeBack:'Come back later.', now:'Now',
    seaHelp:'Sea life: tap to hide or show all; 2 taps crabs, 4 sharks', langAria:'Language: English. Tap for {next}.', tilesAria:'Weather and moon', chartSection:'Tide chart',
    sunAria:'Sunrise and sunset', moonAria:'Moonrise and moonset'
  },
  fr: {
    locale:'fr-FR', html:'fr', name:'Français',
    title:'Marées de San Francisco',
    beaches:{baker:'Plage Baker', china:'Plage de Chine', east:'Plage Est', funston:'Fort Funston', ocean:'Plage de l’Océan'}, place:{
      baker:'Au pied des falaises du Presidio, à l’entrée du Golden Gate', china:'Une charmante petite crique à Sea Cliff, face au Golden Gate',
      east:'À Crissy Field, juste à l’intérieur du Golden Gate', funston:'Au pied des falaises de Fort Funston, au sud du lac Merced',
      ocean:'Le rivage du Pacifique, de la Cliff House à Sloat Boulevard'},
    source:{
      ref:'Marées calculées à partir des constantes harmoniques de la NOAA pour la station 9414290, San Francisco (Golden Gate), la station NOAA la plus proche de cette plage.',
      ob:'Marées calculées à partir de la station NOAA 9414275, plage de l’Océan, côte extérieure (décalages d’heure et de hauteur par rapport à 9414290, San Francisco), la station NOAA la plus proche de cette plage.'},
    notes:'Hauteurs au-dessus du niveau moyen des basses mers inférieures (MLLW) ; touchez la hauteur de marée pour passer des unités américaines aux unités métriques (pieds / mètres, °F / °C, mph / km/h). Une marée négative descend sous ce niveau : le meilleur moment pour explorer les flaques. Les marées sont des prédictions astronomiques ; le vent et la houle modifient le niveau réel de l’eau. Météo du National Weather Service. Ne pas utiliser pour la navigation.',
    decSpd:'Afficher les dixièmes',wholeSpd:'Afficher les nombres entiers',
    credit:'Icônes météo et vent : '+PH+'. Flèche de marée : pictogrammes AIGA. Icônes de lune : '+ICONS+' par Erik Flowers.',
    madeat:'Fait à la plage Baker', info:'Infos',
    weather:'Météo', forecast:'Prévisions', wind:'Vent', moon:'Lune',
    sunrise:'Lever du soleil', sunset:'Coucher du soleil', moonrise:'Lever de lune', moonset:'Coucher de lune',
    loadingWx:'Chargement de la météo…', loading:'Chargement…',
    wxDown:'La météo en direct n’est pas disponible pour le moment. Elle provient du National Weather Service ; réessayez dans quelques minutes.',
    noForecast:'Pas encore de prévisions aussi loin.',
    high:'Max {n}{deg}', low:'Min {n}{deg}', calm:'Calme', from:'Du {d}', gusts:'Rafales jusqu’à {n} {u}', noGusts:'Aucune rafale signalée',
    upTo:'Jusqu’à {n} {u}', rain:'Pluie {n} %', vis:'Visibilité {n} {u}', pres:'Pression {n} {u}', fcSub:'Prévision',
    knot:'nœud', knots:'nœuds',
    beaufort:['Calme','Très légère brise','Légère brise','Petite brise','Jolie brise','Bonne brise','Vent frais','Grand frais','Coup de vent','Fort coup de vent','Tempête','Violente tempête','Ouragan'],
    compass:['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'],
    slack:'Étale', highTide:'Marée haute', kingTide:'Marée royale', lowTide:'Marée basse', negTide:'Marée négative', stop:'. ', tidePool:'Visitez une mare de marée. Respectez Mère Nature.',
    next:'{kind} {when}', dateAt:'{date} à {time}', mapAria:'Ouvrir {b} dans Plans',
    alertUntil:'{ev} en vigueur jusqu’au {when}', advKingTag:'King tides (Marées royales)', advKing:'Avis d’inondation côtière jusqu’au {when}', alertEv:{adv:'Avis d’inondation côtière', warn:'Avertissement d’inondation côtière', watch:'Veille d’inondation côtière', stmt:'Bulletin d’inondation côtière', king:'Bulletin de marées royales'},
    dur: durWith({soon:'d’un instant à l’autre', m10:'dans environ dix minutes', m20:'dans environ vingt minutes', m30:'dans environ trente minutes',
      m45:'dans environ quarante-cinq minutes', few:'dans quelques heures',
      hrs:h=>'dans '+frF(FR_N[h])+' heures', about:h=>'dans environ '+(h===1?'une heure':frF(FR_N[h])+' heures'), more:h=>'dans un peu plus '+(h===1?'d’une heure':'de '+frF(FR_N[h])+' heures')}),
    phases:['Nouvelle lune','Premier croissant','Premier quartier','Gibbeuse croissante','Pleine lune','Gibbeuse décroissante','Dernier quartier','Dernier croissant'],
    fullMoon:'Prochaine pleine lune {when}.', tomorrow:'demain', tomorrowNight:'demain soir',
    inDays:n=>'dans '+FR_N[n]+' jours', howl:' Ahouuuuuu !!!',
    beachAria:'{b}, plage {i} sur {n}. Touchez pour {next}.', nextBeach:'Suivante : {n}',
    unitAria:'Marée {v} {unit}, {dir}. Touchez pour afficher en {other}.', feet:'pieds', meters:'mètres', rising:'montante', falling:'descendante',
    unitTitle:'Touchez pour afficher en {other}',
    chartAria:'Graphique des marées. Faites glisser, ou utilisez les flèches, pour voir jusqu’à 36 heures.', farTide:'Cette marée est dans plus d’un jour.', comeBack:'Revenez plus tard.', now:'Maintenant',
    seaHelp:'Faune marine : touchez pour tout masquer ou afficher ; 2 touches les crabes, 4 les requins', langAria:'Langue : français. Touchez pour {next}.', tilesAria:'Météo et lune', chartSection:'Graphique des marées',
    sunAria:'Lever et coucher du soleil', moonAria:'Lever et coucher de lune'
  },
  es: {
    locale:'es-ES', html:'es', name:'Español',
    title:'Mareas de San Francisco',
    beaches:{baker:'Playa Baker', china:'Playa China', east:'Playa Este', funston:'Fuerte Funston', ocean:'Playa del Océano'}, place:{
      baker:'Bajo los acantilados del Presidio, en la entrada del Golden Gate', china:'Una pequeña y encantadora cala en Sea Cliff, frente al Golden Gate',
      east:'En Crissy Field, justo dentro del Golden Gate', funston:'Bajo los acantilados del Fuerte Funston, al sur del lago Merced',
      ocean:'La orilla del Pacífico, desde la Cliff House hasta Sloat Boulevard'},
    source:{
      ref:'Mareas calculadas a partir de las constantes armónicas de la NOAA para la estación 9414290, San Francisco (Golden Gate), la estación de la NOAA más cercana a esta playa.',
      ob:'Mareas calculadas a partir de la estación 9414275 de la NOAA, Playa del Océano, costa exterior (desfases de hora y altura respecto a 9414290, San Francisco), la estación de la NOAA más cercana a esta playa.'},
    notes:'Alturas sobre la bajamar media inferior (MLLW); toque la altura de la marea para cambiar entre unidades estadounidenses y métricas (pies / metros, °F / °C, mph / km/h). Una marea negativa baja por debajo de esa línea: el mejor momento para ver las pozas de marea. Las mareas son predicciones astronómicas; el viento y el oleaje cambian el nivel real del agua. Tiempo del National Weather Service. No apto para la navegación.',
    decSpd:'Mostrar décimas',wholeSpd:'Mostrar números enteros',
    credit:'Iconos del tiempo y del viento: '+PH+'. Flecha de la marea: pictogramas AIGA. Iconos de la luna: '+ICONS+' de Erik Flowers.',
    madeat:'Hecho en Playa Baker', info:'Información',
    weather:'Tiempo', forecast:'Pronóstico', wind:'Viento', moon:'Luna',
    sunrise:'Amanecer', sunset:'Atardecer', moonrise:'Salida de la luna', moonset:'Puesta de la luna',
    loadingWx:'Cargando el tiempo…', loading:'Cargando…',
    wxDown:'El tiempo en directo no está disponible ahora. Proviene del National Weather Service; inténtelo de nuevo en unos minutos.',
    noForecast:'Aún no hay pronóstico para tan adelante.',
    high:'Máx {n}{deg}', low:'Mín {n}{deg}', calm:'Calma', from:'Del {d}', gusts:'Ráfagas de hasta {n} {u}', noGusts:'Sin ráfagas registradas',
    upTo:'Hasta {n} {u}', rain:'Lluvia {n} %', vis:'Visibilidad {n} {u}', pres:'Presión {n} {u}', fcSub:'Pronóstico',
    knot:'nudo', knots:'nudos',
    beaufort:['Calma','Ventolina','Flojito','Flojo','Bonancible','Fresquito','Fresco','Frescachón','Temporal','Temporal fuerte','Temporal duro','Temporal muy duro','Temporal huracanado'],
    compass:['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'],
    slack:'Repunte', highTide:'Marea alta', kingTide:'Marea rey', lowTide:'Marea baja', negTide:'Marea negativa', stop:'. ', tidePool:'Visita una poza de marea. Respeta a la Madre Naturaleza.',
    next:'{kind} {when}', dateAt:'{date} a las {time}', mapAria:'Abrir {b} en Mapas',
    alertUntil:'{ev} vigente hasta el {when}', advKingTag:'King tides (Mareas rey)', advKing:'Aviso de inundación costera hasta el {when}', alertEv:{adv:'Aviso de inundación costera', warn:'Advertencia de inundación costera', watch:'Vigilancia de inundación costera', stmt:'Declaración de inundación costera', king:'Declaración de mareas rey'},
    dur: durWith({soon:'en cualquier momento', m10:'en unos diez minutos', m20:'en unos veinte minutos', m30:'en unos treinta minutos',
      m45:'en unos cuarenta y cinco minutos', few:'en unas pocas horas',
      hrs:h=>'en '+fem(ES_N[h])+' horas', about:h=>h===1?'en aproximadamente una hora':'en unas '+fem(ES_N[h])+' horas', more:h=>'en poco más de '+(h===1?'una hora':fem(ES_N[h])+' horas')}),
    phases:['Luna nueva','Luna creciente','Cuarto creciente','Gibosa creciente','Luna llena','Gibosa menguante','Cuarto menguante','Luna menguante'],
    fullMoon:'La próxima luna llena llega {when}.', tomorrow:'mañana', tomorrowNight:'mañana por la noche',
    inDays:n=>'en '+masc(ES_N[n])+' días', howl:' ¡¡¡Auuuuuu!!!',
    beachAria:'{b}, playa {i} de {n}. Toque para {next}.', nextBeach:'Siguiente: {n}',
    unitAria:'Marea {v} {unit}, {dir}. Toque para mostrar en {other}.', feet:'pies', meters:'metros', rising:'subiendo', falling:'bajando',
    unitTitle:'Toque para mostrar en {other}',
    chartAria:'Gráfico de mareas. Deslice, o use las flechas, para ver hasta 36 horas.', farTide:'Esta marea es dentro de más de un día.', comeBack:'Vuelva más tarde.', now:'Ahora',
    seaHelp:'Vida marina: toque para ocultar o mostrar todo; 2 toques los cangrejos, 4 los tiburones', langAria:'Idioma: español. Toque para {next}.', tilesAria:'Tiempo y luna', chartSection:'Gráfico de mareas',
    sunAria:'Amanecer y atardecer', moonAria:'Salida y puesta de la luna'
  },
  zh: {
    locale:'zh-CN', html:'zh', name:'中文',
    title:'旧金山潮汐',
    beaches:{baker:'贝克海滩', china:'中国海滩', east:'东海滩', funston:'芬斯顿堡', ocean:'海洋海滩'},
    place:{
      baker:'位于 Presidio 悬崖下方，金门海峡外侧', china:'海崖区（Sea Cliff）一处迷人的小海湾，面朝金门海峡',
      east:'位于克里斯菲尔德（Crissy Field），金门海峡内侧', funston:'位于芬斯顿堡悬崖下方，默塞德湖以南',
      ocean:'太平洋海岸，从悬崖屋（Cliff House）延伸至斯洛特大道'},
    source:{
      ref:'潮汐根据美国国家海洋和大气管理局（NOAA）9414290 号站（旧金山，金门）的调和常数计算，该站是距离此海滩最近的 NOAA 站。',
      ob:'潮汐根据 NOAA 9414275 号站（海洋海滩，外海岸；以旧金山 9414290 号站为基准修正时间和高度）计算，该站是距离此海滩最近的 NOAA 站。'},
    notes:'高度以平均较低低潮面（MLLW）为基准；点按潮高可在美制与公制单位之间切换（英尺 / 米、°F / °C、mph / km/h）。负潮指低于该基准面的潮位，是观察潮池的最佳时机。潮汐为天文预测；风和涌浪会改变实际水位。天气数据来自美国国家气象局。不可用于航海。',
    decSpd:'显示一位小数',wholeSpd:'显示整数',
    credit:'天气和风向图标：'+PH+'。潮汐箭头：AIGA 标识符号。月相图标：'+ICONS+'，作者 Erik Flowers。',
    madeat:'制作于贝克海滩', info:'说明',
    weather:'天气', forecast:'预报', wind:'风', moon:'月亮',
    sunrise:'日出', sunset:'日落', moonrise:'月出', moonset:'月落',
    loadingWx:'正在加载实时天气…', loading:'正在加载…',
    wxDown:'实时天气暂时无法获取。数据来自美国国家气象局，请几分钟后再试。',
    noForecast:'暂无这么远的预报。',
    high:'最高 {n}{deg}', low:'最低 {n}{deg}', calm:'无风', from:'{d}风', gusts:'阵风最高 {n} {u}', noGusts:'无阵风报告',
    upTo:'最高 {n} {u}', rain:'降水概率 {n}%', vis:'能见度 {n} {u}', pres:'气压 {n} {u}', fcSub:'预报',
    knot:'节', knots:'节',
    beaufort:['无风','软风','轻风','微风','和风','清风','强风','疾风','大风','烈风','狂风','暴风','飓风'],
    compass:['北','北东北','东北','东东北','东','东东南','东南','南东南','南','南西南','西南','西西南','西','西西北','西北','北西北'],
    slack:'平潮', highTide:'高潮', kingTide:'国王潮', lowTide:'低潮', negTide:'负潮', stop:'。', tidePool:'去探访潮池。尊重大自然。',
    next:'{kind}：{when}', dateAt:'{date} {time}', mapAria:'在地图中打开{b}',
    alertUntil:'{ev}，有效至{when}', advKingTag:'King tides (国王潮)', advKing:'沿海洪水公告，持续至{when}', alertEv:{adv:'沿海洪水公告', warn:'沿海洪水警告', watch:'沿海洪水监视', stmt:'沿海洪水声明', king:'国王潮声明'},
    dur: durWith({soon:'即将到来', m10:'约十分钟后', m20:'约二十分钟后', m30:'约三十分钟后', m45:'约四十五分钟后', few:'几小时后',
      hrs:h=>zhM(h)+'小时后', about:h=>'约'+zhM(h)+'小时后', more:h=>zhM(h)+'个多小时后'}),
    phases:['新月','蛾眉月','上弦月','盈凸月','满月','亏凸月','下弦月','残月'],
    fullMoon:'下一次满月：{when}。', tomorrow:'明天', tomorrowNight:'明天晚上',
    inDays:n=>zhM(n)+'天后', howl:' 嗷呜——！！！',
    beachAria:'{b}，第 {i} 个海滩，共 {n} 个。点按切换到{next}。', nextBeach:'下一个：{n}',
    unitAria:'潮高 {v} {unit}，{dir}。点按切换为{other}。', feet:'英尺', meters:'米', rising:'涨潮中', falling:'落潮中',
    unitTitle:'点按切换为{other}',
    chartAria:'潮汐图。左右拖动或使用方向键，可查看未来36小时。', farTide:'这次潮汐在一天以后。', comeBack:'请稍后再来。', now:'现在',
    seaHelp:'海洋生物：点按一次隐藏或显示全部；两次螃蟹，四次鲨鱼', langAria:'语言：中文。点按切换到{next}。', tilesAria:'天气和月亮', chartSection:'潮汐图',
    sunAria:'日出和日落', moonAria:'月出和月落'
  },
  fill
};
})();
