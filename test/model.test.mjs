/*
 * Tests du modèle pur — `node test/model.test.mjs`.
 * Les « vérités à préserver » de l'épisode sont le contrat : ces tests ne se
 * suppriment pas, ils se complètent.
 */
import { strict as assert } from 'node:assert';
import {
  TAU, ANNEE_JOURS, JOUR_SOLSTICE_ETE, JOUR_SOLSTICE_HIVER,
  JOUR_EQUINOXE_PRINTEMPS, JOUR_EQUINOXE_AUTOMNE,
  INCLINAISON_DEGRES, INCLINAISON_DESSIN_DEGRES, AXE_DIR, DISTANCE_SOLEIL,
  HAUTEUR_MIDI_EQUINOXE, AMPLITUDE_JOUR_HEURES, EPS,
  jourNormalise, angleAnnee, positionTerre, axeDirection, distanceSoleil,
  penchementNord, penchementVersSoleil,
  ORDRE_SAISONS, SAISONS, saison,
  MOIS, JOURS_PAR_MOIS, moisDuJour,
  hauteurSoleilMidi, dureeJourHeures, heureLever, heureCoucher,
  ARBRES, arbreDuJour, jardinDuJour,
  LATITUDE_REPERES_DEGRES, positionLocaleMaison, positionLocaleKangourou, extremitesAnneau,
  phraseDuMoment, phraseEspace,
  LECTURE_JOURS_PAR_SEC, SCENARIOS, VOIX_TRANSITIONS,
  DEFIS, DEFI_ATTENTE_MS, DEFI_SORTIE_MARGE_JOURS,
  defiReussi, defiEncoreProche, coeurDeSaison,
  forceFaisceau, aplombLumiere, directionNuit,
  EMOJI_RE, texteOral
} from '../js/model.js';

var tests = [];
function test(nom, fn) { tests.push({ nom: nom, fn: fn }); }
function presque(a, b, tol) { assert.ok(Math.abs(a - b) <= (tol || 1e-9), a + ' ≉ ' + b); }

/* ------------------------------------------------------------------ */
/* Vérité n° 1 — l'axe garde toujours la même direction                */
/* ------------------------------------------------------------------ */

test('l’axe de la Terre pointe toujours vers la même direction, toute l’année', function () {
  var reference = axeDirection(0);
  for (var j = 0; j <= ANNEE_JOURS; j += 0.5) {
    var d = axeDirection(j);
    assert.equal(d.x, reference.x);
    assert.equal(d.y, reference.y);
  }
});

test('l’axe est bien penché (ni couché, ni tout droit), du côté annoncé', function () {
  assert.ok(AXE_DIR.x > 0.1, 'le haut de l’axe penche vers +x');
  assert.ok(AXE_DIR.y > 0.5, 'le haut de l’axe reste vers le haut');
  presque(AXE_DIR.x * AXE_DIR.x + AXE_DIR.y * AXE_DIR.y, 1);
  var angle = (Math.atan2(AXE_DIR.x, AXE_DIR.y) * 180) / Math.PI;
  presque(angle, INCLINAISON_DESSIN_DEGRES, 1e-6);
});

test('le penchant du dessin est exagéré mais assumé : plus penché que les 23,5° réels', function () {
  assert.equal(INCLINAISON_DEGRES, 23.5);
  assert.ok(INCLINAISON_DESSIN_DEGRES >= INCLINAISON_DEGRES);
});

/* ------------------------------------------------------------------ */
/* Vérité n° 2 — le penchant vers le Soleil fabrique les saisons       */
/* ------------------------------------------------------------------ */

test('au solstice d’été, chez nous penche à fond vers le Soleil ; au solstice d’hiver, à l’opposé', function () {
  presque(penchementNord(JOUR_SOLSTICE_ETE), 1);
  presque(penchementNord(JOUR_SOLSTICE_HIVER), -1, 1e-6);
});

test('aux équinoxes, la Terre ne penche ni vers le Soleil ni à l’opposé', function () {
  presque(penchementNord(JOUR_EQUINOXE_PRINTEMPS), 0, EPS);
  presque(penchementNord(JOUR_EQUINOXE_AUTOMNE), 0, EPS);
});

test('la géométrie est cohérente : chez nous penche vers le Soleil quand la Terre est du côté où penche son axe', function () {
  for (var j = 0; j < ANNEE_JOURS; j += 1) {
    presque(penchementNord(j), -positionTerre(j).x, 1e-9);
  }
});

