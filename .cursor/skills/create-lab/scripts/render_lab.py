#!/usr/bin/env python3
"""Render a lab Markdown file to PDF, drawing `lab-diagram` blocks as icon diagrams.

Usage:
    python3 render_lab.py labs/<name>.md [-o out.pdf] [--keep-svg]
"""

import argparse
import json
import math
import os
import re
import subprocess
import sys
import tempfile


def ensure_deps():
    try:
        import reportlab  # noqa: F401
        import svglib  # noqa: F401
    except ImportError:
        print("Installing reportlab and svglib...", file=sys.stderr)
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "--quiet", "reportlab", "svglib"]
        )


ensure_deps()

from reportlab.lib import colors  # noqa: E402
from reportlab.lib.enums import TA_CENTER  # noqa: E402
from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.lib.styles import ParagraphStyle  # noqa: E402
from reportlab.lib.units import mm  # noqa: E402
from reportlab.pdfbase.pdfmetrics import stringWidth  # noqa: E402
from reportlab.platypus import (  # noqa: E402
    Flowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from svglib.svglib import svg2rlg  # noqa: E402


# ---------------------------------------------------------------- palette

INK = "#2F3437"
BODY = "#3A3F45"
MUTED = "#7B8088"
PAGE_BG = "#FBFAF7"
PANEL_BG = "#F4F4EF"
CODE_BG = "#EFEDE8"
OLIVE = "#5C6B57"
ROSE = "#A25E5E"
SAGE = "#8FA58C"
BEIGE = "#B9A190"
ROSE_LIGHT = "#C08583"
BLUE_GRAY = "#8C9AAD"
BLUE_GRAY_LIGHT = "#CBD3DD"
LINE_BEIGE = "#CDBBAA"
LINE_ROSE = "#C99593"

BADGE_COLORS = [OLIVE, ROSE, SAGE, BEIGE, BLUE_GRAY, ROSE_LIGHT]


# ---------------------------------------------------------------- icons
# Each icon is SVG markup on a 24x24 grid, drawn as white strokes.

def _gear():
    parts = ['<circle cx="12" cy="12" r="3"/>', '<circle cx="12" cy="12" r="6.5"/>']
    for i in range(8):
        a = math.radians(i * 45)
        x1, y1 = 12 + 6.5 * math.cos(a), 12 + 6.5 * math.sin(a)
        x2, y2 = 12 + 9.5 * math.cos(a), 12 + 9.5 * math.sin(a)
        parts.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke-width="2.6"/>')
    return "".join(parts)


def _kubernetes():
    pts = []
    for i in range(7):
        a = math.radians(-90 + i * 360 / 7)
        pts.append((12 + 10 * math.cos(a), 12 + 10 * math.sin(a)))
    poly = " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)
    parts = [f'<polygon points="{poly}"/>', '<circle cx="12" cy="12" r="2.2"/>']
    for i in range(7):
        a = math.radians(-90 + i * 360 / 7)
        x1, y1 = 12 + 2.2 * math.cos(a), 12 + 2.2 * math.sin(a)
        x2, y2 = 12 + 6.6 * math.cos(a), 12 + 6.6 * math.sin(a)
        parts.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}"/>')
    return "".join(parts)


DOT = 'fill="#FFFFFF" stroke="none"'
CLOUD_PATH = "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"

