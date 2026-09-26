"""Extraction et normalisation des annonces Logic-Immo.

Deux sources possibles, testées dans cet ordre :
  1. les reponses JSON des appels XHR de la page (source la plus fiable) ;
  2. le contenu du DOM rendu (repli quand le format des API change).

L'extraction JSON est volontairement generique : on ne code pas en dur le
schema de l'API, on repere les objets qui ressemblent a une annonce (un prix
plus au moins un autre signal immobilier) et on mappe les cles par alias.
"""

from __future__ import annotations

import re
from typing import Any, Iterable
from urllib.parse import urljoin

BASE_URL = "https://www.logic-immo.com"

# Alias de cles, minuscules et sans separateurs (voir _norm_key).
ALIASES: dict[str, tuple[str, ...]] = {
    "id": ("id", "classifiedid", "listingid", "adid", "uuid", "reference", "ref"),
    "titre": ("title", "headline", "name", "label", "adtitle", "description"),
    "prix": ("price", "pricevalue", "sellingprice", "priceamount", "amount", "totalprice"),
    "surface": (
        "livingspace", "livingarea", "surface", "surfacearea", "area", "space",
        "squaremeters", "habitablesurface",
    ),
    "terrain": ("landsurface", "landarea", "plotsurface", "plotarea", "groundsurface", "terrain"),
    "pieces": ("rooms", "roomcount", "numberofrooms", "nbrooms", "roomsnumber", "pieces"),
    "chambres": ("bedrooms", "bedroomcount", "numberofbedrooms", "nbbedrooms", "chambres"),
    "ville": ("city", "cityname", "town", "locality", "municipality", "commune"),
    "cp": ("zipcode", "postalcode", "postcode", "zip", "codepostal"),
    "agence": (
        "agency", "agencyname", "advertiser", "advertisername", "seller", "contactname",
        "brand", "companyname", "professional",
    ),
    "url": ("url", "link", "permalink", "seourl", "detailurl", "href", "path", "slug"),
    "dpe": ("energyclass", "energyrating", "dpe", "epc", "energyperformance", "energylabel"),
    "type_projet": ("projecttype", "projecttypes", "buildingcondition", "isnew", "newbuild", "isnewbuild"),
    "type_bien": ("estatetype", "propertytype", "realestatetype", "type", "category"),
}

