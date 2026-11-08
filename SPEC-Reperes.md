# Spécification fonctionnelle et technique
## App de lieux à visiter, avec alerte de proximité
Nom de travail : Repères. Cible : macOS puis iOS. Document de cadrage, version 1, 8 novembre 2026.

---

## 1. Besoin exprimé

Tenir une liste de lieux ou d'adresses, les voir positionnés sur un plan, et être
signalé quand on passe à proximité d'un lieu de la liste.

### Interprétation retenue, à confirmer

| Formulation | Interprétation retenue |
|---|---|
| « lister soit des lieux soit des adresses » | une entrée = un nom libre et/ou une adresse, convertie en coordonnées |
| « idéalement sur l'app Plan de Apple » | carte Apple (MapKit) intégrée dans l'app ; voir contrainte C1 |
| « lorsque je visite les lieux la carte affiche les lieux » | chaque lieu a un statut à visiter / visité, visible sur la carte (épingle rouge ou verte) |
| « lorsque je passe à proximité elle me le signale » | notification locale à l'entrée dans un rayon paramétrable autour d'un lieu non visité |

---

## 2. Périmètre

### Dans la v1
- Saisie d'un lieu par recherche d'adresse ou de commerce, par pointage sur la carte, ou depuis la position courante.
- Import d'une liste existante : texte collé (une ligne par lieu), fichier CSV, JSON ou GPX.
- Carte avec les lieux, distinction visuelle visité / à visiter, cercle du rayon d'alerte.
- Notification de proximité avec actions « Marquer comme visité » et « Itinéraire ».
- Marquage visité manuel, ou automatique à l'arrivée si l'option est activée.
- Export CSV, JSON, GPX. Ouverture d'un lieu ou d'un itinéraire dans Plans.

