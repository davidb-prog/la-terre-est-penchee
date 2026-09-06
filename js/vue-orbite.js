/*
 * La vue de l'espace : le Soleil FIXE au centre, l'orbite vue de biais,
 * la Terre penchée qui en fait le tour. C'est ici que vit le
 * geste-signature : attraper la Terre et lui faire faire le tour du Soleil.
 */
import {
  TAU, ANNEE_JOURS, JOUR_SOLSTICE_ETE, AXE_DIR,
  positionTerre, axeDirection, angleAnnee, jourNormalise, penchementNord,
  positionLocaleMaison, positionLocaleKangourou, extremitesAnneau,
  forceFaisceau, aplombLumiere, directionNuit
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

/* La lumière : UN faisceau large qui arrose TOUTE la face de la Terre
 * (comme en vrai — le Soleil ne vise personne), et des taches d'arrivée
 * qui font la pédagogie : vive et ramassée là où la lumière frappe bien
 * en face (chez nous l'été, l'Australie l'hiver), aucune là où elle rase
 * (la lumière glisse sans chauffer). Le faisceau s'éteint autour des
 * équinoxes (loi pure forceFaisceau). */
function dessinerFaisceauLarge(ctx, g, p, force) {
  if (force < 0.05) return;
  var lx = p.x - g.cx, ly = p.y - g.cy;
  var nl = Math.hypot(lx, ly) || 1; lx /= nl; ly /= nl;
  var px = -ly, py = lx;
  ctx.save();
  /* jamais par-dessus le globe : son disque est découpé du faisceau */
  ctx.beginPath();
  ctx.rect(-100000, -100000, 200000, 200000);
  ctx.arc(p.x, p.y, g.rTerre - 0.5, 0, TAU, true);
  ctx.clip('evenodd');
  var degrade = ctx.createLinearGradient(g.cx + lx * g.rSoleil, g.cy + ly * g.rSoleil, p.x, p.y);
  degrade.addColorStop(0, 'rgba(255, 224, 130, ' + (0.38 * force) + ')');
  degrade.addColorStop(1, 'rgba(255, 207, 92, ' + (0.08 * force) + ')');
  ctx.beginPath();
  ctx.moveTo(g.cx + lx * g.rSoleil * 1.02 + px * g.rSoleil * 0.6, g.cy + ly * g.rSoleil * 1.02 + py * g.rSoleil * 0.6);
  ctx.lineTo(p.x + px * g.rTerre * 0.98, p.y + py * g.rTerre * 0.98);
  ctx.lineTo(p.x - px * g.rTerre * 0.98, p.y - py * g.rTerre * 0.98);
  ctx.lineTo(g.cx + lx * g.rSoleil * 1.02 - px * g.rSoleil * 0.6, g.cy + ly * g.rSoleil * 1.02 - py * g.rSoleil * 0.6);
  ctx.closePath();
  ctx.fillStyle = degrade;
  ctx.fill();
  ctx.restore();
}

/* Une tache d'arrivée, posée sur le bord du globe, allongée le long de la
 * surface. Cœur clair, bords en dégradé ; elle se fond dès que la lumière
 * rase (aplomb < 0,45) et disparaît sous 0,25 — pas de tache pour une
 * lumière qui glisse. */
function dessinerTache(ctx, tx, ty, gx, gy, rG, aplomb, force) {
  var fondu = Math.min(1, Math.max(0, (aplomb - 0.25) / 0.2));
  var alpha = (0.35 + 0.6 * aplomb) * force * fondu;
  if (alpha < 0.04) return;
  var nx = tx - gx, ny = ty - gy;
  var nn = Math.hypot(nx, ny) || 1; nx /= nn; ny /= nn;
  var demiTache = rG * Math.min(0.8, 0.32 / Math.max(0.16, aplomb));
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(Math.atan2(nx, -ny));
  ctx.scale(demiTache, Math.max(2, rG * 0.13));
  var doux = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  doux.addColorStop(0, 'rgba(255, 250, 215, ' + alpha + ')');
  doux.addColorStop(0.55, 'rgba(255, 240, 170, ' + (alpha * 0.6) + ')');
  doux.addColorStop(1, 'rgba(255, 240, 170, 0)');
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fillStyle = doux;
  ctx.fill();
  ctx.restore();
}

/* Le kangourou dessiné : une vraie silhouette marron clair, d'un seul
 * trait de profil (les cinq signes qui font « kangourou » : oreilles
 * dressées, museau allongé, dos courbé sur la grosse cuisse, queue
 * épaisse posée au sol, grand pied plat). L'émoji sortait en glyphe GRIS
 * sur iPhone (WebKit, malgré le sélecteur VS16 et la police d'émojis
 * explicite) — la silhouette garantit sa couleur partout. Coordonnées
 * locales : les pieds en (0,0), le corps vers le haut, tête à gauche —
 * la rotation le met tête en bas aux antipodes. */
function dessinerKangourou(ctx, x, y, rotation, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(s * 0.92, s * 0.92);
  /* L'anatomie en formes franches ; l'union se contoure sans coutures :
   * passe 1, chaque forme au trait sombre epais ; passe 2, chaque forme
   * remplie — le remplissage mange la moitie interieure des traits, il ne
   * reste que le contour exterieur de l'union. */
  var formes = [
    function () { ctx.ellipse(0.1, -0.32, 0.3, 0.27, 0.1, 0, TAU); },      /* cuisse   */
    function () { ctx.ellipse(-0.08, -0.68, 0.16, 0.3, -0.25, 0, TAU); },  /* torse    */
    function () { ctx.ellipse(-0.24, -0.97, 0.08, 0.16, -0.55, 0, TAU); }, /* cou      */
    function () { ctx.ellipse(-0.38, -1.13, 0.25, 0.125, 0.18, 0, TAU); }, /* tete     */
    function () { ctx.ellipse(-0.3, -1.36, 0.05, 0.17, -0.35, 0, TAU); },  /* oreille  */
    function () { ctx.ellipse(-0.19, -1.35, 0.05, 0.17, 0.22, 0, TAU); },  /* oreille  */
    function () { ctx.ellipse(-0.12, -0.06, 0.3, 0.06, 0, 0, TAU); },      /* pied     */
    function () {                                                          /* queue    */
      ctx.moveTo(0.2, -0.42);
      ctx.quadraticCurveTo(0.66, -0.46, 0.9, -0.04);
      ctx.quadraticCurveTo(0.55, -0.18, 0.18, -0.12);
      ctx.closePath();
    }
  ];
  var i;
  ctx.strokeStyle = 'rgba(7, 11, 23, 0.55)';
  ctx.lineWidth = 0.07;
  ctx.lineJoin = 'round';
  for (i = 0; i < formes.length; i++) { ctx.beginPath(); formes[i](); ctx.stroke(); }
  ctx.fillStyle = '#e0975f';
  for (i = 0; i < formes.length; i++) { ctx.beginPath(); formes[i](); ctx.fill(); }
  /* Le pli de la patte : la grosse cuisse se lit d'un trait. */
  ctx.strokeStyle = 'rgba(7, 11, 23, 0.3)';
  ctx.lineWidth = 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.3, -0.4);
  ctx.quadraticCurveTo(0.34, -0.2, 0.14, -0.07);
  ctx.stroke();
  /* Le petit bras replié sur le poitrail, dans un brun plus soutenu. */
  ctx.fillStyle = '#c47f4a';
  ctx.beginPath();
  ctx.ellipse(-0.16, -0.62, 0.05, 0.1, -0.4, 0, TAU);
  ctx.fill();
  /* L'œil. */
  ctx.fillStyle = '#0b1020';
  ctx.beginPath();
  ctx.arc(-0.47, -1.16, 0.035, 0, TAU);
  ctx.fill();
  ctx.restore();
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
    /* En mode compact (téléphone), le globe se mesure à la LARGEUR : c'est
     * la hauteur qui manque sur un téléphone, et chaque resserrage en vh
     * rognait le globe (57 → 43 px de diamètre en une semaine — retour
     * utilisateur : « très petit »). 8 % de la largeur = la Terre du jeu
     * (54 px) dans la scène aussi, quelle que soit la hauteur ; plafond
     * plafond dérivé de la hauteur : aux équinoxes la Terre passe par
     * cy ± ry, avec son anneau (1,73 rTerre) au-delà et le Soleil en deçà
     * — il faut 0,48 h ≥ rSoleil + 6 px + rTerre + 1,73 rTerre, sinon la
     * garde verticale resserre l'orbite jusqu'à mettre la Terre dans le
     * Soleil (iPhone SE : canvas de 170 px de haut). (0,085 l donnait 57 px,
     * mais la Terre tenue au doigt reposait alors sur le Soleil aux
     * équinoxes — 9 px entre les disques ; à 0,08, 14 px.) */
    var dpr = window.devicePixelRatio || 1;
    var rSoleil = Math.min(w, h) * 0.08; /* 8 % : de l'air pour l'orbite et le faisceau */
    var rTerre = compact
      ? Math.min(w * 0.08, (h * 0.48 - rSoleil - 6 * dpr) / (1 + 1.73))
      : Math.min(w, h) * 0.095;
    /* Le globe et son anneau « attrape-moi » (jusqu'à 1,6 rTerre) doivent
     * tenir en entier : aux solstices (bord gauche/droit) ET aux équinoxes
     * (bord haut/bas — la Terre passe par cy ± ry, l'anneau au-dessus et
     * au-dessous). L'orbite se borne des deux côtés, même marge (0,13
     * rTerre) ; sans la garde verticale, l'anneau dépassait de 5 px sous
     * le canvas de la scène mobile à l'automne. */
    var rx = Math.min(w * 0.38, h * 0.62, w * 0.5 - rTerre * 1.73, (h * 0.48 - rTerre * 1.73) / 0.52);
    var ry = rx * 0.52;
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
      /* 1,4 rTerre au repos, 1,6 tenue (avant : 1,6 → 1,82 — l'anneau
       * plein débordait du canvas de la scène mobile aux équinoxes) */
      ctx.arc(p.x, p.y, r * (1.4 + 0.2 * halo), 0, TAU);
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
    /* Le voile de nuit : la moitié qui ne regarde pas le Soleil. La loi
     * vit dans le modèle (directionNuit) : ombre géométrique aux
     * solstices, terminateur par les deux pôles aux équinoxes — chaque
     * moitié mi-jour mi-nuit, l'égalité qui se voit. Maison et kangourou
     * se dessinent PAR-DESSUS (retour utilisateur : sous le voile, ils
     * semblaient plongés dans une nuit permanente — or l'hiver a aussi
     * ses journées ; ce sont des repères, pas des points physiques). */
    var nuit = directionNuit(jour);
    var nX = nuit.x, nY = -nuit.y; /* bascule math → canvas */
    /* la rampe est courte : la nuit est FRANCHE dès le milieu de sa
     * moitié (retours utilisateur : « pas assez sombre », deux fois) */
    var ombre = ctx.createLinearGradient(
      p.x - nX * r * 0.1, p.y - nY * r * 0.1,
      p.x + nX * r * 0.55, p.y + nY * r * 0.55);
    ombre.addColorStop(0, 'rgba(7, 11, 23, 0)');
    ombre.addColorStop(0.35, 'rgba(7, 11, 23, 0.62)');
    ombre.addColorStop(0.75, 'rgba(7, 11, 23, 0.8)');
    ombre.addColorStop(1, 'rgba(7, 11, 23, 0.85)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = ombre;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    ctx.restore();

    dessinerMaison(ctx, p.x + dMaison.x * r, p.y + dMaison.y * r, angleAxe, r * 0.42);
    dessinerKangourou(ctx, p.x + dKangourou.x * r, p.y + dKangourou.y * r, angleAxe + Math.PI, r * 0.5);
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
      /* Le faisceau large : la lumière arrose TOUTE la face de la Terre —
       * elle ne vise personne (décision utilisateur : la version fidèle).
       * Ce sont les taches d'arrivée qui racontent l'angle, une par moitié.
       * On part du point qui fait face au Soleil et on tourne vers le haut
       * de l'axe (chez nous) ou vers le bas (l'Australie), d'un angle qui
       * suit la saison : 15° pour la moitié bien en face, 75° pour celle
       * qui rase. L'aplomb du sud est celui du nord six mois plus tard
       * (miroir exact du modèle : cos(a + pi) = -cos(a)). */
      var p = positionTerreCanvas(jour, g);
      var force = forceFaisceau(jour);
      dessinerFaisceauLarge(ctx, g, p, force);
      var versSoleil = { x: g.cx - p.x, y: g.cy - p.y };
      var nvs = Math.hypot(versSoleil.x, versSoleil.y) || 1;
      versSoleil.x /= nvs; versSoleil.y /= nvs;
      var axeEcran = { x: AXE_DIR.x, y: -AXE_DIR.y };
      var croix = versSoleil.x * axeEcran.y - versSoleil.y * axeEcran.x;
      var penchant = penchementNord(jour);
      var thetaNord = ((45 - 30 * penchant) * Math.PI / 180) * croix;
      var thetaSud = -((45 + 30 * penchant) * Math.PI / 180) * croix;
      var cosN = Math.cos(thetaNord), sinN = Math.sin(thetaNord);
      var cosS = Math.cos(thetaSud), sinS = Math.sin(thetaSud);
      var cibleNord = { x: p.x + (versSoleil.x * cosN - versSoleil.y * sinN) * g.rTerre,
                        y: p.y + (versSoleil.x * sinN + versSoleil.y * cosN) * g.rTerre };
      var cibleSud = { x: p.x + (versSoleil.x * cosS - versSoleil.y * sinS) * g.rTerre,
                       y: p.y + (versSoleil.x * sinS + versSoleil.y * cosS) * g.rTerre };
      var aplombNord = aplombLumiere(jour);
      var aplombSud = aplombLumiere(jour + ANNEE_JOURS / 2);
      dessinerTerre(ctx, g, jour, halo);
      /* les taches d'arrivée : vive là où la lumière frappe en face,
       * aucune là où elle rase */
      dessinerTache(ctx, cibleNord.x, cibleNord.y, p.x, p.y, g.rTerre, aplombNord, force);
      dessinerTache(ctx, cibleSud.x, cibleSud.y, p.x, p.y, g.rTerre, aplombSud, force);
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
