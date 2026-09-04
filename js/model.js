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
 * - neige    : le manteau blanc de l'hiver (sol, flocons, bonhomme), 0 à 1.
 * Les rampes s'appuient sur les repères de l'année : les feuilles poussent
 * au printemps, roussissent puis tombent à l'automne, la neige s'installe
 * autour du solstice d'hiver, les premières fleurs dès l'équinoxe de
 * printemps. */
export function jardinDuJour(jour) {
  var j = jourNormalise(jour);
  var t;

  /* Les feuilles : poussent d'avril à juin, tombent d'octobre à décembre. */
  var feuilles;
  t = rampe(j, 90, JOUR_SOLSTICE_ETE);          /* elles poussent */
  if (t !== null) feuilles = t;
  else {
    t = rampe(j, 275, JOUR_SOLSTICE_HIVER);     /* elles tombent */
    if (t !== null) feuilles = 1 - t;
    else feuilles = (j >= JOUR_SOLSTICE_ETE && j < 275) ? 1 : 0;
  }

  /* La rousseur : les feuilles vertes roussissent en septembre-octobre, et
   * la teinte s'efface en douceur à la fin de l'hiver (l'arbre est nu, mais
   * aucun paramètre ne saute jamais — le décor bouge à petits pas). */
  var rousseur;
  t = rampe(j, 245, 280);
  if (t !== null) rousseur = t;
  else {
    t = rampe(j, 20, 60);
    if (t !== null) rousseur = 1 - t;
    else rousseur = (j >= 280 || j < 20) ? 1 : 0;
  }

  /* Les fleurs : les premières s'ouvrent dès l'équinoxe de printemps (le
   * scénario en montre une ou deux), tout est fleuri en mai, et elles
   * s'effacent au début de l'été. */
  var fleurs;
  t = rampe(j, 70, 95);
  if (t !== null) fleurs = t;
  else {
    t = rampe(j, 140, JOUR_SOLSTICE_ETE);
    if (t !== null) fleurs = 1 - t;
    else fleurs = (j >= 95 && j < 140) ? 1 : 0;
  }

  /* La neige : elle s'installe en décembre, fond en février-mars. */
  var neige;
  t = rampe(j, 330, 360);
  if (t !== null) neige = t;
  else {
    t = rampe(j, 40, 75);
    if (t !== null) neige = 1 - t;
    else neige = (j >= 360 || j < 40) ? 1 : 0;
  }

  return { feuilles: feuilles, rousseur: rousseur, fleurs: fleurs, neige: neige };
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

export function phraseDuMoment(jour) {
  var j = jourNormalise(jour);
  var mois = moisDuJour(jour).nom;
  var s = saison(jour, 'nord');
  var p = penchementNord(jour);
  var heures = Math.round(dureeJourHeures(jour));
  /* Le jour s'allonge quand sin(angleAnnee) < 0 (durée = 12 + 4·cos). */
  var mouvement = Math.sin(angleAnnee(jour)) < 0
    ? 'Chaque jour, le Soleil grimpe un peu plus haut, et le jour s’allonge.'
    : 'Chaque jour, le Soleil descend un peu, et le jour raccourcit.';
  /* La bande de transition (les ~12 jours avant un repère) : la phrase
   * annonce la saison qui arrive — sans elle, juin racontait le printemps
   * puis l'été en deux phrases contradictoires (retour test). */
  var reperes = [
    { jour: JOUR_EQUINOXE_PRINTEMPS, saison: 'printemps' },
    { jour: JOUR_SOLSTICE_ETE, saison: 'ete' },
    { jour: JOUR_EQUINOXE_AUTOMNE, saison: 'automne' },
    { jour: JOUR_SOLSTICE_HIVER, saison: 'hiver' }
  ];
  for (var i = 0; i < reperes.length; i++) {
    var dans = jourNormalise(reperes[i].jour - j);
    if (dans > 0 && dans <= 12) {
      var suivante = SAISONS[reperes[i].saison];
      return 'En ' + mois + ', chez nous, ' + SAISONS[s].nom + ' se termine : ' +
        suivante.nom + ' arrive ! ' + suivante.emoji + ' ' + mouvement;
    }
  }
  var debut = 'En ' + mois + ', chez nous, c’est ' + SAISONS[s].nom + ' ! ' + SAISONS[s].emoji + ' ';
  /* Au cœur de l'été et de l'hiver, les superlatifs sont mérités — et le
   * chiffre dit son unité (retour test : « déjà 15 h » ne se comprenait
   * pas). Partout ailleurs, pas de compteur qui défile pendant la
   * lecture : la barre du jour montre déjà les heures. */
  if (p > 0.75) {
    return debut + 'Le Soleil monte très haut dans le ciel, et il fait jour très longtemps : ' + heures + ' heures de lumière !';
  }
  if (p < -0.75) {
    return debut + 'Le Soleil reste tout bas, et la nuit tombe très tôt : ' + heures + ' heures de lumière seulement.';
  }
  return debut + mouvement;
}

/* La phrase de la vue de l'espace : où penche notre moitié, en ce moment. */
export function phraseEspace(jour) {
  var p = penchementNord(jour);
  if (p > 0.7) return '🏡 Chez nous penche à fond vers le Soleil : les jours sont les plus longs de l’année !';
  if (p > 0.15) return '🏡 Chez nous penche vers le Soleil — et l’Australie, à l’opposé.';
  if (p < -0.7) return '🏡 Chez nous penche à fond à l’opposé du Soleil : les jours sont les plus courts de l’année.';
  if (p < -0.15) return '🏡 Chez nous penche à l’opposé du Soleil — l’Australie, elle, penche vers lui.';
  return '🏡 Personne ne penche vers le Soleil : chez nous et l’Australie sont à égalité.';
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
    fenetre: 'Sur l’arbre du jardin, les premières fleurs s’ouvrent ! Le jour dure maintenant aussi longtemps que la nuit. Et chaque jour qui passe, le Soleil grimpe un peu plus haut.',
    espace: 'Les deux moitiés de la Terre sont à égalité : ni chez nous, ni l’Australie ne penche vers le Soleil. Mais la Terre avance… Et bientôt, c’est notre moitié qui penchera vers lui !'
  },
  {
    id: 'ete',
    emoji: '☀️',
    jour: JOUR_SOLSTICE_ETE,
    teinte: 'or',
    label: 'L’été est là',
    sub: 'le solstice d’été',
    intro: 'Fin juin, l’été commence…',
    fenetre: 'Le Soleil monte très haut dans le ciel et, le soir, il fait encore jour très tard. Il fait chaud : on joue dehors jusqu’au soir !',
    espace: 'Regarde la Terre : notre moitié penche à fond vers le Soleil. C’est le jour le plus long de toute l’année — et en Australie, c’est le jour le plus court.'
  },
  {
    id: 'automne',
    emoji: '🍂',
    jour: JOUR_EQUINOXE_AUTOMNE,
    teinte: 'violet',
    label: 'L’automne arrive',
    sub: 'l’équinoxe d’automne',
    intro: 'Fin septembre, l’automne arrive…',
    fenetre: 'Les feuilles de l’arbre deviennent rousses. Le jour dure aussi longtemps que la nuit… Mais maintenant, le Soleil descend un peu plus chaque jour.',
    espace: 'Les deux moitiés de la Terre sont de nouveau à égalité : ni chez nous, ni l’Australie ne penche vers le Soleil. La Terre continue son voyage… Et cette fois, c’est l’Australie qui va pencher vers le Soleil !'
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
    espace: 'Notre moitié penche à fond à l’opposé du Soleil… Mais regarde le kangourou : c’est l’Australie qui penche vers le Soleil ! Là-bas, les enfants fêtent Noël en plein été, sur la plage.'
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
    bravo: 'Bravo ! Le printemps revient : l’arbre ouvre ses premières fleurs !'
  },
  {
    id: 'ete',
    emoji: '☀️',
    cible: 'ete',
    jourBravo: JOUR_SOLSTICE_ETE,
    hemisphere: 'nord',
    consigne: 'Fabrique l’été chez nous !',
    bravo: 'Bravo ! C’est l’été : le Soleil monte très haut et les jours n’en finissent plus !'
  },
  {
    id: 'feuilles',
    emoji: '🍂',
    cible: 'automne',
    jourBravo: JOUR_EQUINOXE_AUTOMNE,
    hemisphere: 'nord',
    consigne: 'Fais venir l’automne dans le jardin !',
    bravo: 'Bravo ! L’automne arrive : les feuilles commencent à roussir, et le jour raccourcit.'
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
