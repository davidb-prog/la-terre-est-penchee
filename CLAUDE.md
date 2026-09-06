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
  leurs cadres (ceux de l'espace — la fenêtre, non interactive, laisse
  défiler), doublé du repli JS `touchstart`/`touchmove` non passifs ;
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
  1,73 rTerre ; (0,48 h − 1,73 rTerre) / 0,52) — les deux derniers termes
  garantissent que le globe et son anneau « attrape-moi » (1,4 rTerre au
  repos, 1,6 tenu) tiennent EN ENTIER aux solstices (bords gauche/droit —
  le jeu coupait la Terre au bord droit) ET aux équinoxes (bords haut/bas —
  l'anneau plein dépassait de 5 px sous la scène mobile à l'automne ;
  retour utilisateur) ; ry = 0,52 rx),
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
- Rayon du globe : `0,095 × min(l, h)` sur grand écran, **`min(0,08 l ;
  0,123 h ; (0,48 h − rSoleil − 6 px) / 2,73)` en mode compact** (< 400 px
  de canvas). `0,123 h` est le rapport globe/orbite de l'iPhone 13 (0,24) :
  sur un canvas bas (iframe de l'artefact, navigateur intégré d'Instagram —
  200 px au lieu de 222), la garde verticale resserrait l'orbite de 17 %
  pendant que le globe, mesuré à la largeur, ne bougeait pas — il
  paraissait plus gros (retour utilisateur, captures prod / artefact) ;
  avec ce plafond, globe et orbite rétrécissent ensemble (200 px : globe
  49 px, orbite 102 px ; iPhone 13 plein écran : rien ne change). Le
  troisième terme est DÉRIVÉ : aux équinoxes la Terre passe par
  cy ± ry, l'anneau (1,73 rTerre) au-delà, le Soleil en deçà ; sans lui,
  la garde verticale resserre l'orbite jusqu'à mettre la Terre dans le
  Soleil (iPhone SE, canvas de 170 px : globe ramené à 45 px, écart 6 px).
  Voir le bloc mobile des invariants. Sur 220 px de haut, trois choses se disputent la
  hauteur : l'anneau doit tenir dans le canvas, la Terre doit rester à
  distance du Soleil aux équinoxes (elle passe par cy ± ry), et l'ellipse
  est plate. Budget mesuré (scène iPhone 13, 338 × 220) : globe 54 px,
  orbite 113 px, 14 px entre les disques Terre et Soleil, 4 px sous
  l'anneau tenu. À 0,085 l (57 px) la Terre tenue reposait sur le Soleil
  (9 px) ; resserrer l'orbite seule (garde à 1,95) la mettait DANS le
  Soleil. Toute retouche de ces trois chiffres se re-mesure aux quatre
  repères, Terre tenue (halo = 1).
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
  empilés, largeur stable) et la barre d'espace. **Le bouton est écrit dans
  la ligne « 🚀 Depuis l'espace »** — sur téléphone il reste sous le pouce
  quand on regarde la Terre tourner (retour utilisateur : dans l'en-tête de
  la scène, il était 500 px plus haut, toujours hors écran) ; sur grand
  écran le CSS le pose en absolu en haut à droite du panneau, dans la
  rangée du titre, comme avant. Un seul bouton, jamais dupliqué (deux ⏸
  visibles à la fois se contrediraient). Sur mobile il a le format des
  autres boutons (corps .9rem, marges 12 px) mais 36 px de haut, pas 44 :
  la ligne du titre grandirait de 16 px (compromis validé, budget
  re-mesuré). Reprendre la main (glisser, curseur, scénario, ouvrir le
  jeu) met en pause ; `prefers-reduced-motion` la désactive au chargement.
