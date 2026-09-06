/*
 * Le modèle pur de l'épisode « Pourquoi il y a des saisons ? »
 * Aucun accès DOM : tout se teste avec `node test/model.test.mjs`.
 *
 * Conventions géométriques (l'orbite vue de biais, le Soleil au centre) :
 * - coordonnées mathématiques (x vers la droite, y vers le haut) — les vues
 *   font elles-mêmes la bascule vers le repère canvas (y vers le bas) ;
 * - le Soleil est FIXE au centre : c'est l'objet-repère de la série,
 *   il ne bouge jamais à l'écran ;
 * - l'axe de la Terre est FIXE lui aussi : il penche toujours vers la même
 *   direction du ciel, quel que soit le jour de l'année — c'est la vérité
 *   n° 1 de l'épisode ;
 * - jour 0 = 1er janvier ; la Terre avance dans le sens trigonométrique.
 *   Au solstice d'été, la Terre est en (−1, 0) : à gauche du Soleil, du côté
 *   où penche le haut de son axe → chez nous (hémisphère nord) penche vers
 *   le Soleil.
 */

export var TAU = Math.PI * 2;

/* Année affichée : 365 jours tout ronds (pas d'année bissextile ici). */
export var ANNEE_JOURS = 365;

/* Le solstice d'été : 21 juin (jour 171 en comptant depuis le 1er janvier).
 * Les autres repères de l'année en découlent, espacés régulièrement — les
 * vraies dates (20 mars, 22-23 septembre, 21-22 décembre) et la petite
 * inégalité des saisons vivent dans la note aux parents. */
export var JOUR_SOLSTICE_ETE = 171;
export var JOUR_EQUINOXE_AUTOMNE = JOUR_SOLSTICE_ETE + ANNEE_JOURS / 4;      /* 262,25 */
export var JOUR_SOLSTICE_HIVER = JOUR_SOLSTICE_ETE + ANNEE_JOURS / 2;        /* 353,5  */
export var JOUR_EQUINOXE_PRINTEMPS = JOUR_SOLSTICE_ETE - ANNEE_JOURS / 4;    /* 79,75  */

/* L'inclinaison vraie de l'axe (pour les chiffres) et celle du dessin
 * (exagérée pour que le penchant se voie bien — documenté). */
export var INCLINAISON_DEGRES = 23.5;
export var INCLINAISON_DESSIN_DEGRES = 30;

/* Direction du HAUT de l'axe (pôle Nord), unitaire, constante, en
 * coordonnées math : penché vers la droite (+x), de l'angle du dessin. */
var INCLINAISON_DESSIN_RAD = (INCLINAISON_DESSIN_DEGRES * Math.PI) / 180;
export var AXE_DIR = {
  x: Math.sin(INCLINAISON_DESSIN_RAD),
  y: Math.cos(INCLINAISON_DESSIN_RAD)
};

/* La distance Terre–Soleil du modèle : CONSTANTE. C'est la vérité n° 3 :
 * l'été n'arrive pas parce que la Terre serait plus près du Soleil. */
export var DISTANCE_SOLEIL = 1;

/* Chez nous (latitude de la France, ~47° nord) : les deux constantes qui
 * fabriquent la fenêtre. À l'équinoxe le Soleil culmine à ~43° et le jour
 * dure 12 h ; le penchant fait osciller tout ça. */
export var HAUTEUR_MIDI_EQUINOXE = 43;   /* degrés au-dessus de l'horizon */
export var AMPLITUDE_JOUR_HEURES = 4;    /* le jour varie de 12−4 à 12+4 h */

/* Epsilon des seuils géométriques (cos(τ/4) ≈ 6e-17 n'est pas « positif »). */
export var EPS = 1e-9;

/* Ramène un jour dans [0, 365[. */
export function jourNormalise(jour) {
  var j = jour % ANNEE_JOURS;
  if (j < 0) j += ANNEE_JOURS;
  return j;
}

/* Angle de la Terre sur son orbite, en radians dans [0, τ[.
 * 0 = solstice d'été (la Terre du côté où penche son axe). */
export function angleAnnee(jour) {
  var a = ((jourNormalise(jour) - JOUR_SOLSTICE_ETE) / ANNEE_JOURS) * TAU;
  if (a < 0) a += TAU;
  return a;
}

/* Position de la Terre (vecteur unitaire Soleil → Terre, coordonnées math).
 * Solstice d'été : (−1, 0). Le jour qui avance fait tourner ce vecteur dans
 * le sens trigonométrique. */
export function positionTerre(jour) {
  var a = angleAnnee(jour);
  return { x: -Math.cos(a), y: -Math.sin(a) };
}

/* La direction de l'axe ne dépend PAS du jour : la Terre garde son penchant
 * toute l'année. C'est la vérité n° 1 de l'épisode. */
export function axeDirection(jour) {
  return { x: AXE_DIR.x, y: AXE_DIR.y };
}

/* La distance au Soleil ne dépend pas du jour non plus (vérité n° 3). */
export function distanceSoleil(jour) {
  return DISTANCE_SOLEIL;
}

