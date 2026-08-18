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
  hiver: { nom: 'l’hiver', emoji: '❄️' },
  printemps: { nom: 'le printemps', emoji: '🌸' },
  ete: { nom: 'l’été', emoji: '☀️' },
  automne: { nom: 'l’automne', emoji: '🍂' }
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
 * Été : tout là-haut (~66°) ; hiver : tout bas (~20°). */
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
/* La petite phrase du moment, affichée sous la fenêtre                */
/* ------------------------------------------------------------------ */

export function phraseDuMoment(jour) {
  var mois = moisDuJour(jour).nom;
  var s = saison(jour, 'nord');
  var heures = Math.round(dureeJourHeures(jour));
  var debut = 'En ' + mois + ', chez nous, c’est ' + SAISONS[s].nom + ' ! ' + SAISONS[s].emoji + ' ';
  if (s === 'hiver') {
    return debut + 'Le Soleil reste tout bas, et le jour est tout court : environ ' + heures + ' heures.';
  }
  if (s === 'printemps') {
    return debut + 'Le Soleil grimpe plus haut chaque jour, et le jour grandit : déjà ' + heures + ' heures.';
  }
  if (s === 'ete') {
    return debut + 'Le Soleil monte tout là-haut, et le jour est très long : environ ' + heures + ' heures.';
  }
  return debut + 'Le Soleil redescend, et le jour raccourcit : plus que ' + heures + ' heures.';
}
