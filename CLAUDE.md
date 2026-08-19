# CLAUDE.md — Pourquoi il y a des saisons ?

**Petit labo d'astronomie.** Site statique d'une page, en français, qui
explique les saisons à un enfant d'environ 5 ans. Le parent lit à voix haute ;
l'enfant attrape la Terre penchée et lui fait faire le tour du Soleil.

## Contraintes (non négociables)

- **Zéro dépendance, zéro build** : HTML + CSS + JS vanilla (modules ES),
  canvas 2D dessiné à la main. La page s'ouvre avec `python3 -m http.server`
  et se déploie telle quelle sur GitHub Pages.
- **Compat mobiles anciens** : pas d'optional chaining `?.` ni de nullish `??`,
  pas de lookbehind regex, repli `@supports` pour `aspect-ratio`,
  `top/right/bottom/left` plutôt qu'`inset`, `touch-action: none` sur le canvas
  interactif. Tester à 390 px de large.
- **`js/model.js` est pur** (aucun accès DOM) : toutes les constantes du récit
  (jours-repères de l'année, penchant, saisons, mois, arbres, phrases générées)
  vivent dedans. Il se teste avec `node test/model.test.mjs`.
- **Boucle rAF résiliente** : le `requestAnimationFrame` suivant se planifie
  dans un `try/finally`.
- **`prefers-reduced-motion` respecté** : le halo « attrape-moi » ne pulse
  plus, le retour du médaillon vers la fenêtre se fait sans défilement animé.
- **Public 5 ans** : phrases courtes, apostrophe typographique « ’ », zéro
  jargon côté enfant (« penchant », pas « obliquité » ; les mots savants et les
  vrais chiffres vont dans la note aux parents).

## L'idée centrale (la vérité à préserver)

> La Terre est penchée, et elle garde son penchant toute l'année. En faisant le
> tour du Soleil, c'est tantôt notre moitié qui penche vers lui (l'été), tantôt
> l'autre (l'hiver).

Vérités verrouillées par `test/model.test.mjs` (à compléter, jamais supprimer) :

1. l'axe de la Terre pointe toujours vers la même direction, toute l'année ;
2. au solstice d'été, chez nous penche à fond vers le Soleil ; au solstice
   d'hiver, à l'opposé ; aux équinoxes, ni l'un ni l'autre ;
