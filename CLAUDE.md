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
- **La vue de l'espace est l'« hybride »** (choix utilisateur, après
  comparaison 2D / hybride / 3D en artefact — la 3D, restée trop petite sur
  téléphone, vit dans l'historique git) : l'orbite-ellipse en perspective à
  plat (cx = 0,5 l ; cy = 0,52 h ; rx = min(0,38 l ; 0,62 h ; 0,5 l −
  1,95 rTerre) — le dernier terme garantit que le globe et son anneau
  « attrape-moi » (1,82 rTerre) tiennent EN ENTIER aux solstices, le jeu
  coupait la Terre au bord droit ; ry = 0,52 rx),
  un **Soleil-boule** (dégradé radial + granules) fixe au centre, rayon
  **8 % de min(l, h)** — de l'air pour l'orbite et le faisceau —, et le
  modelé du globe (voile clair, bord assombri). La sonde de pixels « Soleil
  fixe » vise (0,5 l ; 0,52 h).
- **Le faisceau de lumière est LARGE** (décision utilisateur — la version
  fidèle) : il arrose TOUTE la face de la Terre, du pôle nord au pôle sud —
  le Soleil ne vise personne, et le faisceau lui-même est identique en
  toute saison. Ce sont les **taches d'arrivée** qui font la pédagogie, une
  par moitié : cible à 15° du point face au Soleil pour la moitié bien en
  face, 75° pour celle qui rase (rotation de versSoleil vers le haut de
  l'axe pour chez nous, vers le bas pour l'Australie) ; l'aplomb du sud est
  `aplombLumiere(jour + ANNEE_JOURS/2)` (miroir exact : cos(a+π) = −cos a).
  Tache vive et ramassée quand la lumière frappe en face (demi-largeur
  0,32/aplomb, cœur clair, bords en dégradé), **fondue dès qu'elle rase**
  (aplomb < 0,45, disparue sous 0,25 — la lumière glisse sans chauffer,
  pas de tache). Les lois vivent dans le modèle (`forceFaisceau`,
  `aplombLumiere`, testés) : force pleine aux solstices, creux doux (0,55)
  mais JAMAIS éteinte aux équinoxes — le faisceau large ne vise personne,
  il peut rester allumé sans tricher, et l'égalité se VOIT : **deux taches
  jumelles**, une par moitié, aplomb 0,5 chacune (retour utilisateur :
  l'extinction totale laissait l'égalité des équinoxes invisible) ; jamais
  de saut. (La légende de distance a été
  retirée — décision utilisateur ; la constance de la distance reste dans
  la note aux parents et verrouillée par test.)
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
- **La lecture automatique** (un tour de l'année en ~110 s — ralentie
  après tests utilisateurs, personne n'avait le temps de lire à 85 s —,
  `LECTURE_JOURS_PAR_SEC`) se commande UNIQUEMENT par le bouton ⏸/▶ (libellés
  empilés, largeur stable) et la barre d'espace. Reprendre la main (glisser,
  curseur, scénario, ouvrir le jeu) met en pause ; `prefers-reduced-motion` la
  désactive au chargement.