test('au solstice d’été la Terre est à gauche du Soleil, au solstice d’hiver à droite', function () {
  var ete = positionTerre(JOUR_SOLSTICE_ETE);
  presque(ete.x, -1);
  presque(ete.y, 0);
  var hiver = positionTerre(JOUR_SOLSTICE_HIVER);
  presque(hiver.x, 1, 1e-6);
  presque(hiver.y, 0, 1e-6);
});

/* ------------------------------------------------------------------ */
/* Vérité n° 3 — été en France = hiver en Australie                    */
/* ------------------------------------------------------------------ */

test('été chez nous = hiver en Australie : les deux moitiés ont toujours des saisons opposées', function () {
  var opposees = { hiver: 'ete', ete: 'hiver', printemps: 'automne', automne: 'printemps' };
  for (var j = 0; j < ANNEE_JOURS; j += 0.5) {
    assert.equal(saison(j, 'sud'), opposees[saison(j, 'nord')], 'au jour ' + j);
  }
});

test('le penchant du sud est toujours l’exact opposé de celui du nord', function () {
  for (var j = 0; j < ANNEE_JOURS; j += 1) {
    presque(penchementVersSoleil(j, 'sud'), -penchementVersSoleil(j, 'nord'));
  }
});

test('à Noël (25 décembre), c’est l’hiver chez nous et l’été en Australie', function () {
  var noel = 358; /* 25 décembre, en comptant depuis le 1er janvier (jour 0) */
  assert.equal(moisDuJour(noel).nom, 'décembre');
  assert.equal(saison(noel, 'nord'), 'hiver');
  assert.equal(saison(noel, 'sud'), 'ete');
});

/* ------------------------------------------------------------------ */
/* Vérité n° 4 — ce n'est PAS la distance qui fait les saisons         */
/* ------------------------------------------------------------------ */

test('la Terre est aussi loin du Soleil en été qu’en hiver : la distance n’explique rien', function () {
  presque(distanceSoleil(JOUR_SOLSTICE_ETE), distanceSoleil(JOUR_SOLSTICE_HIVER));
  for (var j = 0; j < ANNEE_JOURS; j += 1) {
    assert.equal(distanceSoleil(j), DISTANCE_SOLEIL);
  }
});

/* ------------------------------------------------------------------ */
/* Vérité n° 5 — en été, Soleil plus haut et jours plus longs          */
/* ------------------------------------------------------------------ */

test('au solstice d’été le Soleil culmine le plus haut de l’année ; au solstice d’hiver, le plus bas', function () {
  var hMax = hauteurSoleilMidi(JOUR_SOLSTICE_ETE);
  var hMin = hauteurSoleilMidi(JOUR_SOLSTICE_HIVER);
  for (var j = 0; j < ANNEE_JOURS; j += 0.5) {
    assert.ok(hauteurSoleilMidi(j) <= hMax + EPS, 'plus haut que le solstice d’été au jour ' + j);
    assert.ok(hauteurSoleilMidi(j) >= hMin - 1e-6, 'plus bas que le solstice d’hiver au jour ' + j);
  }
  presque(hMax, HAUTEUR_MIDI_EQUINOXE + INCLINAISON_DEGRES);
  presque(hMin, HAUTEUR_MIDI_EQUINOXE - INCLINAISON_DEGRES, 1e-6);
});

test('le jour dure 16 h au cœur de l’été, 8 h au cœur de l’hiver', function () {
  presque(dureeJourHeures(JOUR_SOLSTICE_ETE), 12 + AMPLITUDE_JOUR_HEURES);
  presque(dureeJourHeures(JOUR_SOLSTICE_HIVER), 12 - AMPLITUDE_JOUR_HEURES, 1e-6);
});

test('aux équinoxes, le jour et la nuit durent pareil : 12 heures', function () {
  presque(dureeJourHeures(JOUR_EQUINOXE_PRINTEMPS), 12, 1e-6);
  presque(dureeJourHeures(JOUR_EQUINOXE_AUTOMNE), 12, 1e-6);
});

test('lever et coucher restent symétriques autour de midi, toute l’année', function () {
  for (var j = 0; j < ANNEE_JOURS; j += 5) {
    presque(heureLever(j) + heureCoucher(j), 24);
    assert.ok(heureLever(j) < heureCoucher(j));
  }
});

/* ------------------------------------------------------------------ */
/* L'année reboucle, les saisons se suivent dans l'ordre               */
/* ------------------------------------------------------------------ */

