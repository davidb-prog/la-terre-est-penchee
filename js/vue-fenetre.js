/*
 * La fenêtre de chez nous : le ciel du jour, l'arc du Soleil (haut l'été,
 * tout bas l'hiver), l'arbre du jardin qui change avec les saisons, et la
 * barre du jour (la part de la journée où il fait clair).
 * Tout est calculé par le modèle — ici on ne fait que dessiner.
 */
import {
  TAU, hauteurSoleilMidi, dureeJourHeures, arbreDuJour, saison, penchementNord
} from './model.js';

/* Mélange deux couleurs [r, g, b] selon t dans [0, 1]. */
function melanger(a, b, t) {
  var r = Math.round(a[0] + (b[0] - a[0]) * t);
  var g = Math.round(a[1] + (b[1] - a[1]) * t);
  var bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return 'rgb(' + r + ', ' + g + ', ' + bl + ')';
}

/* Le ciel : pâle et froid l'hiver, éclatant l'été. */
var CIEL_HIVER_HAUT = [125, 152, 190];
var CIEL_ETE_HAUT = [56, 140, 214];
var CIEL_HIVER_BAS = [205, 218, 233];
var CIEL_ETE_BAS = [173, 224, 255];

/* Le sol, saison par saison. */
var SOLS = {
  hiver: '#e8eef7',
  printemps: '#7cc98a',
  ete: '#57b06a',
  automne: '#c99a56'
};

/* Flocons et feuilles qui volent : positions déterministes (graine fixe). */
function fabriquerBrins(n, graine) {
  var brins = [];
  var g = graine;
  function suivant() {
    g = (g * 1103515245 + 12345) % 2147483648;
    return g / 2147483648;
  }
  for (var i = 0; i < n; i++) {
    brins.push({ x: 0.08 + suivant() * 0.84, y: 0.12 + suivant() * 0.5, r: 0.5 + suivant() });
  }
  return brins;
}
var FLOCONS = fabriquerBrins(14, 11);
var FEUILLES_VOLANTES = fabriquerBrins(8, 23);

/* Le petit soleil à rayons, réutilisé par la fenêtre et le médaillon. */
function dessinerPetitSoleil(ctx, x, y, r) {
  ctx.strokeStyle = 'rgba(255, 159, 28, 0.85)';
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.lineCap = 'round';
  for (var i = 0; i < 8; i++) {
    var a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3);
    ctx.lineTo(x + Math.cos(a) * r * 1.7, y + Math.sin(a) * r * 1.7);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = '#ffcf5c';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, TAU);
  ctx.fillStyle = '#ffe29a';
  ctx.fill();
}

