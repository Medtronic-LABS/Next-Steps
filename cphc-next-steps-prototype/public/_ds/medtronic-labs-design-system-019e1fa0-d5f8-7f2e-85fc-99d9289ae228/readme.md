# Medtronic LABS — Design System

A brand-faithful design system for **Medtronic LABS**, derived from the official *Medtronic LABS Brand Guide*. It ships the brand's colors, Inter typography, logo, illustrations and photography treatment, a set of reusable React UI primitives, foundation specimen cards, a website UI kit, and a one-pager template.

> **Namespace:** components are exposed at `window.MedtronicLABSDesignSystem_019e1f.<Component>` in card/kit HTML. Consumers link one stylesheet: **`styles.css`**.

---

## 1 · Company & product context

**Medtronic LABS** is a health-systems innovation organisation delivering **tech-enabled, patient-focused care** at the last mile. Its mission: *"reduce the burden of disease, catalyze policy-level change, and help restore the dignity of human life."*

- **Positioning:** "A bold approach to last-mile healthcare delivery" · "We're transforming health systems with care that you can measure."
- **Approach (three elements):** digital technology + field operations + partnerships → human flourishing.
- **SPICE** — the organisation's flagship digital health platform for **community-based population health** (screening, treatment and follow-up run by community health workers). *Note: no SPICE product UI was provided, so it is not recreated here.*
- **Programs:** hypertension, diabetes, maternal health, across Kenya, the Philippines and other markets.
- **Surfaces represented:** the **marketing website** (recreated as a UI kit). The brand guide also implies print collateral and reports.

### Sources used
- `uploads/Medtronic Labs - Brand Guide (1) (1).docx` — the **primary source** (colors, typography, logo, iconography, image treatment, voice). Extracted text saved at `uploads/_brand_text.txt`; extracted imagery at `uploads/media/`.
- `uploads/Inter-VariableFont_opsz,wght.ttf` + italic — the brand typeface (Inter), shipped in `assets/fonts/`.
- `uploads/LABS2.0-Master-Deck-September 2024.pptx` — the company **overview deck** (extracted text at `uploads/_deck_text.txt`, imagery at `uploads/deckmedia/`). Source for the sample **slide templates** and the SPICE product story.
- **Not received:** `Inter (1).zip` (not needed — the loose Inter `.ttf` files are shipped). No **SPICE product UI** (screenshots/code) was provided, so that platform is not recreated as a UI kit — **send it** to add one.

---

## 2 · Content fundamentals (voice & tone)

How Medtronic LABS writes:

- **Bold, plain and direct.** Short, declarative sentences. Minimal jargon. *"A bold approach to last-mile healthcare delivery."*
- **Warm and human, never clinical.** Language centres people and dignity — "patients", "communities", "human flourishing", "care you can measure".
- **Evidence-led.** Claims lean on measurable outcomes and real numbers (patients reached, % controlled, cost per patient).
- **Collective "we".** The brand speaks as "we" and addresses partners/readers as "you" — *"We are proud to work with partners at every level."*
- **Sentence case** for headlines and body. The brand guide is explicit: **avoid all-caps or all-lowercase** for headlines and body copy. The single exception is the wordmark — **"LABS" is always capitalised** ("Medtronic LABS"), and small UI **eyebrows/labels** may be uppercase with letter-spacing.
- **No emoji.** Not part of the brand. Use the line-icon set instead.
- **Casing of the name:** always "Medtronic LABS" (capital LABS), never "Medtronic Labs".

Example headline + body pairing from the guide:
> **A bold approach to last-mile healthcare delivery**
> Transformative change doesn't happen in a vacuum. Our approach integrates three elements: digital technology, field operations, and partnerships, to promote human flourishing.

---

## 3 · Visual foundations

**Color.** The system leads with a deep **Medium Blue / indigo `#1E14BE`** — used for hero blocks, nav, primary buttons and the wordmark. It is balanced by warm and fresh secondaries: **Seafoam `#54CC90`**, **Terracotta `#EB956A`**, **Burnt Orange `#C35721`**, **Periwinkle `#6165DE`**, and a soft tint family (**Blue 30% `#BCB5F7`**, **Peppermint**, **Peach**, **Pink**). Reds (**Merlot/Maroon**) carry danger. Neutrals are warm: **Off-white `#FCFBF9`** surfaces, **Grey `#DEDDD8`** borders, and a near-black ink ramp (`#010101`→`#909090`) for text. Imagery skews **warm**, often with a **merlot→periwinkle duotone**.