ICONS = {
    "code": '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'
            '<line x1="14" y1="4" x2="10" y2="20"/>',
    "file": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
            '<polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/>'
            '<line x1="8" y1="17" x2="13" y2="17"/>',
    "terminal": '<rect x="2" y="4" width="20" height="16" rx="2"/>'
                '<polyline points="6 9 10 12 6 15"/><line x1="12" y1="15" x2="17" y2="15"/>',
    "layers": '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/>'
              '<polyline points="2 17 12 22 22 17"/>',
    "box": '<polygon points="12 2.5 21 7.5 21 16.5 12 21.5 3 16.5 3 7.5 12 2.5"/>'
           '<polyline points="3 7.5 12 12.5 21 7.5"/><line x1="12" y1="12.5" x2="12" y2="21.5"/>',
    "package": '<polygon points="12 2.5 21 7.5 21 16.5 12 21.5 3 16.5 3 7.5 12 2.5"/>'
               '<polyline points="3 7.5 12 12.5 21 7.5"/><line x1="12" y1="12.5" x2="12" y2="21.5"/>'
               '<line x1="7.5" y1="5" x2="16.5" y2="10"/>',
    "server": '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/>'
              f'<circle cx="6" cy="7" r="1.1" {DOT}/><circle cx="6" cy="17" r="1.1" {DOT}/>',
    "cloud": f'<path d="{CLOUD_PATH}"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4.2" ry="10"/>'
             '<line x1="2" y1="12" x2="22" y2="12"/>',
    "database": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'
                '<path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    "key": '<circle cx="7.5" cy="15.5" r="5"/><line x1="11" y1="12" x2="21" y2="2"/>'
           '<line x1="16.5" y1="6.5" x2="19.5" y2="9.5"/><line x1="14" y1="9" x2="16" y2="11"/>',
    "people": '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/>'
              '<path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    "browser": '<rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="8" x2="22" y2="8"/>'
               f'<circle cx="5.5" cy="5.5" r="0.9" {DOT}/><circle cx="8.5" cy="5.5" r="0.9" {DOT}/>',
    "gear": _gear(),
    "upload": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/>'
              '<line x1="12" y1="3" x2="12" y2="15"/>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>'
                '<line x1="12" y1="15" x2="12" y2="3"/>',
    "check": '<polyline points="20 6 9 17 4 12"/>',
    "network": '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/>'
               '<line x1="10.8" y1="7.2" x2="6.2" y2="16.8"/><line x1="13.2" y1="7.2" x2="17.8" y2="16.8"/>'
               '<line x1="7.5" y1="19" x2="16.5" y2="19"/>',
    "kubernetes": _kubernetes(),
}


def icon_svg(name, cx, cy, size, color="#FFFFFF", width=2.0):
    s = size / 24.0
    markup = ICONS[name].replace("#FFFFFF", color)
    return (
        f'<g transform="translate({cx - size / 2:.2f},{cy - size / 2:.2f}) scale({s:.4f})" '
        f'fill="none" stroke="{color}" stroke-width="{width}" '
        f'stroke-linecap="round" stroke-linejoin="round">{markup}</g>'
    )


# ---------------------------------------------------------------- diagram drawing

def esc(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text_svg(x, y, text, size=13, color=INK, anchor="middle", weight="normal"):
    font = "Helvetica-Bold" if weight == "bold" else "Helvetica"
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="{font}" font-size="{size}" '
        f'fill="{color}" text-anchor="{anchor}">{esc(text)}</text>'
    )


def label_lines(label):
    return [line.strip() for line in label.replace("\\n", "\n").split("\n") if line.strip()]


def soft_shadow(shape, cx, cy, r, rounded=False):
    out = []
    for grow, alpha in ((10, 0.025), (6, 0.035), (3, 0.05)):
        if rounded:
            side = 2 * r + grow
            out.append(
                f'<rect x="{cx - side / 2:.1f}" y="{cy - side / 2 + 7:.1f}" width="{side:.1f}" '
                f'height="{side:.1f}" rx="{r * 0.42 + grow / 2:.1f}" fill="#000000" fill-opacity="{alpha}"/>'
            )
        else:
            out.append(
                f'<circle cx="{cx:.1f}" cy="{cy + 7:.1f}" r="{r + grow / 2:.1f}" '
                f'fill="#000000" fill-opacity="{alpha}"/>'
            )
    return "".join(out)


def badge(cx, cy, r, color, icon, rounded=False):
    out = [soft_shadow("badge", cx, cy, r, rounded)]
    if rounded:
        out.append(
            f'<rect x="{cx - r:.1f}" y="{cy - r:.1f}" width="{2 * r:.1f}" height="{2 * r:.1f}" '
            f'rx="{r * 0.42:.1f}" fill="{color}"/>'
        )
    else:
        out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{color}"/>')
    out.append(icon_svg(icon, cx, cy, r * 0.95))
    return "".join(out)


