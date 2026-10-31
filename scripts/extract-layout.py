"""Kurumun verdiği puantaj Excel'inden sayfa düzenini (stil, birleştirme, logo) çıkarır.

Kullanım: python scripts/extract-layout.py "2026 EKİM PUANTAJ.xlsx" [sayfa_no] [sablon_id]
Çıktı: src/lib/puantaj/templates/<sablon_id>/layout.json ve public/sablonlar/<sablon_id>/*.png|jpg

Yeni bir kurum formatı eklerken farklı bir sablon_id verip templates/index.ts'e kaydedin.
Blok satır numaraları (BLOCKS) kurum dosyasına göre ayarlanmalıdır.

Kişisel veri (plaka, ad, TC, km) JSON'a yazılmaz; yalnızca sabit başlık metinleri ve biçim alınır.
Kurum formatı değişirse bu betik yeniden çalıştırılır.
"""
import json, re, sys, zipfile, pathlib
import openpyxl
from openpyxl.utils import get_column_letter, column_index_from_string

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = sys.argv[1]
SHEET = int(sys.argv[2]) if len(sys.argv) > 2 else 2  # EKİM sayfası
TEMPLATE = sys.argv[3] if len(sys.argv) > 3 else "kgm-kiralik-arac"

# Şablon blokları: (ad, başlangıç satırı, satır sayısı, hafta içi gün satırı, hafta sonu gün satırı, veri hücreleri)
BLOCKS = {
    "tek": dict(start=41, rows=40, weekday=46, weekend=48, data={
        3: ["A", "C", "I", "K", "P", "AA", "AK", "AM"],
        36: ["G", "K", "W", "AF"],
        38: ["A", "E", "L", "Y"],
    }),
    "vardiya": dict(start=440, rows=44, weekday=446, weekend=449, data={
        3: ["A", "B", "F", "I", "J", "R", "Z", "AG", "AL"],
        4: ["J", "R", "Z"],
        37: ["D", "I", "N", "W", "AD", "AJ"],
        39: ["A", "I", "AH"],
    }),
}
DAY_OFFSET = {"tek": 5, "vardiya": 6}
MAX_COL = column_index_from_string("AS")

wb = openpyxl.load_workbook(SRC)
ws = wb.worksheets[SHEET]
styles, style_ix = [], {}


def color(c):
    if c is None:
        return None
    if c.type == "rgb" and isinstance(c.rgb, str):
        return {"argb": c.rgb}
    if c.type == "theme":
        out = {"theme": c.theme}
        if c.tint:
            out["tint"] = c.tint
        return out
    if c.type == "indexed" and c.indexed not in (64, None):
        return {"indexed": c.indexed}
    return None


def side(s):
    if s is None or s.style is None:
        return None
    out = {"style": s.style}
    col = color(s.color)
    if col:
        out["color"] = col
    return out


def style_of(cell):
    f = cell.font
    font = {k: v for k, v in {
        "name": f.name, "size": f.sz, "bold": f.b or None, "italic": f.i or None,
        "underline": f.u or None, "color": color(f.color)}.items() if v is not None}
    fill = None
    if cell.fill and cell.fill.fill_type == "solid":
        fg = color(cell.fill.fgColor)
        if fg:
            fill = {"type": "pattern", "pattern": "solid", "fgColor": fg}
    b = cell.border
    border = {k: v for k, v in {"left": side(b.left), "right": side(b.right),
                                "top": side(b.top), "bottom": side(b.bottom)}.items() if v}
    a = cell.alignment
    align = {k: v for k, v in {"horizontal": a.horizontal, "vertical": a.vertical,
                               "wrapText": a.wrap_text or None,
                               "textRotation": a.text_rotation or None}.items() if v is not None}
    st = {k: v for k, v in {"font": font, "fill": fill, "border": border or None,
                            "alignment": align or None,
                            "numFmt": cell.number_format if cell.number_format != "General" else None}.items() if v}
    key = json.dumps(st, sort_keys=True)
    if key not in style_ix:
        style_ix[key] = len(styles)
        styles.append(st)
    return style_ix[key]


def row_styles(r):
    return {get_column_letter(c): style_of(ws.cell(r, c)) for c in range(1, MAX_COL + 1)}