/* De combien notre moitié (hémisphère nord) penche vers le Soleil :
 * +1 au solstice d'été (penche à fond vers lui), −1 au solstice d'hiver
 * (penche à fond à l'opposé), 0 aux équinoxes. */
export function penchementNord(jour) {
  return Math.cos(angleAnnee(jour));
}

/* Pareil, pour l'une ou l'autre moitié : ce qui penche vers le Soleil pour
 * le nord penche à l'opposé pour le sud — d'où les saisons inversées. */
export function penchementVersSoleil(jour, hemisphere) {
  var p = penchementNord(jour);
  return hemisphere === 'sud' ? -p : p;
}

/* ------------------------------------------------------------------ */
/* Les saisons                                                         */
/* ------------------------------------------------------------------ */

export var ORDRE_SAISONS = ['hiver', 'printemps', 'ete', 'automne'];

export var SAISONS = {
  hiver: { nom: 'l’hiver', emoji: '❄️', teinte: 'bleu' },
  printemps: { nom: 'le printemps', emoji: '🌸', teinte: 'rose' },
  ete: { nom: 'l’été', emoji: '☀️', teinte: 'or' },
  automne: { nom: 'l’automne', emoji: '🍂', teinte: 'violet' }
};

var SAISON_OPPOSEE = {
  hiver: 'ete', ete: 'hiver', printemps: 'automne', automne: 'printemps'
};

/* La saison d'un jour, pour une moitié de la Terre ('nord' par défaut). */
export function saison(jour, hemisphere) {
  var j = jourNormalise(jour);
  var nord;
  if (j >= JOUR_EQUINOXE_PRINTEMPS && j < JOUR_SOLSTICE_ETE) nord = 'printemps';
  else if (j >= JOUR_SOLSTICE_ETE && j < JOUR_EQUINOXE_AUTOMNE) nord = 'ete';
  else if (j >= JOUR_EQUINOXE_AUTOMNE && j < JOUR_SOLSTICE_HIVER) nord = 'automne';
  else nord = 'hiver';
  return hemisphere === 'sud' ? SAISON_OPPOSEE[nord] : nord;
}

/* ------------------------------------------------------------------ */
/* Les mois                                                            */
/* ------------------------------------------------------------------ */

export var MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

export var JOURS_PAR_MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/* Le premier jour de l'année d'un mois (index 0 = janvier). */
export function debutDuMois(index) {
  var debut = 0;
  for (var m = 0; m < index; m++) debut += JOURS_PAR_MOIS[m];
  return debut;
}

/* Le mois d'un jour de l'année : { index, nom }. */
export function moisDuJour(jour) {
  var j = jourNormalise(jour);
  var cumul = 0;
  for (var i = 0; i < JOURS_PAR_MOIS.length; i++) {
    cumul += JOURS_PAR_MOIS[i];
    if (j < cumul) return { index: i, nom: MOIS[i] };
  }
  return { index: 11, nom: MOIS[11] };
}

/* ------------------------------------------------------------------ */
/* La fenêtre de chez nous : hauteur du Soleil et longueur du jour     */
/* ------------------------------------------------------------------ */

/* Hauteur du Soleil à midi, en degrés au-dessus de l'horizon (chez nous).
 * Été : très haut (~66°) ; hiver : tout bas (~20°). */
export function hauteurSoleilMidi(jour) {
  return HAUTEUR_MIDI_EQUINOXE + INCLINAISON_DEGRES * penchementNord(jour);
}

/* Durée du jour chez nous, en heures : 8 h au cœur de l'hiver,
 * 16 h au cœur de l'été, 12 h pile aux équinoxes. */
export function dureeJourHeures(jour) {
  return 12 + AMPLITUDE_JOUR_HEURES * penchementNord(jour);
}

export function heureLever(jour) {
  return 12 - dureeJourHeures(jour) / 2;
}

export function heureCoucher(jour) {
  return 12 + dureeJourHeures(jour) / 2;
}

/* L'arbre du jardin, saison par saison. */
export var ARBRES = {
  hiver: 'nu',         /* branches nues, un peu de neige */
  printemps: 'fleurs', /* des fleurs roses */
  ete: 'feuilles',     /* une grosse couronne verte */
  automne: 'roux'      /* des feuilles rousses qui tombent */
};

export function arbreDuJour(jour) {
  return ARBRES[saison(jour, 'nord')];
}

/* ------------------------------------------------------------------ */
/* Le jardin continu : d'un jour au suivant, tout change à petits pas  */
/* ------------------------------------------------------------------ */

/* Rampe linéaire : 0 avant `debut`, 1 après `fin`, en pente entre les deux
 * (sur l'année qui reboucle). */
function rampe(jour, debut, fin) {
  var longueur = jourNormalise(fin - debut);
  var t = jourNormalise(jour - debut);
  if (t >= longueur) {
    /* après la fin : encore « 1 » jusqu'à mi-chemin du retour, sinon 0 */
    return null;
  }
  return t / longueur;
}

