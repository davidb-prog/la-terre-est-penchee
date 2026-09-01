/*
 * La vue de l'espace : le Soleil FIXE au centre, l'orbite vue de biais,
 * la Terre penchée qui en fait le tour. C'est ici que vit le
 * geste-signature : attraper la Terre et lui faire faire le tour du Soleil.
 */
import {
  TAU, ANNEE_JOURS, JOUR_SOLSTICE_ETE, AXE_DIR,
  positionTerre, axeDirection, angleAnnee, jourNormalise, penchementNord,
  positionLocaleMaison, positionLocaleKangourou, extremitesAnneau,
  forceFaisceau, aplombLumiere
} from './model.js';

var CIEL = '#070b17';
var COULEUR_ORBITE = 'rgba(154, 165, 195, 0.35)';

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

/* La lumière qui frappe : un faisceau doux du bord du Soleil vers la cible,
 * et la tache d'arrivée qui fait la pédagogie. Le sweet spot d'été est
 * généreux (le Soleil n'éclaire pas qu'un point), et quand la lumière rase
 * (hiver), la tache s'efface au profit du faisceau diffus — une ellipse
 * plate n'aurait pas de sens. `partie` : 'faisceau' (avant le globe,
 * découpé hors de son disque) ou 'tache' (après, posée sur la surface). */
