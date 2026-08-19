/*
 * La vue de l'espace : le Soleil FIXE au centre, l'orbite vue de biais,
 * la Terre penchée qui en fait le tour. C'est ici que vit le
 * geste-signature : attraper la Terre et lui faire faire le tour du Soleil.
 */
import {
  TAU, ANNEE_JOURS, JOUR_SOLSTICE_ETE,
  positionTerre, axeDirection, angleAnnee, jourNormalise
} from './model.js';

var CIEL = '#070b17';
var COULEUR_ORBITE = 'rgba(154, 165, 195, 0.35)';
var COULEUR_LUMIERE = 'rgba(255, 207, 92, 0.5)';

/* Étoiles décoratives, déterministes (petit générateur maison, graine fixe). */
function fabriquerEtoiles(n) {
  var etoiles = [];
  var graine = 7;
  function suivant() {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    return graine / 2147483648;
  }
  for (var i = 0; i < n; i++) {
    etoiles.push({ x: suivant(), y: suivant(), r: 0.4 + suivant() * 1.1, a: 0.25 + suivant() * 0.55 });
  }
  return etoiles;
}
var ETOILES = fabriquerEtoiles(90);

/* Les quatre repères de saison autour de l'orbite (pour chez nous, au nord).
 * Été à gauche (la Terre y penche vers le Soleil), hiver à droite. */
var REPERES_SAISONS = [
  { emoji: '☀️', angle: 0 },
  { emoji: '🍂', angle: TAU / 4 },
  { emoji: '❄️', angle: TAU / 2 },
  { emoji: '🌸', angle: (3 * TAU) / 4 }
];

