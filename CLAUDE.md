# CLAUDE.md — Pourquoi il y a des saisons ?

**Petit labo d'astronomie.** Site statique d'une page, en français, qui
explique les saisons à un enfant d'environ 5 ans. Le parent lit à voix haute ;
l'enfant attrape la Terre penchée et lui fait faire le tour du Soleil.
En ligne : <https://petit-labo.fr/la-terre-est-penchee/> (tous les liens
croisés de la famille vivent sur ce domaine, jamais `github.io`).

## Contraintes (non négociables)

- **Zéro dépendance, zéro build** : HTML + CSS + JS vanilla (modules ES),
  canvas 2D dessiné à la main. Aucune police tierce à l'exécution : les titres
  parlent en **Baloo 2 auto-hébergée** (`assets/fonts/`, licence OFL, repli
  Arial Rounded/Trebuchet), le corps du texte reste en pile système. La page
  s'ouvre avec `python3 -m http.server` et se déploie telle quelle sur GitHub
  Pages.
- **Compat mobiles anciens** : pas d'optional chaining `?.` ni de nullish `??`,
  pas de lookbehind regex, repli `@supports` pour `aspect-ratio`,
  `top/right/bottom/left` plutôt qu'`inset`. Tester à 390 px de large.
- **Blindage tactile** : `touch-action: none` sur les canvas interactifs et
  leurs cadres, doublé du repli JS `touchstart`/`touchmove` non passifs ;
  `user-select: none` sur `body`, `* { touch-action: pan-x pan-y }`, viewport
  `maximum-scale=1` + filet `gesturestart` → la page ne se sélectionne pas et
  ne se zoome pas sous les doigts d'un enfant (les zooms d'accessibilité du
  système restent utilisables).
- **`js/model.js` est pur** (aucun accès DOM) : toutes les constantes du récit
  (jours-repères de l'année, penchant, saisons, mois, arbres, scénarios, défis,
  phrases générées, textes oraux) vivent dedans. Il se teste avec
  `node test/model.test.mjs`.
- **Boucle rAF résiliente et sobre** : le `requestAnimationFrame` suivant se
  planifie dans un `try/finally`, et rien ne se redessine quand rien ne change
  (en pause, zéro travail par frame — le halo « attrape-moi » ne respire que
  pendant la lecture, il est sage en pause).
- **`prefers-reduced-motion` respecté** : la lecture automatique ne démarre
  pas, les glissements de scénario deviennent des sauts secs, le halo ne pulse
  pas, le retour du médaillon se fait sans défilement animé.
- **Public 5 ans** : phrases courtes, apostrophe typographique « ’ », zéro
  jargon côté enfant (« penchant », pas « obliquité » ; les mots savants et les
  vrais chiffres vont dans la note aux parents).
- **Le code s'écrit en français** (identifiants, constantes, fichiers de
  vues), sans accents ; les API navigateur restent en anglais.

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
- **La vue de l'espace est en 3D** (choix utilisateur, après comparaison 2D /
  hybride / 3D en artefact) : monde avec Soleil à l'origine, orbite de rayon 1
  dans le plan xz, `terre3D(jour) = (−cos a, 0, sin a)` ; caméra à 32°
  au-dessus du plan (`PHI`), distance 3,1 — le bas de l'écran est PRÈS, le
  haut est LOIN, la Terre grossit devant et passe derrière le Soleil au fond.
  Le Soleil se projette toujours PILE en (0,5 w ; 0,52 h) : la sonde de
  pixels « Soleil fixe » tient. Équateur et anneaux sont de vrais cercles 3D
  projetés (moitiés cachées non dessinées), la couture de l'équateur est
  exacte.
- **Le faisceau de lumière** vit dans le modèle (`forceFaisceau`,
  `aplombLumiere`, testés) : plein autour des solstices, ÉTEINT autour des
  équinoxes (quand la Terre est en haut/bas de l'orbite dessinée, la face
  « éclairée » serait la région des pôles — le faisceau s'efface plutôt que de
  raconter ça de travers) ; tache ramassée au solstice d'été, étalée au
  solstice d'hiver, jamais de saut. Sa cible glisse sur le bord éclairé du
  globe (rotation de versSoleil vers l'axe, bornée à 75°, adoucie aux
  alignements) — jamais derrière. La légende fixe « Terre–Soleil : toujours
  150 millions de km » ne bouge jamais.
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
- Le récit explique le maillon central par le « bien en face / de biais »
  (l'expérience de la lampe, dans l'histoire) : penchée vers le Soleil, notre
  moitié le regarde en face → il monte haut et reste longtemps → il a le
  temps de chauffer.

## Invariants d'interaction

- **Le Soleil ne bouge jamais à l'écran** (objet-repère de la série, au centre
  de la vue de l'espace) — sonde de pixels dans la suite navigateur.
