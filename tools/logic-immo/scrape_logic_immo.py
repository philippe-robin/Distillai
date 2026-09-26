#!/usr/bin/env python3
"""Releve les annonces d'une recherche Logic-Immo et les exporte en classeur Excel.

Usage type :
    python scrape_logic_immo.py --url "<URL de recherche logic-immo>" --out biens.xlsx

Le script ouvre la page dans un Chromium pilote par Playwright, collecte les
annonces (reponses JSON de l'API du site, puis repli sur le DOM), deduplique,
filtre sur les criteres de l'URL et ecrit le classeur.

Installation :
    pip install playwright openpyxl && playwright install chromium
"""

from __future__ import annotations

import argparse
import base64
import binascii
import json
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

sys.path.insert(0, str(Path(__file__).resolve().parent))

from logic_immo import extract  # noqa: E402
from logic_immo.export_xlsx import write_workbook  # noqa: E402

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
)
CHROMIUM_FALLBACK = "/opt/pw-browsers/chromium"

COOKIE_SELECTORS = [
    "#didomi-notice-agree-button",
    "button#onetrust-accept-btn-handler",
    "button[aria-label*='Accepter']",
    "button:has-text('Tout accepter')",
    "button:has-text('Accepter')",
    "button:has-text('J’accepte')",
]

# Endpoints de mesure d'audience : leurs JSON n'ont jamais d'annonces.
NOISE_URL_RE = re.compile(
    r"(google|doubleclick|facebook|hotjar|segment|sentry|datadog|adobedtm|criteo|"
    r"cookielaw|didomi|optimizely|amplitude|piano|xiti|gtm\.js|analytics)",
    re.I,
)

PROJECT_LABELS = {"projected": "Neuf", "resale": "Ancien", "new": "Neuf"}
ESTATE_LABELS = {"house": "Maison", "flat": "Appartement", "apartment": "Appartement"}
BUSINESS_LABELS = {"professional": "Professionnels (agences)", "private": "Particuliers"}
DISTRIBUTION_LABELS = {"buy": "Achat", "rent": "Location"}


def decode_criteria(url: str) -> dict[str, Any]:
    """Traduit les parametres de l'URL de recherche en criteres lisibles."""
    query = parse_qs(urlparse(url).query)
    first = {k: v[0] for k, v in query.items() if v}
    criteria: dict[str, Any] = {}

    def label(value: str, mapping: dict[str, str]) -> str:
        parts = [mapping.get(p.strip().lower(), p.strip()) for p in value.split(",") if p.strip()]
        return " + ".join(parts)

    if "estateTypes" in first:
        criteria["estateTypes"] = label(first["estateTypes"], ESTATE_LABELS)
    if "distributionTypes" in first:
        criteria["distributionTypes"] = label(first["distributionTypes"], DISTRIBUTION_LABELS)
    if "projectTypes" in first:
        criteria["projectTypes"] = label(first["projectTypes"], PROJECT_LABELS)
    if "classifiedBusiness" in first:
        criteria["classifiedBusiness"] = label(first["classifiedBusiness"], BUSINESS_LABELS)
    for key in ("priceMin", "priceMax", "spaceMin", "spaceMax"):
        if key in first:
            value = extract.to_number(first[key])
            criteria[key] = int(value) if value is not None else first[key]

    if "locations" in first:
        criteria["zone"] = _decode_locations(first["locations"])
    return criteria


def _decode_locations(raw: str) -> str:
    try:
        padded = raw + "=" * (-len(raw) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded).decode("utf-8"))
    except (ValueError, binascii.Error, UnicodeDecodeError):
        return raw
    places = ", ".join(str(p) for p in data.get("placeIds", []))
    duration, mode = data.get("duration"), data.get("mode")
    if duration and mode:
        modes = {"Car": "en voiture", "Walk": "à pied", "PublicTransport": "en transports"}
        return f"{places} — rayon {duration} min {modes.get(mode, mode)}"
    return places or raw


def url_variants(url: str) -> list[str]:
    """La vue carte n'expose pas toujours la liste : on prevoit la vue resultats."""
    variants = [url]
    parsed = urlparse(url)
    for replacement in ("classified-search", "classified-list", "recherche"):
        if "classified-map" in parsed.path:
            variants.append(urlunparse(parsed._replace(path=parsed.path.replace("classified-map", replacement))))
    return list(dict.fromkeys(variants))


