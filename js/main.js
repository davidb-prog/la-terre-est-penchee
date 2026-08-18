/*
 * Le câblage de la page : boucle de rendu résiliente, geste-signature
 * (attraper la Terre), curseur maître, conteur et médaillon mobile.
 * Toute la connaissance du phénomène vit dans js/model.js — ici on ne fait
 * que brancher.
 */
import { jourNormalise, phraseDuMoment, JOUR_SOLSTICE_ETE } from './model.js';
import { creerVueOrbite } from './vue-orbite.js';
import { creerVueFenetre, dessinerMiniFenetre } from './vue-fenetre.js';

/* ------------------------------------------------------------------ */
/* L'état                                                              */
/* ------------------------------------------------------------------ */

var etat = {
  jour: 0,
  glisse: false
};

var mouvementReduit = false;
if (window.matchMedia) {
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mouvementReduit = !!mq.matches;
  if (mq.addEventListener) mq.addEventListener('change', function (e) { mouvementReduit = !!e.matches; });
}

/* Petit écran ? (même seuil que la grille CSS : 880 px) */
var estMobile = false;
if (window.matchMedia) {
  var mqMobile = window.matchMedia('(max-width: 879px)');
  estMobile = !!mqMobile.matches;
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', function (e) { estMobile = !!e.matches; });
}

/* ------------------------------------------------------------------ */
/* Les éléments                                                        */
/* ------------------------------------------------------------------ */

var canvasOrbite = document.getElementById('canvas-orbite');
var canvasFenetre = document.getElementById('canvas-fenetre');
var curseur = document.getElementById('curseur-jours');
var phraseMoment = document.getElementById('phrase-moment');
var boutonEcouter = document.getElementById('bouton-ecouter');
var menuVoix = document.getElementById('menu-voix');
var conseilVoix = document.getElementById('conseil-voix');
var texteExplication = document.getElementById('texte-explication');
var medaillon = document.getElementById('medaillon-fenetre');
var canvasMedaillon = document.getElementById('canvas-medaillon');

var vueOrbite = creerVueOrbite(canvasOrbite);
var vueFenetre = creerVueFenetre(canvasFenetre);

/* ------------------------------------------------------------------ */
/* Changer de jour                                                     */
/* ------------------------------------------------------------------ */

function fixerJour(jour) {
  etat.jour = jourNormalise(jour);
  curseur.value = String(etat.jour);
  phraseMoment.textContent = phraseDuMoment(etat.jour);
}

/* ------------------------------------------------------------------ */
/* La boucle de rendu (résiliente : un raté ne tue jamais l'animation)  */
/* ------------------------------------------------------------------ */

function ajusterCanvas(canvas) {
  var rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return;
  var dpr = window.devicePixelRatio || 1;
  var w = Math.round(rect.width * dpr);
  var h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function boucle(maintenant) {
  try {
    ajusterCanvas(canvasOrbite);
    ajusterCanvas(canvasFenetre);
    var halo = etat.glisse ? 1 : (mouvementReduit ? 0.4 : 0.4 + 0.35 * Math.sin(maintenant / 550));
    vueOrbite.rendre(etat.jour, halo);
    vueFenetre.rendre(etat.jour);
    gererMedaillon();
  } finally {
    window.requestAnimationFrame(boucle);
  }
}

/* ------------------------------------------------------------------ */
/* Le médaillon flottant (mobile) : chez nous, toujours visible         */
/* ------------------------------------------------------------------ */

function canvasHorsEcran(canvas) {
  var rect = canvas.getBoundingClientRect();
  var hauteur = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom < 80 || rect.top > hauteur - 80;
}

function gererMedaillon() {
  /* Dès que la fenêtre sort de l'écran, chez nous suit l'enfant : il voit
   * les saisons changer pendant qu'il manipule la Terre ou le curseur. */
  var visible = estMobile && canvasHorsEcran(canvasFenetre);
  medaillon.hidden = !visible;
  if (!visible) return;
  ajusterCanvas(canvasMedaillon);
  var ctx = canvasMedaillon.getContext('2d');
  dessinerMiniFenetre(ctx, canvasMedaillon.width, canvasMedaillon.height, etat.jour);
}

/* Un tap sur le médaillon remonte à la fenêtre. */
medaillon.addEventListener('click', function () {
  try {
    canvasFenetre.scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'center' });
  } catch (e) {
    canvasFenetre.scrollIntoView(true);
  }
});