- **La phrase du moment ne défile pas plus vite qu'on ne lit** : hors du
  cœur de l'été et de l'hiver (|penchement| > 0,75, seuls moments où le
  chiffre d'heures s'écrit — avec son unité « heures de lumière »), elle dit
  seulement le mouvement (« le jour s'allonge / raccourcit ») — les heures
  vivent dans la barre du jour, pas de compteur qui tourne pendant la
  lecture. Les ~12 jours avant chaque repère, la **bande de transition**
  annonce « X se termine : Y arrive ! » — juin ne raconte plus le printemps
  puis l'été en deux phrases contradictoires (retour test). La frise du
  curseur porte les initiales des mois (`piste-mois`). La phrase s'affiche
  en DEUX parties (`phraseDuMomentParties`) : le titre en blanc gras avec
  **le mot de la saison dans la teinte de SON bouton** (rose/or/violet/
  bleu — `SAISONS[*].teinte`), le commentaire en clair dessous (retour
  test : tout en un bloc doré, ça se lisait mal). Dans la bande de
  transition, LES DEUX saisons portent chacune leur teinte (« le
  printemps se termine : l'été arrive ! » — la passation se voit).
- **Les scénarios vont au moment choisi en douceur, toujours vers l'avant**
  (le vrai sens de l'année) ; reprendre la main efface l'histoire et désarme
  le bouton. L'histoire s'écrit en deux lignes à puces : 🏡 chez nous /
  🚀 vu de l'espace. Les puces 🚀 d'été et d'hiver répètent le maillon
  causal de l'expérience de la lampe avec SES mots — « bien en face » /
  « de biais », jamais « rayons directs » ni « rasants » (décision
  utilisateur : « penche » seul n'explique pas la chaleur, et la tache
  d'arrivée que l'enfant voit mérite d'être nommée) ; en hiver, c'est
  l'Australie qui « reçoit la lumière bien en face » — la révélation se
  raccorde à la cause. Verrouillé par test.
- **Le jeu ne se gagne qu'en fabriquant soi-même** (jamais pendant un
  glissement animé) : fenêtre de victoire = la saison demandée, tempo de
  maintien `DEFI_ATTENTE_MS`, hystérésis de sortie `DEFI_SORTIE_MARGE_JOURS`
  (le bravo ne clignote pas au bord et ne ment jamais). Recalage doux, à la
  première victoire seulement, vers le `jourBravo` du défi — toujours un
  des quatre repères de l'année (solstices/équinoxes, comme les boutons) ;
  les consignes d'équinoxe font écho aux boutons (« le printemps
  revient », « l'automne arrive ») et le jardin y tient leurs promesses
  (arbre tout fleuri, feuilles qui tombent). Le tirage est un panier SANS remise, anti-répétition compris
  après remélange et réouverture du jeu (`dernierDefiId`) — et il n'offre
  JAMAIS un défi que le jour affiché réussit déjà : si le fond du panier
  n'a plus que des défis gagnés d'avance (l'hiver en réussit deux — la
  neige et l'été australien), on remélange un panier neuf au lieu de
  laisser tomber un bravo gratuit (retour utilisateur ; verrouillé par la
  suite navigateur). Les deux vues du jeu partagent la même hauteur
  (colonnes 9fr/8fr = le rapport de leurs ratios). Le défi du kangourou
  (l'été australien) est la révélation du site.
- **Les repères de saison (❄️🌸☀️🍂) autour de l'orbite s'effacent** quand la
  Terre est dessus (elle y est déjà — pas de doublon visuel).
- **Le voile de nuit de l'ANNÉE** (revirement assumé de « pas de
  jour/nuit », décision utilisateur : l'égalité des équinoxes ne se voyait
  toujours pas) : un voile translucide couvre la moitié du globe qui ne
  regarde pas le Soleil — maison et kangourou se dessinent PAR-DESSUS,
  toujours nets (retour utilisateur : sous le voile, ils semblaient vivre
  une nuit permanente — or chaque saison a ses journées ; ce sont des
  repères, pas des points physiques) — il tourne avec l'année, pas avec les jours (la
  rotation quotidienne reste ignorée). La loi `directionNuit(jour)` vit
  dans le modèle (testée) : ombre géométrique aux solstices (le pôle
  d'hiver plonge dans la nuit), terminateur qui pivote pour passer PAR LES
  DEUX PÔLES aux équinoxes — chaque moitié mi-jour mi-nuit, l'image des
  manuels. Construction vectorielle continue (jamais d'interpolation
  d'angles : elle sauterait le jour où la Terre s'aligne avec l'axe). Les
  moitiés restent nord vert lagon, sud bleu océan, équateur doré.
- **Rien ne se rapproche du Soleil dans le dessin** (retour utilisateur : une
  maison posée sur une face du globe semblait s'approcher du Soleil en été —
  la fausse explication que le site réfute). La maison et le kangourou sont
  assis sur leurs **anneaux de latitude** (rubans teal/bleu à ~45°), au point
  de l'anneau **face à la caméra** — jamais sur la face qui regarde le Soleil
  (le modèle garde `positionLocaleMaison`/`positionLocaleKangourou`/
  `extremitesAnneau`, verrouillés par tests, qui actent l'esprit : l'habitant
  est l'anneau, symétrique, à distance constante du Soleil). Le **kangourou
  est une silhouette dessinée marron clair**, tête en bas sur l'anneau sud —
  l'émoji sortait en glyphe GRIS sur iPhone (WebKit), même avec le sélecteur
  VS16 et la police d'émojis explicite : seule la silhouette garantit sa
  couleur partout (validée par l'utilisateur sur son téléphone). Le dessin
  (retour utilisateur : la première silhouette en tas d'ellipses ne se
  reconnaissait pas) tient aux cinq signes du kangourou — oreilles en V,
  tête oblongue, grosse cuisse, queue épaisse posée au sol, grand pied
  plat — en formes anatomiques franches UNIES par un contour sans
  couture : toutes les formes tracées au trait sombre épais d'abord, puis
  toutes remplies — le remplissage mange la moitié intérieure des traits,
  ne laissant que le contour de l'union.
- **Le glisser lit l'angle sur l'ellipse** : `jourDepuisPointeur(x, y)`
  (l'argument `jourActuel` que passe `main.js` est ignoré, sans danger) ;
  `attrapeTerre` garde sa zone généreuse pour les petits doigts.
- L'étiquette « Terre » s'écrit sous le globe, décalée vers la droite (le
  bas-gauche porte le kangourou, le haut la maison). Mode compact (< 400 px
  de canvas) : étiquettes Soleil/Terre masquées.
- **La barre du jour raconte une journée entière** (retour utilisateur : la
  jauge jaune seule était illisible) : la barre = 24 h, midi au centre ;
  bouts nuit étoilés avec lune dessinée (mot « nuit » si la place le permet,
  grand écran seulement), segment jour en dégradé aube → midi → crépuscule
  avec le petit disque de midi ; la durée s'écrit AU-DESSUS de la barre.
  Les **pieds de l'arc du Soleil tombent PILE sur les bouts du segment
  jaune** (deux fils en pointillés les relient) : l'été l'arc est haut ET
  large, l'hiver bas ET court — le jour, c'est le temps où le Soleil est
  au-dessus de l'horizon.
- **La fenêtre évolue continûment** (retour utilisateur : la vue semblait
  statique) : `jardinDuJour(jour)` livre cinq paramètres continus
  (feuilles, rousseur, fleurs, fruits, neige) — aucun saut de décor d'un
  jour à l'autre, verrouillé par test. **Chaque décor atteint son PLEIN
  dès l'entrée de sa saison** (retour test : les boutons doivent montrer
  l'archétype — magnolia fleuri à l'équinoxe de printemps, fruits rouges
  dès le solstice d'été, arbre roux et feuilles qui tombent à l'équinoxe
  d'automne, neige installée au solstice d'hiver). Le décor en découle :
  fleurs une à une, fruits, tas de feuilles, bonhomme de neige progressif,
  nuages, oiseaux. Les chutes
  (flocons, feuilles, pétales) ne s'animent que pendant la lecture ou le
  glisser (`tempsMs`, null en pause et en mouvement réduit → scène figée,
  déterministe pour le jour affiché).
- **Le seuil mobile UNIQUE de l'épisode : 880 px.** La grille CSS, le
  médaillon, le repli de la boîte d'explication et la vue unique du jeu lisent
  tous ce chiffre.
- **Sur mobile, les DEUX vues et leurs DEUX phrases tiennent dans un
  écran de téléphone** (retour utilisateur, resserré deux fois) : du titre
  de la fenêtre au bas de la phrase de l'espace, ~685 px pour ~715 px
  visibles sur iPhone — hauteurs `min(50vw, 26vh)` (fenêtre) et
  `min(58vw, 31vh)` (espace), gap 8 px, interligne 1,38, réserve de la
  phrase re-mesurée à 7,05 em (pire cas : jour 121). Toujours MESURER au
  script (balayage de l'année) avant de régler ces chiffres.
- **La remontée d'écran des scénarios ne cache jamais le bouton pressé**
  (retour utilisateur) : quand les vues sont hors écran, on remonte à la
  position la plus BASSE entre « vues en haut d'écran » et « rangée des
  boutons encore visible en bas » — l'enfant voit glisser l'année ET le
  bouton qu'il vient de choisir.
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
js/vue-orbite.js     la vue de l'espace (orbite-ellipse, Soleil-boule fixe,
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

**L'emoji-signature de l'épisode : 🦘** (favicon et texte courant — choix
utilisateur : le kangourou est la révélation du site, et il ne collisionne
avec aucun voisin : 🌅 `ou-va-le-soleil`, 🌍 `la-terre-tourne`, 🌙
`la-lune-change-de-forme` — le favicon 🌍 de départ doublonnait
`la-terre-tourne`). Les illustrations restent des SVG maison (jamais
d'emoji en grand, règle de la famille).

Pied de page harmonisé : « Pourquoi il y a des saisons ? » — un épisode du
Petit labo d'astronomie 🔭, liens vers `ou-va-le-soleil`, `la-terre-tourne`
et `la-lune-change-de-forme` (médaillons SVG repris du portail — le pied ne
liste pas « La mécanique des éclipses », décision de la famille), et le bouton
fiole « Tous les épisodes du Petit labo » vers <https://petit-labo.fr/>. En
publiant cet épisode : ajouter son lien dans les pieds de page des voisins,
l'épisode au registre `tools/build-og.mjs` + `sitemap.xml` + cartes du portail,
et sa ligne au registre du skill. Les épisodes ne sont **pas numérotés** :
l'ordre de publication vit dans le registre du skill, pas dans l'interface.