export function creerVueOrbite(canvas) {
  var ctx = canvas.getContext('2d');

  /* Géométrie recalculée à chaque rendu (le canvas peut changer de taille). */
  function geometrie() {
    var w = canvas.width;
    var h = canvas.height;
    var compact = Math.min(w, h) < 400 * (window.devicePixelRatio || 1);
    var cx = w * 0.5;                 /* le Soleil au centre : l'objet-repère fixe */
    var cy = h * 0.52;
    var rx = Math.min(w * 0.38, h * 0.62);
    var ry = rx * 0.52;
    var rTerre = Math.min(w, h) * (compact ? 0.105 : 0.095);
    var rSoleil = Math.min(w, h) * 0.115;
    return { w: w, h: h, cx: cx, cy: cy, rx: rx, ry: ry, rTerre: rTerre, rSoleil: rSoleil, compact: compact };
  }

  /* Position de la Terre sur le canvas (bascule math → canvas : y inversé). */
  function positionTerreCanvas(jour, g) {
    var p = positionTerre(jour);
    return { x: g.cx + p.x * g.rx, y: g.cy - p.y * g.ry };
  }

  function dessinerSoleil(ctx, g) {
    var r = g.rSoleil;
    var halo = ctx.createRadialGradient(g.cx, g.cy, r * 0.4, g.cx, g.cy, r * 3.2);
    halo.addColorStop(0, 'rgba(255, 207, 92, 0.5)');
    halo.addColorStop(1, 'rgba(255, 207, 92, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(g.cx - r * 3.2, g.cy - r * 3.2, r * 6.4, r * 6.4);
    /* Les rayons, sages et fixes, tout autour. */
    ctx.strokeStyle = 'rgba(255, 207, 92, 0.5)';
    ctx.lineWidth = Math.max(2, r * 0.07);
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.moveTo(g.cx + Math.cos(a) * r * 1.25, g.cy + Math.sin(a) * r * 1.25);
      ctx.lineTo(g.cx + Math.cos(a) * r * 1.55, g.cy + Math.sin(a) * r * 1.55);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, r, 0, TAU);
    ctx.fillStyle = '#ffcf5c';
    ctx.fill();
  }

  /* Une petite maison éclairée, posée en (x, y), « debout » selon rotation
   * (0 = vers le haut du canvas). */
  function dessinerMaison(ctx, x, y, rotation, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.rect(-s * 0.5, -s * 0.62, s, s * 0.62);
    ctx.moveTo(-s * 0.64, -s * 0.62);
    ctx.lineTo(0, -s * 1.15);
    ctx.lineTo(s * 0.64, -s * 0.62);
    ctx.closePath();
    ctx.fillStyle = '#cdd5ea';
    ctx.fill();
    ctx.strokeStyle = 'rgba(7, 11, 23, 0.8)';
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#ffcf5c';
    ctx.fillRect(-s * 0.17, -s * 0.48, s * 0.34, s * 0.32);
    ctx.restore();
  }

  /* Tourne un vecteur canvas de `angle` radians (sens horaire à l'écran). */
  function tourner(v, angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
  }

  function dessinerTerre(ctx, g, jour, halo) {
    var p = positionTerreCanvas(jour, g);
    var r = g.rTerre;
    var axe = axeDirection(jour);
    /* Bascule math → canvas : le haut de l'axe à l'écran. */
    var a = { x: axe.x, y: -axe.y };
    var angleAxe = Math.atan2(a.x, -a.y); /* rotation canvas : 0 = tout droit */

    /* L'anneau « attrape-moi ». */
    if (halo > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * (1.6 + 0.22 * halo), 0, TAU);
      ctx.strokeStyle = 'rgba(169, 139, 255, ' + (0.35 + 0.4 * halo) + ')';
      ctx.lineWidth = Math.max(2, r * 0.12);
      ctx.stroke();
    }

    /* L'axe penché : un grand bâton qui traverse la Terre.
     * Sa direction ne change JAMAIS — c'est la vérité n° 1. */
    ctx.beginPath();
    ctx.moveTo(p.x - a.x * r * 1.55, p.y - a.y * r * 1.55);
    ctx.lineTo(p.x + a.x * r * 1.55, p.y + a.y * r * 1.55);
    ctx.strokeStyle = 'rgba(233, 237, 248, 0.75)';
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.lineCap = 'round';
    ctx.stroke();

    /* Le globe : DEUX moitiés bien distinctes, séparées par l'équateur.
     * La moitié nord (côté du haut de l'axe) porte la maison — chez nous ;
     * la moitié sud porte le kangourou — l'Australie. Pas de jour/nuit ici :
     * à l'échelle de l'année, seule compte la moitié qui penche vers le
     * Soleil (la rotation quotidienne a son propre épisode). */
    var angleNord = Math.atan2(a.y, a.x);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, angleNord + Math.PI / 2, angleNord + (3 * Math.PI) / 2, false);
    ctx.closePath();
    ctx.fillStyle = '#2f6fb5';  /* la moitié sud, bleu océan */
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, angleNord - Math.PI / 2, angleNord + Math.PI / 2, false);
    ctx.closePath();
    ctx.fillStyle = '#3fa98e';  /* la moitié nord, vert lagon */
    ctx.fill();

    /* L'équateur : la ceinture de la Terre, bien marquée. */
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angleAxe);
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.strokeStyle = 'rgba(255, 207, 92, 0.85)';
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.stroke();
    ctx.restore();

    /* Le contour. */
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.strokeStyle = 'rgba(233, 237, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* Chez nous : la maison à mi-hauteur de la moitié nord (pas sur le
     * pôle !), debout sur la surface. Et l'Australie à mi-hauteur de la
     * moitié sud, du même côté — la tête en bas, comme dans l'histoire. */
    var dMaison = tourner(a, Math.PI / 4);        /* ~45° nord */
    var dKangourou = tourner(a, (3 * Math.PI) / 4); /* ~45° sud */
    dessinerMaison(ctx, p.x + dMaison.x * r, p.y + dMaison.y * r,
      Math.atan2(dMaison.x, -dMaison.y), r * 0.5);
    ctx.save();
    ctx.translate(p.x + dKangourou.x * r, p.y + dKangourou.y * r);
    ctx.rotate(Math.atan2(dKangourou.x, -dKangourou.y));
    ctx.font = Math.round(r * 0.72) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('🦘', 0, 0);
    ctx.restore();
    return p;
  }

  return {
    /* Rendu complet. `halo` dans [0, 1] fait respirer l'anneau « attrape-moi ». */
    rendre: function (jour, halo) {
      var g = geometrie();
      ctx.fillStyle = CIEL;
      ctx.fillRect(0, 0, g.w, g.h);
      /* Les étoiles. */
      for (var i = 0; i < ETOILES.length; i++) {
        var e = ETOILES[i];
        ctx.globalAlpha = e.a;
        ctx.fillStyle = '#e9edf8';
        ctx.beginPath();
        ctx.arc(e.x * g.w, e.y * g.h, e.r * (g.compact ? 0.8 : 1) * (window.devicePixelRatio || 1), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      /* L'orbite, vue de biais. */
      ctx.beginPath();
      ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, 0, TAU);
      ctx.strokeStyle = COULEUR_ORBITE;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      /* Les quatre repères de saison (pour chez nous), autour de l'orbite.
       * Celui où se trouve la Terre s'efface : la Terre y est déjà. */
      var tailleRepere = Math.round(Math.min(g.w, g.h) * (g.compact ? 0.07 : 0.06));
      var angleTerre = angleAnnee(jour);
      ctx.font = tailleRepere + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var k = 0; k < REPERES_SAISONS.length; k++) {
        var rep = REPERES_SAISONS[k];
        var ecart = Math.abs(rep.angle - angleTerre);
        if (ecart > Math.PI) ecart = TAU - ecart;
        if (ecart < 0.45) continue;
        ctx.globalAlpha = Math.min(1, (ecart - 0.45) / 0.5);
        var px = -Math.cos(rep.angle);
        var py = -Math.sin(rep.angle);
        ctx.fillText(rep.emoji,
          g.cx + px * (g.rx + tailleRepere * 1.4),
          g.cy - py * (g.ry + tailleRepere * 1.4));
      }
      ctx.globalAlpha = 1;
      dessinerSoleil(ctx, g);
      /* Le fil de lumière : du Soleil vers la Terre. */
      var p = positionTerreCanvas(jour, g);
      ctx.beginPath();
      ctx.moveTo(g.cx, g.cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = COULEUR_LUMIERE;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      dessinerTerre(ctx, g, jour, halo);
      /* Les petites étiquettes (pas en mode compact). */
      if (!g.compact) {
        var taille = Math.round(Math.min(g.w, g.h) * 0.035);
        ctx.fillStyle = 'rgba(154, 165, 195, 0.9)';
        ctx.font = '600 ' + taille + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Soleil', g.cx, g.cy + g.rSoleil + taille * 1.4);
        /* Décalée vers la gauche : la maison et le kangourou vivent à droite. */
        ctx.fillText('Terre', p.x - g.rTerre * 0.8, p.y + g.rTerre + taille * 1.8);
      }
    },

    /* Le jour correspondant à un point du canvas (pour le glisser).
     * La position canvas de la Terre est (cx − cosθ·rx, cy + sinθ·ry). */
    jourDepuisPointeur: function (x, y) {
      var g = geometrie();
      var t = Math.atan2((y - g.cy) / g.ry, -(x - g.cx) / g.rx);
      if (t < 0) t += TAU;
      return jourNormalise(JOUR_SOLSTICE_ETE + (t / TAU) * ANNEE_JOURS);
    },

    /* Le pointeur est-il assez près de la Terre pour l'attraper ?
     * (zone généreuse : des petits doigts vont viser large) */
    attrapeTerre: function (x, y, jour) {
      var g = geometrie();
      var p = positionTerreCanvas(jour, g);
      var marge = Math.max(g.rTerre * 2.6, 44 * (window.devicePixelRatio || 1));
      var dx = x - p.x;
      var dy = y - p.y;
      return dx * dx + dy * dy <= marge * marge;
    }
  };
}
