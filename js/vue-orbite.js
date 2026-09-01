/*
 * La vue de l'espace, en 3D : le Soleil FIXE au centre (l'objet-repère de
 * la série, une vraie boule), l'orbite vue en perspective depuis un peu
 * au-dessus du plan — le bas de l'écran est PRÈS, le haut est LOIN, la
 * Terre grossit quand elle passe devant et disparaît derrière le Soleil.
 * L'axe est un vrai vecteur 3D constant ; l'équateur et les anneaux de
 * latitude sont de vrais cercles sur la sphère, projetés (leurs moitiés
 * cachées ne se dessinent pas). Le faisceau de lumière frappe le bord
 * éclairé du globe (lois pures du modèle : force et aplomb), et la légende
 * rappelle que la distance ne change jamais.
 * C'est ici que vit le geste-signature : attraper la Terre et lui faire
 * faire le tour du Soleil.
 */
import {
  TAU, ANNEE_JOURS, INCLINAISON_DESSIN_DEGRES, LATITUDE_REPERES_DEGRES,
  angleAnnee, jourNormalise, penchementNord, forceFaisceau, aplombLumiere
} from './model.js';

var CIEL = '#070b17';

/* La caméra : un peu au-dessus du plan de l'orbite, à distance D. */
var PHI = (32 * Math.PI) / 180;
var COS_PHI = Math.cos(PHI);
var SIN_PHI = Math.sin(PHI);
var DISTANCE_CAMERA = 3.1;
/* Les rayons dessinés (en rayons d'orbite, exagérés — documenté) vivent dans
 * geometrie() : plus gros en mode compact, pour que les astres se voient
 * sur un téléphone. */

/* L'axe de la Terre : un vrai vecteur 3D, constant (la vérité n° 1). */
var INCLINAISON_RAD = (INCLINAISON_DESSIN_DEGRES * Math.PI) / 180;
var AXE3 = { x: Math.sin(INCLINAISON_RAD), y: Math.cos(INCLINAISON_RAD), z: 0 };
/* Direction vers la caméra (approximation orthographique pour la visibilité). */
var CAMERA = { x: 0, y: SIN_PHI, z: COS_PHI };
/* Base du plan de l'équateur (perpendiculaire à l'axe). */
var U_EQUATEUR = { x: AXE3.y, y: -AXE3.x, z: 0 };
var V_EQUATEUR = { x: 0, y: 0, z: -1 };
var LATITUDE_RAD = (LATITUDE_REPERES_DEGRES * Math.PI) / 180;

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

/* Les quatre repères de saison autour de l'orbite (pour chez nous, au nord). */
var REPERES_SAISONS = [
  { emoji: '☀️', angle: 0 },
  { emoji: '🍂', angle: TAU / 4 },
  { emoji: '❄️', angle: TAU / 2 },
  { emoji: '🌸', angle: (3 * TAU) / 4 }
];

/* Le kangourou dessiné : une vraie silhouette orange clair (corps, tête,
 * oreilles, queue, œil) — elle se détache du globe et ne se confond pas
 * avec le bâton de l'axe (la charte bannit l'émoji en illustration).
 * Coordonnées locales : les pieds en (0,0), le corps vers le haut, tête à
 * gauche — la rotation la met tête en bas aux antipodes. */
