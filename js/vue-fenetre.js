/*
 * La fenêtre de chez nous : le ciel du jour, l'arc du Soleil (haut l'été,
 * tout bas l'hiver), l'arbre du jardin et tout un petit monde qui change
 * CHAQUE JOUR, à petits pas (jardinDuJour, continu) : fleurs qui éclosent,
 * feuilles qui poussent puis roussissent et tombent, tas de feuilles, neige
 * qui s'installe, bonhomme de neige, nuages, oiseaux. Pendant la lecture,
 * flocons, feuilles et pétales tombent pour de vrai (tempsMs) ; en pause,
 * la scène est figée mais reste propre au jour affiché.
 * Tout est calculé par le modèle — ici on ne fait que dessiner.
 */
import {
  TAU, hauteurSoleilMidi, dureeJourHeures, penchementNord, jardinDuJour
} from './model.js';

/* Une couleur [r, g, b] en chaîne CSS. */
function rvb(c) {
  return 'rgb(' + Math.round(c[0]) + ', ' + Math.round(c[1]) + ', ' + Math.round(c[2]) + ')';
}
/* Mélange deux couleurs [r, g, b] selon t dans [0, 1]. */
function melangerRVB(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function melanger(a, b, t) {
  return rvb(melangerRVB(a, b, t));
}

/* Le ciel : pâle et froid l'hiver, éclatant l'été. */
var CIEL_HIVER_HAUT = [125, 152, 190];
var CIEL_ETE_HAUT = [56, 140, 214];
var CIEL_HIVER_BAS = [205, 218, 233];
var CIEL_ETE_BAS = [173, 224, 255];

/* Le sol et les feuillages, en continu. */
var SOL_VERT_ETE = [87, 176, 106];
var SOL_VERT_HIVER = [110, 160, 110];
var SOL_ROUX = [201, 154, 86];
var NEIGE = [232, 238, 247];
var FEUILLAGE_VERT = [63, 156, 85];
var FEUILLAGE_ROUX = [217, 130, 43];

/* Petit générateur déterministe (graine fixe) pour semer le décor. */
function fabriquerBrins(n, graine) {
  var brins = [];
  var g = graine;
  function suivant() {
    g = (g * 1103515245 + 12345) % 2147483648;
    return g / 2147483648;
  }
  for (var i = 0; i < n; i++) {
    brins.push({ x: suivant(), y: suivant(), r: 0.5 + suivant(), v: 0.5 + suivant() });
  }
  return brins;
}
var FLOCONS = fabriquerBrins(16, 11);
var FEUILLES_VOLANTES = fabriquerBrins(9, 23);
var PETALES = fabriquerBrins(7, 37);
var FLEURS_JARDIN = fabriquerBrins(8, 51);
var NUAGES = fabriquerBrins(3, 67);
var OISEAUX = fabriquerBrins(2, 83);

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

/* L'arbre du jardin, en continu : les branches sont toujours là, la couronne
 * gonfle avec `feuilles`, verdit ou roussit avec `rousseur`, se constelle de
 * fleurs avec `fleurs`, et porte des paquets de neige avec `neige`. */
function dessinerArbre(ctx, x, sol, taille, jardin) {
  var tronc = taille * 0.5;
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = Math.max(3, taille * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, sol);
  ctx.lineTo(x, sol - tronc);
  ctx.stroke();

  var branches = [[-0.55, -0.85], [0.55, -0.9], [-0.3, -1.15], [0.32, -1.2], [0, -1.3]];
  ctx.lineWidth = Math.max(2, taille * 0.07);
  for (var i = 0; i < branches.length; i++) {
    ctx.strokeStyle = '#7a5230';
    ctx.beginPath();
    ctx.moveTo(x, sol - tronc);
    ctx.lineTo(x + branches[i][0] * taille * 0.55, sol + branches[i][1] * taille * 0.55 - tronc * 0.4);
    ctx.stroke();
  }

  /* La couronne : trois boules qui gonflent avec les feuilles (chacune son
   * tracé — les cordes entre arcs creusent des encoches). */
  if (jardin.feuilles > 0.02) {
    var couleur = melangerRVB(FEUILLAGE_VERT, FEUILLAGE_ROUX, jardin.rousseur);
    ctx.fillStyle = rvb(couleur);
    var gonfle = 0.35 + 0.65 * jardin.feuilles;
    var boules = [
      [0, -0.32, 0.4],
      [-0.3, -0.12, 0.32],
      [0.3, -0.12, 0.32]
    ];
    for (var b = 0; b < boules.length; b++) {
      ctx.beginPath();
      ctx.arc(x + boules[b][0] * taille * gonfle, sol - tronc + boules[b][1] * taille * gonfle,
        boules[b][2] * taille * gonfle, 0, TAU);
      ctx.fill();
    }
    /* Les fleurs roses semées sur la couronne. */
    if (jardin.fleurs > 0.05) {
      ctx.fillStyle = '#ff9dbf';
      var pointsFleurs = [[-0.35, -0.2], [0.05, -0.45], [0.38, -0.15], [-0.1, -0.05], [0.2, -0.38], [-0.28, -0.42]];
      var nb = Math.round(jardin.fleurs * pointsFleurs.length);
      for (var f = 0; f < nb; f++) {
        ctx.beginPath();
        ctx.arc(x + pointsFleurs[f][0] * taille * gonfle,
          sol - tronc + pointsFleurs[f][1] * taille * gonfle - taille * 0.1,
          taille * 0.055, 0, TAU);
        ctx.fill();
      }
    }
  }

  /* Les paquets de neige au bout des branches nues. */
  if (jardin.neige > 0.15 && jardin.feuilles < 0.3) {
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.9 * jardin.neige) + ')';
    for (var s = 0; s < branches.length; s++) {
      ctx.beginPath();
      ctx.arc(x + branches[s][0] * taille * 0.55, sol + branches[s][1] * taille * 0.55 - tronc * 0.4,
        taille * 0.05 * (0.5 + jardin.neige * 0.5), 0, TAU);
      ctx.fill();
    }
  }
}