def with_page(url: str, page_number: int) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    if page_number <= 1:
        query.pop("page", None)
    else:
        query["page"] = [str(page_number)]
    return urlunparse(parsed._replace(query=urlencode(query, doseq=True)))


CARD_JS = """
() => {
  const seen = new Set();
  const out = [];
  const selectors = [
    "[data-testid*='card' i]", "[data-testid*='classified' i]", "[class*='ClassifiedCard' i]",
    "[class*='card' i] a[href]", "article", "li[class*='result' i]",
  ];
  const nodes = new Set();
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((n) => nodes.add(n));
  }
  for (const node of nodes) {
    const text = (node.innerText || "").trim();
    if (text.length < 20 || text.length > 1200) continue;
    if (!/€/.test(text)) continue;
    const anchor = node.matches("a[href]") ? node : node.querySelector("a[href]");
    const href = anchor ? anchor.getAttribute("href") : null;
    const key = (href || "") + "|" + text.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, href, title: anchor ? (anchor.getAttribute("title") || "").trim() : "" });
  }
  return out;
}
"""

NEXT_DATA_JS = """
() => {
  const el = document.querySelector("#__NEXT_DATA__") || document.querySelector("script[type='application/json']");
  return el ? el.textContent : null;
}
"""


def scrape(
    url: str,
    max_pages: int = 10,
    delay: float = 3.0,
    headless: bool = True,
    timeout_ms: int = 45000,
    dump_json: str | None = None,
) -> tuple[list[dict], list[str]]:
    from playwright.sync_api import TimeoutError as PWTimeout
    from playwright.sync_api import sync_playwright

    log: list[str] = []
    records: list[dict] = []
    raw_payloads: list[dict] = []

    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch(headless=headless)
        except Exception:  # binaire gere hors du cache Playwright standard
            browser = pw.chromium.launch(headless=headless, executable_path=CHROMIUM_FALLBACK)
        context = browser.new_context(
            user_agent=USER_AGENT,
            locale="fr-FR",
            timezone_id="Europe/Paris",
            viewport={"width": 1440, "height": 950},
        )
        page = context.new_page()

        def on_response(response) -> None:
            try:
                if NOISE_URL_RE.search(response.url):
                    return
                ctype = (response.headers or {}).get("content-type", "")
                if "json" not in ctype.lower():
                    return
                payload = response.json()
            except Exception:
                return
            found = extract.harvest_json(payload, source="api")
            if found:
                raw_payloads.append({"url": response.url, "count": len(found)})
                records.extend(found)

        page.on("response", on_response)

        base_url = None
        for candidate in url_variants(url):
            try:
                page.goto(candidate, wait_until="domcontentloaded", timeout=timeout_ms)
            except PWTimeout:
                log.append(f"Timeout sur {candidate}")
                continue
            _dismiss_cookies(page, log)
            _settle(page, timeout_ms)
            before = len(records)
            records.extend(_harvest_page(page))
            log.append(f"{candidate} -> {len(records) - before} annonce(s)")
            if len(records) > before:
                base_url = candidate
                break
        if base_url is None:
            base_url = url

        for page_number in range(2, max_pages + 1):
            target = with_page(base_url, page_number)
            if target == base_url:
                break
            time.sleep(delay)
            before = len(extract.dedupe(records))
            try:
                page.goto(target, wait_until="domcontentloaded", timeout=timeout_ms)
            except PWTimeout:
                log.append(f"Timeout page {page_number}")
                break
            _settle(page, timeout_ms)
            records.extend(_harvest_page(page))
            after = len(extract.dedupe(records))
            log.append(f"Page {page_number} -> {after - before} nouvelle(s) annonce(s)")
            if after == before:
                break

        if dump_json:
            Path(dump_json).write_text(
                json.dumps({"records": records, "payloads": raw_payloads}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        context.close()
        browser.close()

    return extract.dedupe(records), log


def _dismiss_cookies(page, log: list[str]) -> None:
    for selector in COOKIE_SELECTORS:
        try:
            locator = page.locator(selector).first
            if locator.is_visible(timeout=1500):
                locator.click(timeout=2000)
                log.append(f"Bandeau cookies accepté ({selector})")
                return
        except Exception:
            continue
    for frame in page.frames:
        for selector in COOKIE_SELECTORS[:3]:
            try:
                locator = frame.locator(selector).first
                if locator.is_visible(timeout=800):
                    locator.click(timeout=1500)
                    log.append("Bandeau cookies accepté (iframe)")
                    return
            except Exception:
                continue


def _settle(page, timeout_ms: int) -> None:
    """Laisse le temps aux appels XHR puis force le chargement paresseux."""
    try:
        page.wait_for_load_state("networkidle", timeout=timeout_ms)
    except Exception:
        page.wait_for_timeout(3000)
    for _ in range(6):
        page.mouse.wheel(0, 2200)
        page.wait_for_timeout(900)
    page.wait_for_timeout(1200)


def _harvest_page(page) -> list[dict]:
    found: list[dict] = []
    try:
        blob = page.evaluate(NEXT_DATA_JS)
        if blob:
            found.extend(extract.harvest_json(json.loads(blob), source="next_data"))
    except Exception:
        pass
    try:
        cards = page.evaluate(CARD_JS)
        found.extend(extract.harvest_cards(cards))
    except Exception:
        pass
    return found


def load_offline(from_json: str | None, from_html: str | None) -> list[dict]:
    """Relecture sans reseau : dump JSON du script, ou page HTML enregistree."""
    records: list[dict] = []
    if from_json:
        payload = json.loads(Path(from_json).read_text(encoding="utf-8"))
        if isinstance(payload, dict) and "records" in payload:
            records.extend(payload["records"])
        else:
            records.extend(extract.harvest_json(payload, source="json"))
    if from_html:
        html = Path(from_html).read_text(encoding="utf-8", errors="ignore")
        for blob in re.findall(r"<script[^>]*type=\"application/(?:ld\+)?json\"[^>]*>(.*?)</script>", html, re.S):
            try:
                records.extend(extract.harvest_json(json.loads(blob), source="html_json"))
            except ValueError:
                continue
    return extract.dedupe(records)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", help="URL de recherche logic-immo.com")
    parser.add_argument("--out", default="biens_logic_immo.xlsx", help="Fichier .xlsx de sortie")
    parser.add_argument("--max-pages", type=int, default=10)
    parser.add_argument("--delay", type=float, default=3.0, help="Pause entre deux pages, en secondes")
    parser.add_argument("--headful", action="store_true", help="Afficher le navigateur")
    parser.add_argument("--dump-json", help="Ecrire le relevé brut dans ce fichier JSON")
    parser.add_argument("--from-json", help="Relire un relevé brut au lieu de scraper")
    parser.add_argument("--from-html", help="Relire une page HTML enregistrée au lieu de scraper")
    parser.add_argument("--no-filter", action="store_true", help="Ne pas re-filtrer sur les critères de l'URL")
    args = parser.parse_args()

    if not args.url and not (args.from_json or args.from_html):
        parser.error("indiquer --url, ou --from-json / --from-html")

    criteria = decode_criteria(args.url) if args.url else {}
    notes: list[str] = []

    if args.from_json or args.from_html:
        records = load_offline(args.from_json, args.from_html)
        log = [f"Lecture hors ligne : {len(records)} annonce(s)"]
    else:
        records, log = scrape(
            args.url,
            max_pages=args.max_pages,
            delay=args.delay,
            headless=not args.headful,
            dump_json=args.dump_json,
        )

    total = len(records)
    if not args.no_filter:
        records = [r for r in records if extract.matches_criteria(r, criteria)]
        if total != len(records):
            notes.append(
                f"{total - len(records)} annonce(s) hors critères de prix ou de surface ont été écartées "
                "(le site élargit parfois la recherche)."
            )

    for line in log:
        print(line, file=sys.stderr)

    if not records:
        print("Aucune annonce relevée. Relancer avec --headful pour observer la page.", file=sys.stderr)
        return 1

    path = write_workbook(records, args.out, criteria=criteria, source_url=args.url, notes=notes)
    print(f"{len(records)} bien(s) écrits dans {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
