# Stealth Apps Signature Style Design Plan

A unified, minimalist luxury design system for Stealth Apps smart watch applications and companion interfaces, featuring pure AMOLED obsidian blacks, dual-tone electric purple and deep violet data accents, and an unbranded, high-end digital horology aesthetic on the watch.

> [!IMPORTANT]
> **Confirmed Design Parameters (From User Interview)**:
> 1. **Visual Tone**: Minimalist luxury with pure AMOLED blacks (`#000000`) and subtle midnight-violet undertones—no flashy neon gradients or roleplay badges.
> 2. **Data & Chart Color**: Dual-tone electric purple (`#c084fc` / `#a855f7`) paired with deep royal violet (`#7c3aed` / `#6d28d9`) to establish instant visual hierarchy across bars, arcs, and metrics without altering element geometry.
> 3. **Watch Face Branding**: **Zero branding on the watch face**. The watch remains a pure, pristine, distraction-free instrument. Brand attribution is exclusively housed on the smartphone Zepp App screen (`setting/index.js`) and companion installer.
> 4. **Geometry Invariant**: All layout positions ($x, y$), element dimensions ($w, h$), 1px bar chart spacing, and top semicircle arc geometry remain identical to the current production structure.

---

## 1. Overview & Core Concept

### What It Delivers
A distinctive, immediately recognizable visual identity that differentiates all Stealth Apps from generic, crowded smartwatch utilities. Instead of mimicking fitness trackers with rainbow charts or generic neon colors, Stealth Apps adopt the visual poise of bespoke luxury digital horology (akin to Urwerk, Ressence, and high-end monochrome instrumentation).

### The Stealth Apps Pillars
- **Obsidian Purity**: 100% true AMOLED `#000000` canvas to eliminate display perimeter bleed, maximize battery life, and create an infinite-depth background.
- **Dual-Tone Violet Telemetry**: Electric purple for focal values and active states; deep velvet violet for secondary metrics and fill volumes.
- **Quiet Precision**: Restrained typography, subtle hairline dividers, and tabular figures without clutter, icons, or badges.
- **Pristine Watch Face, Branded Companion**: No logos, watermarks, or corporate marks crowding the watch's 466x466 AMOLED screen. The Stealth Apps signature identity is showcased in the smartphone Zepp App companion.

---

## 2. User Experience & Visual Design

### 2.1 Color Tokens & Visual Hierarchy
```
┌────────────────────────────────────────────────────────────────────────┐
│                        STEALTH COLOR PALETTE                           │
├──────────────────┬─────────────────┬───────────────────────────────────┤
│ Role             │ Hex Value       │ Usage                             │
├──────────────────┼─────────────────┼───────────────────────────────────┤
│ Obsidian Black   │ #000000         │ 100% OLED background canvas       │
│ Midnight Velvet  │ #151122         │ Subtle surface contrast / pill    │
│ Stealth Track    │ #241e38         │ Arc & bar background tracks       │
│ Deep Violet      │ #7c3aed         │ Baseline data, medium activity    │
│ Electric Purple  │ #c084fc         │ High probability hero, peak bars  │
│ Radiant Lilac    │ #e9d5ff         │ Focal readouts & primary numbers  │
│ Optical White    │ #f8fafc         │ Time and critical text labels     │
│ Muted Slate      │ #94a3b8         │ Guides, secondary units, clouds   │
└──────────────────┴─────────────────┴───────────────────────────────────┘
```

### 2.2 Watch Face Visual Language (Firmware & Emulator)
- **Top Chance Indicator Arc (9 o'clock to 3 o'clock)**:
  - Track: Muted midnight-slate `#241e38` (line_width 14).
  - Dynamic Arc: Transitions from Deep Violet (`#7c3aed`) at low-to-moderate values to Electric Purple (`#c084fc`) at high values, giving an organic energy surge as values rise.
