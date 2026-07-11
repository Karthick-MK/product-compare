---
name: Technical Precision Dark
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#ff516a'
  on-tertiary-container: '#5b0017'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-desktop: 32px
  margin-mobile: 16px
  container-max: 1280px
---

## Brand & Style
The design system is engineered for high-density information environments where clarity and technical accuracy are paramount. The brand personality is professional, data-centric, and authoritative, catering to users who need to compare complex specifications at a glance.

The visual style follows a **Corporate / Modern** approach with a lean toward **Minimalism**. It prioritizes a clear information hierarchy using structured grids and tonal layering rather than excessive decoration. The aesthetic response should be one of "functional elegance"—where every pixel serves a purpose in aiding user comprehension.

## Colors
The palette is built on a deep "Ink" foundation to reduce eye strain during prolonged technical analysis. 

- **Primary (Electric Blue):** Used for interactive elements, highlights, and primary data points.
- **Success (Vibrant Emerald):** Specifically designated for "Pros" and positive technical deltas.
- **Error (Deep Rose):** Reserved for "Cons," critical warnings, or negative performance metrics.
- **Neutral (Slate/Zinc):** A range of greys used to differentiate background layers and provide soft contrast for secondary metadata.

The dark mode utilizes a tonal surface system where higher-elevation components are represented by lighter shades of slate to create depth without relying on heavy shadows.

## Typography
Precision is the focus. We use **Hanken Grotesk** for headings to provide a modern, sharp edge, while **Inter** serves as the workhorse for body text due to its exceptional legibility at small sizes. **JetBrains Mono** is introduced for labels and technical specs (like weight ranges or model numbers) to ensure numerical data remains easy to scan and compare vertically.

For mobile, headlines scale down significantly to maintain the high-density comparison view. `headline-lg` becomes 22px on mobile devices to prevent excessive wrapping in comparison tables.

## Layout & Spacing
This design system utilizes a **Fixed Grid** model for desktop to ensure data columns remain aligned for side-by-side comparison. We use a 12-column grid with tight 16px gutters to maximize horizontal real estate.

Spacing is based on a **4px baseline**. High-density rows use a 12px vertical padding, while standard containers use 20px. On mobile, the comparison table reflows into a "stacked card" model, where the horizontal comparison shifts to a vertical sequence, but the internal "Pros/Cons" maintain a side-by-side split if width allows.

## Elevation & Depth
Elevation is achieved through **Tonal Layering** and **Low-Contrast Outlines**. 
- Level 0: Background (`#020617`)
- Level 1: Main content cards (`#0F172A` with a 1px `#1E293B` border)
- Level 2: Nested comparison cells or tooltips (`#1E293B`)

Shadows are avoided to keep the interface feeling crisp and technical. Instead, use thin, 1px borders to define boundaries between data points. Interaction states (hover) are indicated by increasing the border brightness rather than adding shadows.

## Shapes
In alignment with the "Precision" theme, the design system uses subtle rounding. The base `rounded-md` is **4px** (ROUND_FOUR). This provides just enough softness to feel modern without losing the structured, engineering-led aesthetic. Data chips and status indicators follow this 4px rule, while primary action buttons may use a slightly more pronounced 6px radius.

## Components
- **Comparison Cards:** Use a three-column split on desktop: [Image/Title] | [Key Specs] | [Pros/Cons]. Use a vertical separator line between "Pros" and "Cons" blocks.
- **Buttons:** Primary buttons use the Electric Blue fill with white text. Secondary buttons use an "Outline" style with the same blue.
- **Pros/Cons Chips:** "Pros" header uses a 10% opacity green background with a solid green top border. "Cons" uses a 10% opacity rose background with a solid rose top border.
- **Spec Lists:** Use monospaced font for values. Icons should be simplified glyphs in the neutral-400 color range to avoid visual clutter.
- **Input Fields:** Dark slate background with a 1px border. Focus state changes border to Primary Blue.
- **Data Badges:** Small, 4px rounded rectangular badges used for "New," "Top Pick," or "Best Value" markers.