def panel(w, h):
    return (
        f'<rect x="0" y="0" width="{w}" height="{h}" rx="22" fill="{PANEL_BG}"/>'
        f'<path d="M0 {h * 0.78:.1f} L{w} {h * 0.56:.1f} L{w} {h - 22} '
        f'Q{w} {h} {w - 22} {h} L22 {h} Q0 {h} 0 {h - 22} Z" fill="#FFFFFF" fill-opacity="0.75"/>'
    )


def arrow_head(x, y, angle, color):
    size = 7
    a1, a2 = angle + math.radians(152), angle - math.radians(152)
    p1 = (x + size * math.cos(a1), y + size * math.sin(a1))
    p2 = (x + size * math.cos(a2), y + size * math.sin(a2))
    return (
        f'<polygon points="{x:.1f},{y:.1f} {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}" '
        f'fill="{color}"/>'
    )


def draw_flow(spec):
    nodes = spec["nodes"]
    edges = spec.get("edges", [])
    n = len(nodes)
    w, h = 880, 290
    r = 36 if n <= 5 else 32
    margin = 110 if n <= 4 else 90
    cy = 128
    xs = [w / 2] if n == 1 else [margin + i * (w - 2 * margin) / (n - 1) for i in range(n)]

    out = [panel(w, h)]
    out.append(
        f'<circle cx="{w - 70}" cy="58" r="64" fill="none" stroke="{SAGE}" '
        f'stroke-width="18" stroke-opacity="0.13"/>'
    )
    out.append(
        f'<circle cx="64" cy="{h - 52}" r="40" fill="none" stroke="{ROSE_LIGHT}" '
        f'stroke-width="14" stroke-opacity="0.13"/>'
    )

    for i in range(n - 1):
        x1, x2 = xs[i] + r + 10, xs[i + 1] - r - 12
        lift = 34
        c1 = (x1 + (x2 - x1) * 0.3, cy - lift)
        c2 = (x1 + (x2 - x1) * 0.7, cy - lift)
        color = LINE_ROSE if i % 2 else LINE_BEIGE
        out.append(
            f'<path d="M{x1:.1f} {cy:.1f} C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {x2:.1f} {cy:.1f}" '
            f'fill="none" stroke="{color}" stroke-width="1.8" stroke-linecap="round"/>'
        )
        out.append(arrow_head(x2, cy, math.atan2(cy - c2[1], x2 - c2[0]), color))
        if i < len(edges) and edges[i]:
            out.append(text_svg((x1 + x2) / 2, cy - lift - 4, edges[i], size=11, color=MUTED))

    for i, node in enumerate(nodes):
        color = BADGE_COLORS[i % len(BADGE_COLORS)]
        out.append(badge(xs[i], cy, r, color, node["icon"]))
        chip_x, chip_y = xs[i] + r * 0.72, cy - r * 0.72
        out.append(f'<circle cx="{chip_x:.1f}" cy="{chip_y:.1f}" r="11" fill="#FFFFFF"/>')
        out.append(text_svg(chip_x, chip_y + 4, str(i + 1), size=11, color=color, weight="bold"))
        for j, line in enumerate(label_lines(node["label"])):
            out.append(text_svg(xs[i], cy + r + 30 + j * 17, line, size=13.5))
    return w, h, out


HUB_POSITIONS = {
    2: [(-1, 0), (1, 0)],
    3: [(-1, 0.05), (0.92, -0.55), (0.92, 0.6)],
    4: [(-0.95, -0.5), (0.95, -0.5), (-0.95, 0.55), (0.95, 0.55)],
    5: [(-1, -0.45), (1, -0.45), (-0.82, 0.62), (0.82, 0.62), (0, -1.08)],
    6: [(-1, -0.45), (1, -0.45), (-0.82, 0.62), (0.82, 0.62), (-0.42, -1.08), (0.42, -1.08)],
}


