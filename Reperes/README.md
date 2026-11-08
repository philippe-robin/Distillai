# Repères

App Mac et iPhone (une seule cible, un seul code) pour tenir une liste de lieux,
les voir sur une carte Apple, et recevoir une notification quand on passe à
proximité d'un lieu pas encore visité.

## Ce que fait la v1

- Liste de lieux : nom, adresse, étiquette, notes, rayon d'alerte.
- Ajout par recherche d'adresse ou de commerce (autocomplétion MapKit), par
  pointage sur la carte, ou depuis la position courante.
- Import en lot : liste collée (une ligne par lieu) ou fichier JSON, CSV, texte, GPX.
  Les adresses sont géocodées une par une, avec revue avant ajout.
- Carte : épingles rouges pour les lieux à visiter, vertes pour les lieux visités,
  cercle du rayon d'alerte sur le lieu sélectionné, styles plan / satellite.
- Alerte de proximité : notification locale à l'entrée dans le rayon, avec
  actions « Marquer comme visité » et « Itinéraire ».
- Marquage visité manuel ou automatique à l'arrivée, date de visite conservée.
- Export JSON, CSV, GPX. Ouverture d'un lieu ou d'un itinéraire dans Plans.

## Prérequis

- Xcode 16 ou plus (le projet utilise les groupes synchronisés, format 77).
- macOS 14 ou plus, iOS 17 ou plus.
- Pour l'iPhone : un compte Apple dans Xcode (Settings > Accounts). Un compte
  gratuit suffit, l'app doit alors être réinstallée tous les 7 jours.

## Lancer sur Mac

1. Ouvrir `Reperes.xcodeproj`.
2. Choisir la destination « My Mac », puis Run.
3. Autoriser la localisation et les notifications à la première demande.

La signature macOS est en ad hoc (`CODE_SIGN_IDENTITY[sdk=macosx*] = "-"`), donc
aucun compte développeur n'est nécessaire pour un usage local.

## Lancer sur iPhone

1. Dans les réglages de la cible, onglet Signing & Capabilities, choisir votre
   équipe. Changer `PRODUCT_BUNDLE_IDENTIFIER` si `com.philipperobin.reperes`
   est déjà pris.
2. Choisir l'iPhone comme destination, puis Run.
3. À la première demande, autoriser la localisation **Toujours** : avec
   « Lorsque l'app est active », aucune alerte n'arrive quand l'app est fermée.
   Réglages > Repères > Position > Toujours si l'occasion a été manquée.

Aucun mode d'arrière-plan n'est requis : la surveillance de régions et les
changements significatifs de position suffisent à faire relancer l'app par iOS.

## Limites connues, à savoir avant de juger le comportement

- **Plans d'Apple n'accepte pas de calque tiers.** Une app ne peut pas ajouter sa
  propre série d'épingles dans l'app Plans ; elle peut seulement lui demander
  d'afficher un point ou un itinéraire. La liste complète s'affiche donc dans la
  carte de cette app, qui utilise les mêmes fonds de carte Apple.
- **20 zones surveillées au maximum**, limite imposée par iOS à toute app. L'app
  surveille donc en permanence les lieux les plus proches et fait tourner la
  sélection à chaque changement significatif de position. Au-delà de 20 lieux,
  un lieu lointain n'est pas surveillé par le système jusqu'à ce que vous vous
  en rapprochiez.
- **Sur Mac, les alertes ne fonctionnent que si l'app est ouverte.** Apple
  l'indique explicitement : macOS ne relance pas une app pour un franchissement
  de zone. Le Mac sert à gérer la liste, l'iPhone à être alerté.
- **Latence et précision.** Le système déclenche l'entrée de zone en quelques
  dizaines de secondes à quelques minutes, et un rayon sous 150 m est peu fiable,
  surtout en voiture. 250 m par défaut est un compromis raisonnable.
- **API obsolète assumée.** `CLCircularRegion` et `startMonitoring(for:)` sont
  marqués obsolètes dans le SDK courant au profit de `CLMonitor`, mais
  `CLMonitor` a un défaut documenté : les événements d'entrée ne sont pas livrés
  de façon fiable quand l'app est relancée en arrière-plan. Tout est confiné
  dans `Services/LocationCenter.swift` pour pouvoir basculer plus tard.
- **Ce code n'a pas été compilé.** Il a été écrit dans un conteneur Linux sans
  Xcode. La structure, la syntaxe du projet et l'intégrité des références ont
  été vérifiées, mais la première compilation peut demander quelques
  corrections.

## Organisation du code

```
Reperes/
  ReperesApp.swift          point d'entrée, délégué iOS pour la relance en arrière-plan
  Model/
    Place.swift             le lieu, décodage tolérant aux évolutions de schéma
    AppSettings.swift       réglages persistés
  Store/
    PlaceStorage.swift      lecture et écriture JSON, utilisable hors interface
    AppModel.swift          état observable, filtres, tri, CRUD
  Services/
    LocationCenter.swift    Core Location : autorisations, position, géofences
    NotificationService.swift  notifications locales et actions
    AddressSearch.swift     autocomplétion et géocodage MapKit
    ImportExport.swift      analyse de listes et de fichiers, export
  Views/
    RootView.swift          onglets sur iPhone, vue scindée sur Mac
    MapScreen.swift         carte, épingles, ajout par pointage
    PlaceListScreen.swift   liste, recherche, filtres, export
    PlaceEditor.swift       fiche d'un lieu
    AddPlaceSheet.swift     recherche d'adresse
    BulkImportSheet.swift   import en lot
    SettingsScreen.swift    réglages, autorisations, diagnostic
```

Les données sont dans `Application Support/Reperes/places.json`. Le chemin exact
est affiché dans Réglages, avec un bouton pour l'ouvrir dans le Finder.

## Si le projet refuse de s'ouvrir

Le fichier `project.pbxproj` a été écrit à la main. En cas de refus :

1. Xcode > File > New > Project > Multiplatform > App, nom `Reperes`.
2. Supprimer les fichiers générés `ReperesApp.swift` et `ContentView.swift`.
3. Glisser les dossiers `Model`, `Store`, `Services`, `Views`, `Support` et le
   fichier `ReperesApp.swift` de ce dépôt dans le groupe du projet.
4. Dans les réglages de la cible : déploiement iOS 17 / macOS 14, et recopier
   les descriptions d'usage de la localisation (Info.plist) ainsi que
   l'entitlement de localisation pour le Mac depuis
   `Reperes/Support/Reperes.entitlements`.

## Pistes pour la suite

- Synchronisation iCloud entre Mac et iPhone (CloudKit).
- Widget et Live Activity du prochain lieu à visiter.
- Regroupement des épingles au-delà de quelques centaines de lieux.
- Itinéraire optimisé sur une sélection de lieux.
- Historique des visites et statistiques.
