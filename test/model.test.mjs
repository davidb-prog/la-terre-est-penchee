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
  ARBRES, arbreDuJour, phraseDuMoment
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