test('l’année reboucle : le jour 365 recommence comme le jour 0', function () {
  presque(jourNormalise(ANNEE_JOURS), 0);
  presque(penchementNord(ANNEE_JOURS), penchementNord(0));
  assert.equal(saison(ANNEE_JOURS, 'nord'), saison(0, 'nord'));
  presque(jourNormalise(-10), ANNEE_JOURS - 10);
});

test('les saisons se suivent toujours dans le même ordre, sans jamais s’inverser', function () {
  var precedente = saison(0, 'nord');
  assert.equal(precedente, 'hiver');
  for (var j = 0; j <= ANNEE_JOURS + 2; j += 0.25) {
    var s = saison(j, 'nord');
    if (s !== precedente) {
      var attendue = ORDRE_SAISONS[(ORDRE_SAISONS.indexOf(precedente) + 1) % ORDRE_SAISONS.length];
      assert.equal(s, attendue, 'au jour ' + j.toFixed(2) + ' : ' + precedente + ' → ' + s);
      precedente = s;
    }
  }
});

test('chaque saison a son nom, son emoji et son arbre', function () {
  ORDRE_SAISONS.forEach(function (s) {
    assert.ok(SAISONS[s] && SAISONS[s].nom && SAISONS[s].emoji, 'saison incomplète : ' + s);
    assert.ok(ARBRES[s], 'arbre manquant : ' + s);
  });
  assert.equal(arbreDuJour(JOUR_SOLSTICE_ETE), 'feuilles');
  assert.equal(arbreDuJour(0), 'nu');
  assert.equal(arbreDuJour(120), 'fleurs');     /* début mai : printemps */
  assert.equal(arbreDuJour(290), 'roux');       /* mi-octobre : automne */
});

/* ------------------------------------------------------------------ */
/* Les mois                                                            */
/* ------------------------------------------------------------------ */

test('les douze mois font ensemble 365 jours, et chaque jour retrouve son mois', function () {
  var total = 0;
  for (var i = 0; i < JOURS_PAR_MOIS.length; i++) total += JOURS_PAR_MOIS[i];
  assert.equal(total, ANNEE_JOURS);
  assert.equal(MOIS.length, 12);
  assert.equal(moisDuJour(0).nom, 'janvier');
  assert.equal(moisDuJour(31).nom, 'février');
  assert.equal(moisDuJour(JOUR_SOLSTICE_ETE).nom, 'juin');
  assert.equal(moisDuJour(354).nom, 'décembre');
  assert.equal(moisDuJour(364).nom, 'décembre');
});

/* ------------------------------------------------------------------ */
/* La phrase du moment                                                 */
/* ------------------------------------------------------------------ */

test('la phrase du moment raconte le bon mois, la bonne saison et les bonnes heures', function () {
  var hiver = phraseDuMoment(JOUR_SOLSTICE_HIVER);
  assert.ok(hiver.indexOf('décembre') !== -1, 'décembre attendu : ' + hiver);
  assert.ok(hiver.indexOf('l’hiver') !== -1);
  assert.ok(hiver.indexOf('8 heures') !== -1);
  var ete = phraseDuMoment(JOUR_SOLSTICE_ETE);
  assert.ok(ete.indexOf('juin') !== -1);
  assert.ok(ete.indexOf('l’été') !== -1);
  assert.ok(ete.indexOf('16 heures') !== -1);
  assert.ok(phraseDuMoment(100).indexOf('le printemps') !== -1);
  assert.ok(phraseDuMoment(290).indexOf('l’automne') !== -1);
});

test('aux bords de saison, la phrase dit le mouvement vrai, pas le cliché du solstice', function () {
  var debutMars = phraseDuMoment(59); /* encore l'hiver, mais 11 h et ça grimpe */
  assert.ok(debutMars.indexOf('l’hiver') !== -1, debutMars);
  assert.ok(debutMars.indexOf('tout court') === -1, 'pas de « tout court » début mars : ' + debutMars);
  assert.ok(debutMars.indexOf('s’allonge') !== -1, debutMars);
  var debutSeptembre = phraseDuMoment(243); /* encore l'été, mais 13 h et ça descend */
  assert.ok(debutSeptembre.indexOf('l’été') !== -1, debutSeptembre);
  assert.ok(debutSeptembre.indexOf('très long') === -1, 'pas de « très long » début septembre : ' + debutSeptembre);
  assert.ok(debutSeptembre.indexOf('raccourcit') !== -1, debutSeptembre);
  for (var j = 0; j < ANNEE_JOURS; j += 3) {
    assert.ok(phraseDuMoment(j).indexOf('environ') === -1, '« environ » banni au jour ' + j);
  }
});