- **La phrase du moment ne défile pas plus vite qu'on ne lit** : hors du
  cœur de l'été et de l'hiver (|penchement| > 0,75, seuls moments où le
  chiffre d'heures s'écrit — avec son unité « heures de lumière »), elle dit
  seulement le mouvement (« le jour s'allonge / raccourcit ») — les heures
  vivent dans la barre du jour, pas de compteur qui tourne pendant la
  lecture. Les ~12 jours avant chaque repère, la **bande de transition**
  annonce « X se termine : Y arrive ! » DANS LE TITRE SEULEMENT — juin ne
  raconte plus le printemps puis l'été en deux phrases contradictoires
  (retour test) ; le commentaire, lui, reste celui du mois, et la phrase de
  l'espace ne bouge pas non plus (retour utilisateur : 12 jours = 3,6 s à
  la lecture, un texte propre à la bande n'a pas le temps d'être lu —
  supprimé, pas réécrit ; verrouillé par test, plus aucun « bientôt »). La frise du
  curseur porte les initiales des mois (`piste-mois`). La phrase s'affiche
  en DEUX parties (`phraseDuMomentParties`) : le titre en blanc gras avec
  **le mot de la saison dans la teinte de SON bouton** (rose/or/violet/
  bleu — `SAISONS[*].teinte`), le commentaire en clair dessous (retour
  test : tout en un bloc doré, ça se lisait mal). Dans la bande de
  transition, LES DEUX saisons portent chacune leur teinte (« le
  printemps se termine : l'été arrive ! » — la passation se voit).
  **Deux phrases d'affilée ne s'ouvrent jamais sur les mêmes mots**
  (`momentDuMois`, verrouillé par test) : un mois qui ne porte qu'une
  phrase dit « En janvier », un mois de repère (mars, juin, septembre,
  décembre) en porte trois et les nomme « Début / Mi- / Fin décembre »
  — les tranches sont pilées sur les bornes de la bande de transition,
  FRACTIONNAIRES comme les repères (arrondies au jour entier, le bouton
  « L'automne arrive », jour 262,25, titrait « Mi-septembre, chez nous,
  c'est l'automne » — retour utilisateur ; les tests balaient par
  demi-journées, le pas du curseur), le mot ne change donc jamais sans
  que la phrase change aussi, et « Mi- » ne se dit QUE dans la bande
  (retour utilisateur : trois « En décembre, chez nous, » de suite,
  pendant la lecture, passaient pour un affichage bloqué). **L'émoji du
  titre ne part jamais seul à la ligne** (`FIN_TITRE` = fine insécable
  devant le « ! », insécable entre le « ! » et l'émoji — retour
  utilisateur iPhone, « 🍂 » orphelin ; vérifié par test et au
  navigateur par demi-journées à 320/360/390/1200 px). Plus largement,
  **toute phrase affichée passe par `typographie()`** (fine insécable
  devant « ! ? ; », insécable devant « : » et entre un chiffre et
  « heures ») : mesuré au navigateur de 300 à 1200 px, Chromium coupe
  devant « ! » et « : » même après une espace — à 390 px, le commentaire
  du jour 68 laissait un « ! » seul sur sa ligne et la phrase de l'espace
  s'ouvrait sur « : ». Les phrases générées la portent dans le modèle ;
  les textes du corpus vocal (histoires des scénarios, consignes et bravos)
  la reçoivent À L'AFFICHAGE seulement, dans `main.js` — le corpus reste
  gelé au caractère près, et `texteOral` ramène de toute façon ces espaces
  à des espaces simples. Les textes STATIQUES d'`index.html` (la grande
  histoire, la note aux parents, l'accroche) portent les entités
  `&#8239;` / `&nbsp;` dans le HTML même ; `tools/voix-lib.mjs` les décode
  avant `texteOral`, donc les sept clips `histoire-N` jouent toujours
  (vérifié : `test/voix.test.mjs` + balayage navigateur des paragraphes,
  des histoires de scénarios et des consignes, 320 à 1200 px, zéro ligne
  orpheline).
- **Les deux phrases basculent toujours ensemble** (`trancheDuMoment`,
  verrouillé par test) : la phrase de l'espace lit LA MÊME coupe
  calendaire que celle du jardin (mois + bande de transition) au lieu de
  seuils physiques de penchant (±0,15, ±0,70) — retour utilisateur : un
  seul jour de bascule commun sur 28, pendant la lecture l'une changeait
  puis l'autre quatre jours plus tard. Ses paliers : « à fond » sur les
  mois de cœur (mai-juin-juillet, novembre-décembre-janvier, ceux où le
  jardin écrit les heures) ; « à égalité » sur la tranche qui suit chaque
  équinoxe ; « penche vers / à l'opposé » ailleurs — rien de propre à la
  bande de transition. Aux coupes, le penchant vaut ±0,2 au plus (testé :
  « à fond » ⇒ |p| > 0,55, « à égalité » ⇒ |p| < 0,25).
- **Les scénarios vont au moment choisi en douceur, toujours vers l'avant**
  (le vrai sens de l'année). **Glisser la Terre ou tirer le curseur ne
  coupe ni l'histoire ni la voix** (`reprendreLaMainDoucement`) : le texte
  reste tant que la Terre reste dans la saison du scénario, à la marge
  d'entrée du jeu près (8 jours — `procheDeSaison`), et s'efface quand elle
  en sort, SANS couper la voix, qui finit toujours ce qu'elle dit (retour
  utilisateur : le texte effacé et la voix coupée au premier doigt
  ressemblaient à un bug — l'enfant écoute et joue). Le bouton ▶, un autre
  scénario ou l'ouverture du jeu, eux, effacent et coupent (`reprendreLaMain`).
  L'histoire s'écrit en deux lignes à puces : 🏡 chez nous /
  🚀 vu de l'espace. Les puces 🚀 d'été et d'hiver répètent le maillon
  causal de l'expérience de la lampe avec SES mots — « bien en face » /
  « de biais », jamais « rayons directs » ni « rasants » (décision
  utilisateur : « penche » seul n'explique pas la chaleur, et la tache
  d'arrivée que l'enfant voit mérite d'être nommée) ; en hiver, c'est
  l'Australie qui « reçoit la lumière bien en face » — la révélation se
  raccorde à la cause. Verrouillé par test.
- **Le jeu ne se gagne qu'en fabriquant soi-même** (jamais pendant un
  glissement animé) : fenêtre de victoire = la saison demandée **plus une
  marge d'entrée de 8 jours avant son début** (`DEFI_ENTREE_MARGE_JOURS`,
  `procheDeSaison` — retour utilisateur : la saison commence pile au repère
  que l'enfant vise sur l'orbite, s'arrêter un poil avant était raté ;
  asymétrique par construction, testé), tempo de
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
  `attrapeTerre` garde sa zone généreuse pour les petits doigts. **Un seul
  doigt tient la Terre** : le `pointerId` qui l'a attrapée est mémorisé,
  les autres pointeurs sont ignorés jusqu'au relâcher (retour utilisateur :
  un second doigt posé la faisait sauter).