function dessinerKangourou(ctx, x, y, rotation, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(s, s);
  ctx.strokeStyle = '#ffb36b';
  ctx.lineWidth = 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.15, -0.32);
  ctx.quadraticCurveTo(0.62, -0.35, 0.78, -0.06);
  ctx.stroke();
  ctx.fillStyle = '#ffb36b';
  ctx.beginPath();
  ctx.ellipse(0, -0.5, 0.3, 0.42, -0.25, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0.05, -0.22, 0.24, 0.15, 0.35, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-0.08, -0.045, 0.22, 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-0.3, -0.98, 0.17, 0.14, 0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-0.46, -1.02, 0.1, 0.07, 0.25, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-0.2, -1.2, 0.055, 0.16, 0.35, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-0.32, -1.18, 0.055, 0.16, 0.1, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-0.22, -0.62, 0.06, 0.13, 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0b1020';
  ctx.beginPath();
  ctx.arc(-0.34, -1.02, 0.035, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(7, 11, 23, 0.55)';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.ellipse(0, -0.5, 0.3, 0.42, -0.25, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/* Une petite maison éclairée, « debout » selon rotation (0 = vers le haut). */
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

/* La lumière qui frappe : un faisceau doux du bord du Soleil vers la cible,
 * et la tache d'arrivée qui fait la pédagogie — vive et ramassée en face,
 * longue et pâle de biais. `partie` : 'faisceau' (avant le globe, découpé
 * hors de son disque) ou 'tache' (après, posée sur la surface). */
function dessinerLumiere(ctx, sx, sy, rS, tx, ty, gx, gy, rG, aplomb, partie, force) {
  if (force < 0.05) return;
  var lx = tx - sx, ly = ty - sy;
  var nl = Math.hypot(lx, ly) || 1; lx /= nl; ly /= nl;
  var px = -ly, py = lx;
  var nx = tx - gx, ny = ty - gy;
  var nn = Math.hypot(nx, ny) || 1; nx /= nn; ny /= nn;
  var tanx = -ny, tany = nx;
  if (tanx * px + tany * py < 0) { tanx = -tanx; tany = -tany; }
  var demiTache = rG * Math.min(0.8, 0.17 / Math.max(0.16, aplomb));
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
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(Math.atan2(tany, tanx));
    ctx.beginPath();
    ctx.ellipse(0, 0, demiTache, Math.max(2, rG * 0.09), 0, 0, TAU);
    ctx.fillStyle = 'rgba(255, 240, 170, ' + ((0.2 + 0.55 * aplomb) * force) + ')';
    ctx.fill();
    ctx.restore();
  }
}

export function creerVueOrbite(canvas) {
  var ctx = canvas.getContext('2d');

  function geometrie() {
    var w = canvas.width;
    var h = canvas.height;
    var compact = Math.min(w, h) < 400 * (window.devicePixelRatio || 1);
    return {
      w: w, h: h, cx: w * 0.5, cy: h * 0.47,
      f: Math.min(w * 1.18, h * 1.5), compact: compact,
      rTerreM: compact ? 0.2 : 0.17,
      rSoleilM: compact ? 0.16 : 0.14
    };
  }

  /* Projette un point 3D (monde : Soleil à l'origine, y vers le haut) sur
   * le canvas. `s` est l'échelle de perspective au point (près = grand). */
  function projeter(p, g) {
    var yv = p.y * COS_PHI - p.z * SIN_PHI;
    var zv = p.y * SIN_PHI + p.z * COS_PHI;
    var s = g.f / (DISTANCE_CAMERA - zv);
    return { x: g.cx + p.x * s, y: g.cy - yv * s, s: s, zv: zv };
  }

  function terre3D(jour) {
    var a = angleAnnee(jour);
    return { x: -Math.cos(a), y: 0, z: Math.sin(a) };
  }

  function coteCamera(q, c) {
    return (q.x - c.x) * CAMERA.x + (q.y - c.y) * CAMERA.y + (q.z - c.z) * CAMERA.z > 0;
  }

  /* Échantillonne un cercle 3D dans le plan de l'équateur. */
  function cercle(c, r, n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = (i / n) * TAU;
      pts.push({
        x: c.x + r * (U_EQUATEUR.x * Math.cos(t) + V_EQUATEUR.x * Math.sin(t)),
        y: c.y + r * (U_EQUATEUR.y * Math.cos(t) + V_EQUATEUR.y * Math.sin(t)),
        z: c.z + r * (U_EQUATEUR.z * Math.cos(t) + V_EQUATEUR.z * Math.sin(t))
      });
    }
    return pts;
  }

  /* La chaîne des points visibles (côté caméra), dans l'ordre du cercle. */
  function chaineVisible(pts, centre) {
    var n = pts.length, debut = -1;
    for (var i = 0; i < n; i++) {
      if (coteCamera(pts[i], centre) && !coteCamera(pts[(i + n - 1) % n], centre)) { debut = i; break; }
    }
    if (debut === -1) return coteCamera(pts[0], centre) ? pts.slice() : [];
    var chaine = [];
    for (var k = 0; k < n; k++) {
      var p = pts[(debut + k) % n];
      if (!coteCamera(p, centre)) break;
      chaine.push(p);
    }
    return chaine;
  }

  function tracer(ctx, chaine, g) {
    ctx.beginPath();
    for (var i = 0; i < chaine.length; i++) {
      var e = projeter(chaine[i], g);
      if (i === 0) ctx.moveTo(e.x, e.y); else ctx.lineTo(e.x, e.y);
    }
  }

  function dessinerSoleil(ctx, g) {
    var e = projeter({ x: 0, y: 0, z: 0 }, g);
    var r = g.rSoleilM * e.s;
    /* la couronne, puis la BOULE : cœur blanc-chaud, bord orangé */
    var halo = ctx.createRadialGradient(e.x, e.y, r * 0.4, e.x, e.y, r * 3);
    halo.addColorStop(0, 'rgba(255, 207, 92, 0.5)');
    halo.addColorStop(1, 'rgba(255, 207, 92, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(e.x - r * 3, e.y - r * 3, r * 6, r * 6);
    ctx.strokeStyle = 'rgba(255, 207, 92, 0.45)';
    ctx.lineWidth = Math.max(2, r * 0.07);
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(a) * r * 1.25, e.y + Math.sin(a) * r * 1.25);
      ctx.lineTo(e.x + Math.cos(a) * r * 1.5, e.y + Math.sin(a) * r * 1.5);
      ctx.stroke();
    }
    var boule = ctx.createRadialGradient(e.x - r * 0.18, e.y - r * 0.22, r * 0.08, e.x, e.y, r);
    boule.addColorStop(0, '#fff7d6');
    boule.addColorStop(0.45, '#ffe29a');
    boule.addColorStop(0.8, '#ffcf5c');
    boule.addColorStop(1, '#ff9f1c');
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, TAU);
    ctx.fillStyle = boule;
    ctx.fill();
    /* trois granules de surface, pour la rondeur */
    ctx.strokeStyle = 'rgba(255, 159, 28, 0.5)';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    ctx.lineCap = 'round';
    [[-0.42, -0.28, 0.26], [-0.1, 0.42, 0.3], [0.38, 0.18, 0.22]].forEach(function (gr) {
      ctx.beginPath();
      ctx.arc(e.x + gr[0] * r, e.y + gr[1] * r, gr[2] * r, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    });
    return { x: e.x, y: e.y, r: r };
  }

  function dessinerTerre(ctx, g, jour, halo) {
    var c = terre3D(jour);
    var e = projeter(c, g);
    var r = g.rTerreM * e.s;
    var axeEcranHaut = projeter({ x: c.x + AXE3.x, y: c.y + AXE3.y, z: c.z + AXE3.z }, g);
    var axeDir = { x: axeEcranHaut.x - e.x, y: axeEcranHaut.y - e.y };
    var normeAxe = Math.hypot(axeDir.x, axeDir.y) || 1;
    axeDir.x /= normeAxe; axeDir.y /= normeAxe;
    var angleAxeEcran = Math.atan2(axeDir.x, -axeDir.y);

    /* l'anneau « attrape-moi » */
    if (halo > 0) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * (1.55 + 0.2 * halo), 0, TAU);
      ctx.strokeStyle = 'rgba(169, 139, 255, ' + (0.35 + 0.4 * halo) + ')';
      ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.stroke();
    }

    /* le bâton de l'axe (recouvert par la boule au milieu) : sa direction
     * ne change JAMAIS — c'est la vérité n° 1 */
    var hautAxe = projeter({ x: c.x + AXE3.x * g.rTerreM * 1.55, y: c.y + AXE3.y * g.rTerreM * 1.55, z: c.z + AXE3.z * g.rTerreM * 1.55 }, g);
    var basAxe = projeter({ x: c.x - AXE3.x * g.rTerreM * 1.55, y: c.y - AXE3.y * g.rTerreM * 1.55, z: c.z - AXE3.z * g.rTerreM * 1.55 }, g);
    ctx.beginPath();
    ctx.moveTo(basAxe.x, basAxe.y);
    ctx.lineTo(hautAxe.x, hautAxe.y);
    ctx.strokeStyle = 'rgba(233, 237, 248, 0.75)';
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.lineCap = 'round';
    ctx.stroke();

    /* la boule : moitié nord (on la voit d'en haut), puis la moitié sud
     * découpée EXACTEMENT par l'équateur projeté */
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, TAU);
    ctx.fillStyle = '#3fa98e';
    ctx.fill();
    var equateur = cercle(c, g.rTerreM, 72);
    var devant = chaineVisible(equateur, c);
    if (devant.length > 2) {
      var A = projeter(devant[0], g);
      var B = projeter(devant[devant.length - 1], g);
      var pole = projeter({ x: c.x + AXE3.x * g.rTerreM, y: c.y + AXE3.y * g.rTerreM, z: c.z + AXE3.z * g.rTerreM }, g);
      var angA = Math.atan2(A.y - e.y, A.x - e.x);
      var angB = Math.atan2(B.y - e.y, B.x - e.x);
      var angPole = Math.atan2(pole.y - e.y, pole.x - e.x);
      var balayage = (angA - angB + TAU) % TAU;
      var poleDansArc = ((angPole - angB + TAU) % TAU) < balayage;
      ctx.save();
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, TAU);
      ctx.clip();
      tracer(ctx, devant, g);
      ctx.arc(e.x, e.y, r, angB, angA, poleDansArc);
      ctx.closePath();
      ctx.fillStyle = '#2f6fb5';
      ctx.fill();
      ctx.restore();
      /* l'équateur doré, sur la couture exacte */
      tracer(ctx, devant, g);
      ctx.strokeStyle = 'rgba(255, 207, 92, 0.9)';
      ctx.lineWidth = Math.max(2, r * 0.07);
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    /* les anneaux de latitude : les rubans de chez nous et de l'Australie */
    [1, -1].forEach(function (signe) {
      var centreAnneau = {
        x: c.x + AXE3.x * g.rTerreM * Math.sin(LATITUDE_RAD) * signe,
        y: c.y + AXE3.y * g.rTerreM * Math.sin(LATITUDE_RAD) * signe,
        z: c.z + AXE3.z * g.rTerreM * Math.sin(LATITUDE_RAD) * signe
      };
      var anneau = cercle(centreAnneau, g.rTerreM * Math.cos(LATITUDE_RAD), 60);
      var visible = chaineVisible(anneau, c);
      if (visible.length > 1) {
        tracer(ctx, visible, g);
        ctx.strokeStyle = signe > 0 ? 'rgba(143, 224, 203, 0.85)' : 'rgba(188, 217, 255, 0.7)';
        ctx.lineWidth = Math.max(1.5, r * 0.055);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    });

    /* le modelé : un voile clair côté caméra, un bord assombri — la boule
     * est ronde sous l'œil (le relief de la sphère, PAS un jour/nuit) */
    var modele = ctx.createRadialGradient(e.x - r * 0.25, e.y - r * 0.3, r * 0.1, e.x, e.y, r);
    modele.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    modele.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
    modele.addColorStop(1, 'rgba(7, 11, 23, 0.3)');
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, TAU);
    ctx.fillStyle = modele;
    ctx.fill();

    /* le contour */
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, TAU);
    ctx.strokeStyle = 'rgba(233, 237, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    /* la maison au-devant de son anneau (le point le plus proche de la
     * caméra — jamais côté Soleil), le kangourou pareil sur l'anneau sud,
     * la tête en bas */
    var dotCA = CAMERA.x * AXE3.x + CAMERA.y * AXE3.y + CAMERA.z * AXE3.z;
    var devantRing = { x: CAMERA.x - AXE3.x * dotCA, y: CAMERA.y - AXE3.y * dotCA, z: CAMERA.z - AXE3.z * dotCA };
    var nfd = Math.hypot(devantRing.x, devantRing.y, devantRing.z) || 1;
    devantRing.x /= nfd; devantRing.y /= nfd; devantRing.z /= nfd;
    [1, -1].forEach(function (signe) {
      var pos = {
        x: c.x + (AXE3.x * Math.sin(LATITUDE_RAD) * signe + devantRing.x * Math.cos(LATITUDE_RAD)) * g.rTerreM,
        y: c.y + (AXE3.y * Math.sin(LATITUDE_RAD) * signe + devantRing.y * Math.cos(LATITUDE_RAD)) * g.rTerreM,
        z: c.z + (AXE3.z * Math.sin(LATITUDE_RAD) * signe + devantRing.z * Math.cos(LATITUDE_RAD)) * g.rTerreM
      };
      var ep = projeter(pos, g);
      if (signe > 0) {
        dessinerMaison(ctx, ep.x, ep.y, angleAxeEcran, r * 0.4);
      } else {
        dessinerKangourou(ctx, ep.x, ep.y, angleAxeEcran + Math.PI, r * 0.42);
      }
    });

    /* la lumière qui frappe : la cible vit sur le bord éclairé — on part
     * du point qui fait face au Soleil et on tourne vers le haut de l'axe,
     * d'un angle qui suit la saison et s'adoucit aux alignements (continue
     * partout, jamais à plus de 75° de la face éclairée). Force et aplomb
     * viennent du modèle (testés) : plein aux solstices, éteint aux
     * équinoxes ; tache ramassée l'été, étalée l'hiver. */
    var lumiere = { x: c.x, y: c.y, z: c.z };
    var nl = Math.hypot(lumiere.x, lumiere.y, lumiere.z) || 1;
    lumiere.x /= nl; lumiere.y /= nl; lumiere.z /= nl;
    var versSoleil = { x: -lumiere.x, y: -lumiere.y, z: -lumiere.z };
    var dotSA = versSoleil.x * AXE3.x + versSoleil.y * AXE3.y + versSoleil.z * AXE3.z;
    var perpAxe = { x: AXE3.x - versSoleil.x * dotSA, y: AXE3.y - versSoleil.y * dotSA, z: AXE3.z - versSoleil.z * dotSA };
    var nPerp = Math.hypot(perpAxe.x, perpAxe.y, perpAxe.z);
    var sinVA = nPerp < 1e-6 ? 0 : Math.sqrt(Math.max(0, 1 - dotSA * dotSA));
    if (nPerp > 1e-6) { perpAxe.x /= nPerp; perpAxe.y /= nPerp; perpAxe.z /= nPerp; }
    var gamma = ((45 - 30 * penchementNord(jour)) * Math.PI / 180) * sinVA;
    var cosG = Math.cos(gamma), sinG = Math.sin(gamma);
    var dirCible = {
      x: versSoleil.x * cosG + perpAxe.x * sinG,
      y: versSoleil.y * cosG + perpAxe.y * sinG,
      z: versSoleil.z * cosG + perpAxe.z * sinG
    };
    var cible = {
      x: c.x + dirCible.x * g.rTerreM,
      y: c.y + dirCible.y * g.rTerreM,
      z: c.z + dirCible.z * g.rTerreM
    };
    var force = forceFaisceau(jour);
    var aplomb = aplombLumiere(jour);
    var eCible = projeter(cible, g);
    var eSoleil = projeter({ x: 0, y: 0, z: 0 }, g);
    var rSoleil = g.rSoleilM * eSoleil.s;
    dessinerLumiere(ctx, eSoleil.x, eSoleil.y, rSoleil, eCible.x, eCible.y, e.x, e.y, r, aplomb, 'faisceau', force);
    if (coteCamera(cible, c)) {
      dessinerLumiere(ctx, eSoleil.x, eSoleil.y, rSoleil, eCible.x, eCible.y, e.x, e.y, r, aplomb, 'tache', force);
    }
    return e;
  }

  return {
    /* Rendu complet. `halo` dans [0, 1] fait respirer l'anneau « attrape-moi ». */
    rendre: function (jour, halo) {
      var g = geometrie();
      ctx.fillStyle = CIEL;
      ctx.fillRect(0, 0, g.w, g.h);
      /* les étoiles */
      for (var i = 0; i < ETOILES.length; i++) {
        var et = ETOILES[i];
        ctx.globalAlpha = et.a;
        ctx.fillStyle = '#e9edf8';
        ctx.beginPath();
        ctx.arc(et.x * g.w, et.y * g.h, et.r * (window.devicePixelRatio || 1), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      /* l'orbite en perspective : la moitié ARRIÈRE discrète, puis la
       * moitié AVANT nette et plus épaisse — l'œil lit un vrai cercle */
      ctx.setLineDash([6, 8]);
      [[Math.PI, TAU, 'rgba(154, 165, 195, 0.34)', 1.9],
       [0, Math.PI, 'rgba(154, 165, 195, 0.52)', 2.8]].forEach(function (moitie) {
        ctx.beginPath();
        for (var k = 0; k <= 60; k++) {
          var a = moitie[0] + (k / 60) * (moitie[1] - moitie[0]);
          var e = projeter({ x: -Math.cos(a), y: 0, z: Math.sin(a) }, g);
          if (k === 0) ctx.moveTo(e.x, e.y); else ctx.lineTo(e.x, e.y);
        }
        ctx.strokeStyle = moitie[2];
        ctx.lineWidth = moitie[3];
        ctx.stroke();
      });
      ctx.setLineDash([]);
      /* les repères de saison, en perspective, effacés là où est la Terre */
      var angleTerre = angleAnnee(jour);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      REPERES_SAISONS.forEach(function (rep) {
        var ecart = Math.abs(rep.angle - angleTerre);
        if (ecart > Math.PI) ecart = TAU - ecart;
        if (ecart < 0.45) return;
        ctx.globalAlpha = Math.min(1, (ecart - 0.45) / 0.5);
        var e = projeter({ x: -Math.cos(rep.angle) * 1.1, y: 0, z: Math.sin(rep.angle) * 1.1 }, g);
        ctx.font = Math.round((g.compact ? 0.11 : 0.095) * e.s) + 'px system-ui, sans-serif';
        ctx.fillText(rep.emoji, e.x, e.y);
      });
      ctx.globalAlpha = 1;
      /* l'ordre des profondeurs : la Terre passe derrière le Soleil au
       * fond de l'orbite, devant lui au premier plan */
      var eTerre = projeter(terre3D(jour), g);
      var eSoleil = projeter({ x: 0, y: 0, z: 0 }, g);
      var soleil;
      if (eTerre.zv < 0) {
        eTerre = dessinerTerre(ctx, g, jour, halo);
        soleil = dessinerSoleil(ctx, g);
      } else {
        soleil = dessinerSoleil(ctx, g);
        eTerre = dessinerTerre(ctx, g, jour, halo);
      }
      /* la distance ne change JAMAIS : la légende fixe le rappelle */
      var tailleLegende = Math.max(10, Math.round(Math.min(g.w, g.h) * 0.032));
      ctx.font = '600 ' + tailleLegende + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(255, 207, 92, 0.65)';
      ctx.fillText('Terre–Soleil : toujours 150 millions de km', g.cx, g.h * 0.97);
      /* les petites étiquettes (pas en mode compact) */
      if (!g.compact) {
        var taille = Math.round(Math.min(g.w, g.h) * 0.035);
        ctx.fillStyle = 'rgba(154, 165, 195, 0.9)';
        ctx.font = '600 ' + taille + 'px system-ui, sans-serif';
        ctx.fillText('Soleil', eSoleil.x, g.cy + soleil.r + taille * 1.3);
        var rT = g.rTerreM * projeter(terre3D(jour), g).s;
        var eT = projeter(terre3D(jour), g);
        /* au-dessus derrière le Soleil, sur le côté quand la Terre passe
         * devant (jamais sur la légende du bas), en dessous sinon */
        if (eT.zv < 0) {
          ctx.fillText('Terre', eT.x - rT * 0.6, eT.y - rT - taille * 0.9);
        } else if (eT.y + rT + taille * 2.2 > g.h * 0.9) {
          ctx.textAlign = 'left';
          ctx.fillText('Terre', eT.x + rT * 1.9, eT.y + taille * 0.35);
          ctx.textAlign = 'center';
        } else {
          ctx.fillText('Terre', eT.x + rT * 0.4, eT.y + rT + taille * 1.6);
        }
      }
    },

    /* Le jour correspondant à un point du canvas (pour le glisser) :
     * recherche LOCALE autour du jour courant — la Terre suit le doigt le
     * long du cercle au lieu de sauter entre le devant et l'arrière de
     * l'orbite (les deux branches sont proches à l'écran). */
    jourDepuisPointeur: function (x, y, jourActuel) {
      var g = geometrie();
      var depart = jourActuel === undefined ? 0 : jourActuel;
      var meilleur = depart, meilleureDistance = Infinity;
      for (var d = -45; d <= 45; d += 0.5) {
        var j = jourNormalise(depart + d);
        var e = projeter(terre3D(j), g);
        var dist = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
        if (dist < meilleureDistance) { meilleureDistance = dist; meilleur = j; }
      }
      return meilleur;
    },

    /* Le pointeur est-il assez près de la Terre pour l'attraper ?
     * (zone généreuse : des petits doigts vont viser large) */
    attrapeTerre: function (x, y, jour) {
      var g = geometrie();
      var e = projeter(terre3D(jour), g);
      var marge = Math.max(g.rTerreM * e.s * 2.4, 44 * (window.devicePixelRatio || 1));
      return (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y) <= marge * marge;
    }
  };
}