def draw_hub(spec):
    nodes = spec["nodes"]
    center = spec.get("center", {"icon": "cloud", "label": ""})
    w, h = 880, 460
    cx, cy = w / 2, 236
    rx, ry = 330, 158
    out = [panel(w, h)]

    out.append(f'<ellipse cx="{cx}" cy="{h - 38}" rx="190" ry="13" fill="#000000" fill-opacity="0.05"/>')

    positions = [(cx + px * rx, cy + py * ry) for px, py in HUB_POSITIONS[len(nodes)]]
    for (x, y), i in zip(positions, range(len(nodes))):
        color = LINE_ROSE if i % 2 else LINE_BEIGE
        mx, my = (cx + x) / 2, (cy + y) / 2 - 26
        out.append(
            f'<path d="M{cx:.1f} {cy:.1f} Q{mx:.1f} {my:.1f} {x:.1f} {y:.1f}" fill="none" '
            f'stroke="{color}" stroke-width="1.5" stroke-linecap="round"/>'
        )

    out.append(
        f'<g transform="rotate(-11 {cx} {cy})"><ellipse cx="{cx}" cy="{cy}" rx="{rx + 18}" ry="120" '
        f'fill="none" stroke="{LINE_BEIGE}" stroke-width="1.3" stroke-opacity="0.8"/></g>'
    )
    out.append(
        f'<g transform="rotate(14 {cx} {cy})"><ellipse cx="{cx}" cy="{cy}" rx="{rx - 10}" ry="104" '
        f'fill="none" stroke="{LINE_ROSE}" stroke-width="1.3" stroke-opacity="0.8"/></g>'
    )

    scale = 14.5
    ox, oy = cx - 12 * scale, cy - 12 * scale - 4
    out.append(
        f'<g transform="translate({ox - 12 * scale * 0.09:.1f},{oy - 12 * scale * 0.09:.1f}) '
        f'scale({scale * 1.09:.3f})"><path d="{CLOUD_PATH}" fill="#E9E9E4" fill-opacity="0.9"/></g>'
    )
    out.append(
        f'<g transform="translate({ox:.1f},{oy:.1f}) scale({scale:.3f})">'
        f'<path d="{CLOUD_PATH}" fill="#FFFFFF"/></g>'
    )
    icx, icy = ox + 10.6 * scale, oy + 11.6 * scale
    out.append(icon_svg(center["icon"], icx, icy, 78, color=BLUE_GRAY_LIGHT, width=2.4))
    for j, line in enumerate(label_lines(center.get("label", ""))):
        out.append(text_svg(icx, icy + 62 + j * 16, line, size=13, color=MUTED))

    for i, ((x, y), node) in enumerate(zip(positions, nodes)):
        color = BADGE_COLORS[i % len(BADGE_COLORS)]
        out.append(badge(x, y, 31, color, node["icon"], rounded=True))
        for j, line in enumerate(label_lines(node["label"])):
            out.append(text_svg(x, y + 31 + 26 + j * 16, line, size=13))
    return w, h, out


LAYOUTS = {"flow": draw_flow, "hub": draw_hub}


def validate(spec, where):
    layout = spec.get("layout")
    if layout not in LAYOUTS:
        raise ValueError(f"{where}: layout must be one of {sorted(LAYOUTS)}, got {layout!r}")
    nodes = spec.get("nodes")
    if not isinstance(nodes, list) or not nodes:
        raise ValueError(f"{where}: 'nodes' must be a non-empty list")
    limits = {"flow": (2, 6), "hub": (2, 6)}[layout]
    if not limits[0] <= len(nodes) <= limits[1]:
        raise ValueError(f"{where}: {layout} supports {limits[0]} to {limits[1]} nodes, got {len(nodes)}")
    icons = [n.get("icon") for n in nodes]
    if layout == "hub" and "center" in spec:
        icons.append(spec["center"].get("icon"))
    for icon in icons:
        if icon not in ICONS:
            raise ValueError(f"{where}: unknown icon {icon!r}. Use one of: {', '.join(sorted(ICONS))}")
    for n in nodes:
        if not n.get("label"):
            raise ValueError(f"{where}: every node needs a 'label'")


def diagram_svg(spec):
    w, h, parts = LAYOUTS[spec["layout"]](spec)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
        + "".join(parts)
        + "</svg>"
    )


