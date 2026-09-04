# Pourquoi il y a des saisons ?

**Petit labo d'astronomie** — un site d'une page, en français, qui explique les
saisons à un enfant d'environ 5 ans. Le parent lit à voix haute ; l'enfant
attrape la Terre penchée et lui fait faire le tour du Soleil.

En ligne : **<https://petit-labo.fr/la-terre-est-penchee/>**

L'idée centrale, celle que l'enfant doit retenir :

> La Terre est penchée, et elle garde son penchant toute l'année. En faisant le
> tour du Soleil, c'est tantôt notre moitié qui penche vers lui (l'été), tantôt
> l'autre (l'hiver).

| Été | Hiver |
|---|---|
| ![L'épisode au solstice d'été](docs/desktop-ete.png) | ![L'épisode au solstice d'hiver](docs/desktop-hiver.png) |

## Fonctionnalités

- **Le geste-signature** : attraper la Terre et lui faire faire le tour du
  Soleil-boule, fixe au centre — l'axe garde son penchant, quoi qu'il arrive.
  La Terre montre ses deux moitiés et leurs **anneaux de latitude** : la
  maison et le kangourou sont assis sur leur ruban, au-devant — rien ne se
  « rapproche » du Soleil en été. Autour des solstices, un **faisceau de
  lumière large** arrose toute la face de la Terre — comme en vrai — et les
  taches d'arrivée montrent le mécanisme : vive là où la lumière frappe bien
  en face (chez nous l'été, en Australie l'hiver), aucune là où elle rase.
- **La fenêtre de chez nous**, toujours synchronisée et vivante : le Soleil de
  midi qui monte haut l'été et reste bas l'hiver, et un jardin qui change
  chaque jour à petits pas (`jardinDuJour`, continu — verrouillé par test) —
  fleurs qui éclosent une à une, fruits rouges de l'été, feuilles qui poussent, roussissent et tombent,
  tas de feuilles, neige qui s'installe, bonhomme de neige qui se construit,
  nuages, oiseaux, flocons et pétales qui tombent pendant la lecture — plus la
  **barre de la journée** — 24 h d'un coup d'œil, nuit étoilée aux bouts,
  ruban doré du jour calé pile sous l'arc du Soleil (le jour, c'est le temps
  où le Soleil est levé : 8 h l'hiver, 16 h l'été) — et la petite phrase du
  moment.
- **La lecture automatique** : l'année avance toute seule (un tour en ~110 s),
  bouton ⏸/▶ — et tout geste de l'enfant la met en pause.