/* Tout ce que la fenêtre dessine, en continu — AUCUN saut de décor :
 * - feuilles : la couronne de l'arbre, de 0 (nu) à 1 (pleine) ;
 * - rousseur : 0 = feuilles vertes, 1 = feuilles rousses ;
 * - fleurs   : les fleurs du printemps (arbre et jardin), 0 à 1 ;
 * - fruits   : les fruits de l'été sur la couronne, 0 à 1 ;
 * - neige    : le manteau blanc de l'hiver (sol, flocons, bonhomme), 0 à 1.
 * Les rampes s'appuient sur les repères de l'année : les feuilles poussent
 * au printemps, roussissent puis tombent à l'automne, la neige s'installe
 * autour du solstice d'hiver, les premières fleurs dès l'équinoxe de
 * printemps. */
export function jardinDuJour(jour) {
  var j = jourNormalise(jour);
  var t;

  /* Chaque décor atteint son PLEIN dès l'entrée de sa saison (retour
   * test : au bouton, l'image doit être l'archétype de la saison). */

  /* Les feuilles : poussent au printemps, pleines avant l'été — et elles
   * commencent à tomber juste avant l'équinoxe d'automne (les feuilles
   * volantes s'animent dès l'entrée de l'automne). */
  var feuilles;
  t = rampe(j, 70, 160);                        /* elles pointent dès fin mars */
  if (t !== null) feuilles = t;
  else {
    t = rampe(j, 255, 330);                     /* elles tombent */
    if (t !== null) feuilles = 1 - t;
    else feuilles = (j >= 160 && j < 255) ? 1 : 0;
  }

  /* La rousseur : pleine dès l'équinoxe d'automne, et la teinte s'efface
   * en douceur à la fin de l'hiver (l'arbre est nu, mais aucun paramètre
   * ne saute jamais — le décor bouge à petits pas). */
  var rousseur;
  t = rampe(j, 235, 260);
  if (t !== null) rousseur = t;
  else {
    t = rampe(j, 20, 60);
    if (t !== null) rousseur = 1 - t;
    else rousseur = (j >= 260 || j < 20) ? 1 : 0;
  }

  /* Les fleurs : l'arbre se couvre POUR l'équinoxe de printemps, et elles
   * s'effacent fin mai — place aux fruits. */
  var fleurs;
  t = rampe(j, 60, 78);
  if (t !== null) fleurs = t;
  else {
    t = rampe(j, 135, 165);
    if (t !== null) fleurs = 1 - t;
    else fleurs = (j >= 78 && j < 135) ? 1 : 0;
  }

  /* Les fruits : les premiers poussent dès l'entrée de l'été (au
   * printemps les fleurs, en été les fruits), cueillis à la fin de
   * l'été — l'arbre est vide pour l'équinoxe d'automne. */
  var fruits;
  t = rampe(j, 155, 185);
  if (t !== null) fruits = t;
  else {
    t = rampe(j, 240, 262);
    if (t !== null) fruits = 1 - t;
    else fruits = (j >= 185 && j < 240) ? 1 : 0;
  }

  /* La neige : installée POUR le solstice d'hiver, fond en février-mars. */
  var neige;
  t = rampe(j, 320, 350);
  if (t !== null) neige = t;
  else {
    t = rampe(j, 40, 75);
    if (t !== null) neige = 1 - t;
    else neige = (j >= 350 || j < 40) ? 1 : 0;
  }

  return { feuilles: feuilles, rousseur: rousseur, fleurs: fleurs, fruits: fruits, neige: neige };
}

/* ------------------------------------------------------------------ */
/* La maison et le kangourou sur le globe (vue de l'espace)            */
/* ------------------------------------------------------------------ */

/* La maison n'habite pas un point du globe : elle habite tout son anneau de
 * latitude (elle en fait le tour chaque jour). Le dessin pose donc la maison
 * au-devant du globe, SUR L'AXE de symétrie de son anneau — jamais sur la
 * face qui regarde le Soleil : rien, dans le dessin, ne se rapproche du
 * Soleil en été. Position locale en rayons de globe, coordonnées math,
 * indépendante du jour. */
export var LATITUDE_REPERES_DEGRES = 45;
var RAYON_LATITUDE = Math.sin((LATITUDE_REPERES_DEGRES * Math.PI) / 180);

export function positionLocaleMaison() {
  return { x: AXE_DIR.x * RAYON_LATITUDE, y: AXE_DIR.y * RAYON_LATITUDE };
}

/* Le kangourou vit aux antipodes de la maison, sur l'anneau sud. */
export function positionLocaleKangourou() {
  var m = positionLocaleMaison();
  return { x: -m.x, y: -m.y };
}

/* Les deux bouts de l'anneau de latitude (là où il touche le bord du globe),
 * en rayons de globe : le liseré que la vue dessine sous la maison. */
