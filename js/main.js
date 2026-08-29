/*
 * Le câblage de la page : boucle de rendu résiliente, lecture automatique,
 * geste-signature (attraper la Terre), curseur maître, scénarios racontés,
 * jeu des défis, conteur (voix enregistrée + repli synthèse) et médaillon
 * mobile. Toute la connaissance du phénomène vit dans js/model.js — ici on
 * ne fait que brancher.
 */
import {
  jourNormalise, phraseDuMoment, phraseEspace, JOUR_SOLSTICE_ETE, ANNEE_JOURS,
  LECTURE_JOURS_PAR_SEC, SCENARIOS, VOIX_TRANSITIONS,
  DEFIS, DEFI_ATTENTE_MS, defiReussi, defiEncoreProche, coeurDeSaison,
  texteOral
} from './model.js';
import { creerVueOrbite } from './vue-orbite.js';
import { creerVueFenetre, dessinerMiniFenetre } from './vue-fenetre.js';

var $ = function (id) { return document.getElementById(id); };

/* ------------------------------------------------------------------ */
/* L'état                                                              */
/* ------------------------------------------------------------------ */

var mouvementReduit = false;
if (window.matchMedia) {
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mouvementReduit = !!mq.matches;
  if (mq.addEventListener) mq.addEventListener('change', function (e) { mouvementReduit = !!e.matches; });
}

/* Le seuil mobile UNIQUE de l'épisode : 880 px — le même que la grille CSS. */
var estMobile = false;
var mqMobile = window.matchMedia ? window.matchMedia('(max-width: 879px)') : null;
if (mqMobile) {
  estMobile = !!mqMobile.matches;
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', function (e) { estMobile = !!e.matches; });
}

var etat = {
  jour: JOUR_SOLSTICE_ETE,
  lecture: !mouvementReduit, /* l'année avance toute seule (un tour en ~85 s) */
  glissement: null,          /* { depart, delta, cible, t0, duree } pendant un scénario */
  scenarioActif: null,
  glisse: false
};

/* ------------------------------------------------------------------ */
/* Les éléments et les vues                                            */
/* ------------------------------------------------------------------ */

var canvasOrbite = $('canvas-orbite');
var canvasFenetre = $('canvas-fenetre');
var canvasOrbiteJeu = $('canvas-orbite-jeu');
var canvasFenetreJeu = $('canvas-fenetre-jeu');
var curseur = $('curseur-jours');
var phraseMoment = $('phrase-moment');
var phraseEspaceEl = $('phrase-espace');
var bulleGeste = $('bulle-geste');
var boutonLecture = $('bouton-lecture');
var boutonEcouter = $('bouton-ecouter');
var conseilVoix = $('conseil-voix');
var texteExplication = $('texte-explication');
var explicationPli = $('explication-pli');
var medaillon = $('medaillon-fenetre');
var canvasMedaillon = $('canvas-medaillon');
var zoneJeu = $('zone-jeu');

var vueOrbite = creerVueOrbite(canvasOrbite);
var vueFenetre = creerVueFenetre(canvasFenetre);
var vueOrbiteJeu = creerVueOrbite(canvasOrbiteJeu);
var vueFenetreJeu = creerVueFenetre(canvasFenetreJeu);

/* ------------------------------------------------------------------ */
/* Lecture automatique et reprise en main                              */
/* ------------------------------------------------------------------ */

function fixerLecture(enMarche) {
  etat.lecture = enMarche;
  boutonLecture.setAttribute('aria-pressed', enMarche ? 'true' : 'false');
  boutonLecture.setAttribute('aria-label', enMarche
    ? 'Mettre en pause (l’année passe toute seule)'
    : 'Relancer l’année qui passe toute seule');
}

/* L'utilisateur reprend la main : le glissement s'arrête, la lecture se met
 * en pause, l'histoire affichée s'efface. */
function reprendreLaMain() {
  etat.glissement = null;
  if (etat.lecture) fixerLecture(false);
  if (etat.scenarioActif !== null) {
    etat.scenarioActif = null;
    rafraichirBoutonsScenarios();
    afficherInvite();
    if (narrateur) narrateur.stop();
  }
}