- L'étiquette « Terre » s'écrit sous le globe, décalée vers la droite (le
  bas-gauche porte le kangourou, le haut la maison). Mode compact (< 400 px
  de canvas) : étiquettes Soleil/Terre masquées.
- **La barre du jour raconte une journée entière** (retour utilisateur : la
  jauge jaune seule était illisible) : la barre = 24 h, midi au centre ;
  bouts nuit étoilés avec lune dessinée (mot « nuit » si la place le permet,
  grand écran seulement), segment jour en dégradé aube → midi → crépuscule
  avec un petit soleil À RAYONS à midi (pas un disque : le rond blanc
  sur la piste dégradée se lisait comme le pouce d'un curseur — retour
  utilisateur, on essayait de le tirer en croyant tenir la frise) ; la
  durée s'écrit AU-DESSUS de la barre, sur téléphone aussi (11 px CSS au
  moins, halo clair devant les fils) — une barre sans valeur se lit comme
  un contrôle. Et le cadre de la fenêtre laisse défiler la page
  (`touch-action: pan-x pan-y`, seuls les canvas de l'espace sont à
  `none`) : le doigt qui la « tire » obtient une réponse, la bonne.
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
- **Sur mobile, les DEUX vues, leurs DEUX phrases ET la frise de l'année
  tiennent dans un écran de téléphone** (retour utilisateur, resserré
  trois fois) : du titre de la fenêtre au bas de la frise, **715 px** pour
  ~715 px visibles sur iPhone — hauteurs `min(50vw, 22.5vh)` (fenêtre) et
  `min(58vw, 31vh)` (espace), gap 6 px, phrases en `.88rem` interligne
  1,38, réserve de la phrase re-mesurée à 5,75 em (pire cas : jour 68, la
  bande de transition — à ce corps la phrase tient sur QUATRE lignes, plus
  cinq). Les 107 px qu'a coûtés la frise se sont pris d'abord là où les
  vues ne paient rien : la **légende du curseur disparaît** (la bulle
  « attrape la Terre » enseigne déjà le geste), la bulle du geste tient
  sur une ligne, et la **rangée des repères de saison se serre AU-DESSUS
  du ruban** (1 rem, 1,2 em de haut, descendue de 8 px dans le vide que
  le curseur garde au-dessus de sa piste, `pointer-events: none`) — JAMAIS
  sur le ruban : posés dessus, ils se lisaient comme un bug (retour
  utilisateur, iPhone) ; les 65 restants se prennent sur le JARDIN
  (24,5 → 22,5vh), jamais sur l'espace — la vue qu'on manipule est revenue
  à 31vh, sa hauteur d'avant la frise. **Le globe ne dépend plus de la
  hauteur** : en mode compact, `rTerre = min(0,08 l ; plafond dérivé de
  h)` (retour
  utilisateur : quatre resserrages en vh l'avaient fait passer de 57 à
  43 px de diamètre en une semaine — « très petit ») ; à 0,08 l, la scène
  et le jeu (ratio 9/7) portent la MÊME Terre (54 px), et le prochain
  réglage de hauteur ne la touchera pas ; la zone de saisie
  `max(rTerre × 2,6 ; 44 px)` suit. Raccourcir les textes ne
  rendrait RIEN à ce corps (mesuré : le pire cas n'est plus le commentaire
  d'été mais la bande de transition). Toujours MESURER au script (balayage
  de l'année) avant de régler ces chiffres. Les hauteurs sont portées par
  `.grille-vues` seule : le jeu garde son `aspect-ratio` 9/7. **Le budget
  est calé sur l'iPhone 13 ; sur un iPhone SE (375 × 548 visibles, barres
  dépliées) la frise passe sous le pli — accepté, décision utilisateur** :
  on ne rétrécit pas les vues davantage pour les petits écrans (le globe y
  est déjà ramené à 45 px par son plafond).