export function extremitesAnneau(hemisphere) {
  var signe = hemisphere === 'sud' ? -1 : 1;
  var hauteur = RAYON_LATITUDE * signe;          /* le long de l'axe */
  var demiLargeur = Math.cos((LATITUDE_REPERES_DEGRES * Math.PI) / 180);
  /* perpendiculaire à l'axe (math) : (cos ε, −sin ε) pour un axe (sin ε, cos ε) */
  var perp = { x: AXE_DIR.y, y: -AXE_DIR.x };
  return [
    { x: AXE_DIR.x * hauteur - perp.x * demiLargeur, y: AXE_DIR.y * hauteur - perp.y * demiLargeur },
    { x: AXE_DIR.x * hauteur + perp.x * demiLargeur, y: AXE_DIR.y * hauteur + perp.y * demiLargeur }
  ];
}

/* ------------------------------------------------------------------ */
/* Le faisceau de lumière de la vue de l'espace                        */
/* ------------------------------------------------------------------ */

/* La direction de la NUIT sur le globe (coords math, vecteur unitaire) :
 * la moitié qui ne regarde pas le Soleil. QUATRE ANCRES, une par repère de
 * l'année : pile à l'opposé du Soleil aux solstices (le pôle d'hiver
 * plonge dans la nuit), perpendiculaire à l'axe aux équinoxes (le
 * terminateur passe par les deux pôles — l'image des manuels, l'égalité
 * qui se voit). Entre deux ancres, l'angle est interpolé en douceur
 * (smoothstep) et TOUJOURS dans le sens de l'année : l'ombre ne fait
 * jamais marche arrière (la première construction — un rappel vers l'axe
 * — reculait de ~15° après chaque équinoxe, retour utilisateur). L'écart
 * avec l'ombre géométrique reste sous 65° : la nuit ne quitte jamais le
 * côté opposé au Soleil (verrouillé par test, comme la monotonie et la
 * continuité). */
export function directionNuit(jour) {
  var j = jourNormalise(jour);
  var angleAxe = Math.atan2(AXE_DIR.y, AXE_DIR.x);
  /* les ancres, dans l'ordre de l'année, angles croissants sur un tour */
  var ancres = [
    { jour: JOUR_EQUINOXE_PRINTEMPS, angle: angleAxe + Math.PI / 2 },
    { jour: JOUR_SOLSTICE_ETE, angle: Math.PI },
    { jour: JOUR_EQUINOXE_AUTOMNE, angle: angleAxe + 3 * Math.PI / 2 },
    { jour: JOUR_SOLSTICE_HIVER, angle: TAU }
  ];
  for (var i = 0; i < ancres.length; i++) {
    var deb = ancres[i];
    var fin = ancres[(i + 1) % ancres.length];
    var duree = jourNormalise(fin.jour - deb.jour);
    var dans = jourNormalise(j - deb.jour);
    if (dans < duree) {
      var saut = fin.angle - deb.angle;
      while (saut <= 0) saut += TAU; /* toujours vers l'avant */
      var t = dans / duree;
      var doux = t * t * (3 - 2 * t);
      var angle = deb.angle + saut * doux;
      return { x: Math.cos(angle), y: Math.sin(angle) };
    }
  }
  /* jamais atteint : les segments couvrent toute l'année */
  return { x: Math.cos(ancres[0].angle), y: Math.sin(ancres[0].angle) };
}

/* La force du faisceau (0,55..1) : pleine aux solstices, creux DOUX aux
 * équinoxes — mais jamais éteinte. Depuis le faisceau LARGE (qui ne vise
 * personne, il peut rester allumé sans tricher), ce sont les taches
 * d'arrivée qui racontent : aux équinoxes, l'aplomb du nord et du sud
 * valent 0,5 chacun — DEUX TACHES JUMELLES, une par moitié, la lumière
 * partagée à égalité (retour utilisateur : l'extinction totale laissait
 * l'égalité des équinoxes invisible). Continue, jamais de saut. */
export function forceFaisceau(jour) {
  var t = Math.abs(penchementNord(jour));
  var s = t * t * (3 - 2 * t);
  return 0.55 + 0.45 * s;
}

/* L'aplomb de la lumière sur chez nous (0..1) : la tache d'arrivée du
 * faisceau est ramassée et vive quand la lumière frappe bien en face
 * (solstice d'été), moyenne aux équinoxes, longue et pâle quand elle rase
 * (solstice d'hiver). C'est l'expérience de la lampe, en continu. */
export function aplombLumiere(jour) {
  return Math.max(0.12, 0.5 + 0.45 * penchementNord(jour));
}

/* ------------------------------------------------------------------ */
/* La petite phrase du moment, affichée sous la fenêtre                */
/* ------------------------------------------------------------------ */

/* La bande de transition : les 12 derniers jours avant un repère de
 * l'année, pendant lesquels la phrase annonce la saison qui arrive. */
export var BANDE_TRANSITION_JOURS = 12;

/* Les quatre repères de l'année, dans l'ordre. */
export var JOURS_REPERES = [
  JOUR_EQUINOXE_PRINTEMPS, JOUR_SOLSTICE_ETE,
  JOUR_EQUINOXE_AUTOMNE, JOUR_SOLSTICE_HIVER
];