function basculerLecture() {
  etat.glissement = null;
  if (etat.scenarioActif !== null) {
    etat.scenarioActif = null;
    rafraichirBoutonsScenarios();
    afficherInvite();
  }
  fixerLecture(!etat.lecture);
}

boutonLecture.addEventListener('click', basculerLecture);
document.addEventListener('keydown', function (e) {
  if (e.code === 'Space' && !e.target.closest('button, input, a, summary, select')) {
    e.preventDefault();
    basculerLecture();
  }
});

/* Safari iOS ignore user-scalable=no depuis iOS 10 : on neutralise aussi le
 * zoom pincé de la page par son événement propriétaire. */
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

/* ------------------------------------------------------------------ */
/* Changer de jour                                                     */
/* ------------------------------------------------------------------ */

var curseurTenu = false;

function fixerJour(jour) {
  etat.jour = jourNormalise(jour);
}

curseur.addEventListener('input', function () {
  reprendreLaMain();
  fixerJour(parseFloat(curseur.value));
});
curseur.addEventListener('pointerdown', function () { curseurTenu = true; });
window.addEventListener('pointerup', function () { curseurTenu = false; });
window.addEventListener('pointercancel', function () { curseurTenu = false; });

/* ------------------------------------------------------------------ */
/* Le geste-signature : attraper la Terre                               */
/* ------------------------------------------------------------------ */

function cacherBulleGeste() {
  if (bulleGeste) bulleGeste.classList.add('cachee');
}
window.setTimeout(cacherBulleGeste, 8000);

function coordonneesCanvas(canvas, e) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function brancherGesteTerre(canvas, vue) {
  canvas.addEventListener('pointerdown', function (e) {
    var c = coordonneesCanvas(canvas, e);
    if (!vue.attrapeTerre(c.x, c.y, etat.jour)) return;
    etat.glisse = true;
    reprendreLaMain();
    cacherBulleGeste();
    canvas.classList.add('attrape');
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!etat.glisse) return;
    var c = coordonneesCanvas(canvas, e);
    fixerJour(vue.jourDepuisPointeur(c.x, c.y));
    e.preventDefault();
  });

  function lacherLaTerre() {
    etat.glisse = false;
    canvas.classList.remove('attrape');
  }
  canvas.addEventListener('pointerup', lacherLaTerre);
  canvas.addEventListener('pointercancel', lacherLaTerre);

  /* Repli des vieux mobiles qui ignorent touch-action : le toucher posé sur
   * un canvas appartient au geste, jamais au défilement de la page. */
  canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
}

brancherGesteTerre(canvasOrbite, vueOrbite);
brancherGesteTerre(canvasOrbiteJeu, vueOrbiteJeu);

/* ------------------------------------------------------------------ */
/* Les boutons-scénarios et leurs micro-histoires                       */
/* ------------------------------------------------------------------ */

var boutonsScenarios = {};
var conteneurScenarios = $('boutons-scenarios');
var histoireScn = $('histoire-scn');

SCENARIOS.forEach(function (scn) {
  var bouton = document.createElement('button');
  bouton.className = 'scn scn-' + scn.teinte;
  bouton.setAttribute('aria-pressed', 'false');
  var emoji = document.createElement('span');
  emoji.className = 'scn-emoji';
  emoji.textContent = scn.emoji;
  var label = document.createElement('span');
  label.textContent = scn.label;
  var sub = document.createElement('span');
  sub.className = 'scn-sub';
  sub.textContent = scn.sub;
  bouton.appendChild(emoji); bouton.appendChild(label); bouton.appendChild(sub);
  bouton.addEventListener('click', function () { jouerScenario(scn); });
  conteneurScenarios.appendChild(bouton);
  boutonsScenarios[scn.id] = bouton;
});

function rafraichirBoutonsScenarios() {
  for (var id in boutonsScenarios) {
    var actif = etat.scenarioActif === id;
    boutonsScenarios[id].classList.toggle('actif', actif);
    boutonsScenarios[id].setAttribute('aria-pressed', actif ? 'true' : 'false');
  }
}