- **Metric Bar Charts (Strict 1px Horizontal Gap)**:
  - Background Tracks: Uniform `#241e38` with 2px corner radius.
  - Data Fills: Dual-tone dynamic coloring:
    - High Activity ($\ge 70\%$): Electric Purple (`#c084fc`).
    - Moderate Activity ($40\% - 69\%$): Royal Violet (`#8b5cf6`).
    - Low Activity ($< 40\%$): Velvet Indigo (`#6366f1`).
  - Text Labels Under Bars:
    - Row 1 (Time/Day): Pure Optical White (`#f8fafc`) for instant scanning.
    - Row 2 (Probability %): Electric Purple (`#c084fc`) or Royal Violet (`#8b5cf6`).
    - Row 3 (Kp / Index): Soft Lilac (`#d8b4fe`).
    - Row 4 (Cloud / Sub-metric): Muted Slate (`#94a3b8`).
- **Location Switcher (Bottom Center)**:
  - Background: Minimalist Obsidian Velvet (`#19152b`) with 18px radius.
  - Text: Optical White with subtle lilac chevron (`▾`).

### 2.3 Smartphone Zepp App Companion Screen (`setting/index.js`)
- **Stealth Apps Brand Card**:
  - Premium header card with dark brushed obsidian gradient and subtle purple hairline border (`#3b2d54`).
  - "STEALTH APPS" brand mark in geometric tracking (`tracking-[0.2em] font-semibold text-purple-300`).
  - Minimalist badge indicating firmware compatibility and precision synchronization status.
- **Location Presets & Search UI**:
  - High-contrast search inputs with violet focus rings.
  - Clean unboxed preset rows with purple coordinate badges and swipe-to-delete affordances.

---

## 3. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│                   STEALTH APPS DESIGN ARCHITECTURE                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   WATCH DISPLAY (Firmware: page/index.js & app-widget/index.js)        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │  [Top Semicircle Arc] 180° - 360° (Electric Purple / Violet) │     │
│   │  [Bezel Title] Clean Monospace Tracked (NOW / OUTLOOK)       │     │
│   │  [Hero Probability] 42px Lilac Bold Display                  │     │
│   │  [Bar Charts] 1px Gap | Dual-Tone Violet/Purple Fills        │     │
│   │  [Bottom Switcher] Velvet Obsidian Pill                      │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                  ▲                                     │
│                         BLE Sync │ (Zero Watch Branding)               │
│                                  ▼                                     │
│   SMARTPHONE COMPANION (setting/index.js & src/App.tsx)                │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │  ★ STEALTH APPS Brand Signature Header                       │     │
│   │  • Active GPS Location Status Card (Violet Halo)             │     │
│   │  • Custom Preset Management (Up to 5 slots)                  │     │
│   │  • Geocoding Search & One-Tap Preset Injection               │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps & File Modifications

1. **Watch Palette Constants Update (`page/index.js` & `zepp-app/page/index.js`)**:
   - Define canonical Stealth color constants:
     - `COLOR_OBSIDIAN = 0x000000`
     - `COLOR_TRACK = 0x241e38`
     - `COLOR_ELECTRIC_PURPLE = 0xc084fc`
     - `COLOR_ROYAL_VIOLET = 0x8b5cf6`
     - `COLOR_DEEP_VIOLET = 0x7c3aed`
     - `COLOR_LILAC = 0xd8b4fe`
     - `COLOR_MUTED_SLATE = 0x94a3b8`
   - Update `getColorByProb()` to return the dual-tone purple/violet spectrum.
   - Update text widget colors across Screens 0, 1, 2, and 3 without altering any `x, y, w, h` values.

2. **Carousel App Widget Synchronisation (`app-widget/index.js` & `zepp-app/app-widget/index.js`)**:
   - Apply the matching dual-tone purple/violet scheme to the top Chance arc and primary widget readouts.

3. **Smartphone Zepp App Settings (`setting/index.js` & `zepp-app/setting/index.js`)**:
   - Introduce the Stealth Apps brand identity card with geometric typography and violet accents.
   - Refine search inputs, preset buttons, and status cards to reflect the minimalist luxury aesthetic.

4. **Web Emulator Alignment (`src/App.tsx`)**:
   - Update SVG stroke colors, metric gradients, and bar chart color mappings to match the new Stealth Apps palette.
   - Refresh the web companion view with the updated Stealth Apps brand card.

5. **Compilation & Verification**:
   - Run `lint_applet` and `compile_applet` to verify zero regressions.