- **L'axe de la Terre ne change jamais de direction à l'écran**, quel que soit
  le jour — c'est LE message visuel de l'épisode.
- **Glisser fait avancer le phénomène** : attraper la Terre la déplace sur son
  orbite (dans les deux sens) ; le curseur maître fait la même chose. Les deux
  vues (espace + fenêtre) restent **synchronisées en permanence** sur le même
  `etat.jour`, chacune avec sa petite phrase (le même jour, deux regards).
- **La lecture automatique** (un tour de l'année en ~85 s,
  `LECTURE_JOURS_PAR_SEC`) se commande UNIQUEMENT par le bouton ⏸/▶ (libellés
  empilés, largeur stable) et la barre d'espace. Reprendre la main (glisser,
  curseur, scénario, ouvrir le jeu) met en pause ; `prefers-reduced-motion` la
  désactive au chargement.
- **Les scénarios vont au moment choisi en douceur, toujours vers l'avant**
  (le vrai sens de l'année) ; reprendre la main efface l'histoire et désarme
  le bouton. L'histoire s'écrit en deux lignes à puces : 🏡 chez nous /
  🚀 vu de l'espace.
- **Le jeu ne se gagne qu'en fabriquant soi-même** (jamais pendant un
  glissement animé) : fenêtre de victoire = la saison demandée, tempo de
  maintien `DEFI_ATTENTE_MS`, hystérésis de sortie `DEFI_SORTIE_MARGE_JOURS`
  (le bravo ne clignote pas au bord et ne ment jamais). Recalage doux vers le
  cœur de la saison à la première victoire seulement. Le défi du kangourou
  (l'été australien) est la révélation du site.
- **Les repères de saison (❄️🌸☀️🍂) autour de l'orbite s'effacent** quand la
  Terre est dessus (elle y est déjà — pas de doublon visuel).
- **Pas de jour/nuit dans la vue de l'espace** : à l'échelle de l'année, un
  côté nuit qui tourne embrouille (retour utilisateur). Seuls comptent le
  penchant et les deux moitiés : nord vert lagon, sud bleu océan, équateur
  doré bien marqué.
- **Rien ne se rapproche du Soleil dans le dessin** (retour utilisateur : une
  maison posée sur une face du globe semblait s'approcher du Soleil en été —
  la fausse explication que le site réfute). La maison et le kangourou sont
  assis sur leurs **anneaux de latitude** (rubans teal/bleu à ~45°), au point
  de l'anneau **face à la caméra** — jamais sur la face qui regarde le Soleil
  (le modèle garde `positionLocaleMaison`/`positionLocaleKangourou`/
  `extremitesAnneau`, verrouillés par tests, qui actent l'esprit : l'habitant
  est l'anneau, symétrique, à distance constante du Soleil). Le **kangourou
  est une silhouette dessinée** (orange clair — jamais l'émoji, qui se
  confondait avec le bâton de l'axe), tête en bas sur l'anneau sud.
- **Le glisser suit le cercle** : `jourDepuisPointeur(x, y, jourActuel)`
  cherche LOCALEMENT (fenêtre ±45 jours autour du jour courant) — sans quoi
  la Terre saute entre le devant et l'arrière de l'orbite en perspective,
  verticalement proches à l'écran.
- **L'orbite porte sa profondeur** : pointillés nets et épais sur la moitié
  avant, discrets sur la moitié arrière — chaque moitié tracée d'un seul
  trait (des segments individuels casseraient la trame des pointillés).
- L'étiquette « Terre » évite les collisions : au-dessus du globe derrière le
  Soleil, sur le côté quand la Terre passe devant (jamais sur la légende du
  bas), en dessous sinon. Mode compact (< 400 px de canvas) : étiquettes
  Soleil/Terre masquées, légende de distance conservée.
- **La fenêtre évolue continûment** (retour utilisateur : la vue semblait
  statique) : `jardinDuJour(jour)` livre quatre paramètres continus
  (feuilles, rousseur, fleurs, neige) — aucun saut de décor d'un jour à
  l'autre, verrouillé par test. Le décor en découle : fleurs une à une, tas
  de feuilles, bonhomme de neige progressif, nuages, oiseaux. Les chutes
  (flocons, feuilles, pétales) ne s'animent que pendant la lecture ou le
  glisser (`tempsMs`, null en pause et en mouvement réduit → scène figée,
  déterministe pour le jour affiché).
- **Le seuil mobile UNIQUE de l'épisode : 880 px.** La grille CSS, le
  médaillon, le repli de la boîte d'explication et la vue unique du jeu lisent
  tous ce chiffre.
- **Sur mobile (< 880 px) seulement** : un médaillon flottant (haut droit,
  hors du chemin du pouce) montre la fenêtre de chez nous en miniature dès
  qu'elle sort de l'écran — un tap y ramène. Le jeu n'affiche qu'une vue
  (l'espace) : c'est le médaillon qui montre le résultat. Rien de tel sur
  grand écran, et rien n'est incrusté dans le canvas qu'on manipule.

## Le conteur (synthèse + voix enregistrée)

Patron de la famille (voir le skill `petit-labo`,
`references/narrateur.md` et `references/voix-enregistree.md`) : moteur unique
`narrateur.narrate(blocs)` — chaque bloc `{ id, texte, pause? }` joue son mp3
enregistré si `assets/audio/manifest.json` le connaît ET que son texte
correspond encore au site, sinon repli synthèse (générations, découpage en
phrases, ton rate/pitch, score des voix françaises sans menu). Bouton
« 🔊 Écouter l'histoire » (blocs `histoire-1…6`), bouton 🔇/🔊 jumeau
scénarios/jeu (clé de famille `petit-labo-son`), `visibilitychange` +
`pagehide` → `stop()`. Sans synthèse, les boutons sonores se cachent et le
site reste complet.

**La voix enregistrée n'est pas encore générée** : manifeste vide, tout passe
à la synthèse. Le corpus vit dans `tools/voix-lib.mjs`, la production se
déroule avec le skill `generer-voix-petit-labo` sur la machine de
l'utilisateur (clé dans `.cle-elevenlabs`, gitignoré). Tant que rien n'est
enregistré, les textes du site restent libres — après, ils sont GELÉS.

## Structure

```
index.html           la page unique (socle SEO + og: dans le <head>)
css/style.css        palette de la série astronomie + Baloo 2 (fond nuit)
js/model.js          modèle pur + constantes du récit + textes oraux
js/vue-orbite.js     la vue de l'espace en 3D (Soleil-boule fixe, perspective,
                     faisceau de lumière, geste-signature)
js/vue-fenetre.js    chez nous par la fenêtre (+ dessinerMiniFenetre, médaillon)
js/main.js           câblage : boucle rAF, lecture auto, curseur, geste,
                     scénarios, jeu, conteur narrate(), médaillon
test/model.test.mjs  tests du modèle (Node)
test/voix.test.mjs   tests du corpus vocal et du manifeste
tools/voix-lib.mjs   le corpus de l'épisode (la seule partie propre à lui)
tools/build-voix.mjs génération ElevenLabs (hors site — voir docs/voix-conteur.md)
tools/controle-voix.mjs  contrôle « sans oreilles » des mp3
assets/fonts/        Baloo 2 (woff2, OFL)
assets/audio/        manifest.json (+ mp3 une fois la voix générée)
docs/                captures du README + og.png (carte de partage)
```

## Vérification navigateur

Suite Playwright maintenue **hors dépôt** (scratchpad de session,
`test-site.js`) : trois passes — desktop 1200 px, `reducedMotion: 'reduce'`,
mobile 390 px (`hasTouch`, `isMobile`), avec la synthèse vocale FIGÉE par un
stub (le câblage se teste, pas le son). Vérifie la structure (fiole, pied
harmonisé sans lien github.io, socle SEO), la lecture auto (avance seule,
pause à la reprise en main, rien ne bouge en mouvement réduit), le
geste-signature, les scénarios (glissement, histoire à deux regards,
effacement), le jeu (consigne, bravo, rangement), le conteur, le médaillon
mobile, zéro erreur console, pas de débordement horizontal, et des sondes de
pixels (le Soleil doré fixe au centre ; le ciel de la fenêtre). Servir avant :
`python3 -m http.server 8123`. Régénérer les captures `docs/*.png` à chaque
évolution visuelle (variable `CAPTURES=docs` ; les passes `reduit-*.png` ne se
committent pas). La carte `docs/og.png` se régénère depuis le dépôt du portail
(`tools/build-og.mjs`) à chaque changement de titre.

## La série

Pied de page harmonisé : « Pourquoi il y a des saisons ? » — un épisode du
Petit labo d'astronomie 🔭, liens vers `ou-va-le-soleil`, `la-terre-tourne`
et `la-lune-change-de-forme` (médaillons SVG repris du portail — le pied ne
liste pas « La mécanique des éclipses », décision de la famille), et le bouton
fiole « Tous les épisodes du Petit labo » vers <https://petit-labo.fr/>. En
publiant cet épisode : ajouter son lien dans les pieds de page des voisins,
l'épisode au registre `tools/build-og.mjs` + `sitemap.xml` + cartes du portail,
et sa ligne au registre du skill. Les épisodes ne sont **pas numérotés** :
l'ordre de publication vit dans le registre du skill, pas dans l'interface.