test('hors mois de transition, la phrase ne change jamais en cours de mois', function () {
  /* mai (jours 120-150) et novembre (304-333) basculaient en plein mois */
  [[120, 150], [304, 333], [212, 242], [31, 58]].forEach(function (mois) {
    var reference = phraseDuMoment(mois[0]);
    for (var j = mois[0]; j <= mois[1]; j++) {
      assert.equal(phraseDuMoment(j), reference, 'la phrase change au jour ' + j);
    }
  });
});

test('juste avant un repère, la phrase annonce la saison qui arrive (bande de transition)', function () {
  var finJuin = phraseDuMoment(165); /* 6 jours avant le solstice d'été */
  assert.ok(finJuin.indexOf('le printemps se termine') !== -1, finJuin);
  assert.ok(finJuin.indexOf('l’été arrive') !== -1, finJuin);
  var finDecembre = phraseDuMoment(348); /* ~5 jours avant le solstice d'hiver */
  assert.ok(finDecembre.indexOf('l’hiver arrive') !== -1, finDecembre);
});

test('la phrase du moment finit par une ponctuation et garde l’apostrophe typographique', function () {
  for (var j = 0; j < ANNEE_JOURS; j += 7) {
    var p = phraseDuMoment(j);
    assert.ok(/[.!?…]$/.test(p), 'ponctuation finale au jour ' + j + ' : ' + p);
    assert.ok(p.indexOf("'") === -1, 'apostrophe droite interdite au jour ' + j);
  }
});

/* ------------------------------------------------------------------ */
/* La maison sur son anneau : rien ne se rapproche du Soleil           */
/* ------------------------------------------------------------------ */

test('la maison vit sur son anneau, pile sur l’axe — jamais sur la face qui regarde le Soleil', function () {
  var m = positionLocaleMaison();
  /* colinéaire à l'axe (composante perpendiculaire nulle), côté nord */
  presque(m.x * AXE_DIR.y - m.y * AXE_DIR.x, 0);
  assert.ok(m.x * AXE_DIR.x + m.y * AXE_DIR.y > 0, 'la maison est du côté nord de l’axe');
  presque(Math.hypot(m.x, m.y), Math.sin((LATITUDE_REPERES_DEGRES * Math.PI) / 180));
});

test('le kangourou vit aux antipodes exacts de la maison', function () {
  var m = positionLocaleMaison();
  var k = positionLocaleKangourou();
  presque(k.x, -m.x);
  presque(k.y, -m.y);
});

test('l’anneau touche le globe à ses deux bouts, symétriques autour de l’axe — même distance au Soleil été comme hiver', function () {
  ['nord', 'sud'].forEach(function (hemisphere) {
    var bouts = extremitesAnneau(hemisphere);
    presque(Math.hypot(bouts[0].x, bouts[0].y), 1, 1e-9);
    presque(Math.hypot(bouts[1].x, bouts[1].y), 1, 1e-9);
    /* le milieu des deux bouts est sur l'axe : l'anneau est symétrique */
    var milieu = { x: (bouts[0].x + bouts[1].x) / 2, y: (bouts[0].y + bouts[1].y) / 2 };
    presque(milieu.x * AXE_DIR.y - milieu.y * AXE_DIR.x, 0);
  });
  /* et l'anneau ne dépend pas du jour : posé sur le globe une fois pour toutes */
  var a = extremitesAnneau('nord');
  var b = extremitesAnneau('nord');
  presque(a[0].x, b[0].x);
});

/* ------------------------------------------------------------------ */
/* Le jardin continu de la fenêtre                                     */
/* ------------------------------------------------------------------ */

test('le jardin change à petits pas : aucun paramètre ne saute d’un jour à l’autre', function () {
  var precedent = jardinDuJour(0);
  for (var j = 1; j <= ANNEE_JOURS; j += 1) {
    var courant = jardinDuJour(j);
    ['feuilles', 'rousseur', 'fleurs', 'neige'].forEach(function (cle) {
      assert.ok(Math.abs(courant[cle] - precedent[cle]) <= 0.06,
        cle + ' saute au jour ' + j + ' (' + precedent[cle].toFixed(2) + ' → ' + courant[cle].toFixed(2) + ')');
      assert.ok(courant[cle] >= 0 && courant[cle] <= 1, cle + ' hors bornes au jour ' + j);
    });
    precedent = courant;
  }
});