/* Le mot d'ouverture de la phrase du moment : « En janvier », mais
 * « Début / Mi- / Fin décembre » quand le mois porte PLUSIEURS phrases
 * (retour utilisateur : en mars, juin, septembre et décembre, trois
 * phrases d'affilée commençaient par « En décembre, chez nous, » — pendant
 * la lecture, on croyait que l'affichage était bloqué).
 *
 * Le mois se coupe aux mêmes jours que la phrase : l'entrée et la sortie
 * de la bande de transition. Une seule tranche → « En » ; deux → début et
 * fin ; trois → début, milieu et fin. Les tranches suivent donc toujours
 * le texte qu'elles ouvrent : le mot ne change jamais sans que la phrase
 * change aussi.
 *
 * Les bornes restent FRACTIONNAIRES, comme les repères (79,75 ; 262,25 ;
 * 353,5) : arrondies au jour entier, le bouton « L'automne arrive »
 * (jour 262,25) tombait dans le trou entre la sortie de la bande et le
 * premier jour entier qui suit, et titrait « Mi-septembre, chez nous,
 * c'est l'automne » (retour utilisateur — le curseur avance par demi-
 * journées, il y tombait aussi). */
export function momentDuMois(jour) {
  var j = jourNormalise(jour);
  var mois = moisDuJour(j);
  var debut = debutDuMois(mois.index);
  var fin = debut + JOURS_PAR_MOIS[mois.index];
  /* les coupures du mois : l'entrée et la sortie de chaque bande */
  var coupures = [];
  for (var i = 0; i < JOURS_REPERES.length; i++) {
    var bornes = [JOURS_REPERES[i] - BANDE_TRANSITION_JOURS, JOURS_REPERES[i]];
    for (var b = 0; b < bornes.length; b++) {
      var d = bornes[b];
      if (d > debut && d < fin && coupures.indexOf(d) === -1) coupures.push(d);
    }
  }
  coupures.sort(function (a, z) { return a - z; });
  if (coupures.length === 0) return 'En ' + mois.nom;
  var rang = 0;
  for (var k = 0; k < coupures.length; k++) if (j >= coupures[k]) rang = k + 1;
  if (rang === 0) return 'Début ' + mois.nom;
  if (rang === coupures.length) return 'Fin ' + mois.nom;
  return 'Mi-' + mois.nom;
}

/* La typographie française des phrases affichées : fine insécable devant
 * « ! ? ; », insécable devant « : », insécable entre un nombre et son unité
 * (« 8 heures »). Mesuré au navigateur (Chromium, 300 à 1200 px) : sans
 * elles, une ligne se réduisait à « ! » (jour 68 à 390 px), une autre
 * s'ouvrait sur « : », un chiffre se séparait de « heures » — la règle
 * Unicode « pas de coupure devant ! même après une espace » n'est PAS
 * appliquée par tous les moteurs. `texteOral` ramène ces espaces à des
 * espaces simples : la voix n'y voit rien. */
export function typographie(t) {
  return t
    .replace(/ ([!?;])/g, '\u202f$1')
    .replace(/ :/g, '\u00a0:')
    .replace(/(\d) heures/g, '$1\u00a0heures');
}

/* La fin du titre : « … ! 🍂 ». L'espace devant le « ! » est la fine
 * insécable de la typographie française, celle entre le « ! » et l'émoji
 * est insécable aussi — l'émoji ne part JAMAIS seul à la ligne (retour
 * utilisateur, iPhone : « c'est l'automne ! » puis « 🍂 » orphelin). */
export var FIN_TITRE = '\u202f!\u00a0';

/* La TRANCHE du moment : la coupe calendaire que partagent la phrase du
 * jardin et celle de l'espace — { mois, saison, bande } où `bande` est la
 * saison qui arrive (dans les 12 jours avant son repère) ou null. Les deux
 * phrases ne changent QUE quand la tranche change : elles basculent donc
 * toujours ensemble (retour utilisateur : la phrase de l'espace suivait
 * des seuils physiques — ±0,15, ±0,70 de penchant — qui ne tombaient sur
 * aucune frontière du jardin, un seul jour commun sur 28 ; pendant la
 * lecture, on voyait l'une changer, puis l'autre quatre jours plus tard). */
export function trancheDuMoment(jour) {
  var j = jourNormalise(jour);
  var reperes = [
    { jour: JOUR_EQUINOXE_PRINTEMPS, saison: 'printemps' },
    { jour: JOUR_SOLSTICE_ETE, saison: 'ete' },
    { jour: JOUR_EQUINOXE_AUTOMNE, saison: 'automne' },
    { jour: JOUR_SOLSTICE_HIVER, saison: 'hiver' }
  ];
  var bande = null;
  for (var i = 0; i < reperes.length; i++) {
    var dans = jourNormalise(reperes[i].jour - j);
    if (dans > 0 && dans <= BANDE_TRANSITION_JOURS) bande = reperes[i].saison;
  }
  return { mois: moisDuJour(j), saison: saison(j, 'nord'), bande: bande, mot: momentDuMois(j) };
}