function dessinerLumiere(ctx, sx, sy, rS, tx, ty, gx, gy, rG, aplomb, partie, force) {
  if (force < 0.05) return;
  var lx = tx - sx, ly = ty - sy;
  var nl = Math.hypot(lx, ly) || 1; lx /= nl; ly /= nl;
  var px = -ly, py = lx;
  var nx = tx - gx, ny = ty - gy;
  var nn = Math.hypot(nx, ny) || 1; nx /= nn; ny /= nn;
  var tanx = -ny, tany = nx;
  if (tanx * px + tany * py < 0) { tanx = -tanx; tany = -tany; }
  var demiTache = rG * Math.min(0.8, 0.28 / Math.max(0.16, aplomb));
  if (partie === 'faisceau') {
    ctx.save();
    /* jamais par-dessus le globe : son disque est découpé du faisceau */
    ctx.beginPath();
    ctx.rect(-100000, -100000, 200000, 200000);
    ctx.arc(gx, gy, rG - 0.5, 0, TAU, true);
    ctx.clip('evenodd');
    var degrade = ctx.createLinearGradient(sx + lx * rS, sy + ly * rS, tx, ty);
    degrade.addColorStop(0, 'rgba(255, 224, 130, ' + (0.42 * force) + ')');
    degrade.addColorStop(1, 'rgba(255, 207, 92, ' + (0.1 * force) + ')');
    ctx.beginPath();
    ctx.moveTo(sx + lx * rS * 1.02 + px * rS * 0.34, sy + ly * rS * 1.02 + py * rS * 0.34);
    ctx.lineTo(tx + tanx * demiTache, ty + tany * demiTache);
    ctx.lineTo(tx - tanx * demiTache, ty - tany * demiTache);
    ctx.lineTo(sx + lx * rS * 1.02 - px * rS * 0.34, sy + ly * rS * 1.02 - py * rS * 0.34);
    ctx.closePath();
    ctx.fillStyle = degrade;
    ctx.fill();
    ctx.restore();
  } else {
    /* la tache s'efface quand la lumière rase (aplomb < 0,45) — en dessous
     * de 0,25, plus d'ellipse du tout : le faisceau diffus raconte seul */
    var fondu = Math.min(1, Math.max(0, (aplomb - 0.25) / 0.2));
    var alpha = (0.2 + 0.55 * aplomb) * force * fondu;
    if (alpha < 0.04) return;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(Math.atan2(tany, tanx));
    ctx.scale(demiTache, Math.max(2, rG * 0.09));
    /* bords doux : un dégradé radial plutôt qu'une ellipse franche */
    var doux = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    doux.addColorStop(0, 'rgba(255, 240, 170, ' + alpha + ')');
    doux.addColorStop(0.65, 'rgba(255, 240, 170, ' + (alpha * 0.55) + ')');
    doux.addColorStop(1, 'rgba(255, 240, 170, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.fillStyle = doux;
    ctx.fill();
    ctx.restore();
  }
}

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
    var rSoleil = Math.min(w, h) * 0.08; /* 8 % : de l'air pour l'orbite et le faisceau */
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
    var boule = ctx.createRadialGradient(g.cx - r * 0.18, g.cy - r * 0.22, r * 0.08, g.cx, g.cy, r);
    boule.addColorStop(0, '#fff7d6');
    boule.addColorStop(0.45, '#ffe29a');
    boule.addColorStop(0.8, '#ffcf5c');
    boule.addColorStop(1, '#ff9f1c');
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, r, 0, TAU);
    ctx.fillStyle = boule;
    ctx.fill();
    /* trois granules de surface, pour la rondeur */
    ctx.strokeStyle = 'rgba(255, 159, 28, 0.5)';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.lineCap = 'round';
    [[-0.42, -0.28, 0.26], [-0.1, 0.42, 0.3], [0.38, 0.18, 0.22]].forEach(function (gr) {
      ctx.beginPath();
      ctx.arc(g.cx + gr[0] * r, g.cy + gr[1] * r, gr[2] * r, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    });
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

    /* Les anneaux de latitude : chez nous et l'Australie n'habitent pas un
     * point du globe, ils habitent tout leur ruban (la Terre tourne dessus
     * chaque jour) — et un ruban reste à la même distance du Soleil été
     * comme hiver : rien ne se rapproche du Soleil dans ce dessin. Dessinés
     * bombés vers l'équateur, comme de vrais rubans posés sur la boule. */
    ['nord', 'sud'].forEach(function (hemisphere) {
      var bouts = extremitesAnneau(hemisphere);
      var signe = hemisphere === 'nord' ? 1 : -1;
      var controleX = p.x + ((bouts[0].x + bouts[1].x) / 2 - a.x * signe * 0.4) * r;
      var controleY = p.y - ((bouts[0].y + bouts[1].y) / 2 + a.y * signe * 0.4) * r;
      ctx.beginPath();
      ctx.moveTo(p.x + bouts[0].x * r, p.y - bouts[0].y * r);
      ctx.quadraticCurveTo(controleX, controleY, p.x + bouts[1].x * r, p.y - bouts[1].y * r);
      ctx.strokeStyle = hemisphere === 'nord'
        ? 'rgba(143, 224, 203, 0.8)' : 'rgba(188, 217, 255, 0.65)';
      ctx.lineWidth = Math.max(1.5, r * 0.06);
      ctx.lineCap = 'round';
      ctx.stroke();
    });

    /* le modelé : un voile clair, un bord assombri — la boule est ronde */
    var modele = ctx.createRadialGradient(p.x - r * 0.25, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
    modele.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    modele.addColorStop(0.6, 'rgba(255, 255, 255, 0.04)');
    modele.addColorStop(1, 'rgba(7, 11, 23, 0.28)');
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fillStyle = modele;
    ctx.fill();

    /* Le contour. */
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.strokeStyle = 'rgba(233, 237, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* La maison, assise SUR SON RUBAN, au-devant du globe (sur l'axe de
     * symétrie de l'anneau — jamais sur la face qui regarde le Soleil, et
     * un cran vers l'équateur pour ne pas se coller au bâton de l'axe).
     * Le kangourou aux antipodes, sur le ruban sud, la tête en bas. */
    var m = positionLocaleMaison();
    var k = positionLocaleKangourou();
    var versEquateur = 0.18; /* en rayons de globe, le long de l'axe */
    var dMaison = { x: m.x - AXE_DIR.x * versEquateur, y: -(m.y - AXE_DIR.y * versEquateur) };
    var dKangourou = { x: k.x + AXE_DIR.x * versEquateur, y: -(k.y + AXE_DIR.y * versEquateur) };
    dessinerMaison(ctx, p.x + dMaison.x * r, p.y + dMaison.y * r, angleAxe, r * 0.42);
    ctx.save();
    ctx.translate(p.x + dKangourou.x * r, p.y + dKangourou.y * r);
    ctx.rotate(angleAxe + Math.PI);
    ctx.font = Math.round(r * 0.6) + 'px system-ui, sans-serif';
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
      /* Le faisceau de lumière : sa cible vit sur le BORD ÉCLAIRÉ du globe —
       * on part du point qui fait face au Soleil et on tourne vers le haut
       * de l'axe, d'un angle qui suit la saison (15° l'été → 75° l'hiver)
       * et s'adoucit aux alignements. Force et aplomb viennent du modèle
       * (testés) : plein aux solstices, éteint aux équinoxes. */
      var p = positionTerreCanvas(jour, g);
      var versSoleil = { x: g.cx - p.x, y: g.cy - p.y };
      var nvs = Math.hypot(versSoleil.x, versSoleil.y) || 1;
      versSoleil.x /= nvs; versSoleil.y /= nvs;
      var axeEcran = { x: AXE_DIR.x, y: -AXE_DIR.y };
      var croix = versSoleil.x * axeEcran.y - versSoleil.y * axeEcran.x;
      var gammaLumiere = ((45 - 30 * penchementNord(jour)) * Math.PI / 180) * croix;
      var cosG = Math.cos(gammaLumiere), sinG = Math.sin(gammaLumiere);
      var dirCible = { x: versSoleil.x * cosG - versSoleil.y * sinG,
                       y: versSoleil.x * sinG + versSoleil.y * cosG };
      var cibleX = p.x + dirCible.x * g.rTerre;
      var cibleY = p.y + dirCible.y * g.rTerre;
      var force = forceFaisceau(jour);
      var aplomb = aplombLumiere(jour);
      dessinerLumiere(ctx, g.cx, g.cy, g.rSoleil, cibleX, cibleY, p.x, p.y, g.rTerre, aplomb, 'faisceau', force);
      dessinerTerre(ctx, g, jour, halo);
      /* la tache de lumière : ramassée et vive quand le Soleil frappe en
       * face (été), effacée quand il rase (le faisceau diffus suffit) */
      dessinerLumiere(ctx, g.cx, g.cy, g.rSoleil, cibleX, cibleY, p.x, p.y, g.rTerre, aplomb, 'tache', force);
      /* Les petites étiquettes (pas en mode compact). */
      if (!g.compact) {
        var taille = Math.round(Math.min(g.w, g.h) * 0.035);
        ctx.fillStyle = 'rgba(154, 165, 195, 0.9)';
        ctx.font = '600 ' + taille + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Soleil', g.cx, g.cy + g.rSoleil + taille * 1.4);
        /* Sous le globe : la maison vit en haut à droite, le kangourou à
         * gauche — le bas reste libre. */
        ctx.fillText('Terre', p.x + g.rTerre * 0.4, p.y + g.rTerre + taille * 1.8);
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