test('le jardin raconte la bonne saison, en continu', function () {
  var ete = jardinDuJour(200);
  assert.equal(ete.feuilles, 1, 'plein été : la couronne est pleine');
  assert.equal(ete.fleurs, 0, 'plein été : les fleurs du printemps sont passées');
  assert.equal(ete.neige, 0, 'plein été : pas de neige');
  var hiver = jardinDuJour(20);
  assert.equal(hiver.neige, 1, 'cœur de l’hiver : la neige est là');
  assert.equal(hiver.feuilles, 0, 'cœur de l’hiver : l’arbre est nu');
  var printemps = jardinDuJour(125);
  assert.equal(printemps.fleurs, 1, 'cœur du printemps : tout est fleuri');
  var equinoxe = jardinDuJour(80);
  assert.equal(equinoxe.fleurs, 1, 'équinoxe de printemps : l’arbre est tout fleuri (archétype au bouton)');
  assert.equal(jardinDuJour(200).fruits, 1, 'plein été : les fruits sont là');
  assert.ok(jardinDuJour(JOUR_SOLSTICE_ETE).fruits > 0.3, 'les premiers fruits dès l’entrée de l’été');
  assert.equal(jardinDuJour(80).fruits, 0, 'pas de fruits au printemps');
  assert.equal(jardinDuJour(290).fruits, 0, 'plus de fruits à l’automne');
  var entreeAutomne = jardinDuJour(263);
  assert.equal(entreeAutomne.rousseur, 1, 'équinoxe d’automne : l’arbre est tout roux');
  assert.ok(entreeAutomne.feuilles < 1 && entreeAutomne.feuilles > 0.7,
    'les feuilles commencent à tomber dès l’entrée de l’automne');
  assert.ok(printemps.feuilles > 0.2 && printemps.feuilles < 0.8, 'les feuilles poussent encore');
  var automne = jardinDuJour(290);
  assert.ok(automne.rousseur > 0.5, 'l’automne roussit les feuilles');
  assert.ok(automne.feuilles < 0.9 && automne.feuilles > 0.1, 'les feuilles tombent');
  assert.ok(automne.rousseur * (1 - automne.feuilles) > 0.05, 'le tas de feuilles grossit');
});

/* ------------------------------------------------------------------ */
/* Le faisceau de lumière de la vue de l'espace                        */
/* ------------------------------------------------------------------ */

test('le faisceau est plein aux solstices, en creux doux mais JAMAIS éteint aux équinoxes', function () {
  presque(forceFaisceau(JOUR_SOLSTICE_ETE), 1);
  presque(forceFaisceau(JOUR_SOLSTICE_HIVER), 1, 1e-6);
  presque(forceFaisceau(JOUR_EQUINOXE_PRINTEMPS), 0.55, 1e-6);
  presque(forceFaisceau(JOUR_EQUINOXE_AUTOMNE), 0.55, 1e-6);
  for (var j = 0; j < ANNEE_JOURS; j += 1) {
    assert.ok(forceFaisceau(j) >= 0.55, 'la lumière ne s’éteint jamais (jour ' + j + ')');
  }
});

test('la nuit est à l’opposé du Soleil aux solstices, et passe par les deux pôles aux équinoxes', function () {
  [JOUR_SOLSTICE_ETE, JOUR_SOLSTICE_HIVER].forEach(function (j) {
    var n = directionNuit(j);
    var pos = positionTerre(j);
    presque(n.x, pos.x, 1e-6);
    presque(n.y, pos.y, 1e-6);
  });
  [JOUR_EQUINOXE_PRINTEMPS, JOUR_EQUINOXE_AUTOMNE].forEach(function (j) {
    var n = directionNuit(j);
    presque(n.x * AXE_DIR.x + n.y * AXE_DIR.y, 0, 1e-6); /* terminateur ∥ axe */
  });
  var precedente = directionNuit(0);
  for (var j = 1; j <= ANNEE_JOURS; j += 1) {
    var d = directionNuit(j);
    presque(Math.hypot(d.x, d.y), 1, 1e-9);
    var ecart = Math.hypot(d.x - precedente.x, d.y - precedente.y);
    assert.ok(ecart <= 0.06, 'la nuit saute au jour ' + j + ' (' + ecart.toFixed(3) + ')');
    /* JAMAIS de marche arrière : l'ombre tourne toujours dans le sens de
     * l'année (produit vectoriel jamais négatif) */
    var croix = precedente.x * d.y - precedente.y * d.x;
    assert.ok(croix >= -1e-9, 'l’ombre recule au jour ' + j);
    /* et la nuit reste du côté opposé au Soleil, toute l'année */
    var pos = positionTerre(j);
    assert.ok(d.x * pos.x + d.y * pos.y > 0.3, 'la nuit quitte le côté opposé au Soleil au jour ' + j);
    precedente = d;
  }
});