- **Les quatre boutons-saisons** « 🎲 Joue avec les saisons » : l'année glisse
  en douceur jusqu'au moment choisi, puis la micro-histoire raconte le même
  instant des deux regards (🏡 chez nous / 🚀 vu de l'espace) — avec sa version
  sonore.
- **Le jeu « 🎯 Fabrique la saison ! »** : faire fleurir l'arbre, fabriquer
  l'été, faire tomber la neige… et la révélation du site : offrir l'été aux
  enfants d'Australie — en plein hiver chez nous.
- **Le conteur** : l'explication et les histoires s'écoutent. Prêt pour la
  **voix enregistrée** (mp3 ElevenLabs commités, manifeste de cohérence) avec
  la synthèse vocale du navigateur en repli permanent — rien ne part jamais
  sur Internet. Sans synthèse, les boutons se cachent et le site reste complet.
- **Le médaillon flottant (mobile)** : quand la fenêtre sort de l'écran, une
  miniature suit l'enfant en haut à droite — un tap y ramène.
- **La note aux parents** en deux temps : « Comment on s'en sert », puis chaque
  simplification assumée avec les vrais chiffres — et le mot savant de la fin
  (l'obliquité).

## Lancer en local

```bash
python3 -m http.server 8123
# puis ouvrir http://localhost:8123/
```

Aucune dépendance, aucun build : HTML + CSS + JS vanilla (modules ES), canvas 2D
dessiné à la main, Baloo 2 auto-hébergée pour les titres (`assets/fonts/`,
licence OFL). Le site se déploie tel quel sur GitHub Pages (workflow
`.github/workflows/deploy-pages.yml`, publication à chaque push sur `main` —
réglage : Settings → Pages → GitHub Actions).

## Tests

```bash
node test/model.test.mjs   # le modèle pur et les vérités à préserver
node test/voix.test.mjs    # le corpus vocal et le manifeste des mp3
```

Le modèle est pur (aucun accès DOM) et les « vérités à préserver » sont des
tests nommés en français : l'axe garde toujours la même direction ; été en
France = hiver en Australie ; la distance au Soleil n'explique rien ; en été le
Soleil monte plus haut et les jours durent plus longtemps ; aux équinoxes, jour
et nuit durent 12 h. Une suite navigateur (Playwright, maintenue hors dépôt)
vérifie la structure, la lecture automatique, le geste-signature, les
scénarios, le jeu, les invariants visuels (sondes de pixels : le Soleil doré
fixe au centre) et l'absence d'erreurs console, en desktop,
`prefers-reduced-motion` et mobile 390 px.

## La voix enregistrée

Le corpus vocal de l'épisode (30 blocs : scénarios, transitions, jeu, grande
histoire) vit dans `tools/voix-lib.mjs` ; `tools/build-voix.mjs` génère les mp3
avec ElevenLabs, hors site (la clé ne touche jamais le dépôt), et
`assets/audio/manifest.json` garantit que la voix enregistrée ne dit jamais
autre chose que ce que le site affiche — sinon, repli synthèse. Tant que le
manifeste est vide (c'est le cas), tout passe à la synthèse. Marche à suivre :
`docs/voix-conteur.md`.

## Ce que le site simplifie

- **Le penchant est exagéré au dessin** : 30° à l'écran, 23,44° en vrai. Sa
  direction reste quasi fixe d'une année sur l'autre (précession sur ~26 000
  ans, ignorée).
- **La distance ne fait pas les saisons** — et le site la garde constante.
  En vrai l'orbite est quasi circulaire et la Terre est même un peu *plus près*
  du Soleil début janvier (147 millions de km) qu'en juillet (152 millions).
- **Solstices et équinoxes sont espacés régulièrement** (tous les quarts
  d'année). Vraies dates : équinoxes vers les 20 mars et 22-23 septembre,
  solstices vers les 20-21 juin et 21-22 décembre ; les saisons n'ont pas
  exactement la même durée (orbite légèrement elliptique). L'année du site fait
  365 jours tout ronds.
- **Les chiffres de la fenêtre sont ceux de la France** (latitude ~47° nord),
  avec une formule sinusoïdale simple : Soleil de midi entre ~20° et ~66°,
  jour entre 8 h et 16 h. À l'équateur, presque pas de variation ; aux pôles,
  soleil de minuit et nuit polaire.
- **Pas de températures affichées.** Le site montre les causes (hauteur du
  Soleil, durée du jour) et relie la chaleur en une phrase ; la météo réelle
  suit avec du retard (inertie thermique : le plus chaud fin juillet-août, le
  plus froid fin janvier) et ses caprices — expliqué dans la note aux parents.
- **La maison ne se rapproche jamais du Soleil.** Sans rotation quotidienne,
  une maison posée sur une face du globe semblerait s'approcher du Soleil en
  été — la fausse explication classique. Maison et kangourou sont donc assis
  sur leur **anneau de latitude** (dessiné sur le globe), au-devant, sur l'axe
  de symétrie — un anneau reste à la même distance du Soleil toute l'année
  (verrouillé par test) : ce qui change, c'est l'angle des rayons et la durée
  du jour, jamais la distance.
- **Une maison, un kangourou.** Ils marquent les deux moitiés (leurs anneaux,
  ~45° nord et ~45° sud) sans prétendre à la vraie géographie ; près de
  l'équateur on parle plutôt de saison sèche et de saison des pluies.
- **Le faisceau de lumière ne s'allume qu'autour des solstices** (lois pures
  `forceFaisceau`/`aplombLumiere`, testées) : aux équinoxes, la perspective du
  dessin ne sait pas montrer l'angle des rayons sans tricher — le faisceau
  s'éteint en douceur plutôt que de raconter faux.
- **La rotation quotidienne est ignorée** dans la vue de l'espace : ni rotation,
  ni côté nuit dessinés — le jour et la nuit ont leur propre épisode
  (ci-dessous).

## Structure

```
index.html           la page unique (socle SEO + carte de partage dans le <head>)
css/style.css        palette commune de la série astronomie + Baloo 2 (fond nuit)
js/model.js          modèle pur + constantes du récit + textes oraux
js/vue-orbite.js     la vue de l'espace (orbite-ellipse, Soleil-boule fixe,
                     faisceau de lumière, geste-signature)
js/vue-fenetre.js    chez nous par la fenêtre (+ dessinerMiniFenetre, médaillon)
js/main.js           câblage : boucle rAF, lecture auto, curseur, geste,
                     scénarios, jeu, conteur, médaillon
test/                tests du modèle et de la voix (Node)
tools/               outillage de la voix enregistrée (hors site)
assets/              Baloo 2 + audio (manifeste, mp3 à venir)
docs/                captures d'écran du README + og.png
```

## La série

Petit labo d'astronomie 🔭 — <https://petit-labo.fr/> :

- [La mécanique des éclipses](https://petit-labo.fr/eclipse-explorer/)
- [Où va le Soleil la nuit ?](https://petit-labo.fr/ou-va-le-soleil/)
- [Quelle heure est-il là-bas ?](https://petit-labo.fr/la-terre-tourne/)
- [Pourquoi la Lune change de forme ?](https://petit-labo.fr/la-lune-change-de-forme/)
- **Pourquoi il y a des saisons ?** (cet épisode)
