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
_ZIP_CITY_RE = re.compile(r"\b(\d{5})\b[\s,-]*([A-Za-zÀ-ÿ'’\- ]{2,40})")
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
    zip_city = _ZIP_CITY_RE.search(text)
    if zip_city:
        out["cp"] = zip_city.group(1)
        out["ville"] = zip_city.group(2).strip(" ,-")
    return out


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
        keys.append(
            ("fuzzy", rec.get("prix"), rec.get("surface"), (rec.get("ville") or "").strip().lower())
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