test('aux équinoxes, les deux moitiés reçoivent EXACTEMENT la même lumière (taches jumelles)', function () {
  [JOUR_EQUINOXE_PRINTEMPS, JOUR_EQUINOXE_AUTOMNE].forEach(function (j) {
    var nord = aplombLumiere(j);
    var sud = aplombLumiere(j + ANNEE_JOURS / 2);
    presque(nord, 0.5, 1e-6);
    presque(nord, sud, 1e-6);
  });
});

test('la tache est ramassée au solstice d’été, étalée au solstice d’hiver, moyenne aux équinoxes', function () {
  presque(aplombLumiere(JOUR_SOLSTICE_ETE), 0.95);
  presque(aplombLumiere(JOUR_SOLSTICE_HIVER), 0.12, 1e-6); /* plancher : jamais nulle */
  presque(aplombLumiere(JOUR_EQUINOXE_PRINTEMPS), 0.5, 1e-6);
  assert.ok(aplombLumiere(JOUR_SOLSTICE_ETE) > aplombLumiere(JOUR_EQUINOXE_AUTOMNE));
  assert.ok(aplombLumiere(JOUR_EQUINOXE_AUTOMNE) > aplombLumiere(JOUR_SOLSTICE_HIVER));
});

test('la lumière ne saute jamais d’un jour à l’autre (force et aplomb continus)', function () {
  var forcePrecedente = forceFaisceau(0);
  var aplombPrecedent = aplombLumiere(0);
  for (var j = 1; j <= ANNEE_JOURS; j += 1) {
    var force = forceFaisceau(j);
    var aplomb = aplombLumiere(j);
    assert.ok(Math.abs(force - forcePrecedente) <= 0.08, 'la force saute au jour ' + j);
    assert.ok(Math.abs(aplomb - aplombPrecedent) <= 0.02, 'l’aplomb saute au jour ' + j);
    assert.ok(force >= 0.55 && force <= 1 && aplomb >= 0.12 && aplomb <= 0.95, 'hors bornes au jour ' + j);
    forcePrecedente = force;
    aplombPrecedent = aplomb;
  }
});

/* ------------------------------------------------------------------ */
/* La lecture automatique                                              */
/* ------------------------------------------------------------------ */

test('la lecture automatique fait le tour de l’année en 100 à 120 secondes', function () {
  /* ~85 s à l'origine — ralentie après les tests utilisateurs : à cette
   * vitesse, personne n'avait le temps de lire les phrases. */
  var secondes = ANNEE_JOURS / LECTURE_JOURS_PAR_SEC;
  assert.ok(secondes >= 100 && secondes <= 120, secondes + ' s');
});

/* ------------------------------------------------------------------ */
/* Les scénarios                                                       */
/* ------------------------------------------------------------------ */

test('les quatre scénarios tombent pile sur leurs solstices et équinoxes, dans l’ordre de l’année', function () {
  assert.equal(SCENARIOS.length, 4);
  var attendus = {
    printemps: JOUR_EQUINOXE_PRINTEMPS, ete: JOUR_SOLSTICE_ETE,
    automne: JOUR_EQUINOXE_AUTOMNE, hiver: JOUR_SOLSTICE_HIVER
  };
  var precedent = -1;
  SCENARIOS.forEach(function (s) {
    presque(s.jour, attendus[s.id]);
    assert.ok(s.jour > precedent, 'les scénarios suivent l’ordre de l’année');
    precedent = s.jour;
  });
});