/* ------------------------------------------------------------------ */
/* Le geste-signature : attraper la Terre                               */
/* ------------------------------------------------------------------ */

function coordonneesCanvas(canvas, e) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

canvasOrbite.addEventListener('pointerdown', function (e) {
  var c = coordonneesCanvas(canvasOrbite, e);
  if (!vueOrbite.attrapeTerre(c.x, c.y, etat.jour)) return;
  etat.glisse = true;
  canvasOrbite.classList.add('attrape');
  if (canvasOrbite.setPointerCapture) canvasOrbite.setPointerCapture(e.pointerId);
  e.preventDefault();
});

canvasOrbite.addEventListener('pointermove', function (e) {
  if (!etat.glisse) return;
  var c = coordonneesCanvas(canvasOrbite, e);
  fixerJour(vueOrbite.jourDepuisPointeur(c.x, c.y));
  e.preventDefault();
});

function lacherLaTerre() {
  etat.glisse = false;
  canvasOrbite.classList.remove('attrape');
}

canvasOrbite.addEventListener('pointerup', lacherLaTerre);
canvasOrbite.addEventListener('pointercancel', lacherLaTerre);

/* ------------------------------------------------------------------ */
/* Le curseur maître                                                    */
/* ------------------------------------------------------------------ */

curseur.addEventListener('input', function () {
  fixerJour(parseFloat(curseur.value));
});

/* ------------------------------------------------------------------ */
/* Le conteur                                                           */
/* ------------------------------------------------------------------ */

var synthesePossible = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
var CLE_VOIX = 'petit-labo-saisons-voix';