_NUM_RE = re.compile(r"-?\d[\d\s  .,]*")
_PRICE_TXT_RE = re.compile(r"([\d][\d\s  .,]*)\s*(?:€|eur)", re.I)
_SPACE_TXT_RE = re.compile(r"([\d][\d\s  .,]*)\s*m(?:²|2|²)", re.I)
_ROOMS_TXT_RE = re.compile(r"(\d+)\s*(?:pi[eè]ces?|p\.\b|pcs?\b)", re.I)
_BEDROOMS_TXT_RE = re.compile(r"(\d+)\s*(?:chambres?|ch\.\b)", re.I)
_CITY_TOKEN = r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]*(?:[ '’\-][A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]*){0,4}"
_ZIP_CITY_RE = re.compile(r"\b(\d{5})\b[\s,-]+(" + _CITY_TOKEN + r")")
_CITY_ZIP_RE = re.compile(r"(" + _CITY_TOKEN + r")\s*[(\[]\s*(\d{5})\s*[)\]]")
# Lignes de simulation de credit ou de frais : leur montant n'est pas un prix de vente.
_CREDIT_LINE_RE = re.compile(
    r"(par\s*mois|/\s*mois|mensualit|cr[ée]dit|emprunt|pr[êe]t|assurance|honoraires|"
    r"frais\s+d|charges|taxe|estimation|budget)",
    re.I,
)
# Mots qui ouvrent un intitule d'annonce.
_TITLE_HINT_RE = re.compile(r"(maison|villa|appartement|duplex|loft|propri[ée]t[ée]|demeure|pavillon|m²|pi[eè]ce)", re.I)
_DETAIL_HREF_RE = re.compile(r"/(?:classified|annonce|detail|vente)[-/]", re.I)


def _norm_key(key: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(key).lower())


def to_number(value: Any) -> float | None:
    """Convertit 550000, '550 000 €', '1.250,50' ou {'value': 550000} en float."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, dict):
        for key in ("value", "amount", "raw", "min", "displayvalue"):
            for k, v in value.items():
                if _norm_key(k) == key:
                    num = to_number(v)
                    if num is not None:
                        return num
        return None
    if isinstance(value, (list, tuple)):
        for item in value:
            num = to_number(item)
            if num is not None:
                return num
        return None
    text = str(value)
    match = _NUM_RE.search(text)
    if not match:
        return None
    raw = re.sub(r"[\s  ]", "", match.group(0))
    # 1.250,50 -> 1250.50 ; 1,250.50 -> 1250.50 ; 1 250 -> 1250
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".") if raw.rfind(",") > raw.rfind(".") else raw.replace(",", "")
    elif "," in raw:
        decimals = len(raw.split(",")[-1])
        raw = raw.replace(",", "." if decimals in (1, 2) else "")
    elif raw.count(".") == 1 and len(raw.split(".")[-1]) == 3:
        raw = raw.replace(".", "")  # 550.000 -> 550000
    try:
        return float(raw)
    except ValueError:
        return None


def _flat_lookup(obj: dict, field: str) -> Any:
    """Cherche un alias du champ dans l'objet puis dans ses sous-objets simples."""
    aliases = ALIASES[field]
    for key, value in obj.items():
        if _norm_key(key) in aliases and value not in (None, "", [], {}):
            return value
    for key, value in obj.items():
        if isinstance(value, dict):
            for subkey, subvalue in value.items():
                if _norm_key(subkey) in aliases and subvalue not in (None, "", [], {}):
                    return subvalue
    return None


def _as_text(value: Any) -> str | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, dict):
        for key in ("name", "label", "title", "value", "text", "displayname"):
            for k, v in value.items():
                if _norm_key(k) == key:
                    text = _as_text(v)
                    if text:
                        return text
        return None
    if isinstance(value, (list, tuple)):
        parts = [t for t in (_as_text(v) for v in value) if t]
        return ", ".join(dict.fromkeys(parts)) or None
    return None


def looks_like_listing(obj: Any) -> bool:
    if not isinstance(obj, dict):
        return False
    prix = to_number(_flat_lookup(obj, "prix"))
    if prix is None or prix < 1000:  # ecarte les compteurs, filtres, pagination
        return False
    signals = sum(
        1
        for field in ("surface", "pieces", "ville", "url", "id", "titre", "terrain", "chambres")
        if _flat_lookup(obj, field) not in (None, "", [], {})
    )
    return signals >= 2


def normalize(obj: dict, source: str = "json") -> dict:
    url = _as_text(_flat_lookup(obj, "url"))
    if url and url.startswith("/"):
        url = urljoin(BASE_URL, url)
    type_projet = _flat_lookup(obj, "type_projet")
    if isinstance(type_projet, bool):
        type_projet = "Neuf" if type_projet else "Ancien"
    record = {
        "id": _as_text(_flat_lookup(obj, "id")),
        "titre": _as_text(_flat_lookup(obj, "titre")),
        "ville": _as_text(_flat_lookup(obj, "ville")),
        "cp": _as_text(_flat_lookup(obj, "cp")),
        "prix": to_number(_flat_lookup(obj, "prix")),
        "surface": to_number(_flat_lookup(obj, "surface")),
        "terrain": to_number(_flat_lookup(obj, "terrain")),
        "pieces": to_number(_flat_lookup(obj, "pieces")),
        "chambres": to_number(_flat_lookup(obj, "chambres")),
        "dpe": _as_text(_flat_lookup(obj, "dpe")),
        "type_bien": _as_text(_flat_lookup(obj, "type_bien")),
        "type_projet": _as_text(type_projet),
        "agence": _as_text(_flat_lookup(obj, "agence")),
        "url": url,
        "source": source,
    }
    if record["titre"] and len(record["titre"]) > 180:
        record["titre"] = record["titre"][:177] + "..."
    return record


def harvest_json(payload: Any, source: str = "json", _depth: int = 0) -> list[dict]:
    """Parcourt un JSON quelconque et remonte les objets qui sont des annonces."""
    found: list[dict] = []
    if _depth > 12:
        return found
    if isinstance(payload, dict):
        if looks_like_listing(payload):
            found.append(normalize(payload, source))
            # Une annonce peut contenir des sous-objets (medias, agence) : on ne
            # descend pas plus bas pour eviter les doublons partiels.
            return found
        for value in payload.values():
            found.extend(harvest_json(value, source, _depth + 1))
    elif isinstance(payload, list):
        for item in payload:
            found.extend(harvest_json(item, source, _depth + 1))
    return found


def parse_card_text(text: str) -> dict:
    """Extrait prix / surface / pieces / ville depuis le texte d'une carte."""
    out: dict[str, Any] = {}
    price = _PRICE_TXT_RE.search(text)
    if price:
        out["prix"] = to_number(price.group(1))
    space = _SPACE_TXT_RE.search(text)
    if space:
        out["surface"] = to_number(space.group(1))
    rooms = _ROOMS_TXT_RE.search(text)
    if rooms:
        out["pieces"] = float(rooms.group(1))
    bedrooms = _BEDROOMS_TXT_RE.search(text)
    if bedrooms:
        out["chambres"] = float(bedrooms.group(1))
    city_zip = _CITY_ZIP_RE.search(text)
    if city_zip:
        out["ville"] = city_zip.group(1).strip(" ,-")
        out["cp"] = city_zip.group(2)
    else:
        zip_city = _ZIP_CITY_RE.search(text)
        if zip_city:
            out["cp"] = zip_city.group(1)
            out["ville"] = zip_city.group(2).strip(" ,-")
    return out


MIN_SALE_PRICE = 10000  # en dessous, c'est une mensualite ou des frais, pas un bien


def parse_text_dump(text: str) -> list[dict]:
    """Extrait les annonces d'un copier-coller de la page de resultats.

    Le texte colle n'a pas de structure : on decoupe sur les prix de vente. Un
    bloc va de la fin du bloc precedent jusqu'a la ligne du prix incluse, ce qui
    evite de happer le debut de l'annonce suivante. Les lignes de simulation de
    credit et de frais sont ignorees, sinon leur montant ouvrirait un faux bloc.
    """
    lines = [l.strip() for l in text.replace("\u00a0", " ").replace("\u202f", " ").splitlines()]
    found: list[dict] = []
    start = 0
    for index, line in enumerate(lines):
        price_match = _PRICE_TXT_RE.search(line)
        if not price_match or _CREDIT_LINE_RE.search(line):
            continue
        price = to_number(price_match.group(1))
        if price is None or price < MIN_SALE_PRICE:
            continue
        block = [l for l in lines[start : index + 1] if l and not _CREDIT_LINE_RE.search(l)]
        start = index + 1
        parsed = parse_card_text("\n".join(block))
        parsed["prix"] = price  # le prix du bloc est celui de sa derniere ligne
        if parsed.get("surface") is None and parsed.get("pieces") is None:
            continue
        titre = next((l for l in block if _TITLE_HINT_RE.search(l) and not _PRICE_TXT_RE.search(l)), None)
        if titre is None:
            titre = next((l for l in block if len(l) > 8 and not _PRICE_TXT_RE.search(l)), None)
        found.append(
            {
                "id": None,
                "titre": titre[:180] if titre else None,
                "ville": parsed.get("ville"),
                "cp": parsed.get("cp"),
                "prix": parsed.get("prix"),
                "surface": parsed.get("surface"),
                "terrain": None,
                "pieces": parsed.get("pieces"),
                "chambres": parsed.get("chambres"),
                "dpe": None,
                "type_bien": None,
                "type_projet": None,
                "agence": None,
                "url": None,
                "source": "texte",
            }
        )
    return found


def harvest_cards(cards: Iterable[dict]) -> list[dict]:
    """cards : dicts {'text': ..., 'href': ..., 'title': ...} preleves dans le DOM."""
    found = []
    for card in cards:
        text = card.get("text") or ""
        parsed = parse_card_text(text)
        if not parsed.get("prix"):
            continue
        href = card.get("href")
        if href and href.startswith("/"):
            href = urljoin(BASE_URL, href)
        title = (card.get("title") or "").strip() or None
        if not title:
            first_line = next((l.strip() for l in text.splitlines() if l.strip()), "")
            title = first_line[:180] or None
        found.append(
            {
                "id": card.get("id"),
                "titre": title,
                "ville": parsed.get("ville"),
                "cp": parsed.get("cp"),
                "prix": parsed.get("prix"),
                "surface": parsed.get("surface"),
                "terrain": None,
                "pieces": parsed.get("pieces"),
                "chambres": parsed.get("chambres"),
                "dpe": None,
                "type_bien": None,
                "type_projet": None,
                "agence": card.get("agence"),
                "url": href,
                "source": "dom",
            }
        )
    return found


def _keys_for(rec: dict) -> list[tuple]:
    """Cles d'identite d'une annonce, de la plus sure a la plus faible.

    Une meme annonce peut arriver par l'API (avec un id) et par le DOM (avec
    seulement son lien) : on lui donne toutes ses cles et on fusionne les
    enregistrements qui en partagent au moins une. La cle approximative n'est
    utilisee que faute d'identifiant, pour ne pas confondre deux lots
    identiques d'un meme programme.
    """
    keys: list[tuple] = []
    if rec.get("id"):
        keys.append(("id", str(rec["id"]).strip().lower()))
    url = rec.get("url")
    if url:
        keys.append(("url", str(url).split("?")[0].split("#")[0].rstrip("/").lower()))
    if not keys:
        # Sans identifiant ni lien, l'annonceur fait partie de l'identite : un
        # meme bien confie a deux agences donne deux annonces, pas un doublon.
        keys.append(
            (
                "fuzzy",
                rec.get("prix"),
                rec.get("surface"),
                (rec.get("ville") or "").strip().lower(),
                (rec.get("agence") or "").strip().lower(),
            )
        )
    return keys


def _merge_into(target: dict, other: dict) -> None:
    for field, value in other.items():
        if target.get(field) in (None, "") and value not in (None, ""):
            target[field] = value


def dedupe(records: Iterable[dict]) -> list[dict]:
    """Fusionne les doublons, y compris entre deux sources de collecte."""
    groups: list[dict] = []
    index: dict[tuple, int] = {}
    for rec in records:
        keys = _keys_for(rec)
        hits = sorted({index[k] for k in keys if k in index})
        if not hits:
            groups.append(dict(rec))
            position = len(groups) - 1
        else:
            position = hits[0]
            _merge_into(groups[position], rec)
            for extra in hits[1:]:  # deux groupes relies par cette annonce
                if groups[extra] is not None:
                    _merge_into(groups[position], groups[extra])
                    for key, value in list(index.items()):
                        if value == extra:
                            index[key] = position
                    groups[extra] = None
        for key in keys:
            index[key] = position
        for key in _keys_for(groups[position]):
            index.setdefault(key, position)
    return [g for g in groups if g is not None]


def matches_criteria(rec: dict, criteria: dict) -> bool:
    """Filtre local de securite : le site peut elargir la recherche."""
    checks = (
        ("prix", criteria.get("priceMin"), criteria.get("priceMax")),
        ("surface", criteria.get("spaceMin"), criteria.get("spaceMax")),
    )
    for field, low, high in checks:
        value = rec.get(field)
        if value is None:
            continue
        if low is not None and value < float(low):
            return False
        if high is not None and value > float(high):
            return False
    return True


# --- Lecture d'un copier-coller de la page de resultats Logic-Immo -----------
#
# Chaque annonce y apparait deux fois : une ligne de resume qui porte toutes les
# caracteristiques, puis un bloc detaille qui porte le DPE, le prix au m2
# affiche, la localisation separee par une virgule et le nom de l'annonceur.
# On segmente sur les lignes de resume et on complete avec le bloc qui suit.

_SUMMARY_RE = re.compile(
    r"^(?P<bien>Maison|Villa|Appartement|Propri[ée]t[ée]|Chalet|Loft|Duplex|Immeuble|Ferme)\s+à vendre\b(?P<reste>.*)$"
)
_PRICE_ANY_RE = re.compile(r"(?P<masque>-\s*de\s*)?(?P<montant>\d[\d\s  .,]*)\s*(?P<millions>M)?\s*€")
_PER_SQM_RE = re.compile(r"([\d\s  .,]+)\s*€\s*/\s*m²")
_DPE_RE = re.compile(r"^[A-G]$")
_LOCATION_RE = re.compile(r"^(?:(?P<secteur>.+),\s*)?(?P<ville>[^,()]+?)\s*\((?P<cp>\d{5})\)$")
_ROOMS_ONLY_RE = re.compile(r"(\d+)\s*pi[eè]ces?")
_BEDROOMS_ONLY_RE = re.compile(r"(\d+)\s*chambres?")
_LAND_RE = re.compile(r"([\d\s  .,]+)\s*m²\s*de\s*terrain")
_LIVING_RE = re.compile(r"([\d\s  .,]+)\s*m²(?!\s*de\s*terrain)")
_BADGES = {
    "exclusivité", "nouveau", "consulté", "à voir sur lux residence",
    "simuler mon crédit immobilier", "sélection", "liste", "carte",
}


def _clean_agency(line: str) -> str:
    return re.sub(r"\s{2,}", " ", line).strip()


def parse_results_paste(text: str) -> list[dict]:
    """Depouille un copier-coller de la liste de resultats."""
    lines = [l.strip() for l in text.replace(" ", " ").replace(" ", " ").splitlines()]
    starts = [i for i, l in enumerate(lines) if _SUMMARY_RE.match(l) and "€" in l and "m²" in l]
    records: list[dict] = []

    for position, index in enumerate(starts):
        end = starts[position + 1] if position + 1 < len(starts) else len(lines)
        segment = lines[index:end]
        summary = _SUMMARY_RE.match(lines[index])
        rest = summary.group("reste")

        price_match = _PRICE_ANY_RE.search(rest)
        prix = None
        prix_mention = None
        if price_match:
            if price_match.group("masque"):  # "- de 1.1M €" : fourchette, pas un prix
                prix_mention = price_match.group(0).strip()
            else:
                prix = to_number(price_match.group("montant"))
                if price_match.group("millions"):
                    prix = prix * 1_000_000 if prix and prix < 1000 else prix
            mention = rest[: price_match.start()].strip(" -–—")
            after = rest[price_match.end():]
        else:
            mention, after = "", rest

        pieces = _ROOMS_ONLY_RE.search(after)
        chambres = _BEDROOMS_ONLY_RE.search(after)
        terrain = _LAND_RE.search(after)
        living_zone = after[: terrain.start()] if terrain else after
        surface = _LIVING_RE.search(living_zone)

        secteur = ville = cp = dpe = agence = None
        prix_m2_site = None
        for line in segment:
            if dpe is None and _DPE_RE.match(line):
                dpe = line
            if prix_m2_site is None:
                per_sqm = _PER_SQM_RE.search(line)
                if per_sqm:
                    prix_m2_site = to_number(per_sqm.group(1))
            location = _LOCATION_RE.match(line)
            if location and ville is None:
                secteur = (location.group("secteur") or "").strip() or None
                ville = location.group("ville").strip()
                cp = location.group("cp")
                for candidate in segment[segment.index(line) + 1:]:
                    if not candidate or candidate.lower() in _BADGES or candidate == "·":
                        continue
                    agence = _clean_agency(candidate)
                    break

        remarques = []
        if mention:
            remarques.append(mention)
        if prix_mention:
            remarques.append(f"Prix non communiqué, annonce affichée « {prix_mention} »")

        records.append(
            {
                "id": None,
                "titre": None,
                "type_bien": summary.group("bien"),
                "mention": " · ".join(remarques) or None,
                "secteur": secteur,
                "ville": ville,
                "cp": cp,
                "prix": prix,
                "prix_mention": prix_mention,
                "surface": to_number(surface.group(1)) if surface else None,
                "terrain": to_number(terrain.group(1)) if terrain else None,
                "pieces": float(pieces.group(1)) if pieces else None,
                "chambres": float(chambres.group(1)) if chambres else None,
                "dpe": dpe,
                "prix_m2_site": prix_m2_site,
                "type_projet": "Neuf" if mention and "occupation" in mention.lower() else None,
                "agence": agence,
                "url": None,
                "source": "collage",
            }
        )
    return records


def check_price_per_sqm(records: Iterable[dict], tolerance: float = 0.015) -> list[str]:
    """Compare le prix au m2 recalcule a celui affiche par le site."""
    alerts = []
    for rec in records:
        shown, prix, surface = rec.get("prix_m2_site"), rec.get("prix"), rec.get("surface")
        if not (shown and prix and surface):
            continue
        computed = prix / surface
        if abs(computed - shown) / shown > tolerance:
            alerts.append(
                f"{rec.get('ville')} {prix:.0f} € / {surface} m² : "
                f"{computed:.0f} €/m² calculé contre {shown:.0f} €/m² affiché"
            )
    return alerts


def flag_duplicates(records: list[dict], tolerance: float = 0.02) -> list[dict]:
    """Marque les annonces qui portent probablement sur le meme bien.

    Meme prix et meme commune, surface a 2 % pres : typiquement un bien confie a
    plusieurs agences. On les signale sans les fusionner, leurs caracteristiques
    publiees pouvant differer.
    """
    groups: list[list[int]] = []
    for i, rec in enumerate(records):
        if not rec.get("prix") or not rec.get("surface"):
            continue
        placed = False
        for group in groups:
            ref = records[group[0]]
            same_price = ref.get("prix") == rec.get("prix")
            same_city = (ref.get("ville") or "").lower() == (rec.get("ville") or "").lower()
            close_area = abs(ref["surface"] - rec["surface"]) / ref["surface"] <= tolerance
            # Deux terrains nettement differents : deux biens differents.
            land_ref, land_rec = ref.get("terrain"), rec.get("terrain")
            same_land = (
                True
                if not land_ref or not land_rec
                else abs(land_ref - land_rec) / land_ref <= 0.05
            )
            if same_price and same_city and close_area and same_land:
                group.append(i)
                placed = True
                break
        if not placed:
            groups.append([i])
    label = 0
    for group in groups:
        if len(group) < 2:
            continue
        label += 1
        for i in group:
            records[i]["doublon"] = f"D{label}"
    return records