test('chaque scénario raconte la bonne saison, aux deux regards', function () {
  var scnParId = {};
  SCENARIOS.forEach(function (s) { scnParId[s.id] = s; });
  assert.equal(saison(scnParId.ete.jour, 'nord'), 'ete');
  assert.equal(saison(scnParId.hiver.jour, 'nord'), 'hiver');
  assert.ok(scnParId.ete.fenetre.indexOf('Il fait chaud') !== -1, 'l’été dit la chaleur (les heures vivent dans la barre du jour)');
  assert.ok(scnParId.hiver.fenetre.indexOf('la nuit tombe avant le dîner') !== -1, 'l’hiver dit sa nuit précoce');
  assert.ok(scnParId.hiver.espace.indexOf('Australie') !== -1, 'Noël en Australie vit dans le scénario d’hiver');
  /* Le maillon causal de l'histoire (l'expérience de la lampe) se répète
   * aux boutons été/hiver, avec les MÊMES mots — « bien en face » /
   * « de biais » —, jamais de jargon (« rayons directs », « rasants »). */
  assert.ok(scnParId.ete.espace.indexOf('bien en face') !== -1, 'l’été de l’espace dit la lumière bien en face');
  assert.ok(scnParId.hiver.espace.indexOf('de biais') !== -1, 'l’hiver de l’espace dit la lumière de biais');
  assert.ok(scnParId.hiver.espace.indexOf('bien en face') !== -1, 'la révélation australienne se raccorde à la cause');
  var teintes = {};
  SCENARIOS.forEach(function (s) {
    assert.ok(s.label && s.sub && s.intro && s.fenetre && s.espace, 'scénario complet : ' + s.id);
    assert.ok(!teintes[s.teinte], 'teinte en double : ' + s.teinte);
    teintes[s.teinte] = true;
  });
});

/* ------------------------------------------------------------------ */
/* Le jeu « Fabrique la saison ! »                                     */
/* ------------------------------------------------------------------ */

function defiParId(id) {
  for (var i = 0; i < DEFIS.length; i++) { if (DEFIS[i].id === id) return DEFIS[i]; }
  throw new Error('défi introuvable : ' + id);
}

test('chaque défi est atteignable, et gagné pile dans sa saison', function () {
  DEFIS.forEach(function (d) {
    var atteignable = false;
    for (var j = 0; j < ANNEE_JOURS; j += 1) {
      if (defiReussi(d, j)) { atteignable = true; break; }
    }
    assert.ok(atteignable, 'défi inatteignable : ' + d.id);
    assert.ok(d.consigne && d.bravo && d.emoji, 'défi complet : ' + d.id);
  });
  assert.ok(defiReussi(defiParId('ete'), JOUR_SOLSTICE_ETE), 'l’été au solstice d’été');
  assert.ok(!defiReussi(defiParId('ete'), JOUR_SOLSTICE_HIVER), 'pas d’été au solstice d’hiver');
});

test('les quatre saisons de chez nous ont chacune leur défi — l’automne compris', function () {
  var couvertes = {};
  DEFIS.forEach(function (d) {
    if (d.hemisphere === 'nord') couvertes[d.cible] = true;
  });
  ORDRE_SAISONS.forEach(function (s) {
    assert.ok(couvertes[s], 'saison sans défi : ' + s);
  });
  assert.ok(defiReussi(defiParId('feuilles'), 290), 'les feuilles tombent à la mi-octobre');
});

test('le défi de la révélation : l’été australien se gagne en plein hiver chez nous', function () {
  var australie = defiParId('australie');
  assert.equal(australie.hemisphere, 'sud');
  assert.ok(defiReussi(australie, JOUR_SOLSTICE_HIVER + 5));
  assert.equal(saison(JOUR_SOLSTICE_HIVER + 5, 'nord'), 'hiver');
});

test('l’hystérésis : le bravo se range une marge au-delà des bords de la saison, pas au bord', function () {
  var ete = defiParId('ete');
  var sortie = JOUR_EQUINOXE_AUTOMNE; /* premier jour hors de l’été */
  assert.ok(!defiReussi(ete, sortie + 0.5));
  assert.ok(defiEncoreProche(ete, sortie + 0.5), 'à un demi-jour du bord, le bravo reste');
  assert.ok(!defiEncoreProche(ete, sortie + DEFI_SORTIE_MARGE_JOURS + 1.5), 'loin du bord, il se range');
  assert.ok(DEFI_ATTENTE_MS > 0, 'le tempo anti « gagné en passant » existe');
});

test('le cœur de chaque saison tombe bien au milieu de sa saison', function () {
  ORDRE_SAISONS.forEach(function (s) {
    assert.equal(saison(coeurDeSaison(s, 'nord'), 'nord'), s, 'cœur de ' + s);
  });
  assert.equal(saison(coeurDeSaison('ete', 'sud'), 'sud'), 'ete', 'le cœur de l’été australien');
  presque(coeurDeSaison('ete', 'nord'), JOUR_SOLSTICE_ETE + ANNEE_JOURS / 8);
});

