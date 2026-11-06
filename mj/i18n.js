/* Bay Area Mahjong — translations: EN (default), FR, ES, ZH. Tap the language code in the header to cycle (same pattern as /tides).
   Page text lives in the language blocks. Schedule text from mj/data.js (notes, how, cost, freq, status, group titles)
   is translated through DATA below: notes sentence by sentence, the other fields as whole strings.
   Anything not found is shown in English as written, so a new listing still appears; add its phrases here to translate it.
   Venue names, addresses and the hosts' own event names stay as written. */
(function () {
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => v && v[k] != null ? v[k] : m);

/* ---- Schedule phrases: English (as in mj/data.js) → [fr, es, zh] ---- */
const DATA = {
  // notes, one sentence each
  'Open play.':['Jeu libre.','Juego libre.','自由对局。'],
  'Beginner lessons.':['Cours pour débutants.','Clases para principiantes.','新手课程。'],
  'All levels welcome.':['Tous niveaux bienvenus.','Todos los niveles son bienvenidos.','欢迎各种水平。'],
  'Same hours at all four locations.':['Mêmes horaires dans les quatre adresses.','Mismo horario en los cuatro locales.','四家店时间相同。'],
  'Meet in Room 11.':['Rendez-vous salle 11.','Reunión en la sala 11.','在 11 号房间集合。'],
  'Class.':['Cours.','Clase.','课程。'],
  'Taught from scratch.':['On part de zéro.','Se enseña desde cero.','从零教起。'],
  'First-time visit is for free.':['Première visite gratuite.','La primera visita es gratis.','首次参加免费。'],
  'Run by Play Mahjong SF.':['Organisé par Play Mahjong SF.','Organizado por Play Mahjong SF.','由 Play Mahjong SF 主办。'],
  'Club.':['Club.','Club.','俱乐部。'],
  'All levels, beginners to experienced.':['Tous niveaux, des débutants aux confirmés.','Todos los niveles, de principiantes a expertos.','各种水平，从新手到老手。'],
  'Meets in the Tea Room.':['Se réunit dans le salon de thé (Tea Room).','Se reúne en el salón de té (Tea Room).','在茶室（Tea Room）聚会。'],
  'Plus bonus sessions.':['Plus des séances supplémentaires.','Además, sesiones extra.','另有加场。'],
  'Free instruction 4–5 pm, then play until 7 pm.':['Initiation gratuite de 16:00 à 17:00, puis jeu jusqu’à 19:00.','Enseñanza gratis de 16:00 a 17:00, luego juego hasta las 19:00.','16:00–17:00 免费教学，之后对局至 19:00。'],
  'Open play at the wine bar.':['Jeu libre au bar à vin.','Juego libre en el bar de vinos.','在葡萄酒吧自由对局。'],
  'Bring a set, if you can.':['Apportez un jeu si vous pouvez.','Traiga un juego si puede.','如有牌具，请自带。'],
  'Instruction on 1st and 3rd Tuesdays.':['Initiation les 1er et 3e mardis.','Enseñanza el 1.º y 3.º martes.','每月第一、第三个星期二有教学。'],
  'Instruction on 1st and 3rd Fridays.':['Initiation les 1er et 3e vendredis.','Enseñanza el 1.º y 3.º viernes.','每月第一、第三个星期五有教学。'],
  'Instruction on first Tuesdays.':['Initiation le premier mardi du mois.','Enseñanza el primer martes de cada mes.','每月第一个星期二有教学。'],
  'Instruction for Hong Kong style.':['Initiation au style de Hong Kong.','Enseñanza del estilo de Hong Kong.','教授港式麻将。'],
  'Play Mahjong SF hosts every other week.':['Play Mahjong SF anime une semaine sur deux.','Play Mahjong SF lo organiza cada dos semanas.','Play Mahjong SF 每两周主办一次。'],
  'No instructors.':['Pas de moniteurs.','Sin instructores.','没有老师。'],
  'Handouts.':['Fiches d’aide fournies.','Hay hojas de ayuda.','提供讲义。'],
  'Beginners welcome.':['Débutants bienvenus.','Principiantes bienvenidos.','欢迎新手。'],
  'Fast, advanced play.':['Jeu rapide, niveau avancé.','Juego rápido y avanzado.','节奏快，水平高。'],
  'With food.':['Avec à manger.','Con comida.','供应餐食。'],
  'Indoors next to Delica.':['À l’intérieur, à côté de Delica.','En el interior, junto a Delica.','室内，Delica 旁边。'],
  'Open to all players.':['Ouvert à tous les joueurs.','Abierto a todos los jugadores.','对所有玩家开放。'],
  'New night.':['Nouvelle soirée.','Noche nueva.','新开的场次。'],
  'Outdoor games.':['Parties en plein air.','Partidas al aire libre.','户外对局。'],
  'Chess too.':['Échecs aussi.','También ajedrez.','也有人下棋。'],
  'Near the skate park and farmers market.':['Près du skatepark et du marché fermier.','Cerca del skatepark y del mercado de agricultores.','在滑板公园和农贸市场附近。'],
  'Some sessions fall on Sundays.':['Certaines séances ont lieu le dimanche.','Algunas sesiones son en domingo.','部分场次在星期日。'],
  'No registration.':['Sans inscription.','Sin inscripción.','无需报名。'],
  'With drinks and DJs.':['Avec boissons et DJ.','Con bebidas y DJ.','有酒水和 DJ。'],
  'Lessons and play.':['Cours et parties.','Clases y partidas.','教学加对局。'],
  'Venue rotates between Sports Basement Stonestown, 19th Avenue Baptist Church and Shirley Chisholm Village.':[
    'Le lieu alterne entre Sports Basement Stonestown, 19th Avenue Baptist Church et Shirley Chisholm Village.',
    'El lugar rota entre Sports Basement Stonestown, 19th Avenue Baptist Church y Shirley Chisholm Village.',
    '场地在 Sports Basement Stonestown、19th Avenue Baptist Church 和 Shirley Chisholm Village 之间轮换。'],
  'Some months fall on Saturday.':['Certains mois, c’est le samedi.','Algunos meses es en sábado.','有些月份在星期六。'],
  'A lesson, then play all day.':['Un cours, puis jeu toute la journée.','Una clase y luego juego todo el día.','先上课，然后全天对局。'],
  'In Bogart Court.':['Dans la Bogart Court.','En Bogart Court.','在 Bogart Court。'],
  // how (sign-up / contact)
  'RSVP on Meetup':['Réponse sur Meetup','Confirme en Meetup','在 Meetup 上报名'],
  'Contact Alexa Dalkey and Robyn Ginsburg Braverman, mahjong@sjwomansclub.org':[
    'Contact : Alexa Dalkey et Robyn Ginsburg Braverman, mahjong@sjwomansclub.org',
    'Contacto: Alexa Dalkey y Robyn Ginsburg Braverman, mahjong@sjwomansclub.org',
    '联系 Alexa Dalkey 和 Robyn Ginsburg Braverman：mahjong@sjwomansclub.org'],
  'Email Jim Dant (no address listed)':['Écrire à Jim Dant (adresse non indiquée)','Escriba a Jim Dant (no se indica la dirección)','发邮件给 Jim Dant（未列出地址）'],
  'Tickets required':['Billet obligatoire','Se necesita entrada','需购票'],
  'Three Dragon Society on Instagram':['Three Dragon Society sur Instagram','Three Dragon Society en Instagram','Instagram 上的 Three Dragon Society'],
  'Sign up online':['Inscription en ligne','Inscripción en línea','网上报名'],
  'Register online':['Inscription en ligne','Inscripción en línea','网上报名'],
  'Call Nancy, 714-403-0305':['Appeler Nancy, 714-403-0305','Llame a Nancy, 714-403-0305','致电 Nancy：714-403-0305'],
  'Tickets online':['Billets en ligne','Entradas en línea','网上购票'],
  'Text 415-601-9906':['SMS au 415-601-9906','Envíe un mensaje al 415-601-9906','发短信至 415-601-9906'],
  'RSVP to Connie, conniewhite90@gmail.com':['Réponse à Connie, conniewhite90@gmail.com','Confirme con Connie, conniewhite90@gmail.com','向 Connie 报名：conniewhite90@gmail.com'],
  // group titles
  'Mamahuhu (4 locations)':['Mamahuhu (4 adresses)','Mamahuhu (4 locales)','Mamahuhu（4 家店）'],
  'Play Mahjong SF (rotating venues)':['Play Mahjong SF (lieux tournants)','Play Mahjong SF (sedes rotativas)','Play Mahjong SF（场地轮换）'],
  // frequency
  'About monthly':['Environ une fois par mois','Aproximadamente mensual','大约每月一次'],
  '1st, 3rd and 5th Mondays':['1er, 3e et 5e lundis','1.º, 3.º y 5.º lunes','每月第一、三、五个星期一'],
  'Monthly':['Mensuel','Mensual','每月一次'],
  'Occasional':['Occasionnel','Ocasional','不定期'],
  'One weekend a month':['Un week-end par mois','Un fin de semana al mes','每月一个周末'],
  'Most Sundays':['La plupart des dimanches','Casi todos los domingos','大多数星期日'],
  // cost
  'Free':['Gratuit','Gratis','免费'],
  '$20 cover (per Dragon Well\'s site)':['Entrée 20 $ (selon le site de Dragon Well)','Entrada de 20 $ (según la web de Dragon Well)','入场费 20 美元（据 Dragon Well 网站）'],
  'Included with museum admission':['Compris dans l’entrée du musée','Incluido con la entrada al museo','含在博物馆门票内'],
  '$20 ($10 members)':['20 $ (10 $ pour les membres)','20 $ (10 $ para socios)','20 美元（会员 10 美元）'],
  // status
  'Inactive':['Inactif','Inactivo','暂停'],
};
const DI = {fr:0, es:1, zh:2};
function phrase(s, l){ const e=DATA[String(s).trim()]; return e ? e[DI[l]] : null; }
// Whole string first; notes are split into sentences, each translated on its own (unknown ones stay in English)
function tx(s, l){
  if (!s || l==='en') return s;
  const whole = phrase(s, l); if (whole) return whole;
  const parts = String(s).split(/(?<=\.)\s+/);
  if (parts.length < 2) return s;
  return parts.map(p => phrase(p, l) || p).join(l==='zh' ? '' : ' ');
}

// 24-hour clock outside English: 17:30
const h24 = h => { const H=Math.floor(h)%24, M=Math.round((h-Math.floor(h))*60); return H+':'+String(M).padStart(2,'0'); };

window.MJ_I18N = {
  order: ['en','fr','es','zh'],
  tx, fill,
  en: {
    html:'en', name:'English', map:'en',
    title:'Bay Area Mahjong', h1:'BAY AREA MAHJONG',
    subtitle:'Weekly Recurring Games. Confirm with venue.', play:'Come and play.',
    hk:'Hong Kong', am:'American', both:'Both', styleKey:'Style key',
    sty:{chinese:'Hong Kong', american:'American', both:'Both styles', unlisted:'Style not listed'},
    days:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    short:['SUN','MON','TUE','WED','THU','FRI','SAT'], daysAria:'Day of week', mapAria:'Map',
    evN:n=>n+(n===1?' event':' events'),
    time:h=>{ const H=Math.floor(h), M=Math.round((h-H)*60), ap=H>=12&&H<24?'pm':'am', h12=((H+11)%12)+1; return h12+(M?':'+String(M).padStart(2,'0'):'')+' '+ap; },
    start:'{t} start', range:'{a}–{b}', noTime:'Time not listed',
    approx:'(location approx.)', openIn:'Open {v} in Google Maps', mapsTitle:'Open in Google Maps',
    more:'More info', barTitle:'10 am to midnight', empty:'Nothing listed for this day.',
    noLoad:'The schedule could not load. Reload the page to try again.',
    noMap:'The map could not load in this browser, so the list shows every venue and time. If you use a content blocker or Lockdown Mode, allow api.mapbox.com and reload to see the map.',
    thanks:'Special thanks to {a} and {b}.',
    langAria:'Language: English. Tap for {next}.'
  },
  fr: {
    html:'fr', name:'Français', map:'fr',
    title:'Mahjong dans la Bay Area', h1:'BAY AREA MAHJONG',
    subtitle:'Parties chaque semaine. Confirmez auprès du lieu.', play:'Venez jouer.',
    hk:'Hong Kong', am:'Américain', both:'Les deux', styleKey:'Légende des styles',
    sty:{chinese:'Hong Kong', american:'Américain', both:'Les deux styles', unlisted:'Style non précisé'},
    days:['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
    short:['DIM','LUN','MAR','MER','JEU','VEN','SAM'], daysAria:'Jour de la semaine', mapAria:'Carte',
    evN:n=>n+(n===1?' événement':' événements'),
    time:h24, start:'à partir de {t}', range:'{a}–{b}', noTime:'Horaire non précisé',
    approx:'(emplacement approximatif)', openIn:'Ouvrir {v} dans Google Maps', mapsTitle:'Ouvrir dans Google Maps',
    more:'Plus d’infos', barTitle:'De 10:00 à minuit', empty:'Rien de prévu ce jour-là.',
    noLoad:'Le programme n’a pas pu se charger. Rechargez la page pour réessayer.',
    noMap:'La carte n’a pas pu se charger dans ce navigateur ; la liste indique donc tous les lieux et horaires. Si vous utilisez un bloqueur de contenu ou le mode Isolement, autorisez api.mapbox.com et rechargez pour voir la carte.',
    thanks:'Merci tout particulier à {a} et à {b}.',
    langAria:'Langue : français. Touchez pour {next}.'
  },
  es: {
    html:'es', name:'Español', map:'es',
    title:'Mahjong en el Área de la Bahía', h1:'BAY AREA MAHJONG',
    subtitle:'Partidas cada semana. Confirme con el local.', play:'Ven a jugar.',
    hk:'Hong Kong', am:'Americano', both:'Ambos', styleKey:'Leyenda de estilos',
    sty:{chinese:'Hong Kong', american:'Americano', both:'Ambos estilos', unlisted:'Estilo no indicado'},
    days:['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
    short:['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'], daysAria:'Día de la semana', mapAria:'Mapa',
    evN:n=>n+(n===1?' evento':' eventos'),
    time:h24, start:'desde las {t}', range:'{a}–{b}', noTime:'Horario no indicado',
    approx:'(ubicación aproximada)', openIn:'Abrir {v} en Google Maps', mapsTitle:'Abrir en Google Maps',
    more:'Más información', barTitle:'De 10:00 a medianoche', empty:'No hay nada este día.',
    noLoad:'El programa no se pudo cargar. Recargue la página para intentarlo de nuevo.',
    noMap:'El mapa no se pudo cargar en este navegador, así que la lista muestra todos los lugares y horarios. Si usa un bloqueador de contenido o el modo de aislamiento, permita api.mapbox.com y recargue para ver el mapa.',
    thanks:'Un agradecimiento especial a {a} y a {b}.',
    langAria:'Idioma: español. Toque para {next}.'
  },
  zh: {
    html:'zh', name:'中文', map:'zh-Hans',
    title:'湾区麻将', h1:'湾区麻将',
    subtitle:'每周固定牌局。请先向场地确认。', play:'来打牌吧。',
    hk:'港式', am:'美式', both:'两种都有', styleKey:'风格图例',
    sty:{chinese:'港式', american:'美式', both:'两种都有', unlisted:'未注明风格'},
    days:['星期日','星期一','星期二','星期三','星期四','星期五','星期六'],
    short:['周日','周一','周二','周三','周四','周五','周六'], daysAria:'星期', mapAria:'地图',
    evN:n=>n+' 场活动',
    time:h24, start:'{t} 开始', range:'{a}–{b}', noTime:'未注明时间',
    approx:'（大致位置）', openIn:'在 Google 地图中打开{v}', mapsTitle:'在 Google 地图中打开',
    more:'更多信息', barTitle:'上午 10 点至午夜', empty:'这一天没有活动。',
    noLoad:'日程无法加载。请重新加载页面再试。',
    noMap:'此浏览器无法加载地图，因此列表显示所有场地和时间。如果你使用内容拦截器或锁定模式，请允许 api.mapbox.com 并重新加载以查看地图。',
    thanks:'特别感谢 {a} 和 {b}。',
    langAria:'语言：中文。点按切换到{next}。'
  }
};
})();