3. été en France = hiver en Australie : les saisons des deux moitiés sont
   toujours opposées (à Noël, l'Australie est en été) ;
4. la distance Terre–Soleil du modèle est constante : ce n'est PAS elle qui
   fait les saisons ;
5. en été le Soleil culmine le plus haut et le jour est le plus long (16 h) ;
   en hiver le plus bas et le plus court (8 h) ; 12 h pile aux équinoxes ;
6. l'année (365 jours) reboucle proprement et les saisons se suivent toujours
   dans le même ordre.

## Géométrie du modèle

- Coordonnées **mathématiques** (y vers le haut) dans le modèle ; les vues font
  la bascule canvas (y vers le bas).
- Le Soleil est **fixe au centre**. Jour 0 = 1er janvier.
- `angleAnnee(jour) = (jour − 171) / 365 · τ` (0 = solstice d'été, 21 juin) ;
  `positionTerre(jour) = (−cos a, −sin a)` (sens trigonométrique). Solstice
  d'été : Terre à gauche du Soleil ; hiver : à droite ; l'automne passe par le
  bas de l'écran, le printemps par le haut.
- L'axe penche vers **+x** (`AXE_DIR`, constant), dessiné à 30°
  (`INCLINAISON_DESSIN_DEGRES`, exagéré — les 23,5° réels servent aux chiffres).
- `penchementNord(jour) = cos(angleAnnee) = −positionTerre.x` : +1 au solstice
  d'été, −1 au solstice d'hiver, 0 aux équinoxes (espacés tous les quarts
  d'année — les vraies dates vivent dans la note aux parents).
- Chez nous (France, ~47° nord) : `hauteurSoleilMidi = 43 + 23,5 · penchement`
  (degrés) ; `dureeJourHeures = 12 + 4 · penchement`.

## Invariants d'interaction

- **Le Soleil ne bouge jamais à l'écran** (objet-repère de la série, au centre
  de la vue de l'espace) — sonde de pixels dans la suite navigateur.
- **L'axe de la Terre ne change jamais de direction à l'écran**, quel que soit
  le jour — c'est LE message visuel de l'épisode.
- **Glisser fait avancer le phénomène** : attraper la Terre la déplace sur son
  orbite (dans les deux sens) ; le curseur maître fait la même chose. Les deux
  vues (espace + fenêtre) restent **synchronisées en permanence** sur le même
  `etat.jour`.
- **Les repères de saison (❄️🌸☀️🍂) autour de l'orbite s'effacent** quand la
  Terre est dessus (elle y est déjà — pas de doublon visuel).
- **Pas de jour/nuit dans la vue de l'espace** : à l'échelle de l'année, un
  côté nuit qui tourne embrouille (retour utilisateur). Seuls comptent le
  penchant et les deux moitiés : nord vert lagon avec la maison (~45° nord,
  jamais sur le pôle), sud bleu océan avec le kangourou (~45° sud, tête en
  bas), séparées par un équateur doré bien marqué.
- **Sur mobile (< 880 px) seulement** : un médaillon flottant (haut droit,
  hors du chemin du pouce) montre la fenêtre de chez nous en miniature dès
  qu'elle sort de l'écran — un tap y ramène. Rien de tel sur grand écran, et
  rien n'est incrusté dans le canvas qu'on manipule.

## Le conteur (synthèse vocale)

Voir la charte de la famille : moteur unique `narrateur` (générations pour
invalider les lectures annulées), découpage en phrases, ton (rate/pitch selon
la ponctuation), score des voix françaises (fr-FR > fr > fr-CA, bonus
naturelles/neurales, malus robotiques), menu 🗣 si ≥ 2 voix (choix en
`localStorage`, clé `petit-labo-saisons-voix`), textes oraux sans émoji avec
espaces recollées avant la ponctuation, `pagehide` → `cancel()`. Pas de
scénarios dans cet épisode : seul le bouton « 🔊 Écouter l'histoire » parle.
Sans synthèse, les boutons sonores se cachent et le site reste complet.

## Structure

```
index.html           la page unique
css/style.css        palette commune de la série astronomie (fond nuit)
js/model.js          modèle pur + constantes du récit
js/vue-orbite.js     la vue de l'espace (Soleil fixe, orbite, geste-signature)
js/vue-fenetre.js    chez nous par la fenêtre (+ dessinerMiniFenetre, médaillon)
js/main.js           câblage : boucle rAF, curseur, geste, conteur, médaillon
test/model.test.mjs  tests du modèle (Node)
docs/                captures d'écran du README
```

## Vérification navigateur

Suite Playwright maintenue **hors dépôt** (scratchpad de session,
`test-site.js`) : trois passes — desktop 1200 px, `reducedMotion: 'reduce'`,
mobile 390 px (`hasTouch`, `isMobile`). Vérifie la structure, le
geste-signature (glisser simulé le long de l'orbite), la synchronisation
curseur/vues/phrase, le câblage du son, le médaillon mobile, zéro erreur
console, pas de débordement horizontal, et des sondes de pixels (le Soleil doré
fixe au centre ; le ciel de la fenêtre). Servir avant :
`python3 -m http.server 8123`. Régénérer les captures `docs/*.png` à chaque
évolution visuelle (variable `CAPTURES=docs` ; les passes `reduit-*.png` ne se
committent pas).

## La série

Pieds de page croisés avec : `eclipse-explorer`, `ou-va-le-soleil`,
`la-terre-tourne`, `la-lune-change-de-forme`. En publiant cet épisode, ajouter
son lien dans les pieds de page des quatre voisins. Les épisodes ne sont **pas
numérotés** (ni kicker, ni pieds de page) : l'ordre de publication vit dans le
registre du skill, pas dans l'interface.