test('le bravo emmène chaque défi à son jour d’ancrage — et il y gagne encore', function () {
  DEFIS.forEach(function (d) {
    assert.ok(typeof d.jourBravo === 'number', 'jourBravo manquant : ' + d.id);
    assert.ok(defiReussi(d, d.jourBravo), 'le défi ' + d.id + ' doit rester gagné à son ancrage');
  });
  var parId = {};
  DEFIS.forEach(function (d) { parId[d.id] = d; });
  presque(parId.ete.jourBravo, JOUR_SOLSTICE_ETE);
  presque(parId.neige.jourBravo, JOUR_SOLSTICE_HIVER);
  presque(parId.australie.jourBravo, JOUR_SOLSTICE_HIVER);
  presque(parId.fleurs.jourBravo, JOUR_EQUINOXE_PRINTEMPS);
  presque(parId.feuilles.jourBravo, JOUR_EQUINOXE_AUTOMNE);
  /* le jardin tient les promesses des bravos : archétypes dès l'entrée */
  assert.equal(jardinDuJour(parId.fleurs.jourBravo).fleurs, 1, 'l’arbre est tout fleuri au bravo du printemps');
  assert.equal(jardinDuJour(parId.feuilles.jourBravo).rousseur, 1, 'l’arbre est tout roux au bravo de l’automne');
  assert.ok(jardinDuJour(parId.neige.jourBravo).neige === 1, 'la neige est installée au bravo de l’hiver');
});

/* ------------------------------------------------------------------ */
/* Le texte oral                                                       */
/* ------------------------------------------------------------------ */

test('texteOral : émojis retirés, ponctuation recollée, guillemets et cadratins apprivoisés', function () {
  assert.equal(texteOral('Le Soleil brille ☀️ .'), 'Le Soleil brille.');
  assert.equal(texteOral('chez nous — et là-bas — pareil'), 'chez nous, et là-bas, pareil');
  assert.equal(texteOral('On dit « penchant »… en vrai'), 'On dit penchant… en vrai');
  assert.equal(texteOral('C’est l’hiver ! ❄️ Le jour est court.'), 'C’est l’hiver ! Le jour est court.');
});

test('tous les textes du conteur sont propres pour l’oral', function () {
  var emojiUne = new RegExp(EMOJI_RE.source, 'u');
  var textes = [VOIX_TRANSITIONS.espace];
  SCENARIOS.forEach(function (s) { textes.push(s.intro, s.fenetre, s.espace); });
  DEFIS.forEach(function (d) { textes.push(d.consigne, d.bravo); });
  textes.forEach(function (t) {
    var oral = texteOral(t);
    assert.ok(!emojiUne.test(oral), 'émoji dans : ' + oral);
    assert.ok(/[.!?…]$/.test(oral), 'ponctuation finale : ' + oral);
    assert.ok(oral.indexOf("'") === -1, 'apostrophe droite dans : ' + oral);
    assert.ok(!/[«»—]/.test(oral), 'guillemet ou cadratin dans : ' + oral);
  });
});

test('la phrase de l’espace suit le penchant, et nomme toujours qui penche', function () {
  assert.ok(phraseEspace(JOUR_SOLSTICE_ETE).indexOf('à fond vers le Soleil') !== -1);
  assert.ok(phraseEspace(JOUR_SOLSTICE_HIVER).indexOf('à l’opposé du Soleil') !== -1);
  assert.ok(phraseEspace(JOUR_SOLSTICE_HIVER).indexOf('les plus courts') !== -1);
  assert.ok(phraseEspace(JOUR_EQUINOXE_PRINTEMPS).indexOf('égalité') !== -1);
  for (var j = 0; j < ANNEE_JOURS; j += 3) {
    /* « notre moitié » est le sujet qui penche (décision utilisateur :
     * « chez nous penche » sonnait bizarre) ; « chez nous » survit comme
     * lieu dans la phrase d'égalité */
    var ph = phraseEspace(j);
    assert.ok(ph.indexOf('otre moitié') !== -1 || ph.indexOf('chez nous') !== -1,
      'la phrase nomme notre moitié (ou chez nous) au jour ' + j);
    assert.ok(ph.indexOf('Chez nous penche') === -1, '« chez nous » ne penche plus au jour ' + j);
  }
});

/* ------------------------------------------------------------------ */

var rates = 0;
tests.forEach(function (t) {
  try {
    t.fn();
    console.log('  ✓ ' + t.nom);
  } catch (e) {
    rates += 1;
    console.error('  ✗ ' + t.nom);
    console.error('    ' + (e && e.message ? e.message : e));
  }
});
console.log('');
console.log(rates === 0
  ? tests.length + ' tests, tout est vert.'
  : rates + ' test(s) en échec sur ' + tests.length + '.');
if (rates > 0) process.exit(1);