/* Retire les émojis (imprononçables) et recolle l'espace orpheline. */
function pourOral(texte) {
  var sansEmoji = texte.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '');
  return sansEmoji.replace(/\s+([.,…])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

/* Découpe un texte en phrases (les moteurs coupent les longs blocs). */
function phrasesDe(texte) {
  var morceaux = [];
  var re = /[^.!?…]+[.!?…]+/g;
  var dernierIndex = 0;
  var m = re.exec(texte);
  while (m) {
    var phrase = m[0].trim();
    if (phrase) morceaux.push({ texte: phrase, finDeParagraphe: false });
    dernierIndex = re.lastIndex;
    m = re.exec(texte);
  }
  var reste = texte.slice(dernierIndex).trim();
  if (reste) morceaux.push({ texte: reste, finDeParagraphe: false });
  if (morceaux.length) morceaux[morceaux.length - 1].finDeParagraphe = true;
  return morceaux;
}

var narrateur = (function () {
  if (!synthesePossible) {
    return { parler: function () {}, stop: function () {} };
  }

  var synthese = window.speechSynthesis;
  var generation = 0;
  var finPrecedente = null;
  var voixChoisie = null;

  function scoreVoix(v) {
    var lang = (v.lang || '').replace('_', '-').toLowerCase();
    var nom = (v.name || '').toLowerCase();
    var score = 0;
    if (lang.indexOf('fr-fr') === 0) score += 60;
    else if (lang.indexOf('fr-ca') === 0) score += 20 - 30;
    else if (lang.indexOf('fr') === 0) score += 20;
    else return -1000;
    if (/natural|neural|online|premium|enhanced|améliorée|amelioree|siri/.test(nom)) score += 30;
    if (/google/.test(nom)) score += 24;
    if (/amélie|amelie|thomas|audrey|aurélie|aurelie|marie|denise|hortense|julie/.test(nom)) score += 12;
    if (v.localService === false) score += 6;
    if (/espeak|eloquence|compact|robot/.test(nom)) score -= 50;
    if (/albert|bahh|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|bad news|good news/.test(nom)) score -= 40;
    return score;
  }

  function voixFrancaises() {
    var toutes = synthese.getVoices() || [];
    var fr = [];
    for (var i = 0; i < toutes.length; i++) {
      if (scoreVoix(toutes[i]) > -1000) fr.push(toutes[i]);
    }
    fr.sort(function (a, b) { return scoreVoix(b) - scoreVoix(a); });
    return fr;
  }

  function rafraichirVoix() {
    var fr = voixFrancaises();
    if (!fr.length) return;
    var souhait = null;
    try { souhait = window.localStorage.getItem(CLE_VOIX); } catch (e) { /* stockage indisponible */ }
    voixChoisie = fr[0];
    if (souhait) {
      for (var i = 0; i < fr.length; i++) {
        if (fr[i].name === souhait) { voixChoisie = fr[i]; break; }
      }
    }
    /* Le menu de voix, seulement s'il y a le choix. */
    if (fr.length >= 2) {
      menuVoix.hidden = false;
      while (menuVoix.firstChild) menuVoix.removeChild(menuVoix.firstChild);
      fr.forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = '🗣 ' + v.name;
        if (voixChoisie && v.name === voixChoisie.name) opt.selected = true;
        menuVoix.appendChild(opt);
      });
    }
    conseilVoix.hidden = scoreVoix(voixChoisie) >= 40;
  }

  if (synthese.addEventListener) synthese.addEventListener('voiceschanged', rafraichirVoix);
  else if ('onvoiceschanged' in synthese) synthese.onvoiceschanged = rafraichirVoix;
  rafraichirVoix();

  menuVoix.addEventListener('change', function () {
    try { window.localStorage.setItem(CLE_VOIX, menuVoix.value); } catch (e) { /* tant pis */ }
    var relire = synthese.speaking && lectureExplication;
    rafraichirVoix();
    if (relire) lireExplication(); /* changement de voix en cours de lecture → on relit */
  });

  function tonDeConteur(u, phrase) {
    u.rate = 0.92;
    u.pitch = 1.04;
    if (phrase.indexOf('…') !== -1) u.rate = 0.87;
    if (/\?\s*$/.test(phrase)) u.pitch = 1.12;
    if (/!\s*$/.test(phrase)) { u.rate = 0.96; u.pitch = 1.14; }
  }

  function parler(morceaux, quandFini) {
    generation += 1;
    var gen = generation;
    if (finPrecedente) { var f = finPrecedente; finPrecedente = null; f(); }
    finPrecedente = quandFini || null;
    synthese.cancel();
    rafraichirVoix(); /* certaines listes de voix arrivent tard */

    function suivant(i) {
      if (gen !== generation) return;
      if (i >= morceaux.length) {
        if (finPrecedente) { var f2 = finPrecedente; finPrecedente = null; f2(); }
        return;
      }
      var u = new window.SpeechSynthesisUtterance(morceaux[i].texte);
      u.lang = 'fr-FR';
      if (voixChoisie) u.voice = voixChoisie;
      tonDeConteur(u, morceaux[i].texte);
      u.onend = function () {
        if (gen !== generation) return;
        var pause = morceaux[i].finDeParagraphe ? 620 : 300;
        window.setTimeout(function () { suivant(i + 1); }, pause);
      };
      u.onerror = u.onend;
      synthese.speak(u);
    }
    suivant(0);
  }

  return {
    parler: parler,
    stop: function () {
      generation += 1;
      synthese.cancel();
      if (finPrecedente) { var f = finPrecedente; finPrecedente = null; f(); }
    }
  };
})();

/* « 🔊 Écouter l'histoire » sur la boîte d'explication. */
var lectureExplication = false;

function lireExplication() {
  var paragraphes = texteExplication.querySelectorAll('p');
  var morceaux = [];
  for (var i = 0; i < paragraphes.length; i++) {
    var phrases = phrasesDe(pourOral(paragraphes[i].textContent));
    for (var j = 0; j < phrases.length; j++) morceaux.push(phrases[j]);
  }
  lectureExplication = true;
  boutonEcouter.textContent = '⏹ Arrêter';
  narrateur.parler(morceaux, function () {
    lectureExplication = false;
    boutonEcouter.textContent = '🔊 Écouter l’histoire';
  });
}

if (synthesePossible) {
  boutonEcouter.hidden = false;
  boutonEcouter.addEventListener('click', function () {
    if (lectureExplication) narrateur.stop();
    else lireExplication();
  });

  window.addEventListener('pagehide', function () { window.speechSynthesis.cancel(); });
}

/* ------------------------------------------------------------------ */
/* Démarrage : on ouvre la page au solstice d'été (le plus joli moment  */
/* pour découvrir la fenêtre), l'enfant part ensuite où il veut.        */
/* ------------------------------------------------------------------ */

fixerJour(JOUR_SOLSTICE_ETE);
window.requestAnimationFrame(boucle);
