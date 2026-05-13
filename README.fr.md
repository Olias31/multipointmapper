# MultiPointMapper v1.0 — Thème de question pour LimeSurvey

Thème de question pour LimeSurvey permettant aux répondants de **placer plusieurs points sur une carte interactive** (Leaflet + OpenStreetMap), chacun annoté avec un nom et une fréquence de visite.

Développé à l'INRAE pour l'étude des lieux d'approvisionnement en circuits courts alimentaires.

Inspiré de [LimeSurvey-Signature-Question](https://github.com/adamzammit/LimeSurvey-Signature-Question) par Adam Zammit.

![LimeSurvey](https://img.shields.io/badge/LimeSurvey-4.x%20%7C%205.x%20%7C%206.x-brightgreen)
![Licence](https://img.shields.io/badge/licence-GPL%20v3-blue)

---

## Fonctionnalités

- Cliquer sur la carte pour déposer un point
- Chaque point ouvre un formulaire : champ nom libre + liste déroulante de fréquence de visite configurable
- Nombre maximum de points configurable (0 = illimité)
- Réponses stockées sous forme de tableau JSON — survivent à la navigation entre pages
- Tous les paramètres cartographiques configurables par question (centre, zoom, options de fréquence)
- Compatible LimeSurvey 4.x, 5.x, 6.x

## Installation

### LimeSurvey 6.x (interface graphique)

1. Télécharger le zip de la dernière version (`MultiPointMapper_v1.0.zip`) depuis les [Releases GitHub](https://github.com/Olias31/multipointmapper/releases)
2. Dans l'administration LimeSurvey : **Configuration → Thèmes → Thèmes de questions → Importer**
3. Uploader le zip — le thème `multipointmapper` est disponible

### LimeSurvey 4.x / 5.x (installation manuelle)

Extraire le zip de façon à ce que le dossier `multipointmapper` se retrouve à l'emplacement :

```
limesurvey/survey/questions/answer/shortfreetext/multipointmapper/
```

## Utilisation

Appliquer le thème à n'importe quelle question de type **Texte libre court**. Quatre attributs personnalisés sont disponibles dans l'éditeur de question :

| Attribut | Défaut | Description |
|---|---|---|
| `mpm_max_points` | `0` | Nombre maximum de points (0 = illimité) |
| `mpm_frequency_options` | `Tous les jours;Plusieurs fois par semaine;...` | Options de fréquence séparées par des points-virgules |
| `mpm_map_center` | `43.6119, 3.8778` | Centre initial de la carte (lat, lng) |
| `mpm_default_zoom` | `12` | Niveau de zoom initial |

## Format des réponses

Les réponses sont stockées sous forme de tableau JSON dans le champ texte de la question :

```json
[
  { "id": 1, "lat": 43.6119, "lng": 3.8778, "name": "Marché du Lez", "freq": "Une fois par semaine" },
  { "id": 2, "lat": 43.5800, "lng": 3.8500, "name": "AMAP des Pins",  "freq": "Tous les jours" }
]
```

## Licence

GPL v3 — voir [LICENSE](LICENSE)

## Auteur

Grégori Akermann — INRAE  
gregori.akermann@inrae.fr