/* La phrase du moment, en deux parties : le TITRE (le mois et la saison —
 * affiché en doré) et le TEXTE (le commentaire, en clair) — retour test :
 * tout en un bloc, ça se lisait mal. phraseDuMoment les recolle pour les
 * tests et le cache de main.js. */
export function phraseDuMomentParties(jour) {
  var t = trancheDuMoment(jour);
  var mois = t.mois;
  var s = t.saison;
  /* La bande de transition (les ~12 jours avant un repère) : SEUL LE TITRE
   * annonce la saison qui arrive — le commentaire reste celui du mois.
   * (Retour utilisateur : 12 jours, c'est 3,6 secondes à la lecture ; un
   * commentaire propre à la bande — « Le jour raccourcit : bientôt aussi
   * long que la nuit » — changeait en même temps que le titre et la phrase
   * de l'espace, illisible et mal tourné. Supprimé, pas réécrit : réécrit,
   * il resterait 3,6 secondes.) */
  var parties;
  if (t.bande) {
    var suivante = SAISONS[t.bande];
    parties = {
      titreAvant: t.mot + ', chez nous, ',
      avantSaisonNom: SAISONS[s].nom,
      avantTeinte: SAISONS[s].teinte,
      entre: typographie(' se termine : '),
      saisonNom: suivante.nom,
      titreApres: ' arrive' + FIN_TITRE + suivante.emoji,
      teinte: suivante.teinte
    };
  } else {
    parties = {
      titreAvant: t.mot + ', chez nous, c’est ',
      saisonNom: SAISONS[s].nom,
      titreApres: FIN_TITRE + SAISONS[s].emoji,
      teinte: SAISONS[s].teinte
    };
  }
  /* Hors bande, le commentaire ne change JAMAIS en cours de mois (retour
   * test : début mai et début novembre, la phrase basculait au milieu du
   * mois). Les clauses sont ancrées sur des MOIS ENTIERS — superlatifs en
   * mai-juin-juillet et novembre-décembre-janvier, mouvement ailleurs —
   * et le chiffre d'heures est FIGÉ au milieu du mois affiché. */
  var debutMois = debutDuMois(mois.index);
  var heures = Math.round(dureeJourHeures(debutMois + JOURS_PAR_MOIS[mois.index] / 2));
  if (mois.index >= 4 && mois.index <= 6) { /* mai, juin, juillet */
    parties.texte = 'Le Soleil monte très haut dans le ciel, et il fait jour très longtemps : ' + heures + ' heures de lumière !';
  } else if (mois.index >= 10 || mois.index === 0) { /* novembre, décembre, janvier */
    parties.texte = 'Le Soleil reste tout bas, et la nuit tombe très tôt : ' + heures + ' heures de lumière seulement.';
  } else if (Math.sin(angleAnnee(jour)) < 0) {
    parties.texte = 'Chaque jour, le Soleil grimpe un peu plus haut, et le jour s’allonge.';
  } else {
    parties.texte = 'Chaque jour, le Soleil descend un peu, et le jour raccourcit.';
  }
  parties.texte = typographie(parties.texte);
  return parties;
}

export function phraseDuMoment(jour) {
  var p = phraseDuMomentParties(jour);
  var titre = p.titreAvant + (p.avantSaisonNom ? p.avantSaisonNom + p.entre : '') + p.saisonNom + p.titreApres;
  return titre + ' ' + p.texte;
}

/* La phrase de la vue de l'espace : où penche notre moitié, en ce moment.
 * Elle lit LA MÊME tranche que la phrase du jardin (trancheDuMoment) : les
 * deux basculent ensemble, toujours. Ses paliers suivent donc le calendrier
 * — « à fond » sur les mois de cœur (mai-juin-juillet, novembre-décembre-
 * janvier : ceux où le jardin écrit les heures), « à égalité » sur la bande
 * la tranche qui suit chaque équinoxe — au lieu des seuils ±0,15 / ±0,70
 * de penchant : aux coupes, le penchant vaut ±0,2 au plus, l'approximation
 * est invisible pour un enfant, les vrais chiffres vivent dans la note aux
 * parents. */
export function phraseEspace(jour) {
  var t = trancheDuMoment(jour);
  var m = t.mois.index;
  var texte;
  /* (pas de phrase propre à la bande de transition : 12 jours = 3,6 s à la
   * lecture, on n'a pas le temps de la lire — retour utilisateur) */
  if ((m === 2 && t.saison === 'printemps') || (m === 8 && t.saison === 'automne')) {
    /* fin mars, fin septembre : la tranche qui suit l'équinoxe */
    texte = 'Aucune moitié ne penche vers le Soleil : chez nous et l’Australie sont à égalité.';
  } else if (m >= 4 && m <= 6) texte = 'Notre moitié de la Terre penche à fond vers le Soleil : les jours sont les plus longs de l’année !';
  else if (m >= 10 || m === 0) texte = 'Notre moitié penche à fond à l’opposé du Soleil : les jours sont les plus courts de l’année.';
  else if (m === 3 || m === 7 || m === 8) texte = 'Notre moitié penche vers le Soleil — et l’Australie, à l’opposé.';
  else texte = 'Notre moitié penche à l’opposé du Soleil — l’Australie, elle, penche vers le Soleil.';
  return typographie(texte);
}