# ---------------------------------------------------------------- markdown parsing

def parse_markdown(text):
    """Return a list of (kind, payload, line_no) blocks."""
    lines = text.splitlines()
    blocks = []
    i = 0
    para = []

    def flush_para():
        if para:
            blocks.append(("p", " ".join(s.strip() for s in para), None))
            para.clear()

    while i < len(lines):
        line = lines[i]
        fence = re.match(r"^\s*(```|~~~)\s*([\w-]*)\s*$", line)
        if fence:
            flush_para()
            marker, lang = fence.group(1), fence.group(2)
            start = i + 1
            body = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith(marker):
                body.append(lines[i])
                i += 1
            i += 1
            blocks.append(("diagram" if lang == "lab-diagram" else "code", ("\n".join(body), lang), start))
            continue
        heading = re.match(r"^(#{1,3})\s+(.*)$", line)
        if heading:
            flush_para()
            blocks.append((f"h{len(heading.group(1))}", heading.group(2).strip(), None))
        elif re.match(r"^\s*[-*]\s+", line):
            flush_para()
            items = []
            while i < len(lines) and re.match(r"^\s*[-*]\s+", lines[i]):
                items.append(re.sub(r"^\s*[-*]\s+", "", lines[i]).strip())
                i += 1
            blocks.append(("ul", items, None))
            continue
        elif re.match(r"^\s*\d+[.)]\s+", line):
            flush_para()
            items = []
            while i < len(lines) and re.match(r"^\s*\d+[.)]\s+", lines[i]):
                items.append(re.sub(r"^\s*\d+[.)]\s+", "", lines[i]).strip())
                i += 1
            blocks.append(("ol", items, None))
            continue
        elif line.startswith(">"):
            flush_para()
            quote = []
            while i < len(lines) and lines[i].startswith(">"):
                quote.append(lines[i].lstrip(">").strip())
                i += 1
            blocks.append(("quote", " ".join(quote), None))
            continue
        elif not line.strip():
            flush_para()
        else:
            para.append(line)
        i += 1
    flush_para()
    return blocks