- **La remontée d'écran des scénarios ne cache jamais le bouton pressé**
  (retour utilisateur) : quand les vues sont hors écran, on remonte à la
  position la plus BASSE entre « vues en haut d'écran » et « rangée des
  boutons encore visible en bas » — l'enfant voit glisser l'année ET le
  bouton qu'il vient de choisir.
- **Sur mobile (< 880 px) seulement** : un médaillon flottant (haut droit,
  hors du chemin du pouce) montre la fenêtre de chez nous en miniature dès
  qu'elle sort de l'écran — un tap y ramène. **Pendant le jeu, il est
  ANCRÉ dans l'en-tête du jeu** (`main.js` le déplace à l'ouverture, le
  rend à sa place au rangement ; classe `jeu-ouvert` sur le panneau) : à
  droite du titre, 60 px, élément de la mise en page — visible quoi
  qu'il arrive au défilement — et la rangée des actions prend toute la
  largeur dessous : **[🔇] [Encore une !] [Ranger le jeu]** sur UNE
  ligne, la voix en icône seule (son libellé, `.libelle`, vit dans le
  jumeau des scénarios), « Encore une ! » est monté dans cette rangée (et
  se range avec le jeu)
  (retour utilisateur : le médaillon flottait par-dessus les boutons,
  qu'on serrait et empilait pour le fuir — « posés n'importe comment »).
  Dans les scénarios, le bouton 🔊/🔇 est à droite du titre, sans
  réserve pour le médaillon (décision utilisateur : le chevauchement
  n'est que transitoire, le temps que l'en-tête passe sous lui en
  défilant). Le jeu n'affiche qu'une vue
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
site reste complet. **Les clips d'une narration se téléchargent tous en
parallèle au départ, en blobs, et se jouent depuis ces blobs** (gardés
pour la session) : Safari iOS ne réutilise pas le cache d'un `fetch` pour
un `<audio>`, le simple préchauffage laissait chaque clip se retélécharger
à son tour — silences de une à trois secondes entre deux phrases selon le
réseau (retour utilisateur : le printemps enchaîne quatre clips, les deux
derniers paragraphes sont les plus lourds). Le PREMIER clip part en src
direct, dans le geste de l'utilisateur (iOS n'autorise le premier `play()`
que là) ; échec de téléchargement → src direct.

**La voix enregistrée est générée** (30 clips, 3 min 35 s, 1,9 Mo — la
voix de la série astronomie, `GFj5Qf6cNQ3Lgp8VKBwc`, `eleven_multilingual_v2`) :
les quatre scénarios (intro, fenêtre, espace), la transition, les consignes
et bravos des cinq défis, les sept paragraphes de la grande histoire. Le
corpus vit dans `tools/voix-lib.mjs`, la production s'est déroulée avec le
skill `generer-voix-petit-labo` sur la machine de l'utilisateur (clé dans
`.cle-elevenlabs`, gitignoré). **Les textes du corpus sont donc GELÉS** :
un texte enregistré qui change ne casse rien, mais son clip se tait et la
synthèse reprend (`test/voix.test.mjs` verrouille la cohérence manifeste ↔
site) — toute retouche d'un texte du corpus impose de re-tirer son clip.
Les phrases GÉNÉRÉES (phrase du moment, phrase de l'espace) ne sont pas
dans le corpus : elles restent libres, et `texteOral` normalise de toute
façon les espaces insécables du titre.

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
assets/audio/        manifest.json + les 30 mp3 du conteur
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