# Logolar: drawing xml'deki oneCellAnchor'lar
z = zipfile.ZipFile(SRC)
sheet_xml = z.read(f"xl/worksheets/sheet{SHEET + 1}.xml").decode("utf8")
rels = z.read(f"xl/worksheets/_rels/sheet{SHEET + 1}.xml.rels").decode("utf8")
drawing = re.search(r'Target="\.\./drawings/(drawing\d+\.xml)"', rels).group(1)
dxml = z.read(f"xl/drawings/{drawing}").decode("utf8")
drels = z.read(f"xl/drawings/_rels/{drawing}.rels").decode("utf8")
rid_target = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="\.\./media/([^"]+)"', drels))
anchors = []
for m in re.finditer(r"<xdr:oneCellAnchor>(.*?)</xdr:oneCellAnchor>", dxml, re.S):
    body = m.group(1)
    col, colOff, row, rowOff = map(int, re.search(
        r"<xdr:from><xdr:col>(\d+)</xdr:col><xdr:colOff>(-?\d+)</xdr:colOff><xdr:row>(\d+)</xdr:row><xdr:rowOff>(-?\d+)</xdr:rowOff>",
        body).groups())
    cx, cy = map(int, re.search(r'<xdr:ext cx="(\d+)" cy="(\d+)"', body).groups())
    media = rid_target[re.search(r'r:embed="(rId\d+)"', body).group(1)]
    anchors.append(dict(col=col, colOff=colOff, row=row, rowOff=rowOff, cx=cx, cy=cy, media=media))

pub = ROOT / "public" / "sablonlar" / TEMPLATE
pub.mkdir(parents=True, exist_ok=True)
layouts = {}
for name, b in BLOCKS.items():
    start, n = b["start"], b["rows"]
    day0 = DAY_OFFSET[name]
    cells, heights = {}, []
    for i in range(n):
        r = start + i
        heights.append(ws.row_dimensions[r].height)
        if day0 <= i < day0 + 31:
            continue
        data_cols = b["data"].get(i, [])
        row = {}
        for c in range(1, MAX_COL + 1):
            cell = ws.cell(r, c)
            L = get_column_letter(c)
            entry = {"s": style_of(cell)}
            if cell.value is not None and L not in data_cols and isinstance(cell.value, str):
                entry["v"] = cell.value
            row[L] = entry
        cells[i] = row
    merges = []
    for m in ws.merged_cells.ranges:
        if start <= m.min_row < start + n:
            merges.append([m.min_row - start, m.min_col, m.max_row - start, m.max_col])
    images = []
    for a in anchors:
        if start - 1 <= a["row"] < start - 1 + n:
            fname = f"{name}-{a['col']}{pathlib.Path(a['media']).suffix}"
            (pub / fname).write_bytes(z.read(f"xl/media/{a['media']}"))
            images.append(dict(file=fname, ext=pathlib.Path(a["media"]).suffix[1:], col=a["col"],
                               colOff=a["colOff"], row=a["row"] - (start - 1), rowOff=a["rowOff"],
                               width=round(a["cx"] / 9525), height=round(a["cy"] / 9525)))
    # Aynı konumda tekrarlanan logoları ayıkla
    seen, uniq = set(), []
    for im in images:
        k = (im["col"], im["row"])
        if k not in seen:
            seen.add(k)
            uniq.append(im)
    layouts[name] = dict(rows=n, dayRow=day0, heights=heights, cells=cells, merges=merges,
                         weekday=row_styles(b["weekday"]), weekend=row_styles(b["weekend"]),
                         images=uniq)

cols = [ws.column_dimensions[get_column_letter(c)].width for c in range(1, MAX_COL + 1)]
ps = ws.page_setup
out = dict(columns=cols, styles=styles, layouts=layouts,
           page=dict(orientation=ps.orientation, paperSize=ps.paperSize,
                     margins=dict(left=ws.page_margins.left, right=ws.page_margins.right,
                                  top=ws.page_margins.top, bottom=ws.page_margins.bottom,
                                  header=ws.page_margins.header, footer=ws.page_margins.footer)))
dst = ROOT / "src" / "lib" / "puantaj" / "templates" / TEMPLATE / "layout.json"
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
print("styles", len(styles), {k: (len(v["merges"]), len(v["images"])) for k, v in layouts.items()})