function afficherInvite() {
  histoireScn.innerHTML = '';
  var p = document.createElement('p');
  p.className = 'invite-scn';
  p.textContent = 'Appuie sur une saison : l’année glisse jusqu’au bon moment, puis on raconte le même instant deux fois — chez nous, et depuis l’espace.';
  histoireScn.appendChild(p);
}

function afficherHistoire(scn) {
  histoireScn.innerHTML = '';
  var lignes = [
    { cls: 'puce-histoire-fenetre', puce: '🏡 chez nous', texte: scn.fenetre },
    { cls: 'puce-histoire-espace', puce: '🚀 vu de l’espace', texte: scn.espace }
  ];
  lignes.forEach(function (ligne) {
    var rangee = document.createElement('div');
    rangee.className = 'ligne-histoire';
    var puce = document.createElement('span');
    puce.className = 'puce-histoire ' + ligne.cls;
    puce.textContent = ligne.puce;
    var texte = document.createElement('p');
    texte.className = 'texte-histoire';
    texte.textContent = ligne.texte;
    rangee.appendChild(puce); rangee.appendChild(texte);
    histoireScn.appendChild(rangee);
  });
}

/* L'année glisse en douceur jusqu'au moment choisi — toujours vers l'avant,
 * le vrai sens du voyage de la Terre. */
function jouerScenario(scn) {
  fixerLecture(false);
  etat.scenarioActif = scn.id;
  rafraichirBoutonsScenarios();
  afficherHistoire(scn);
  raconterScenario();
  /* Les vues sont plus haut dans la page : on les ramène à l'écran pour que
   * l'enfant VOIE l'année glisser. */
  var grille = document.querySelector('.grille-vues');
  var cadre = grille.getBoundingClientRect();
  var blocs = grille.children;
  var empilees = blocs.length > 1 &&
    blocs[1].getBoundingClientRect().top >= blocs[0].getBoundingClientRect().bottom - 1;
  if (empilees) {
    var cible = Math.max(0, window.scrollY + cadre.top - 8);
    if (Math.abs(window.scrollY - cible) > 30) {
      if (!mouvementReduit && 'scrollBehavior' in document.documentElement.style) {
        window.scrollTo({ top: cible, behavior: 'smooth' });
      } else {
        window.scrollTo(0, cible);
      }
    }
  } else if (cadre.bottom < 120 || cadre.top > window.innerHeight - 120) {
    $('panneau-scene').scrollIntoView(mouvementReduit ? true : { behavior: 'smooth', block: 'start' });
  }
  var delta = jourNormalise(scn.jour - etat.jour);
  if (mouvementReduit || delta < 0.25 || delta > ANNEE_JOURS - 0.25) {
    etat.glissement = null;
    fixerJour(scn.jour);
    return;
  }
  etat.glissement = {
    depart: etat.jour, delta: delta, cible: scn.jour,
    t0: performance.now(), duree: Math.min(2600, 700 + delta * 6)
  };
}

/* ------------------------------------------------------------------ */
/* La boucle de rendu (résiliente, et sobre : rien ne se redessine      */
/* quand rien ne change — en pause, zéro travail par frame)             */
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