### Hors v1, à arbitrer plus tard
- Synchronisation Mac / iPhone (voir décision D1).
- Widget, Live Activity, Apple Watch.
- Itinéraire optimisé sur plusieurs lieux (Plans ne gère que 2 points via l'API publique).
- Partage de listes entre personnes.
- Regroupement d'épingles (utile seulement au-delà de quelques centaines de lieux).

---

## 3. Contraintes techniques, vérifiées avant conception

Ce sont les points qui déterminent la faisabilité. Ils ont été vérifiés dans la
documentation Apple courante, pas de mémoire.

### C1. L'app Plans d'Apple n'est pas extensible par une app tierce
Aucune API publique ne permet d'ajouter sa propre série d'épingles dans l'app Plans.
Une app tierce peut seulement demander à Plans d'afficher **un** point ou un
itinéraire, via `MKMapItem.openInMaps(launchOptions:)`.

**Conséquence** : la liste complète s'affiche dans la carte de l'app, qui utilise
les mêmes fonds de carte Apple (framework MapKit). Le bouton « Ouvrir dans Plans »
reste disponible lieu par lieu. L'alternative pour avoir les lieux dans Plans
lui-même serait de les saisir à la main en « Repères personnels », sans automatisation possible.
Source : [MKMapItem.openInMaps](https://developer.apple.com/documentation/mapkit/mkmapitem/openinmaps(launchoptions:))

### C2. iOS limite la surveillance à 20 zones par application
Limite système, pas contournable. Elle vaut pour l'ancienne API de régions et,
d'après les retours développeurs, pour la nouvelle API `CLMonitor`.

**Conséquence** : l'app surveille en permanence les 20 lieux actifs les plus proches
et fait tourner cette sélection à chaque changement significatif de position. Un lieu
lointain n'est pas surveillé par le système tant qu'on ne s'en rapproche pas. Un
contrôle par calcul de distance complète le dispositif à chaque réveil de l'app.
Source : [fil développeur sur la limite de 20 conditions](https://developer.apple.com/forums/thread/769113)

### C3. Sur macOS, les alertes ne fonctionnent que si l'app est ouverte
Texte Apple : « In macOS, condition monitoring works only while the app is running
[...] The system doesn't launch Mac apps to deliver region-related notifications. »
Sur iOS au contraire, le système réveille l'app, même fermée.

**Conséquence** : le Mac sert à constituer et gérer la liste, l'iPhone à être alerté
en déplacement. C'est aussi ce qui justifie la séquence Mac d'abord, iPhone ensuite.
Source : [Monitoring the user's proximity to geographic regions](https://developer.apple.com/documentation/corelocation/monitoring-the-user-s-proximity-to-geographic-regions)

### C4. Choix d'API de geofencing : l'ancienne, volontairement
- `CLMonitor` est l'API moderne (iOS 17+). Un défaut est documenté dans les forums
  Apple : les événements d'entrée ne sont pas livrés de façon fiable quand l'app est
  relancée en arrière-plan, alors que les sorties le sont.
  Source : [fil développeur 812111](https://developer.apple.com/forums/thread/812111)
- `CLLocationManager.startMonitoring(for:)` avec `CLCircularRegion` est marquée
  obsolète dans le SDK courant (disponible iOS 5.0 à 27.3), mais c'est celle dont le
  réveil en arrière-plan et la livraison des entrées sont fiables.
  Source : [startMonitoring(for:)](https://developer.apple.com/documentation/corelocation/cllocationmanager/startmonitoring(for:))

**Décision** : retenir l'ancienne API, et l'isoler dans un seul fichier pour pouvoir
basculer sur `CLMonitor` quand le défaut sera corrigé. Coût du basculement estimé :
une demi-journée. Avertissements de compilation assumés.

### C5. Autorisation de localisation « Toujours » indispensable
Avec « Lorsque l'app est active », aucune alerte n'arrive quand l'app est fermée.
iOS impose de demander d'abord « À l'utilisation », puis l'escalade vers « Toujours ».
Aucun mode d'arrière-plan particulier n'est à déclarer : la surveillance de régions
et les changements significatifs de position suffisent.

### C6. Latence et précision du déclenchement
Apple ne publie pas de chiffre. Les retours terrain convergents indiquent un délai de
l'ordre de la minute et un rayon sous 100 à 150 m peu fiable, surtout en voiture.
Point à valider sur le terrain, pas une donnée documentée.

**Conséquence** : rayon par défaut 250 m, réglable de 50 m à 3 km, avec un
avertissement dans l'interface sous 150 m.

### C7. Installation sur iPhone
Compte Apple gratuit : installation valable 7 jours, à renouveler par un nouveau Run
depuis Xcode. Compte développeur payant (99 euros par an) : un an, et possibilité de
TestFlight. Rien à décider pour commencer, le compte gratuit suffit aux essais.

---

## 4. Modèle de données

Un seul objet métier.

| Champ | Type | Rôle |
|---|---|---|
| `id` | UUID | identifiant stable, sert aussi d'identifiant de zone surveillée |
| `name` | texte | nom libre |
| `address` | texte | adresse formatée, renseignée par le géocodage |
| `latitude`, `longitude` | double | coordonnées |
| `notes` | texte | libre |
| `tag` | texte | étiquette simple pour filtrer |
| `isVisited` | booléen | statut |
| `visitedAt` | date | date de visite |
| `alertEnabled` | booléen | alerte active pour ce lieu |
| `alertRadius` | double | rayon de déclenchement en mètres |
| `createdAt` | date | ajout |
| `lastAlertAt` | date | dernière alerte, pour le délai anti-répétition |

Réglages globaux : rayon par défaut, alertes actives, alerter aussi les lieux visités,
marquage automatique à l'arrivée, délai minimum entre deux alertes d'un même lieu
(défaut 6 h), nombre de zones surveillées (1 à 20).

Décodage tolérant : un champ ajouté plus tard ne doit pas invalider un fichier
existant. Chaque champ absent prend sa valeur par défaut.

---

## 5. Architecture

Une seule cible multiplateforme, un seul code, SwiftUI. Déploiement iOS 17 / macOS 14
minimum, imposé par les API de carte SwiftUI et d'observation.

```
Modèle        Place, AppSettings                      structures pures, codables
Stockage      fichier JSON dans Application Support   lisible hors interface
État          AppModel, @Observable                   filtres, tri, écritures
Services      LocationCenter                          autorisations, position, zones
              NotificationService                     notifications et actions
              AddressSearch                           autocomplétion et géocodage MapKit
              ImportExport                            analyse de listes, export
Interface     onglets sur iPhone, vue scindée sur Mac
```

Deux points d'architecture non négociables, qui découlent des contraintes :

1. **Le stockage doit être lisible sans passer par l'interface.** Quand iOS relance
   l'app en arrière-plan pour un franchissement de zone, le code qui construit la
   notification tourne avant toute interface. D'où un stockage fichier simple plutôt
   qu'une base liée au cycle de vie de l'interface.
2. **Core Location doit être reconfiguré dès le lancement**, dans le délégué
   d'application, pas au premier affichage d'un écran.

Choix du stockage : fichier JSON. Simple, exportable, identique sur les deux
plateformes, et suffisant pour quelques milliers de lieux. À revoir si la décision D1
impose iCloud, qui orienterait plutôt vers SwiftData et CloudKit.

---

## 6. Écrans

| Écran | Contenu |
|---|---|
| Carte | épingles rouges à visiter, vertes visitées, cercle du rayon sur la sélection, styles plan et satellite, filtre, menu d'ajout, mode de pointage avec viseur au centre |
| Liste | recherche, filtre à visiter / visités / tous, tri distance, nom ou date d'ajout, distance affichée, indicateur des lieux réellement surveillés, balayage pour marquer visité ou supprimer |
| Fiche | nom, adresse, étiquette, notes, alerte et rayon, statut et date de visite, mini carte, ouverture dans Plans, itinéraire, suppression |
| Ajout | champ de recherche, suggestions d'adresses et de commerces, saisie directe de coordonnées acceptée |
| Import | zone de collage, formats reconnus affichés, géocodage ligne par ligne avec progression, revue avant ajout, lignes introuvables décochées |
| Réglages | alertes et rayon par défaut, options de marquage, délai anti-répétition, autorisations avec état et boutons, notification de test, diagnostic (zones surveillées, position, dernière alerte), chemin du fichier de données, suppression globale |

Sur Mac : liste à gauche, carte à droite, réglages dans la fenêtre Réglages standard.
Sur iPhone : trois onglets Carte, Lieux, Réglages.

---

## 7. Règles de fonctionnement des alertes

1. Candidats : lieux avec alerte active, coordonnées valides, non visités (sauf si
   l'option d'alerter les lieux visités est cochée).
2. Sélection : les 20 plus proches de la dernière position connue.
3. Mise à jour de la sélection : à chaque changement significatif de position, à
   chaque sortie de zone, à chaque modification de la liste, au lancement.
4. Déclenchement : entrée dans la zone, ou contrôle par distance au réveil de l'app.
5. Anti-répétition : pas de seconde alerte pour un même lieu avant le délai réglé.
6. Effet : notification locale, horodatage, et marquage visité si l'option est active.
7. Un lieu ajouté alors qu'on se trouve déjà dedans ne déclenche pas d'entrée de zone.
   Couvert par le contrôle de distance et par un bouton de vérification manuelle.

---

## 8. Plan de livraison

Chaque étape se termine par quelque chose de vérifiable sur la machine.

| Étape | Contenu | Livrable vérifiable | Charge |
|---|---|---|---|
| 1 | Projet Xcode, modèle, stockage, liste, fiche, carte avec épingles | sur Mac : ajouter un lieu à la main, le voir sur la carte, le retrouver après redémarrage | 1 jour |
| 2 | Recherche d'adresse, ajout par pointage, import de liste, export | coller 20 adresses et obtenir 20 épingles correctes | 1 jour |
| 3 | Localisation, distances, tri par distance, autorisations, diagnostic | sur Mac : voir sa position et les distances ; sur iPhone : build et liste fonctionnelle | 0,5 jour |
| 4 | Geofencing, notifications, actions, règles d'alerte | sur iPhone : recevoir une alerte en passant devant un lieu, app fermée | 1 jour, plus essais terrain |
| 5 | Finitions : icône, libellés, cas limites, réglages | app utilisable au quotidien | 0,5 jour |

Les étapes 1 à 3 sont vérifiables sans iPhone ni compte développeur. L'étape 4 exige
un iPhone et des essais en déplacement réel : c'est la seule qui ne peut pas être
validée depuis un bureau.

---

## 9. Décisions à prendre

| Réf | Décision | Options | Recommandation |
|---|---|---|---|
| D1 | Synchronisation Mac / iPhone | aucune (export/import manuel) ; iCloud via CloudKit | commencer sans, ajouter iCloud en v2 : cela change le stockage et ajoute un vrai coût de mise au point |
| D2 | Source de la liste initiale | saisie manuelle ; collage ; fichier existant (CSV, Notion, Plans) | à préciser : si une liste existe déjà, son format conditionne l'import de l'étape 2 |
| D3 | Statut des lieux | visité / à visiter ; plusieurs visites horodatées | binaire en v1, historique si le besoin apparaît |
| D4 | Distribution | usage personnel ; TestFlight ; App Store | usage personnel, compte gratuit, rien à payer |
| D5 | Nom de l'app | Repères ou autre | provisoire, sans impact technique hors identifiant de bundle |

---

## 10. Ce qui est solide, ce qui reste à valider

**Solide, vérifié dans la documentation Apple** : l'impossibilité d'injecter des
épingles dans l'app Plans, la limite de 20 zones, l'absence de réveil d'app sur macOS,
l'état des deux API de geofencing, la nécessité de l'autorisation « Toujours ».

**À valider sur le terrain, non documenté par Apple** : le délai réel de
déclenchement, le rayon minimum utilisable, le comportement en voiture à vitesse
soutenue, la consommation de batterie. Ces points ne se tranchent qu'avec un iPhone en
déplacement, à l'étape 4.

**Hypothèse de conception** : le volume de lieux reste de l'ordre de quelques
centaines. Au-delà, la carte demandera un regroupement d'épingles et le tri par
distance une indexation.
