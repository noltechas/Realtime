#!/usr/bin/env python3
"""Flatten the Delauney display font into deterministic polygon data for GLB generation."""

import json
from pathlib import Path

from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont


SCRIPT_DIR = Path(__file__).resolve().parent
FONT_PATH = SCRIPT_DIR.parent / "assets" / "fonts" / "Delauney-Regular.ttf"
OUTPUT_PATH = SCRIPT_DIR / "delauney-glyphs.json"
CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ-."
CURVE_STEPS = 4


def lerp(a, b, amount):
    return a + (b - a) * amount


def quadratic_point(start, control, end, amount):
    first = (
        lerp(start[0], control[0], amount),
        lerp(start[1], control[1], amount),
    )
    second = (
        lerp(control[0], end[0], amount),
        lerp(control[1], end[1], amount),
    )
    return (
        lerp(first[0], second[0], amount),
        lerp(first[1], second[1], amount),
    )


def cubic_point(start, control_a, control_b, end, amount):
    inverse = 1 - amount
    return (
        inverse**3 * start[0]
        + 3 * inverse**2 * amount * control_a[0]
        + 3 * inverse * amount**2 * control_b[0]
        + amount**3 * end[0],
        inverse**3 * start[1]
        + 3 * inverse**2 * amount * control_a[1]
        + 3 * inverse * amount**2 * control_b[1]
        + amount**3 * end[1],
    )


def append_point(contour, point):
    rounded = [round(point[0], 3), round(point[1], 3)]
    if not contour or contour[-1] != rounded:
        contour.append(rounded)


def flatten_recording(commands):
    contours = []
    contour = []
    current = None
    contour_start = None

    for operation, raw_points in commands:
        points = list(raw_points)
        if operation == "moveTo":
            if contour:
                contours.append(contour)
            contour = []
            current = points[0]
            contour_start = current
            append_point(contour, current)
        elif operation == "lineTo":
            for point in points:
                append_point(contour, point)
                current = point
        elif operation == "qCurveTo":
            if current is None:
                continue
            if points and points[-1] is None:
                points[-1] = contour_start
            controls = points[:-1]
            final_point = points[-1]
            for index, control in enumerate(controls):
                end = (
                    final_point
                    if index == len(controls) - 1
                    else (
                        (control[0] + controls[index + 1][0]) / 2,
                        (control[1] + controls[index + 1][1]) / 2,
                    )
                )
                for step in range(1, CURVE_STEPS + 1):
                    append_point(
                        contour,
                        quadratic_point(current, control, end, step / CURVE_STEPS),
                    )
                current = end
        elif operation == "curveTo":
            if current is None:
                continue
            for index in range(0, len(points), 3):
                control_a, control_b, end = points[index : index + 3]
                for step in range(1, CURVE_STEPS + 1):
                    append_point(
                        contour,
                        cubic_point(
                            current,
                            control_a,
                            control_b,
                            end,
                            step / CURVE_STEPS,
                        ),
                    )
                current = end
        elif operation in ("closePath", "endPath"):
            if contour:
                if len(contour) > 1 and contour[0] == contour[-1]:
                    contour.pop()
                if len(contour) >= 3:
                    contours.append(contour)
            contour = []
            current = None
            contour_start = None

    if contour:
        if len(contour) > 1 and contour[0] == contour[-1]:
            contour.pop()
        if len(contour) >= 3:
            contours.append(contour)
    return contours


def main():
    font = TTFont(FONT_PATH)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    glyphs = {}

    for character in CHARACTERS:
        glyph_name = cmap[ord(character)]
        pen = RecordingPen()
        glyph_set[glyph_name].draw(pen)
        glyphs[character] = {
            "advance": round(glyph_set[glyph_name].width, 3),
            "contours": flatten_recording(pen.value),
        }

    payload = {
        "unitsPerEm": font["head"].unitsPerEm,
        "glyphs": glyphs,
    }
    OUTPUT_PATH.write_text(
        json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