/* ------------------------------------------------------------------ */
/* La lecture automatique                                              */
/* ------------------------------------------------------------------ */

/* Le phénomène avance tout seul : un tour de l'année en ~110 secondes
 * (retour test : à 85 s, pas le temps de lire les phrases). */
export var LECTURE_JOURS_PAR_SEC = ANNEE_JOURS / 110;

/* ------------------------------------------------------------------ */
/* Les boutons-scénarios : « 🎲 Joue avec les saisons »                */
/* ------------------------------------------------------------------ */

/* Les quatre moments-clés de l'année, aux dégradés communs de la famille
 * (attribués au sens du moment : printemps rose, été or, automne violet,
 * hiver bleu). `fenetre` et `espace` s'affichent en lignes à puces (le même
 * instant, deux regards) ; `intro` n'existe qu'à l'oral — c'est la voix qui
 * nomme le moment fabriqué. */
export var SCENARIOS = [
  {
    id: 'printemps',
    emoji: '🌸',
    jour: JOUR_EQUINOXE_PRINTEMPS,
    teinte: 'rose',
    label: 'Le printemps revient',
    sub: 'l’équinoxe de printemps',
    intro: 'Au mois de mars, le printemps revient…',
    fenetre: 'L’arbre du jardin se couvre de fleurs ! Le jour dure maintenant aussi longtemps que la nuit. Et chaque jour qui passe, le Soleil grimpe un peu plus haut.',
    espace: 'Les deux moitiés de la Terre sont à égalité : ni notre moitié, ni l’Australie ne penche vers le Soleil. Mais la Terre avance… Et bientôt, c’est notre moitié qui penchera vers lui !'
  },
  {
    id: 'ete',
    emoji: '☀️',
    jour: JOUR_SOLSTICE_ETE,
    teinte: 'or',
    label: 'L’été est là',
    sub: 'le solstice d’été',
    intro: 'Fin juin, l’été commence…',
    fenetre: 'Dans le ciel, le Soleil monte très haut, et le soir, il fait encore jour très tard. Il fait chaud : l’arbre donne ses premiers fruits, et on joue dehors jusqu’au soir !',
    espace: 'Regarde la Terre : notre moitié penche vers le Soleil, et elle reçoit sa lumière bien en face — regarde la belle tache brillante sur nous ! Elle a tout le temps de chauffer : c’est l’été.'
  },
  {
    id: 'automne',
    emoji: '🍂',
    jour: JOUR_EQUINOXE_AUTOMNE,
    teinte: 'violet',
    label: 'L’automne arrive',
    sub: 'l’équinoxe d’automne',
    intro: 'Fin septembre, l’automne arrive…',
    fenetre: 'Les feuilles de l’arbre deviennent rousses et commencent à tomber. Le jour dure aussi longtemps que la nuit… Mais maintenant, le Soleil descend un peu plus chaque jour.',
    espace: 'Les deux moitiés de la Terre sont de nouveau à égalité : ni notre moitié, ni l’Australie ne penche vers le Soleil. La Terre continue son voyage… Et cette fois, c’est l’Australie qui va pencher vers le Soleil !'
  },
  {
    id: 'hiver',
    emoji: '❄️',
    jour: JOUR_SOLSTICE_HIVER,
    teinte: 'bleu',
    label: 'L’hiver est là',
    sub: 'le solstice d’hiver',
    intro: 'Fin décembre, l’hiver commence…',
    fenetre: 'Le Soleil reste tout bas, et la nuit tombe avant le dîner. L’arbre est tout nu, et parfois, il neige sur le jardin.',
    espace: 'Notre moitié penche à l’opposé du Soleil : sa lumière ne nous arrive plus que de biais, elle glisse sans chauffer. Mais regarde le kangourou : c’est l’Australie qui reçoit la lumière bien en face ! Là-bas, c’est Noël en plein été, sur la plage !'
  }
];

/* Les enchaînements que seul l'oral entend. */
export var VOIX_TRANSITIONS = {
  espace: 'Et maintenant, vu de l’espace…'
};

/* ------------------------------------------------------------------ */
/* Le jeu « 🎯 Fabrique la saison ! »                                  */
/* ------------------------------------------------------------------ */

/* Gagné quand le jour RESTE un petit instant dans la saison demandée
 * (tempo anti « gagné en passant »), rangé seulement une marge au-delà de
 * ses bords (hystérésis : le bravo ne clignote pas à la frontière). */
export var DEFI_ATTENTE_MS = 350;
export var DEFI_SORTIE_MARGE_JOURS = 6;