/* Le bonhomme de neige : il se construit au cœur de l'hiver, boule à boule. */
function dessinerBonhomme(ctx, x, sol, taille) {
  ctx.fillStyle = '#f6f9ff';
  ctx.beginPath();
  ctx.arc(x, sol - taille * 0.3, taille * 0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, sol - taille * 0.72, taille * 0.21, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0b1020';
  ctx.beginPath();
  ctx.arc(x - taille * 0.07, sol - taille * 0.76, taille * 0.025, 0, TAU);
  ctx.arc(x + taille * 0.07, sol - taille * 0.76, taille * 0.025, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff9f1c';
  ctx.beginPath();
  ctx.moveTo(x, sol - taille * 0.72);
  ctx.lineTo(x + taille * 0.16, sol - taille * 0.69);
  ctx.lineTo(x, sol - taille * 0.66);
  ctx.closePath();
  ctx.fill();
}

/* Un petit oiseau : deux ailes en accent circonflexe. */
function dessinerOiseau(ctx, x, y, taille) {
  ctx.strokeStyle = 'rgba(11, 16, 32, 0.65)';
  ctx.lineWidth = Math.max(1.2, taille * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - taille, y + taille * 0.4);
  ctx.quadraticCurveTo(x - taille * 0.5, y - taille * 0.4, x, y);
  ctx.quadraticCurveTo(x + taille * 0.5, y - taille * 0.4, x + taille, y + taille * 0.4);
  ctx.stroke();
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

  /* `tempsMs` : l'horloge des chutes de flocons/feuilles/pétales et des
   * dérives de nuages. Null (pause, mouvement réduit) → scène figée,
   * déterministe pour le jour affiché. */
  return {
    rendre: function (jour, tempsMs) {
      var g = geometrie();
      var jardin = jardinDuJour(jour);
      var p = (penchementNord(jour) + 1) / 2; /* 0 = plein hiver, 1 = plein été */
      var T = tempsMs === null || tempsMs === undefined ? jour * 40 : tempsMs / 16;

      /* Le ciel. */
      var ciel = ctx.createLinearGradient(0, 0, 0, g.solY);
      ciel.addColorStop(0, melanger(CIEL_HIVER_HAUT, CIEL_ETE_HAUT, p));
      ciel.addColorStop(1, melanger(CIEL_HIVER_BAS, CIEL_ETE_BAS, p));
      ctx.fillStyle = ciel;
      ctx.fillRect(0, 0, g.w, g.h);

      /* Les nuages, qui dérivent doucement — plus gris quand l'année fraîchit. */
      var gris = Math.max(jardin.neige, jardin.rousseur * 0.6);
      for (var n = 0; n < NUAGES.length; n++) {
        var nu = NUAGES[n];
        var nx = ((nu.x + T * 0.00012 * nu.v) % 1.2 - 0.1) * g.w;
        var ny = (0.08 + nu.y * 0.2) * g.solY;
        var nr = (0.06 + nu.r * 0.035) * g.w;
        ctx.fillStyle = 'rgba(' + Math.round(255 - gris * 60) + ', ' + Math.round(255 - gris * 50) + ', 255, 0.8)';
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, TAU);
        ctx.arc(nx + nr * 0.9, ny + nr * 0.15, nr * 0.75, 0, TAU);
        ctx.arc(nx - nr * 0.9, ny + nr * 0.2, nr * 0.7, 0, TAU);
        ctx.fill();
      }

      /* L'arc du Soleil : il se lève à gauche, culmine au milieu (midi),
       * se couche à droite. Sa hauteur suit le modèle. */
      var hauteur = hauteurSoleilMidi(jour); /* ~19,5° à ~66,5° */
      var gauche = g.w * 0.1;
      var droite = g.w * 0.9;
      var sommetY = g.solY - (hauteur / 75) * (g.solY - g.h * 0.1);
      ctx.beginPath();
      /* le sommet d'une courbe quadratique est à mi-chemin du contrôle */
      ctx.moveTo(gauche, g.solY);
      ctx.quadraticCurveTo(g.w * 0.5, 2 * sommetY - g.solY, droite, g.solY);
      ctx.strokeStyle = 'rgba(255, 159, 28, 0.55)';
      ctx.lineWidth = Math.max(2, g.w * 0.006);
      ctx.setLineDash([5, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      dessinerPetitSoleil(ctx, g.w * 0.5, sommetY, Math.min(g.w, g.h) * (g.compact ? 0.075 : 0.065));

      /* Les oiseaux du beau temps. */
      if (jardin.feuilles > 0.5 && jardin.neige < 0.2) {
        for (var o = 0; o < OISEAUX.length; o++) {
          var oi = OISEAUX[o];
          var ox = ((oi.x + T * 0.0004 * oi.v) % 1.1 - 0.05) * g.w;
          var oy = (0.18 + oi.y * 0.25 + 0.02 * Math.sin(T * 0.02 + o * 3)) * g.solY;
          dessinerOiseau(ctx, ox, oy, g.w * 0.016 * (0.8 + oi.r * 0.4));
        }
      }

      /* Le sol : vert qui suit la saison, roussi à l'automne, blanchi l'hiver. */
      var solCouleur = melangerRVB(SOL_VERT_HIVER, SOL_VERT_ETE, p);
      solCouleur = melangerRVB(solCouleur, SOL_ROUX, jardin.rousseur * (1 - jardin.feuilles) * 0.8);
      solCouleur = melangerRVB(solCouleur, NEIGE, jardin.neige);
      ctx.fillStyle = rvb(solCouleur);
      ctx.beginPath();
      ctx.moveTo(0, g.solY + g.h * 0.02);
      ctx.quadraticCurveTo(g.w * 0.5, g.solY - g.h * 0.03, g.w, g.solY + g.h * 0.02);
      ctx.lineTo(g.w, g.h);
      ctx.lineTo(0, g.h);
      ctx.closePath();
      ctx.fill();

      /* Les fleurs du jardin, une à une au fil du printemps. */
      var nbFleurs = Math.round(jardin.fleurs * FLEURS_JARDIN.length);
      for (var fj = 0; fj < nbFleurs; fj++) {
        var fl = FLEURS_JARDIN[fj];
        var fx = (0.36 + fl.x * 0.58) * g.w;
        var fy = g.solY + (0.35 + fl.y * 0.5) * (g.h - g.solY) * 0.55;
        ctx.fillStyle = fj % 2 ? '#ff9dbf' : '#fff3b0';
        ctx.beginPath();
        ctx.arc(fx, fy, Math.max(2, g.w * 0.008), 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffe29a';
        ctx.beginPath();
        ctx.arc(fx, fy, Math.max(1, g.w * 0.003), 0, TAU);
        ctx.fill();
      }

      /* Le tas de feuilles au pied de l'arbre (l'automne l'entasse, la neige
       * le recouvre). */
      var tas = jardin.rousseur * (1 - jardin.feuilles) * (1 - jardin.neige);
      if (tas > 0.05) {
        ctx.fillStyle = 'rgba(201, 122, 44, ' + (0.75 * tas + 0.1) + ')';
        ctx.beginPath();
        ctx.ellipse(g.w * 0.24, g.solY + g.h * 0.03, g.w * 0.1 * (0.4 + tas * 0.6),
          g.h * 0.02 * (0.4 + tas * 0.6), 0, 0, TAU);
        ctx.fill();
      }

      /* L'arbre du jardin. */
      dessinerArbre(ctx, g.w * 0.2, g.solY + g.h * 0.01, Math.min(g.w, g.h) * 0.3, jardin);

      /* Le bonhomme de neige, qui se construit au cœur de l'hiver. */
      var bonhomme = Math.max(0, (jardin.neige - 0.45) / 0.55);
      if (bonhomme > 0.05) {
        dessinerBonhomme(ctx, g.w * 0.82, g.solY + g.h * 0.05, Math.min(g.w, g.h) * 0.16 * bonhomme);
      }

      /* Ce qui tombe du ciel : flocons, feuilles rousses, pétales. */
      if (jardin.neige > 0.05) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        var nbFlocons = Math.round(jardin.neige * FLOCONS.length);
        for (var i = 0; i < nbFlocons; i++) {
          var flo = FLOCONS[i];
          var yF = ((flo.y + T * 0.0016 * flo.v) % 1) * g.solY * 0.95;
          var xF = (flo.x + 0.02 * Math.sin(T * 0.02 + i)) * g.w;
          ctx.beginPath();
          ctx.arc(xF, yF, flo.r * g.w * 0.006 + 1.5, 0, TAU);
          ctx.fill();
        }
      }
      var chute = jardin.rousseur * 4 * jardin.feuilles * (1 - jardin.feuilles);
      if (chute > 0.1) {
        ctx.fillStyle = 'rgba(217, 130, 43, 0.85)';
        var nbFeuilles = Math.round(Math.min(1, chute) * FEUILLES_VOLANTES.length);
        for (var k = 0; k < nbFeuilles; k++) {
          var fe = FEUILLES_VOLANTES[k];
          var yV = ((fe.y + T * 0.0012 * fe.v) % 1) * g.solY * 0.9 + g.solY * 0.08;
          var xV = (fe.x + 0.04 * Math.sin(T * 0.015 + k * 2)) * g.w;
          ctx.beginPath();
          ctx.ellipse(xV, yV, fe.r * g.w * 0.008 + 2, g.w * 0.004 + 1, 0.6 + 0.5 * Math.sin(T * 0.03 + k), 0, TAU);
          ctx.fill();
        }
      }
      if (jardin.fleurs > 0.3) {
        ctx.fillStyle = 'rgba(255, 157, 191, 0.8)';
        var nbPetales = Math.round(jardin.fleurs * PETALES.length);
        for (var q = 0; q < nbPetales; q++) {
          var pe = PETALES[q];
          var yP = ((pe.y + T * 0.0008 * pe.v) % 1) * g.solY * 0.85 + g.solY * 0.1;
          var xP = (pe.x + 0.05 * Math.sin(T * 0.012 + q * 2)) * g.w;
          ctx.beginPath();
          ctx.ellipse(xP, yP, pe.r * g.w * 0.005 + 1.5, g.w * 0.003 + 1, 0.8, 0, TAU);
          ctx.fill();
        }
      }

      /* La barre du jour : la part de la journée où il fait clair. */
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
      var partJour = duree / 24;
      var jx = bx + bw * (0.5 - partJour / 2);
      var jw = bw * partJour;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(jx, by, jw, bh, arrondi);
      else ctx.rect(jx, by, jw, bh);
      ctx.fillStyle = '#ffcf5c';
      ctx.fill();
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
  var jardin = jardinDuJour(jour);
  var p = (penchementNord(jour) + 1) / 2;
  var solY = h * 0.74;
  var ciel = ctx.createLinearGradient(0, 0, 0, solY);
  ciel.addColorStop(0, melanger(CIEL_HIVER_HAUT, CIEL_ETE_HAUT, p));
  ciel.addColorStop(1, melanger(CIEL_HIVER_BAS, CIEL_ETE_BAS, p));
  ctx.fillStyle = ciel;
  ctx.fillRect(0, 0, w, h);
  var solCouleur = melangerRVB(SOL_VERT_HIVER, SOL_VERT_ETE, p);
  solCouleur = melangerRVB(solCouleur, SOL_ROUX, jardin.rousseur * (1 - jardin.feuilles) * 0.8);
  solCouleur = melangerRVB(solCouleur, NEIGE, jardin.neige);
  ctx.fillStyle = rvb(solCouleur);
  ctx.fillRect(0, solY, w, h - solY);
  var hauteur = hauteurSoleilMidi(jour);
  var sommetY = solY - (hauteur / 75) * (solY - h * 0.14);
  dessinerPetitSoleil(ctx, w * 0.62, sommetY, Math.min(w, h) * 0.14);
  dessinerArbre(ctx, w * 0.28, solY + h * 0.02, Math.min(w, h) * 0.34, jardin);
}
