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

/* La phrase de la vue de l'espace : où penche notre moitié, en ce moment. */
export function phraseEspace(jour) {
  var p = penchementNord(jour);
  if (p > 0.7) return '🏡 Chez nous penche à fond vers le Soleil : c’est le grand été !';
  if (p > 0.15) return '🏡 Chez nous penche vers le Soleil — et l’Australie, à l’opposé.';
  if (p < -0.7) return '🏡 Chez nous penche à fond loin du Soleil : c’est le grand hiver.';
  if (p < -0.15) return '🏡 Chez nous penche loin du Soleil — l’Australie, elle, penche vers lui.';
  return '🏡 Ni vers le Soleil, ni à l’opposé : les deux moitiés sont à égalité.';
}

/* ------------------------------------------------------------------ */
/* La lecture automatique                                              */
/* ------------------------------------------------------------------ */

/* Le phénomène avance tout seul : un tour de l'année en ~85 secondes. */
export var LECTURE_JOURS_PAR_SEC = ANNEE_JOURS / 85;

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
    sub: 'l’équinoxe de mars',
    intro: 'Au mois de mars, le printemps revient…',
    fenetre: 'L’arbre du jardin se couvre de fleurs ! Le jour et la nuit durent pareil : douze heures chacun. Et chaque jour qui passe, le Soleil grimpe un peu plus haut.',
    espace: 'La Terre ne penche ni vers le Soleil, ni à l’opposé : les deux moitiés sont à égalité. Mais elle avance… Et bientôt, ce sera notre tour de pencher vers lui !'
  },
  {
    id: 'ete',
    emoji: '☀️',
    jour: JOUR_SOLSTICE_ETE,
    teinte: 'or',
    label: 'Le grand été',
    sub: 'le solstice de juin',
    intro: 'Fin juin, c’est le grand été…',
    fenetre: 'Le Soleil monte tout là-haut dans le ciel, et le soir, il fait encore jour très tard : seize heures de lumière ! L’arbre est vert, on mange dehors.',
    espace: 'Regarde la Terre : notre moitié penche à fond vers le Soleil. C’est le jour le plus long de toute l’année — et en Australie, c’est le jour le plus court.'
  },
  {
    id: 'automne',
    emoji: '🍂',
    jour: JOUR_EQUINOXE_AUTOMNE,
    teinte: 'violet',
    label: 'L’automne arrive',
    sub: 'l’équinoxe de septembre',
    intro: 'Fin septembre, l’automne arrive…',
    fenetre: 'Les feuilles de l’arbre deviennent rousses et s’envolent. Le jour et la nuit durent encore pareil… Mais maintenant, le Soleil descend un peu plus chaque jour.',
    espace: 'La Terre est de nouveau à égalité : ni vers le Soleil, ni à l’opposé. Elle continue son voyage — et cette fois, c’est l’autre moitié qui va pencher vers lui.'
  },
  {
    id: 'hiver',
    emoji: '❄️',
    jour: JOUR_SOLSTICE_HIVER,
    teinte: 'bleu',
    label: 'Noël en Australie',
    sub: 'le solstice de décembre',
    intro: 'Fin décembre, c’est le grand hiver…',
    fenetre: 'Le Soleil reste tout bas, la nuit tombe avant le dîner : huit heures de jour, pas plus. L’arbre est tout nu, et parfois, il neige sur le jardin.',
    espace: 'Notre moitié penche à fond loin du Soleil… Mais regarde le kangourou : l’Australie penche vers lui ! Là-bas, les enfants fêtent Noël en plein été, sur la plage.'
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

export var DEFIS = [
  {
    id: 'fleurs',
    emoji: '🌸',
    cible: 'printemps',
    hemisphere: 'nord',
    consigne: 'Fais fleurir l’arbre du jardin !',
    bravo: 'Bravo ! Tu as fabriqué le printemps : l’arbre est tout fleuri !'
  },
  {
    id: 'grand-ete',
    emoji: '☀️',
    cible: 'ete',
    hemisphere: 'nord',
    consigne: 'Fabrique l’été chez nous !',
    bravo: 'Bravo ! C’est l’été : le Soleil monte tout là-haut et les jours n’en finissent plus !'
  },
  {
    id: 'neige',
    emoji: '❄️',
    cible: 'hiver',
    hemisphere: 'nord',
    consigne: 'Fais tomber la neige sur le jardin !',
    bravo: 'Bravo ! C’est l’hiver : la neige est là et la nuit tombe tôt.'
  },
  {
    id: 'australie',
    emoji: '🦘',
    cible: 'ete',
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
  return saison(jour, defi.hemisphere) === defi.cible;
}

/* Le bravo se range seulement une marge AU-DELÀ des bords de la saison. */
export function defiEncoreProche(defi, jour) {
  if (defiReussi(defi, jour)) return true;
  for (var d = 1; d <= DEFI_SORTIE_MARGE_JOURS; d++) {
    if (saison(jour + d, defi.hemisphere) === defi.cible) return true;
    if (saison(jour - d, defi.hemisphere) === defi.cible) return true;
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