def inline(text):
    codes = []

    def stash(m):
        codes.append(m.group(1))
        return f"\x00{len(codes) - 1}\x00"

    text = re.sub(r"`([^`]+)`", stash, text)
    text = esc(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", rf'<a href="\2" color="{ROSE}"><u>\1</u></a>', text)
    text = re.sub(
        r"\x00(\d+)\x00",
        lambda m: f'<font name="Courier" color="{ROSE}">{esc(codes[int(m.group(1))])}</font>',
        text,
    )
    return text


# ---------------------------------------------------------------- PDF flowables

class CodeBlock(Flowable):
    font, size, leading, pad = "Courier", 8.8, 12.2, 9

    def __init__(self, text, lang="", lines=None):
        super().__init__()
        self.text, self.lang = text, lang
        self.raw_lines = lines if lines is not None else text.expandtabs(4).split("\n")
        self.lines = []

    def _wrap_lines(self, avail_w):
        cw = stringWidth("M", self.font, self.size)
        max_chars = max(20, int((avail_w - 2 * self.pad) / cw))
        out = []
        for line in self.raw_lines:
            while len(line) > max_chars:
                out.append(line[:max_chars])
                line = "  " + line[max_chars:]
            out.append(line)
        return out

    def wrap(self, avail_w, avail_h):
        self.width = avail_w
        self.lines = self._wrap_lines(avail_w)
        self.height = 2 * self.pad + len(self.lines) * self.leading
        return self.width, self.height

    def split(self, avail_w, avail_h):
        lines = self._wrap_lines(avail_w)
        fit = int((avail_h - 2 * self.pad) / self.leading)
        if fit < 3 or fit >= len(lines):
            return []
        return [CodeBlock("", self.lang, lines[:fit]), CodeBlock("", self.lang, lines[fit:])]

    def draw(self):
        c = self.canv
        c.setFillColor(colors.HexColor(CODE_BG))
        c.roundRect(0, 0, self.width, self.height, 6, stroke=0, fill=1)
        c.setFillColor(colors.HexColor(ROSE_LIGHT))
        c.rect(0, 0, 2.2, self.height, stroke=0, fill=1)
        if self.lang:
            c.setFont("Helvetica", 7)
            c.setFillColor(colors.HexColor(MUTED))
            c.drawRightString(self.width - 8, self.height - 11, self.lang.upper())
        c.setFont(self.font, self.size)
        c.setFillColor(colors.HexColor(INK))
        y = self.height - self.pad - self.size
        for line in self.lines:
            c.drawString(self.pad + 3, y, line)
            y -= self.leading


class PaletteBar(Flowable):
    def wrap(self, avail_w, avail_h):
        self.width = avail_w
        return avail_w, 6

    def draw(self):
        x = 0
        for color, w in ((OLIVE, 46), (ROSE, 30), (SAGE, 22), (BEIGE, 14), (BLUE_GRAY, 8)):
            self.canv.setFillColor(colors.HexColor(color))
            self.canv.roundRect(x, 0, w, 4, 2, stroke=0, fill=1)
            x += w + 5


class StepNumber(Flowable):
    def __init__(self, label):
        super().__init__()
        self.label = label

    def wrap(self, avail_w, avail_h):
        return 22, 22

    def draw(self):
        c = self.canv
        c.setFillColor(colors.HexColor(ROSE))
        c.circle(11, 11, 11, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(11, 7.4, self.label)


class Rule(Flowable):
    def wrap(self, avail_w, avail_h):
        self.width = avail_w
        return avail_w, 1

    def draw(self):
        self.canv.setStrokeColor(colors.HexColor("#E4DED6"))
        self.canv.setLineWidth(0.7)
        self.canv.line(0, 0, self.width, 0)


# ---------------------------------------------------------------- PDF assembly

def styles():
    base = dict(fontName="Helvetica", textColor=colors.HexColor(BODY))
    return {
        "kicker": ParagraphStyle("kicker", fontName="Helvetica-Bold", fontSize=8.5, leading=11,
                                 textColor=colors.HexColor(ROSE), spaceAfter=6),
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=23, leading=28,
                                textColor=colors.HexColor(INK), spaceAfter=10),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=14.5, leading=18,
                             textColor=colors.HexColor(OLIVE), spaceBefore=16, spaceAfter=5),
        "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=11.5, leading=14.5,
                             textColor=colors.HexColor(INK)),
        "body": ParagraphStyle("body", fontSize=10.3, leading=15, spaceAfter=7, **base),
        "item": ParagraphStyle("item", fontSize=10.3, leading=14.5, **base),
        "caption": ParagraphStyle("caption", fontName="Helvetica-Oblique", fontSize=8.8, leading=11,
                                  textColor=colors.HexColor(MUTED), alignment=TA_CENTER,
                                  spaceBefore=4, spaceAfter=10),
    }