/* La marge d'ENTRÉE : la saison commence pile au repère, et l'enfant vise
 * le repère sur l'orbite — s'arrêter un poil avant, c'était raté (retour
 * utilisateur : « il faut vraiment rentrer dans la saison »). Huit jours
 * avant le début, c'est gagné. Même marge pour l'histoire d'un scénario :
 * elle reste affichée tant que la Terre est dans sa saison, à huit jours
 * près. */
export var DEFI_ENTREE_MARGE_JOURS = 8;

/* Le jour est-il dans la saison — ou à moins de `marge` jours de son début ? */
export function procheDeSaison(jour, cible, hemisphere, marge) {
  if (saison(jour, hemisphere) === cible) return true;
  for (var d = 1; d <= marge; d++) {
    if (saison(jour + d, hemisphere) === cible) return true;
  }
  return false;
}

/* `jourBravo` : le jour où le recalage doux emmène la Terre après la
 * victoire — TOUJOURS un des quatre repères de l'année (solstices et
 * équinoxes), les mêmes que les boutons-saisons (décision utilisateur :
 * tout autre jour brouillait la boussole). Les consignes des deux défis
 * d'équinoxe promettent des DÉBUTS (« le printemps revient », « l'automne
 * arrive ») — jamais plus que ce que le jardin y montre. */
export var DEFIS = [
  {
    id: 'fleurs',
    emoji: '🌸',
    cible: 'printemps',
    jourBravo: JOUR_EQUINOXE_PRINTEMPS,
    hemisphere: 'nord',
    consigne: 'Fais revenir le printemps chez nous !',
    bravo: 'Bravo ! Le printemps revient : l’arbre est tout fleuri !'
  },
  {
    id: 'ete',
    emoji: '☀️',
    cible: 'ete',
    jourBravo: JOUR_SOLSTICE_ETE,
    hemisphere: 'nord',
    consigne: 'Fabrique l’été chez nous !',
    bravo: 'Bravo ! C’est l’été : le Soleil monte haut dans le ciel et les jours n’en finissent plus !'
  },
  {
    id: 'feuilles',
    emoji: '🍂',
    cible: 'automne',
    jourBravo: JOUR_EQUINOXE_AUTOMNE,
    hemisphere: 'nord',
    consigne: 'Fais venir l’automne dans le jardin !',
    bravo: 'Bravo ! L’automne arrive : les feuilles roussissent et commencent à tomber.'
  },
  {
    id: 'neige',
    emoji: '❄️',
    cible: 'hiver',
    jourBravo: JOUR_SOLSTICE_HIVER,
    hemisphere: 'nord',
    consigne: 'Fais tomber la neige sur le jardin !',
    bravo: 'Bravo ! C’est l’hiver : la neige est là et la nuit tombe tôt.'
  },
  {
    id: 'australie',
    emoji: '🦘',
    cible: 'ete',
    jourBravo: JOUR_SOLSTICE_HIVER,
    hemisphere: 'sud',
    consigne: 'Offre l’été aux enfants d’Australie !',
    bravo: 'Bravo ! L’Australie penche vers le Soleil… Et pendant ce temps, chez nous, c’est l’hiver !'
  }
];

/* Le cœur de chaque saison (nord) : le milieu de son quart d'année — c'est
 * là que le recalage doux emmène l'image parfaite du bravo. */
export function coeurDeSaison(saisonCible, hemisphere) {
  var nord = saisonCible;
  if (hemisphere === 'sud') {
    var opposees = { hiver: 'ete', ete: 'hiver', printemps: 'automne', automne: 'printemps' };
    nord = opposees[saisonCible];
  }
  var debut = {
    printemps: JOUR_EQUINOXE_PRINTEMPS,
    ete: JOUR_SOLSTICE_ETE,
    automne: JOUR_EQUINOXE_AUTOMNE,
    hiver: JOUR_SOLSTICE_HIVER
  }[nord];
  return jourNormalise(debut + ANNEE_JOURS / 8);
}

export function defiReussi(defi, jour) {
  return procheDeSaison(jour, defi.cible, defi.hemisphere, DEFI_ENTREE_MARGE_JOURS);
}

/* Le bravo se range seulement une marge AU-DELÀ des bords de la saison. */
export function defiEncoreProche(defi, jour) {
  if (defiReussi(defi, jour)) return true;
  for (var d = 1; d <= DEFI_SORTIE_MARGE_JOURS; d++) {
    if (defiReussi(defi, jour + d) || defiReussi(defi, jour - d)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Le texte oral : ce que la voix a le droit de dire                   */
/* ------------------------------------------------------------------ */

/* Les émojis, imprononçables (plage large + variantes et liaisons). */
export var EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

/* Prépare un texte du site pour la voix : émojis retirés, guillemets
 * français retirés (la synthèse trébuche dessus), tirets cadratins en
 * virgules, espaces recollées devant la ponctuation. */
export function texteOral(t) {
  return t.replace(EMOJI_RE, '')
    .replace(/[«»]/g, ' ')
    .replace(/\s+—\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,…])/g, '$1')
    .replace(/([!?…])\s*\./g, '$1') /* le point orphelin d'un émoji retiré */
    .trim();
}
