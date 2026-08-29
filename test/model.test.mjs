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
  ARBRES, arbreDuJour, phraseDuMoment, phraseEspace,
  LECTURE_JOURS_PAR_SEC, SCENARIOS, VOIX_TRANSITIONS,
  DEFIS, DEFI_ATTENTE_MS, DEFI_SORTIE_MARGE_JOURS,
  defiReussi, defiEncoreProche, coeurDeSaison,
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

test('la phrase du moment finit par une ponctuation et garde l’apostrophe typographique', function () {
  for (var j = 0; j < ANNEE_JOURS; j += 7) {
    var p = phraseDuMoment(j);
    assert.ok(/[.!?…]$/.test(p), 'ponctuation finale au jour ' + j + ' : ' + p);
    assert.ok(p.indexOf("'") === -1, 'apostrophe droite interdite au jour ' + j);
  }
});

/* ------------------------------------------------------------------ */
/* La lecture automatique                                              */
/* ------------------------------------------------------------------ */

test('la lecture automatique fait le tour de l’année en 80 à 90 secondes', function () {
  var secondes = ANNEE_JOURS / LECTURE_JOURS_PAR_SEC;
  assert.ok(secondes >= 80 && secondes <= 90, secondes + ' s');
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
  assert.ok(scnParId.ete.fenetre.indexOf('seize heures') !== -1, 'l’été dit ses seize heures');
  assert.ok(scnParId.hiver.fenetre.indexOf('huit heures') !== -1, 'l’hiver dit ses huit heures');
  assert.ok(scnParId.hiver.espace.indexOf('Australie') !== -1, 'Noël en Australie vit dans le scénario d’hiver');
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

test('chaque défi est atteignable, et gagné pile dans sa saison', function () {
  DEFIS.forEach(function (d) {
    var atteignable = false;
    for (var j = 0; j < ANNEE_JOURS; j += 1) {
      if (defiReussi(d, j)) { atteignable = true; break; }
    }
    assert.ok(atteignable, 'défi inatteignable : ' + d.id);
    assert.ok(d.consigne && d.bravo && d.emoji, 'défi complet : ' + d.id);
  });
  assert.ok(defiReussi(DEFIS[1], JOUR_SOLSTICE_ETE), 'l’été au solstice d’été');
  assert.ok(!defiReussi(DEFIS[1], JOUR_SOLSTICE_HIVER), 'pas d’été au solstice d’hiver');
});

test('le défi de la révélation : l’été australien se gagne en plein hiver chez nous', function () {
  var australie = DEFIS[3];
  assert.equal(australie.hemisphere, 'sud');
  assert.ok(defiReussi(australie, JOUR_SOLSTICE_HIVER + 5));
  assert.equal(saison(JOUR_SOLSTICE_HIVER + 5, 'nord'), 'hiver');
});

test('l’hystérésis : le bravo se range une marge au-delà des bords de la saison, pas au bord', function () {
  var ete = DEFIS[1];
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

test('la phrase de l’espace suit le penchant', function () {
  assert.ok(phraseEspace(JOUR_SOLSTICE_ETE).indexOf('à fond vers le Soleil') !== -1);
  assert.ok(phraseEspace(JOUR_SOLSTICE_HIVER).indexOf('loin du Soleil') !== -1);
  assert.ok(phraseEspace(JOUR_EQUINOXE_PRINTEMPS).indexOf('égalité') !== -1);
  assert.ok(phraseEspace(JOUR_SOLSTICE_HIVER).indexOf('grand hiver') !== -1);
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