def boxed(flowables, bg, bar, width):
    t = Table([[flowables]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
        ("LINEBEFORE", (0, 0), (0, -1), 2.4, colors.HexColor(bar)),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def build_pdf(md_path, out_path, keep_svg=False):
    with open(md_path, encoding="utf-8") as f:
        blocks = parse_markdown(f.read())

    st = styles()
    page_w, page_h = A4
    margin = 20 * mm
    content_w = page_w - 2 * margin
    title_text = next((b[1] for b in blocks if b[0] == "h1"), os.path.splitext(os.path.basename(md_path))[0])

    svg_dir = os.path.splitext(out_path)[0] + "-diagrams" if keep_svg else tempfile.mkdtemp()
    os.makedirs(svg_dir, exist_ok=True)

    story = []
    section = None
    outcome = []
    diagram_count = 0

    def target():
        return outcome if section == "outcome" else story

    for kind, payload, line_no in blocks:
        if kind == "h1":
            story += [Paragraph("HANDS-ON LAB", st["kicker"]), Paragraph(inline(payload), st["title"]),
                      PaletteBar(), Spacer(1, 6)]
        elif kind == "h2":
            if section == "outcome" and outcome:
                story.append(boxed(outcome, "#EEF2EC", SAGE, content_w))
                outcome = []
            section = "outcome" if payload.strip().lower() == "outcome" else payload.lower()
            story += [Paragraph(inline(payload), st["h2"]), Rule(), Spacer(1, 7)]
        elif kind == "h3":
            m = re.match(r"^step\s+(\d+)\s*[:.\-]?\s*(.*)$", payload, re.I)
            if m:
                row = Table([[StepNumber(m.group(1)), Paragraph(inline(m.group(2)), st["h3"])]],
                            colWidths=[30, content_w - 30])
                row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                                         ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                         ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
                target().extend([Spacer(1, 8), row, Spacer(1, 6)])
            else:
                target().extend([Spacer(1, 6), Paragraph(inline(payload), st["h3"]), Spacer(1, 4)])
        elif kind == "p":
            target().append(Paragraph(inline(payload), st["body"]))
        elif kind in ("ul", "ol"):
            items = [ListItem(Paragraph(inline(t), st["item"]), leftIndent=16) for t in payload]
            opts = dict(bulletColor=colors.HexColor(ROSE), leftIndent=16, spaceAfter=8)
            if kind == "ul":
                lst = ListFlowable(items, bulletType="bullet", start="\u2022", bulletFontSize=10, **opts)
            else:
                lst = ListFlowable(items, bulletType="1", bulletFontName="Helvetica-Bold",
                                   bulletFontSize=9.5, **opts)
            target().append(lst)
        elif kind == "quote":
            target().append(boxed([Paragraph(inline(payload), st["body"])], "#F6F0EA", BEIGE, content_w))
            target().append(Spacer(1, 8))
        elif kind == "code":
            body, lang = payload
            target().extend([CodeBlock(body, lang), Spacer(1, 9)])
        elif kind == "diagram":
            body, _ = payload
            where = f"{md_path}:{line_no}"
            try:
                spec = json.loads(body)
            except json.JSONDecodeError as e:
                raise ValueError(f"{where}: invalid JSON in lab-diagram block: {e}") from None
            validate(spec, where)
            diagram_count += 1
            svg_path = os.path.join(svg_dir, f"{spec.get('id') or f'diagram-{diagram_count}'}.svg")
            with open(svg_path, "w", encoding="utf-8") as f:
                f.write(diagram_svg(spec))
            drawing = svg2rlg(svg_path)
            k = content_w / drawing.width
            drawing.width, drawing.height = drawing.width * k, drawing.height * k
            drawing.scale(k, k)
            parts = [Spacer(1, 4), drawing]
            if spec.get("caption"):
                parts.append(Paragraph(inline(spec["caption"]), st["caption"]))
            else:
                parts.append(Spacer(1, 10))
            target().append(KeepTogether(parts))

    if outcome:
        story.append(boxed(outcome, "#EEF2EC", SAGE, content_w))

    def on_page(c, doc):
        c.saveState()
        c.setFillColor(colors.HexColor(PAGE_BG))
        c.rect(0, 0, page_w, page_h, stroke=0, fill=1)
        c.setFont("Helvetica", 7.8)
        c.setFillColor(colors.HexColor(MUTED))
        c.drawString(margin, 11 * mm, re.sub(r"[`*]", "", title_text))
        c.drawRightString(page_w - margin, 11 * mm, str(doc.page))
        c.restoreState()

    doc = SimpleDocTemplate(out_path, pagesize=A4, leftMargin=margin, rightMargin=margin,
                            topMargin=18 * mm, bottomMargin=20 * mm, title=title_text,
                            author="Hands-on lab")
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return diagram_count


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("markdown")
    ap.add_argument("-o", "--output", help="PDF path (default: next to the Markdown file)")
    ap.add_argument("--keep-svg", action="store_true", help="also save diagram SVGs next to the PDF")
    args = ap.parse_args()

    out = args.output or os.path.splitext(args.markdown)[0] + ".pdf"
    try:
        count = build_pdf(args.markdown, out, args.keep_svg)
    except (ValueError, FileNotFoundError) as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(1)
    print(f"Wrote {out} ({count} diagram{'s' if count != 1 else ''})")


if __name__ == "__main__":
    main()
