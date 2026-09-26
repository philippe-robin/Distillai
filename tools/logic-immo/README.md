# Relevé des annonces Logic-Immo vers Excel

Ouvre une recherche Logic-Immo dans un navigateur piloté, relève les annonces et
les écrit dans un classeur Excel trié par prix au m².

## Installation

```bash
pip install playwright openpyxl
playwright install chromium
```

## Utilisation

```bash
python scrape_logic_immo.py \
  --url "https://www.logic-immo.com/classified-map?classifiedBusiness=Professional&distributionTypes=Buy&estateTypes=House&locations=eyJwbGFjZUlkcyI6WyJTVFJURlI0MTI4Mzk1Il0sImR1cmF0aW9uIjoxNSwibW9kZSI6IkNhciJ9&method=form&priceMax=800000&priceMin=550000&projectTypes=Projected,Resale&spaceMax=250&spaceMin=150" \
  --out biens_strasbourg.xlsx --dump-json releve.json
```

Options utiles :

| Option | Effet |
|---|---|
| `--headful` | affiche le navigateur, pour voir ce que fait la page |
| `--max-pages N` | nombre de pages de résultats parcourues (10 par défaut) |
| `--delay S` | pause entre deux pages, 3 s par défaut |
| `--dump-json F` | écrit le relevé brut, rejouable avec `--from-json` |
| `--from-json F` | régénère le classeur sans repasser sur le site |
| `--from-html F` | relit une page enregistrée depuis le navigateur (Cmd+S) |
| `--no-filter` | garde les annonces hors critères de prix ou de surface |

## Ce que produit le classeur

- Feuille **Biens** : une ligne par annonce, filtres Excel actifs, volets figés,
  tri par prix au m² croissant, lien cliquable vers l'annonce. Le prix au m² est
  une formule (`prix ÷ surface`), il se met à jour si une valeur est corrigée.
- Feuille **Critères** : URL de recherche, critères décodés, date du relevé et
  notes de méthode.

## Comment la collecte fonctionne

1. **Réponses JSON de l'API du site** : le script écoute les appels XHR de la page
   et repère les objets qui ressemblent à une annonce (un prix, plus au moins deux
   autres signaux). Les clés sont mappées par alias, donc un renommage côté site
   ne casse pas la collecte.
2. **`__NEXT_DATA__`** : les données injectées dans la page au chargement.
3. **DOM rendu** : repli par lecture des cartes de résultats, prix, surface,
   pièces et commune extraits du texte.

Les trois sources sont fusionnées et dédupliquées (par identifiant, puis par lien,
puis par prix + surface + commune).

## Limites connues

- Le site peut renvoyer des annonces hors critères ; elles sont écartées et le
  nombre écarté est indiqué dans la feuille Critères.
- Une annonce sans surface publiée sort sans prix au m².
- Un mur anti-robot ou un captcha bloque la collecte : relancer avec `--headful`,
  ou enregistrer la page depuis le navigateur et la relire avec `--from-html`.
- Les sélecteurs de repli DOM sont génériques, mais une refonte du site peut
  demander un ajustement de `CARD_JS` dans `scrape_logic_immo.py`.

## Tests

```bash
python tests/test_extract.py
```

Couvre les parseurs de prix et de surface, l'extraction JSON, la déduplication
inter-sources, le filtrage sur critères, le pipeline navigateur sur une page de
test locale et la structure du classeur.