function adoucir(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

var texteCache = {};
function fixerTexte(cle, el, valeur) {
  if (texteCache[cle] === valeur) return;
  texteCache[cle] = valeur;
  el.textContent = valeur;
}

function rafraichirTextes() {
  fixerTexte('moment', phraseMoment, phraseDuMoment(etat.jour));
  fixerTexte('espace', phraseEspaceEl, phraseEspace(etat.jour));
  if (!curseurTenu) curseur.value = String(etat.jour);
}

var dessine = { jour: -1, halo: -1, tailles: '' };
function cleTailles() {
  return canvasFenetre.clientWidth + 'x' + canvasFenetre.clientHeight +
    '|' + canvasOrbite.clientWidth + 'x' + canvasOrbite.clientHeight +
    '|' + (zoneJeu.hidden ? 'jeu-ferme' : canvasOrbiteJeu.clientWidth) +
    '|' + (medaillon.hidden ? 'sans-medaillon' : canvasMedaillon.clientWidth);
}

var msPrecedent = performance.now();
function boucle(maintenant) {
  try {
    var dt = Math.min((maintenant - msPrecedent) / 1000, 0.1);
    msPrecedent = maintenant;
    if (etat.glissement) {
      var g = etat.glissement;
      var p = Math.min(1, (maintenant - g.t0) / g.duree);
      etat.jour = p >= 1 ? g.cible : jourNormalise(g.depart + g.delta * adoucir(p));
      if (p >= 1) etat.glissement = null;
    } else if (etat.lecture) {
      etat.jour = jourNormalise(etat.jour + LECTURE_JOURS_PAR_SEC * dt);
    }
    /* Le halo « attrape-moi » : plein pendant le glisser, respirant pendant
     * la lecture (la vue se redessine déjà à chaque frame), sage en pause —
     * pour qu'en pause, rien n'ait besoin de se redessiner. */
    var halo = etat.glisse ? 1
      : (etat.lecture && !mouvementReduit ? 0.4 + 0.35 * Math.sin(maintenant / 550) : 0.45);
    var tailles = cleTailles();
    if (etat.jour !== dessine.jour || halo !== dessine.halo || tailles !== dessine.tailles) {
      dessine.jour = etat.jour; dessine.halo = halo; dessine.tailles = tailles;
      ajusterCanvas(canvasFenetre);
      ajusterCanvas(canvasOrbite);
      vueFenetre.rendre(etat.jour);
      vueOrbite.rendre(etat.jour, halo);
      if (!zoneJeu.hidden) {
        ajusterCanvas(canvasOrbiteJeu);
        vueOrbiteJeu.rendre(etat.jour, halo);
        /* Sur mobile, le jeu n'a qu'une vue : la fenêtre est masquée par la
         * feuille de style, c'est le médaillon flottant qui la remplace. */
        if (canvasFenetreJeu.offsetWidth > 0) {
          ajusterCanvas(canvasFenetreJeu);
          vueFenetreJeu.rendre(etat.jour);
        }
      }
      dessinerMedaillon();
      rafraichirTextes();
    }
    gererMedaillon();
    surveillerDefi(maintenant);
  } finally {
    /* la boucle survit à un raté de rendu ponctuel */
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
  var visible = estMobile && canvasHorsEcran(canvasFenetre);
  if (medaillon.hidden === !visible) return;
  medaillon.hidden = !visible;
  if (visible) dessinerMedaillon();
}

function dessinerMedaillon() {
  if (medaillon.hidden) return;
  ajusterCanvas(canvasMedaillon);
  var ctx = canvasMedaillon.getContext('2d');
  dessinerMiniFenetre(ctx, canvasMedaillon.width, canvasMedaillon.height, etat.jour);
}

medaillon.addEventListener('click', function () {
  try {
    canvasFenetre.scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'center' });
  } catch (e) {
    canvasFenetre.scrollIntoView(true);
  }
});

/* ------------------------------------------------------------------ */
/* Le conteur : la voix enregistrée (mp3 commités) + repli synthèse     */
/* ------------------------------------------------------------------ */

/* Le manifeste (assets/audio/manifest.json) liste les blocs enregistrés avec
 * leur texte oral exact. On ne joue un fichier que si son texte correspond
 * ENCORE au texte du site — la voix enregistrée ne ment jamais. Manifeste
 * vide ou absent : tout passe par la synthèse. */
var blocsAudio = {};
if (window.__VOIX_MANIFESTE && window.__VOIX_MANIFESTE.blocs) {
  /* l'artefact de test familial embarque le manifeste dans la page */
  blocsAudio = window.__VOIX_MANIFESTE.blocs;
} else if (window.fetch) {
  fetch('assets/audio/manifest.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) {
      if (m && m.blocs) blocsAudio = m.blocs;
      /* le conseil « voix robotiques » ne concerne que le repli synthèse */
      if (Object.keys(blocsAudio).length > 0 && conseilVoix) conseilVoix.hidden = true;
    })
    .catch(function () { /* hors ligne ou manifeste absent : synthèse seule */ });
}