**Type.** **Inter** throughout (variable). Headlines, sub-headers and body are **Medium (500)**; captions and small text are **Regular (400)**; **Bold (700)** for emphasis and the "LABS" mark. Hierarchy from the guide: Display/H1 84px (letter-spacing −1.5px), H1 48px, H2 36px, H3 24px, Body 16px, Button 14px. **Minimum size 10px.** Default to **single line spacing** (tight). Prefer **left-aligned**; never justify.

**Spacing & layout.** 8px-based spacing scale (4px half-steps). Centred max-width containers (~1200px) with generous 40–48px gutters. Sections alternate **off-white** and **full-bleed indigo** bands for rhythm.

**Backgrounds.** Mostly flat off-white or solid indigo. A subtle **diagonal-line "map" pattern** (`assets/pattern-lines.png`) decorates indigo blocks at low opacity. Smooth two-stop gradients (indigo→periwinkle) are used sparingly. No noisy textures.

**Corners & cards.** Soft, generous radii. Cards use **24px (`--radius-xl`)**; images use **20px (`--radius-image`)**; buttons are **pills**. Cards are white with either a soft indigo-tinted shadow (`--shadow-sm`) or a hairline grey border.

**Shadows.** Low-contrast and **tinted toward indigo** (`rgba(30,20,190,…)`), never neutral grey-black. Used lightly for elevation; hover lifts to `--shadow-md`.

**Borders.** 1–1.5px, warm grey (`--ml-grey` / `#CFCEC8`); indigo for active/focus.

**Motion.** Quiet and functional — short fades and 120–320ms transitions on `cubic-bezier(0.2,0,0.2,1)`. No bounces or infinite loops.

**Hover / press.** Hover = slightly **darker** fill (primary) or a pale indigo wash (secondary/ghost). Press = darker still + a subtle `scale(0.97)`. Focus = 3px periwinkle ring.

**Transparency & blur.** Sparing — the sticky header uses a translucent white with backdrop blur; the photo duotone uses `multiply` blending.

**Illustrations.** Flat vector scenes of people (community health workers, patients) amid **seafoam/teal botanical foliage**, with indigo gradient forms. Mood: caring, empathetic, optimistic. (`assets/illo-*.png/jpeg`.)

**Photography.** Real field photography of health workers and communities, given a soft **rounded edge** and an optional brand **duotone overlay** (merlot→periwinkle).

---

## 4 · Iconography

- The brand icon set is built on a **24×24px grid**, with consistent stroke, proportions and spacing, shown at **full opacity** with breathing room around each glyph.
- Style: **outlined line icons** (the guide shows thin/thick stroke weights), typically in brand indigo.
- **No emoji.** Unicode glyphs are not used as icons.
- **Substitution (flagged):** the brand guide ships its icons as flat artwork inside the document, not as a reusable font/SVG set, so this system standardises on **[Lucide](https://lucide.dev)** — open-source line icons with a matching **1.75px stroke and rounded caps** (`--icon-stroke`, `--icon-base: 24px`). Foundation/kit cards draw inline Lucide-style SVGs. **If Medtronic LABS has an official icon library, send it and we'll swap Lucide out.**

---

## 5 · Index / manifest

**Root**
- `styles.css` — global entry point (imports only).
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`.
- `assets/` — `logo-mark.png`, `logo-wordmark-reverse.png`, `motif-{periwinkle,seafoam,peach,merlot}.png`, `illo-{consultation,climbing,climbing-sm}.*`, `photo-{hands,hands-treated,chw-child,chw-child-treated}.jpeg`, `pattern-lines.png`, `fonts/`.
- `readme.md` (this file), `SKILL.md`.

**Components** (`window.MedtronicLABSDesignSystem_019e1f`)
- `components/forms/` — Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Switch
- `components/feedback/` — Badge, Tag, Alert, Tooltip, ProgressBar
- `components/data-display/` — Card, StatCard, Avatar
- `components/navigation/` — Tabs, Breadcrumb

**Foundation cards** (Design System tab) — `guidelines/`: Colors (primary, secondary, neutrals, status, gradients), Type (headings, body, weights), Spacing (scale, radius, elevation, icon sizes), Brand (logo, logo-on-indigo, motifs, image treatment, iconography, illustrations, voice).

**UI kits** — `ui_kits/website/` — interactive marketing-site homepage.

**Slides** — `slides/` — five branded sample slides (title, statement, stats, three-up, case study) recreated from the master deck.

**Templates** — `templates/impact-onepager/` — branded one-page impact sheet (`.dc.html`).

---

### Caveats
- **SPICE platform UI** is not built — no product screenshots or code were provided. Send them to add a SPICE UI kit.
- The **logomark** (`assets/logo-mark.png`) was reconstructed from the brand guide's logo (the only embedded copy carried construction guides); colors are sampled exact. Replace with an official vector logo when available.
- Icons use **Lucide** as a documented stand-in for the brand's bespoke set.
