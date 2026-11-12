# Spécification V1 — Repères
## App iPhone de lieux à visiter, avec alerte de proximité

Document de cadrage, version 2, 12 novembre 2026.
Cible V1 : **iPhone seul**, iOS 17 minimum. Le Mac est écarté de la V1 (motif en C3).

Maquette interactive associée : `Reperes/prototype-iphone.html`.

---

## 1. Besoin

Tenir une liste de lieux ou d'adresses, les voir positionnés sur un plan, et être
signalé en passant à proximité d'un lieu de la liste.

### Interprétation retenue

| Formulation | Interprétation |
|---|---|
| « lister soit des lieux soit des adresses » | une entrée = un nom libre et/ou une adresse, convertie en coordonnées |
| « sur l'app Plan de Apple » | carte Apple (MapKit) intégrée dans l'app ; voir C1 |
| « lorsque je visite les lieux la carte affiche les lieux » | statut à visiter / visité, visible sur la carte (épingle rouge ou verte) |
| « lorsque je passe à proximité elle me le signale » | notification locale à l'entrée dans un rayon paramétrable autour d'un lieu non visité |

---

## 2. Périmètre

### Dans la V1
- Saisie par recherche d'adresse ou de commerce, par pointage sur la carte, depuis la position courante.
- Import d'une liste : texte collé (une ligne par lieu), fichier CSV, JSON ou GPX.
- Carte avec les lieux, distinction visité / à visiter, cercle du rayon d'alerte.
- Notification de proximité avec actions « Marquer comme visité » et « Itinéraire ».
- Marquage visité manuel, ou automatique à l'arrivée si l'option est activée.
- Export CSV, JSON, GPX. Ouverture d'un lieu ou d'un itinéraire dans Plans.

### Hors V1
- **Version Mac.** Le code SwiftUI reste multiplateforme dans sa structure ; ajouter
  la destination macOS plus tard coûte de l'ordre d'une journée, essentiellement
  d'interface. Rien dans la V1 ne ferme cette porte.