function sourceAudio(id, texte) {
  var b = blocsAudio[id];
  if (!b || b.texte !== texte || !b.fichier) return null;
  return b.fichier.indexOf('data:') === 0 ? b.fichier : 'assets/audio/' + b.fichier;
}

/* une phrase par bulle (les longs textes d'une traite se font couper) */
function phrasesDe(texte, finDeBloc) {
  var bouts = texte.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*/g) || [];
  var morceaux = [];
  bouts.forEach(function (b) {
    if (b.trim()) morceaux.push({ texte: b.trim(), finDeBloc: false });
  });
  if (morceaux.length && finDeBloc) morceaux[morceaux.length - 1].finDeBloc = true;
  return morceaux;
}

var narrateur = null; /* { narrate(blocs, quandFini), stop() } — null sans synthèse */

if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
  var voixFr = [];

  var scoreVoix = function (v) {
    var lang = (v.lang || '').replace('_', '-').toLowerCase();
    var nom = (v.name || '').toLowerCase();
    var score = 0;
    if (lang.indexOf('fr-fr') === 0) score += 60;
    else if (lang.indexOf('fr') === 0) score += 20;
    if (lang.indexOf('fr-ca') === 0) score -= 30;
    if (/natural|neural|online|premium|enhanced|am[ée]lior[ée]e|siri/.test(nom)) score += 30;
    if (nom.indexOf('google') !== -1) score += 24;
    if (/audrey|thomas|aur[ée]lie|marie|denise|henri|[ée]lo[ïi]se|vivienne|r[ée]my|jacqueline|charline|coralie|hortense/.test(nom)) score += 12;
    if (!v.localService) score += 6;
    if (/espeak|eloquence|compact|robot/.test(nom)) score -= 50;
    if (/eddy|\bflo\b|grandma|grandpa|\breed\b|rocko|sandy|shelley|jester|bells|organ|superstar|trinoids|whisper|zarvox|bad news|bahh|boing|bubbles|cellos|wobble/.test(nom)) score -= 40;
    return score;
  };

  var rafraichirVoix = function () {
    var toutes = window.speechSynthesis.getVoices();
    voixFr = [];
    for (var i = 0; i < toutes.length; i++) {
      if ((toutes[i].lang || '').replace('_', '-').toLowerCase().indexOf('fr') === 0) voixFr.push(toutes[i]);
    }
    voixFr.sort(function (a, b) { return scoreVoix(b) - scoreVoix(a); });
    if (conseilVoix) {
      var meilleure = voixFr.length ? scoreVoix(voixFr[0]) : -1;
      conseilVoix.hidden = meilleure >= 84 || Object.keys(blocsAudio).length > 0;
    }
  };
  rafraichirVoix();
  if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = rafraichirVoix;
  }

  /* le score choisit seul la meilleure voix française (pas de menu : c'était
   * un héritage d'avant la voix enregistrée) */
  var choisirVoix = function () { return voixFr.length ? voixFr[0] : null; };

  /* une lecture à la fois : generation invalide les onend des lectures
   * annulées, et le quandFini de la lecture précédente est toujours prévenu */
  var generation = 0;
  var finEnCours = null;
  /* UN SEUL élément audio, réutilisé : débloqué par le premier geste, il peut
   * rejouer sans geste (indispensable pour le bravo du jeu, déclenché par la
   * boucle d'animation) */
  var lecteur = null;
  var obtenirLecteur = function () {
    if (!lecteur) lecteur = new Audio();
    return lecteur;
  };
  var prevenirFin = function () { var f = finEnCours; finEnCours = null; if (f) f(); };
  var toutArreter = function () {
    generation++;
    window.speechSynthesis.cancel();
    if (lecteur) {
      try { lecteur.pause(); } catch (e) { /* déjà arrêté */ }
      lecteur.onended = null;
      lecteur.onerror = null;
    }
    prevenirFin();
  };

  /* le ton de conteur du repli synthèse : débit posé, relief sur ! ? … */
  var direLesPhrases = function (morceaux, maGen, fini) {
    var voix = choisirVoix();
    var indice = 0;
    var suivante = function () {
      if (maGen !== generation) return;
      if (indice >= morceaux.length) { fini(); return; }
      var m = morceaux[indice++];
      var u = new SpeechSynthesisUtterance(m.texte);
      u.lang = voix ? voix.lang : 'fr-FR';
      if (voix) u.voice = voix;
      u.rate = 0.92; u.pitch = 1.04;
      if (/!\s*$/.test(m.texte)) { u.rate = 0.96; u.pitch = 1.14; }
      else if (/\?\s*$/.test(m.texte)) { u.pitch = 1.12; }
      else if (m.texte.indexOf('…') !== -1) { u.rate = 0.87; }
      u.onend = function () {
        if (maGen !== generation) return;
        window.setTimeout(suivante, m.finDeBloc ? 620 : 300);
      };
      u.onerror = function () { if (maGen === generation) fini(); };
      window.speechSynthesis.speak(u);
    };
    suivante();
  };

  /* Le conteur : une suite de blocs { id, texte, pause? }. Chaque bloc joue
   * son fichier enregistré s'il existe ET dit encore le bon texte ; sinon la
   * synthèse lit le texte phrase à phrase. */
  var narrate = function (blocs, quandFini) {
    toutArreter();
    rafraichirVoix(); /* certaines listes de voix n'arrivent qu'après le chargement */
    var maGen = generation;
    finEnCours = quandFini || null;
    var indice = 0;
    var suivant = function () {
      if (maGen !== generation) return;
      if (indice >= blocs.length) { prevenirFin(); return; }
      var bloc = blocs[indice++];
      var apres = function () { if (maGen === generation) window.setTimeout(suivant, 0); };
      var replie = false; /* onerror ET promesse rejetée peuvent tomber tous les deux */
      var repli = function () {
        if (replie || maGen !== generation) return;
        replie = true;
        direLesPhrases(phrasesDe(bloc.texte, true), maGen, apres);
      };
      var src = sourceAudio(bloc.id, bloc.texte);
      if (!src) { repli(); return; }
      var a = obtenirLecteur();
      var pause = typeof bloc.pause === 'number' ? bloc.pause : 620;
      a.onended = function () { if (maGen === generation) window.setTimeout(apres, pause); };
      a.onerror = repli;
      a.src = src;
      var promesse = a.play();
      if (promesse && promesse.then) promesse.then(null, repli);
      /* préchauffer le fichier du bloc suivant pendant que celui-ci joue */
      if (indice < blocs.length && window.fetch) {
        var prochain = sourceAudio(blocs[indice].id, blocs[indice].texte);
        if (prochain && prochain.indexOf('data:') !== 0) {
          fetch(prochain).catch(function () { /* le lecteur retentera */ });
        }
      }
    };
    suivant();
  };
  narrateur = { narrate: narrate, stop: toutArreter };

  /* -- « 🔊 Écouter l'histoire » : la boîte d'explication, bloc par bloc -- */
  boutonEcouter.hidden = false;
  var lectureEnCours = false;
  var reposerBoutonEcouter = function () {
    lectureEnCours = false;
    boutonEcouter.textContent = '🔊 Écouter l’histoire';
    boutonEcouter.setAttribute('aria-pressed', 'false');
  };
  var lireExplication = function () {
    var blocs = [];
    var paragraphes = texteExplication.querySelectorAll('p');
    for (var i = 0; i < paragraphes.length; i++) {
      blocs.push({ id: 'histoire-' + (i + 1), texte: texteOral(paragraphes[i].textContent) });
    }
    narrateur.narrate(blocs, reposerBoutonEcouter);
    lectureEnCours = true;
    boutonEcouter.textContent = '⏹ Arrêter';
    boutonEcouter.setAttribute('aria-pressed', 'true');
  };
  boutonEcouter.addEventListener('click', function () {
    if (lectureEnCours) { narrateur.stop(); return; } /* le quandFini remet le bouton */
    lireExplication();
  });

  /* partir ailleurs coupe le conteur net — synthèse ET mp3 */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') narrateur.stop();
  });
  window.addEventListener('pagehide', function () { if (narrateur) narrateur.stop(); });
}