/* L'arbre du jardin. `etatArbre` : 'nu' | 'fleurs' | 'feuilles' | 'roux'. */
function dessinerArbre(ctx, x, sol, taille, etatArbre) {
  var tronc = taille * 0.5;
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = Math.max(3, taille * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, sol);
  ctx.lineTo(x, sol - tronc);
  ctx.stroke();

  if (etatArbre === 'nu') {
    /* Des branches nues, avec un trait de neige. */
    ctx.lineWidth = Math.max(2, taille * 0.07);
    var branches = [[-0.55, -0.85], [0.55, -0.9], [-0.3, -1.15], [0.32, -1.2], [0, -1.3]];
    for (var i = 0; i < branches.length; i++) {
      ctx.strokeStyle = '#7a5230';
      ctx.beginPath();
      ctx.moveTo(x, sol - tronc);
      ctx.lineTo(x + branches[i][0] * taille * 0.55, sol + branches[i][1] * taille * 0.55 - tronc * 0.4);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (var j = 0; j < branches.length; j++) {
      ctx.beginPath();
      ctx.arc(x + branches[j][0] * taille * 0.55, sol + branches[j][1] * taille * 0.55 - tronc * 0.4,
        taille * 0.05, 0, TAU);
      ctx.fill();
    }
    return;
  }

  /* Une couronne joufflue : trois boules (chacune son tracé, sinon les
   * cordes qui relient les arcs creusent des encoches dans la couronne). */
  var couleurs = {
    fleurs: '#8fd49a',
    feuilles: '#3f9c55',
    roux: '#d9822b'
  };
  ctx.fillStyle = couleurs[etatArbre];
  var boules = [
    [0, -0.32, 0.4],
    [-0.3, -0.12, 0.32],
    [0.3, -0.12, 0.32]
  ];
  for (var b = 0; b < boules.length; b++) {
    ctx.beginPath();
    ctx.arc(x + boules[b][0] * taille, sol - tronc + boules[b][1] * taille, boules[b][2] * taille, 0, TAU);
    ctx.fill();
  }

  if (etatArbre === 'fleurs') {
    /* Des fleurs roses semées sur la couronne. */
    ctx.fillStyle = '#ff9dbf';
    var fleurs = [[-0.35, -0.2], [0.05, -0.45], [0.38, -0.15], [-0.1, -0.05], [0.2, -0.38], [-0.28, -0.42]];
    for (var k = 0; k < fleurs.length; k++) {
      ctx.beginPath();
      ctx.arc(x + fleurs[k][0] * taille, sol - tronc + fleurs[k][1] * taille - taille * 0.1,
        taille * 0.055, 0, TAU);
      ctx.fill();
    }
  }
}

export function creerVueFenetre(canvas) {
  var ctx = canvas.getContext('2d');

  function geometrie() {
    var w = canvas.width;
    var h = canvas.height;
    var compact = Math.min(w, h) < 330 * (window.devicePixelRatio || 1);
    var solY = h * 0.72;
    return { w: w, h: h, solY: solY, compact: compact };
  }

  return {
    rendre: function (jour) {
      var g = geometrie();
      var s = saison(jour, 'nord');
      var p = (penchementNord(jour) + 1) / 2; /* 0 = plein hiver, 1 = plein été */

      /* Le ciel. */
      var ciel = ctx.createLinearGradient(0, 0, 0, g.solY);
      ciel.addColorStop(0, melanger(CIEL_HIVER_HAUT, CIEL_ETE_HAUT, p));
      ciel.addColorStop(1, melanger(CIEL_HIVER_BAS, CIEL_ETE_BAS, p));
      ctx.fillStyle = ciel;
      ctx.fillRect(0, 0, g.w, g.h);

      /* L'arc du Soleil : il se lève à gauche, culmine au milieu (midi),
       * se couche à droite. Sa hauteur suit le modèle : tout bas l'hiver,
       * tout là-haut l'été. */
      var hauteur = hauteurSoleilMidi(jour); /* ~19,5° à ~66,5° */
      var gauche = g.w * 0.1;
      var droite = g.w * 0.9;
      var sommetY = g.solY - (hauteur / 75) * (g.solY - g.h * 0.1);
      ctx.beginPath();
      /* Le sommet d'une courbe quadratique est à mi-chemin du point de
       * contrôle : on le place pour que l'arc culmine pile sur le Soleil. */
      ctx.moveTo(gauche, g.solY);
      ctx.quadraticCurveTo(g.w * 0.5, 2 * sommetY - g.solY, droite, g.solY);
      ctx.strokeStyle = 'rgba(255, 159, 28, 0.55)';
      ctx.lineWidth = Math.max(2, g.w * 0.006);
      ctx.setLineDash([5, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      /* Le Soleil de midi, au sommet de son arc. */
      dessinerPetitSoleil(ctx, g.w * 0.5, sommetY, Math.min(g.w, g.h) * (g.compact ? 0.075 : 0.065));

      /* Flocons d'hiver, feuilles d'automne qui volent. */
      if (s === 'hiver') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (var i = 0; i < FLOCONS.length; i++) {
          ctx.beginPath();
          ctx.arc(FLOCONS[i].x * g.w, FLOCONS[i].y * g.solY, FLOCONS[i].r * g.w * 0.006 + 1.5, 0, TAU);
          ctx.fill();
        }
      } else if (s === 'automne') {
        ctx.fillStyle = 'rgba(217, 130, 43, 0.85)';
        for (var k = 0; k < FEUILLES_VOLANTES.length; k++) {
          ctx.beginPath();
          ctx.ellipse(FEUILLES_VOLANTES[k].x * g.w, (0.35 + FEUILLES_VOLANTES[k].y * 0.6) * g.solY,
            FEUILLES_VOLANTES[k].r * g.w * 0.008 + 2, g.w * 0.004 + 1, 0.6, 0, TAU);
          ctx.fill();
        }
      }

      /* Le sol. */
      ctx.fillStyle = SOLS[s];
      ctx.beginPath();
      ctx.moveTo(0, g.solY + g.h * 0.02);
      ctx.quadraticCurveTo(g.w * 0.5, g.solY - g.h * 0.03, g.w, g.solY + g.h * 0.02);
      ctx.lineTo(g.w, g.h);
      ctx.lineTo(0, g.h);
      ctx.closePath();
      ctx.fill();

      /* L'arbre du jardin. */
      dessinerArbre(ctx, g.w * 0.2, g.solY + g.h * 0.01, Math.min(g.w, g.h) * 0.3, arbreDuJour(jour));

      /* La barre du jour : la part de la journée où il fait clair.
       * Nuit sombre aux deux bouts, or au milieu (autour de midi). */
      var duree = dureeJourHeures(jour);
      var bx = g.w * 0.08;
      var bw = g.w * 0.84;
      var by = g.h * 0.88;
      var bh = Math.max(8, g.h * 0.055);
      var arrondi = bh / 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, arrondi);
      else ctx.rect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(11, 16, 32, 0.85)';
      ctx.fill();
      /* La part de jour, centrée sur midi. */
      var partJour = duree / 24;
      var jx = bx + bw * (0.5 - partJour / 2);
      var jw = bw * partJour;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(jx, by, jw, bh, arrondi);
      else ctx.rect(jx, by, jw, bh);
      ctx.fillStyle = '#ffcf5c';
      ctx.fill();
      /* Ses petites légendes. */
      if (!g.compact) {
        var taille = Math.round(g.h * 0.042);
        ctx.font = '600 ' + taille + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(233, 237, 248, 0.9)';
        ctx.fillText('🌙', bx + bh * 0.9, by + bh / 2);
        ctx.fillText('🌙', bx + bw - bh * 0.9, by + bh / 2);
        ctx.fillStyle = 'rgba(11, 16, 32, 0.9)';
        ctx.fillText(Math.round(duree) + ' h de jour', bx + bw / 2, by + bh / 2);
      }
    }
  };
}

/* La version miniature pour le médaillon flottant (mobile) : le ciel, le
 * Soleil à sa hauteur du moment et l'arbre — l'essentiel d'un coup d'œil. */
export function dessinerMiniFenetre(ctx, w, h, jour) {
  var s = saison(jour, 'nord');
  var p = (penchementNord(jour) + 1) / 2;
  var solY = h * 0.74;
  var ciel = ctx.createLinearGradient(0, 0, 0, solY);
  ciel.addColorStop(0, melanger(CIEL_HIVER_HAUT, CIEL_ETE_HAUT, p));
  ciel.addColorStop(1, melanger(CIEL_HIVER_BAS, CIEL_ETE_BAS, p));
  ctx.fillStyle = ciel;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = SOLS[s];
  ctx.fillRect(0, solY, w, h - solY);
  var hauteur = hauteurSoleilMidi(jour);
  var sommetY = solY - (hauteur / 75) * (solY - h * 0.14);
  dessinerPetitSoleil(ctx, w * 0.62, sommetY, Math.min(w, h) * 0.14);
  dessinerArbre(ctx, w * 0.28, solY + h * 0.02, Math.min(w, h) * 0.34, arbreDuJour(jour));
}