- Synchronisation et sauvegarde iCloud (décision D1).
- Widget, Live Activity, Apple Watch.
- Itinéraire optimisé sur plusieurs lieux (l'API publique de Plans ne gère que deux points).
- Regroupement d'épingles, utile seulement au-delà de quelques centaines de lieux.

---

## 3. Contraintes techniques vérifiées

Vérifiées dans la documentation Apple courante, pas de mémoire. Ce sont elles qui
déterminent la conception.

### C1. L'app Plans d'Apple n'est pas extensible par une app tierce
Aucune API publique ne permet d'ajouter une série d'épingles dans l'app Plans. Une
app tierce peut seulement lui demander d'afficher **un** point ou un itinéraire, via
`MKMapItem.openInMaps(launchOptions:)`.

**Conséquence** : la liste s'affiche dans la carte de l'app, qui utilise les mêmes
fonds de carte Apple (MapKit). Le bouton « Ouvrir dans Plans » reste disponible lieu
par lieu. Pour avoir les lieux dans Plans lui-même, il faudrait les saisir à la main
en repères personnels, sans automatisation possible.
Source : https://developer.apple.com/documentation/mapkit/mkmapitem/openinmaps(launchoptions:)

### C2. iOS limite la surveillance à 20 zones par application
Limite système, non contournable.

**Conséquence** : l'app surveille les 20 lieux actifs les plus proches et fait tourner
la sélection à chaque changement significatif de position. Un lieu lointain n'est pas
surveillé tant qu'on ne s'en rapproche pas. Un contrôle par calcul de distance
complète le dispositif à chaque réveil de l'app.
Source : https://developer.apple.com/forums/thread/769113

### C3. Pourquoi le Mac est écarté de la V1
Texte Apple : « In macOS, condition monitoring works only while the app is running
[...] The system doesn't launch Mac apps to deliver region-related notifications. »
Sur iOS, le système réveille l'app même fermée.

**Conséquence** : sur Mac, la fonction centrale de l'app ne fonctionne que si la
fenêtre est ouverte. Le Mac ne peut donc servir qu'à gérer la liste. Pour une V1,
l'iPhone porte seul la valeur de l'app.
Source : https://developer.apple.com/documentation/corelocation/monitoring-the-user-s-proximity-to-geographic-regions

### C4. Choix d'API de geofencing : l'ancienne, volontairement
- `CLMonitor`, API moderne depuis iOS 17, a un défaut documenté dans les forums
  Apple : les événements d'entrée ne sont pas livrés de façon fiable quand l'app est
  relancée en arrière-plan, alors que les sorties le sont.
  Source : https://developer.apple.com/forums/thread/812111
- `CLLocationManager.startMonitoring(for:)` avec `CLCircularRegion` est marquée
  obsolète dans le SDK courant (disponible iOS 5.0 à 27.3), mais c'est celle dont le
  réveil en arrière-plan et la livraison des entrées sont fiables.
  Source : https://developer.apple.com/documentation/corelocation/cllocationmanager/startmonitoring(for:)

**Décision** : retenir l'ancienne API, isolée dans un seul fichier, pour pouvoir
basculer sur `CLMonitor` quand le défaut sera corrigé. Basculement estimé à une
demi-journée. Avertissements de compilation assumés.

### C5. Autorisation de localisation « Toujours » indispensable
Avec « Lorsque l'app est active », aucune alerte n'arrive app fermée. iOS impose de
demander d'abord « À l'utilisation » puis l'escalade vers « Toujours ». Aucun mode
d'arrière-plan n'est à déclarer : la surveillance de régions et les changements
significatifs de position suffisent.

### C6. Latence et précision du déclenchement
Apple ne publie pas de chiffre. Les retours terrain convergents indiquent un délai de
l'ordre de la minute et un rayon sous 100 à 150 m peu fiable, surtout en voiture.
À valider sur le terrain, ce n'est pas une donnée documentée.

**Conséquence** : rayon par défaut 250 m, réglable de 50 m à 3 km, avertissement dans
l'interface sous 150 m.

### C7. Installation sur iPhone
Compte Apple gratuit : installation valable 7 jours, à renouveler par un Run depuis
Xcode. Compte développeur payant (99 euros par an) : un an, et TestFlight. Le compte
gratuit suffit pour commencer.

---

## 4. Modèle de données

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
existant, chaque champ absent prend sa valeur par défaut.

---

## 5. Architecture

Cible iOS unique, SwiftUI, iOS 17 minimum (imposé par les API de carte SwiftUI et
d'observation).

```
Modèle        Place, AppSettings                      structures pures, codables
Stockage      fichier JSON dans Application Support   lisible hors interface
État          AppModel, @Observable                   filtres, tri, écritures
Services      LocationCenter                          autorisations, position, zones
              NotificationService                     notifications et actions
              AddressSearch                           autocomplétion et géocodage MapKit
              ImportExport                            analyse de listes, export
Interface     trois onglets : Carte, Lieux, Réglages
```

Deux points non négociables, qui découlent des contraintes :

1. **Le stockage doit être lisible sans passer par l'interface.** Quand iOS relance
   l'app en arrière-plan pour un franchissement de zone, le code qui construit la
   notification tourne avant toute interface. D'où un stockage fichier simple plutôt
   qu'une base liée au cycle de vie de l'interface.
2. **Core Location doit être reconfiguré dès le lancement**, dans le délégué
   d'application, pas au premier affichage d'un écran.

Stockage retenu : fichier JSON. Simple, exportable, suffisant pour quelques milliers
de lieux. À revoir si la décision D1 impose iCloud, qui orienterait vers SwiftData et
CloudKit.

---

## 6. Écrans

| Écran | Contenu |
|---|---|
| Carte | épingles rouges à visiter, vertes visitées, cercle du rayon sur la sélection, filtre, styles plan et satellite, menu d'ajout, mode de pointage avec viseur |
| Lieux | recherche, filtre à visiter / visités / tous, tri par distance, indicateur des lieux réellement surveillés, balayage pour marquer visité ou supprimer, export |
| Fiche | nom, adresse, étiquette, notes, alerte et rayon, statut et date de visite, ouverture dans Plans, itinéraire, suppression |
| Ajout | champ de recherche, suggestions d'adresses et de commerces, saisie de coordonnées acceptée |
| Import | zone de collage, formats reconnus, géocodage ligne par ligne avec progression, revue avant ajout |
| Réglages | alertes et rayon par défaut, marquage automatique, délai anti-répétition, autorisations avec état et escalade vers « Toujours », notification de test, diagnostic, export, suppression globale |

La maquette `prototype-iphone.html` montre ces six écrans en fonctionnement, avec la
simulation d'un trajet qui déclenche les notifications.

---

## 7. Règles de fonctionnement des alertes

1. Candidats : lieux avec alerte active, coordonnées valides, non visités (sauf si
   l'option d'alerter les lieux visités est cochée).
2. Sélection : les 20 plus proches de la dernière position connue.
3. Mise à jour : à chaque changement significatif de position, à chaque sortie de
   zone, à chaque modification de la liste, au lancement.
4. Déclenchement : entrée dans la zone, ou contrôle par distance au réveil de l'app.
5. Anti-répétition : pas de seconde alerte pour un même lieu avant le délai réglé.
6. Effet : notification locale, horodatage, marquage visité si l'option est active.
7. Un lieu ajouté alors qu'on se trouve déjà dedans ne déclenche pas d'entrée de zone.
   Couvert par le contrôle de distance et par un bouton de vérification manuelle.

---

## 8. Plan de livraison

| Étape | Contenu | Livrable vérifiable | Charge |
|---|---|---|---|
| 1 | Projet Xcode iOS, modèle, stockage, liste, fiche | simulateur : ajouter un lieu, le retrouver après relance | 0,75 j |
| 2 | Carte MapKit, épingles, sélection, cercle de rayon, pointage | simulateur : les lieux s'affichent et se sélectionnent | 0,75 j |
| 3 | Recherche d'adresse, import de liste collée ou fichier, export | coller 20 adresses et obtenir 20 épingles correctes | 0,75 j |
| 4 | Localisation, autorisations, geofencing, notifications, règles | simulateur avec trajet simulé : les notifications tombent | 0,75 j |
| 5 | Essais terrain, réglages de rayon, finitions, icône | alerte reçue en passant devant un lieu, iPhone en poche | 0,5 j + essais |

Les étapes 1 à 4 se vérifient dans le simulateur Xcode, qui sait simuler une position
et un trajet. L'étape 5 exige un iPhone et des déplacements réels : c'est la seule qui
ne peut pas être validée depuis un bureau.

Préalable à l'étape 1 : le brouillon de code présent dans ce dossier est
multiplateforme. Le ramener à iOS seul (retrait des branches macOS, de la vue scindée,
de la scène Réglages macOS et des entitlements) est inclus dans l'étape 1.

---

## 9. Décisions à prendre

| Réf | Décision | Options | Recommandation |
|---|---|---|---|
| D1 | Sauvegarde et reprise | aucune, export manuel ; iCloud | aucune en V1 ; l'export JSON suffit à ne rien perdre |
| D2 | Source de la liste initiale | saisie manuelle ; collage ; fichier existant | à préciser : si une liste existe déjà, son format conditionne l'étape 3 |
| D3 | Statut des lieux | visité / à visiter ; plusieurs visites horodatées | binaire en V1 |
| D4 | Distribution | usage personnel ; TestFlight ; App Store | usage personnel, compte gratuit |
| D5 | Nom de l'app | Repères ou autre | provisoire, sans impact technique hors identifiant de bundle |

---

## 10. Ce qui est solide, ce qui reste à valider

**Solide, vérifié dans la documentation Apple** : l'impossibilité d'injecter des
épingles dans l'app Plans, la limite de 20 zones, l'absence de réveil d'app sur macOS,
l'état des deux API de geofencing, la nécessité de l'autorisation « Toujours ».

**À valider sur le terrain, non documenté par Apple** : le délai réel de
déclenchement, le rayon minimum utilisable, le comportement en voiture à vitesse
soutenue, la consommation de batterie. Ces points ne se tranchent qu'avec un iPhone en
déplacement, à l'étape 5.

**Hypothèse de conception** : quelques centaines de lieux au plus. Au-delà, la carte
demandera un regroupement d'épingles et le tri par distance une indexation.

---

## Historique

- v2, 12 novembre 2026 : V1 ramenée à l'iPhone seul, macOS repoussé, plan de livraison
  revu pour le simulateur, maquette interactive ajoutée.
- v1, 8 novembre 2026 : cadrage initial Mac puis iPhone.