/* ------------------------------------------------------------------ */
/* La version sonore des scénarios et du jeu (bouton 🔇/🔊 jumeau)       */
/* ------------------------------------------------------------------ */

var boutonVoixScn = $('bouton-voix-scn');
var boutonVoixJeu = $('bouton-voix-jeu');
var voixActive = false;
/* clé de famille (même origine petit-labo.fr : le réglage suit l'enfant
 * d'un épisode à l'autre) */
try {
  voixActive = window.localStorage.getItem('petit-labo-son') === '1';
} catch (e) { /* mode privé */ }

function rafraichirBoutonsVoix() {
  boutonVoixScn.setAttribute('aria-pressed', voixActive ? 'true' : 'false');
  boutonVoixJeu.setAttribute('aria-pressed', voixActive ? 'true' : 'false');
}

function basculerVoix() {
  voixActive = !voixActive;
  try { window.localStorage.setItem('petit-labo-son', voixActive ? '1' : '0'); } catch (e) { /* tant pis */ }
  rafraichirBoutonsVoix();
  if (!narrateur) return;
  if (voixActive) raconterScenario(); else narrateur.stop();
}

if (narrateur) {
  boutonVoixJeu.hidden = false;
  rafraichirBoutonsVoix();
  boutonVoixScn.addEventListener('click', basculerVoix);
  boutonVoixJeu.addEventListener('click', basculerVoix);
} else {
  boutonVoixScn.hidden = true;
  boutonVoixJeu.hidden = true;
}

