"""Ecriture du classeur Excel des biens releves."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Sequence

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

FONT = "Arial"

COLUMNS: list[tuple[str, str, int]] = [
    # (cle interne, en-tete, largeur)
    ("rang", "N°", 5),
    ("type_bien", "Bien", 10),
    ("secteur", "Secteur", 26),
    ("ville", "Ville", 22),
    ("cp", "CP", 8),
    ("prix", "Prix (€)", 13),
    ("surface", "Surface (m²)", 12),
    ("terrain", "Terrain (m²)", 12),
    ("pieces", "Pièces", 8),
    ("chambres", "Chambres", 10),
    ("prix_m2", "Prix/m² (€)", 12),
    ("dpe", "DPE", 6),
    ("type_projet", "Neuf / Ancien", 14),
    ("agence", "Agence", 34),
    ("doublon", "Doublon", 9),
    ("mention", "Remarque", 30),
    ("titre", "Titre", 40),
    ("url", "Lien", 40),
    ("releve", "Relevé le", 12),
]
# Colonnes toujours presentes, meme vides.
REQUIRED = {"rang", "ville", "prix", "surface", "prix_m2", "releve"}

HEADER_FILL = PatternFill("solid", fgColor="1F3864")
HEADER_FONT = Font(name=FONT, size=10, bold=True, color="FFFFFF")
CELL_FONT = Font(name=FONT, size=10)
LINK_FONT = Font(name=FONT, size=10, color="0563C1", underline="single")
THIN = Side(style="thin", color="D9D9D9")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def _sort_key(rec: dict) -> tuple:
    prix = rec.get("prix")
    surface = rec.get("surface")
    ratio = prix / surface if prix and surface else None
    return (0, ratio) if ratio is not None else (1, prix or 0)


def write_workbook(
    records: Sequence[dict],
    path: str,
    criteria: dict[str, Any] | None = None,
    source_url: str | None = None,
    notes: Sequence[str] = (),
) -> str:
    criteria = criteria or {}
    releve = datetime.now().strftime("%d/%m/%Y")
    rows = sorted(records, key=_sort_key)
    columns = [
        c for c in COLUMNS
        if c[0] in REQUIRED or any(r.get(c[0]) not in (None, "") for r in rows)
    ]

    wb = Workbook()
    ws = wb.active
    ws.title = "Biens"

    for idx, (_key, header, width) in enumerate(columns, start=1):
        cell = ws.cell(row=1, column=idx, value=header)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER
        ws.column_dimensions[get_column_letter(idx)].width = width
    ws.row_dimensions[1].height = 28

    col = {key: get_column_letter(i) for i, (key, _h, _w) in enumerate(columns, start=1)}

    for offset, rec in enumerate(rows):
        r = offset + 2
        values = {
            "rang": offset + 1,
            "titre": rec.get("titre"),
            "type_bien": rec.get("type_bien"),
            "secteur": rec.get("secteur"),
            "doublon": rec.get("doublon"),
            "mention": rec.get("mention"),
            "ville": rec.get("ville"),
            "cp": rec.get("cp"),
            "prix": rec.get("prix"),
            "surface": rec.get("surface"),
            "terrain": rec.get("terrain"),
            "pieces": rec.get("pieces"),
            "chambres": rec.get("chambres"),
            # Prix au m2 calcule dans le classeur : il suit toute correction manuelle.
            # Formule seulement si prix et surface sont connus, sinon la case reste vide.
            "prix_m2": (
                f"=IFERROR({col['prix']}{r}/{col['surface']}{r},\"\")"
                if rec.get("prix") and rec.get("surface")
                else None
            ),
            "type_projet": rec.get("type_projet"),
            "dpe": rec.get("dpe"),
            "agence": rec.get("agence"),
            "url": rec.get("url"),
            "releve": releve,
        }
        for idx, (key, _header, _width) in enumerate(columns, start=1):
            cell = ws.cell(row=r, column=idx, value=values.get(key))
            cell.font = CELL_FONT
            cell.border = BORDER
            if key in ("prix", "prix_m2"):
                cell.number_format = '#,##0 "€"'
            elif key in ("surface", "terrain"):
                cell.number_format = "#,##0"
            elif key in ("pieces", "chambres", "rang"):
                cell.number_format = "0"
                cell.alignment = Alignment(horizontal="center")
            elif key == "titre":
                cell.alignment = Alignment(vertical="top", wrap_text=False)
            elif key == "url" and values["url"]:
                cell.hyperlink = values["url"]
                cell.font = LINK_FONT

    last_row = max(len(rows) + 1, 2)
    ws.auto_filter.ref = f"A1:{get_column_letter(len(columns))}{last_row}"
    ws.freeze_panes = "B2"

    _write_criteria_sheet(wb, criteria, source_url, len(rows), releve, notes)
    wb.save(path)
    return path


def _write_criteria_sheet(wb, criteria, source_url, count, releve, notes) -> None:
    ws = wb.create_sheet("Critères")
    ws.column_dimensions["A"].width = 26
    ws.column_dimensions["B"].width = 96

    title = ws.cell(row=1, column=1, value="Critères de la recherche")
    title.font = Font(name=FONT, size=12, bold=True)

    lines: list[tuple[str, Any]] = [
        ("Date du relevé", releve),
        ("Source", "logic-immo.com"),
        ("Biens retenus", count),
    ]
    labels = {
        "estateTypes": "Type de bien",
        "distributionTypes": "Transaction",
        "priceMin": "Prix minimum (€)",
        "priceMax": "Prix maximum (€)",
        "spaceMin": "Surface minimum (m²)",
        "spaceMax": "Surface maximum (m²)",
        "projectTypes": "Neuf / ancien",
        "classifiedBusiness": "Type d'annonceur",
        "zone": "Zone géographique",
    }
    for key, label in labels.items():
        if criteria.get(key) not in (None, ""):
            lines.append((label, criteria[key]))
    if source_url:
        lines.append(("URL de recherche", source_url))

    row = 3
    for label, value in lines:
        c1 = ws.cell(row=row, column=1, value=label)
        c1.font = Font(name=FONT, size=10, bold=True)
        c2 = ws.cell(row=row, column=2, value=value)
        c2.font = CELL_FONT
        c2.alignment = Alignment(wrap_text=True, vertical="top")
        row += 1

    row += 1
    head = ws.cell(row=row, column=1, value="Notes de méthode")
    head.font = Font(name=FONT, size=10, bold=True)
    row += 1
    default_notes = [
        "Données relevées automatiquement sur les pages de résultats Logic-Immo, telles que publiées par les annonceurs.",
        "Prix/m² : formule de la feuille Biens (prix ÷ surface habitable), recalculée ici et non recopiée.",
        "Le classement par défaut est le prix au m² croissant. Les filtres Excel sont actifs sur l'en-tête.",
        "Une cellule vide signifie que l'information n'était pas publiée dans l'annonce.",
    ]
    for note in list(default_notes) + list(notes):
        cell = ws.cell(row=row, column=2, value=note)
        cell.font = CELL_FONT
        cell.alignment = Alignment(wrap_text=True, vertical="top")
        row += 1