/* L'oral d'un scénario : la voix nomme le moment (l'enfant ne lit pas les
 * libellés), puis raconte les deux regards. Pause courte après les annonces :
 * leurs mp3 finissent déjà sur la suspension du « … ». */
function blocsScenario(scn) {
  return [
    { id: 'scn-' + scn.id + '-intro', texte: texteOral(scn.intro), pause: 120 },
    { id: 'scn-' + scn.id + '-fenetre', texte: texteOral(scn.fenetre) },
    { id: 'transition-espace', texte: texteOral(VOIX_TRANSITIONS.espace), pause: 120 },
    { id: 'scn-' + scn.id + '-espace', texte: texteOral(scn.espace) }
  ];
}

function raconterScenario() {
  if (!narrateur || !voixActive || etat.scenarioActif === null) return;
  for (var i = 0; i < SCENARIOS.length; i++) {
    if (SCENARIOS[i].id === etat.scenarioActif) {
      narrateur.narrate(blocsScenario(SCENARIOS[i]));
      return;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Le jeu « 🎯 Fabrique la saison ! »                                   */
/* ------------------------------------------------------------------ */

var boutonJouer = $('bouton-jouer');
var boutonEncore = $('bouton-encore');
var defiJeu = $('defi-jeu');
var bravoJeu = $('bravo-jeu');

var defi = null;        /* le défi en cours (null : jeu fermé) */
var panierDefis = [];   /* tirage SANS remise : chaque défi sort avant qu'on remélange */
var defiEntreeMs = null; /* entrée dans la saison (tempo anti « gagné en passant ») */
var defiGagne = false;
var bravoVisible = false;

function raconterDefi(genre, texte) {
  if (narrateur && voixActive) {
    narrateur.narrate([{ id: 'defi-' + defi.id + '-' + genre, texte: texteOral(texte) }]);
  }
}

function remplirPanierDefis() {
  panierDefis = DEFIS.slice();
  for (var i = panierDefis.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var echange = panierDefis[i];
    panierDefis[i] = panierDefis[j];
    panierDefis[j] = echange;
  }
}

function prochainDefi() {
  /* Tirage au panier, sans remise : tous les défis sortent avant qu'on
   * remélange — et jamais deux fois le même d'affilée au remélange. */
  if (!panierDefis.length) remplirPanierDefis();
  if (defi && panierDefis.length > 1 && panierDefis[0].id === defi.id) {
    panierDefis.push(panierDefis.shift());
  }
  /* Ne pas tirer un défi que le jour actuel réussit déjà (gagné d'avance) —
   * sauf s'il ne reste que ceux-là dans le panier. */
  var indice = 0;
  for (var i = 0; i < panierDefis.length; i++) {
    if (!defiReussi(panierDefis[i], etat.jour)) { indice = i; break; }
  }
  defi = panierDefis.splice(indice, 1)[0];
  defiGagne = false;
  bravoVisible = false;
  defiEntreeMs = null;
  defiJeu.textContent = defi.emoji + ' ' + defi.consigne;
  bravoJeu.hidden = true;
  boutonEncore.hidden = true;
  raconterDefi('consigne', defi.consigne);
}

function gagnerDefi(maintenant) {
  var premiere = !defiGagne;
  defiGagne = true;
  bravoVisible = true;
  bravoJeu.textContent = '⭐ ' + defi.bravo;
  bravoJeu.hidden = false;
  boutonEncore.hidden = false;
  if (premiere) {
    raconterDefi('bravo', defi.bravo);
    /* Le recalage doux : l'année glisse jusqu'au cœur de la saison (l'image
     * parfaite du bravo), par le chemin court. Rien n'est verrouillé : un
     * glisser annule le glissement aussitôt. */
    var cible = coeurDeSaison(defi.cible, defi.hemisphere);
    var delta = jourNormalise(cible - etat.jour + ANNEE_JOURS / 2) - ANNEE_JOURS / 2;
    if (mouvementReduit || Math.abs(delta) < 0.25) {
      fixerJour(cible);
    } else {
      etat.glissement = { depart: etat.jour, delta: delta, cible: cible, t0: maintenant, duree: 700 };
    }
  }
}

/* La vérification vit dans la boucle : gagné quand le jour RESTE un petit
 * instant dans la saison — et le bravo ne ment jamais : il se range si
 * l'enfant repart loin de la saison (hystérésis), revient s'il la refabrique. */
function surveillerDefi(maintenant) {
  if (!defi || zoneJeu.hidden) return;
  if (bravoVisible) {
    if (!defiEncoreProche(defi, etat.jour)) {
      bravoVisible = false;
      defiEntreeMs = null;
      bravoJeu.hidden = true;
    }
    return;
  }
  if (etat.glissement) return; /* rien ne se gagne pendant une animation */
  if (defiReussi(defi, etat.jour)) {
    if (defiEntreeMs === null) defiEntreeMs = maintenant;
    else if (maintenant - defiEntreeMs >= DEFI_ATTENTE_MS) gagnerDefi(maintenant);
  } else {
    defiEntreeMs = null;
  }
}

boutonJouer.addEventListener('click', function () {
  if (!zoneJeu.hidden) {
    zoneJeu.hidden = true;
    defi = null;
    boutonJouer.textContent = '🎮 Jouer';
    boutonJouer.setAttribute('aria-expanded', 'false');
    return;
  }
  zoneJeu.hidden = false;
  boutonJouer.textContent = '📦 Ranger le jeu';
  boutonJouer.setAttribute('aria-expanded', 'true');
  reprendreLaMain(); /* l'enfant prend la main : rien ne doit gagner tout seul */
  prochainDefi();
});
boutonEncore.addEventListener('click', prochainDefi);

/* ------------------------------------------------------------------ */
/* La boîte d'explication : repliée sur mobile, toujours ouverte sinon  */
/* ------------------------------------------------------------------ */

function surveillerPliExplication() {
  if (mqMobile && mqMobile.matches) return; /* sur mobile, on plie et déplie librement */
  explicationPli.open = true;
}
if (mqMobile && mqMobile.matches) explicationPli.open = false; /* au chargement : repliée */
explicationPli.addEventListener('toggle', surveillerPliExplication);
if (mqMobile) {
  if (mqMobile.addEventListener) mqMobile.addEventListener('change', surveillerPliExplication);
  else if (mqMobile.addListener) mqMobile.addListener(surveillerPliExplication); /* vieux Safari */
}

/* ------------------------------------------------------------------ */
/* Démarrage : on ouvre au solstice d'été (le plus joli moment pour     */
/* découvrir la fenêtre), et l'année se met en route toute seule.       */
/* ------------------------------------------------------------------ */

afficherInvite();
fixerJour(JOUR_SOLSTICE_ETE);
fixerLecture(etat.lecture);
window.requestAnimationFrame(boucle);
