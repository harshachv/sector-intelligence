# UI Design System

## Theme

Light mode. Clean, institutional, finance-grade analytics product.

---

## Color Palette

### Base

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-page` | `#F7F9FC` | Page background |
| `bg-surface` | `#FFFFFF` | Cards, table rows, header |
| `bg-secondary` | `#F1F5F9` | Secondary surfaces, hover states |
| `border` | `#E2E8F0` | All dividers and card borders |
| `text-primary` | `#0F172A` | Body text, headings |
| `text-muted` | `#64748B` | Secondary labels, timestamps |

### Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-blue` | `#0284C7` | Active states, links, CTA buttons |
| `accent-cyan` | `#06B6D4` | Highlights, progress fills |

### Semantic

| Token | Hex | Usage |
|-------|-----|-------|
| `green` | `#16A34A` | Positive growth, bullish, constructive |
| `amber` | `#D97706` | Caution, defensive |
| `red` | `#E11D48` | Negative growth, bearish, max defensive |

### Soft Backgrounds (badge fills)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-green-soft` | `#DCFCE7` | Bullish badges |
| `bg-amber-soft` | `#FEF3C7` | Caution badges |
| `bg-red-soft` | `#FFE4E6` | Bearish/defensive badges |
| `bg-blue-soft` | `#E0F2FE` | Neutral/info badges |

---

## Typography

### Font Stack

```
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

### Monospace (for tickers, scores, timestamps)

```
ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
```

### Scale

| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Brand | 14px | 700 | Header brand text |
| Page title | 24px | 700 | Sector name on detail page |
| Section title | 16px | 600 | Section headers |
| Card label | 11px | 600 | KPI card labels (uppercase) |
| Card value | 28px | 700 | KPI large values |
| Body | 13px | 400 | Table cells, body text |
| Muted | 12px | 400 | Secondary labels |
| Mono | 12px | 500 | Scores, tickers, timestamps |

---

## Spacing

- Card padding: `p-4` or `p-5`
- Section gap: `gap-4` or `gap-6`
- Table cell padding: `px-4 py-3`
- Header height: `h-14`

---

## Responsive Behaviour

Tailwind breakpoints: `sm` 640px · `md` 768px · `lg` 1024px. Mobile-first — base classes target the smallest screens.

| Area | Mobile (<640) | Tablet (md) | Desktop (lg+) |
|------|---------------|-------------|----------------|
| Header brand | "Intelligence" (the word "Sector " is `hidden sm:inline`) | full "SECTOR INTELLIGENCE" | full |
| Header nav links | hidden (`hidden lg:flex`) | hidden | shown |
| Home KPI cards | `grid-cols-2` | `md:grid-cols-4` | 4-col |
| Top Growth Sectors | `grid-cols-1` → `sm:grid-cols-2` | `md:grid-cols-3` | `lg:grid-cols-5` |
| StatCard value font | `text-2xl`, `break-words`, `min-w-0` (long sector names wrap, never clip) | `sm:text-3xl` | `text-3xl` |
| Stock chart height | `h-[380px]` | `sm:h-[460px]` | `lg:h-[560px]` |
| Chart-type buttons | icon only | icon + label (`hidden md:inline`) | icon + label |
| Chart toolbar | Chart / Range / View groups wrap (`flex-wrap items-end`); inter-group dividers `hidden sm:block` | inline | inline |
| Tables (rankings, constituents) | horizontal scroll inside `overflow-x-auto` — never break the layout | scroll | full width |

Rules:
- **Never allow body-level horizontal overflow.** Wide tables live inside an `overflow-x-auto` wrapper; the page container itself must not exceed `100vw`.
- KPI/value text that can be long (sector names) must use `break-words` + `min-w-0` and a responsive font size so it wraps instead of clipping.
- Dense control rows (chart toolbar) use labelled `ButtonGroup`s with `flex-wrap items-end` so groups wrap as units and stay bottom-aligned.
- Verify changes at mobile (375px) and tablet (768px) before finalizing.

---

## Borders & Shadows

- Border: `border border-[#E2E8F0]`
- Card shadow: `shadow-sm`
- Hover shadow: `shadow-md`
- Border radius: `rounded-lg` for cards, `rounded-md` for badges/buttons

---

## Component Patterns

### KPI Card
- White background, border, rounded-lg, shadow-sm
- Uppercase label (11px, muted, tracking-wider)
- Large value (28px bold, primary text)
- Optional subtext (12px, muted)

### Status Badge
- Inline pill: `rounded-full px-2 py-0.5 text-xs font-semibold`
- Color variants: green/amber/red/blue backgrounds with matching text

### Progress Bar
- Container: `h-1.5 rounded-full bg-[#E2E8F0]`
- Fill: `h-full rounded-full bg-[#06B6D4]`
- Show percentage label beside or above bar

### Status Dot
- `w-2 h-2 rounded-full`
- Green: `bg-[#16A34A]`
- Amber: `bg-[#D97706]`
- Red: `bg-[#E11D48]`

### Table
- `min-w-full` inside a `overflow-x-auto` wrapper
- Header row: `bg-[#F1F5F9]` with uppercase 11px muted labels
- Data rows: white background, hover `bg-[#F7F9FC]`
- Border between rows: `border-b border-[#E2E8F0]`

### Button (primary action)
- `bg-[#0284C7] text-white rounded-md px-3 py-1.5 text-sm font-medium`
- Hover: `hover:bg-[#0369A1]`
- Focus ring: `focus:ring-2 focus:ring-[#0284C7] focus:ring-offset-1`

---

## Tailwind Config Extensions

```js
// tailwind.config.js — custom color tokens
colors: {
  brand: {
    blue: '#0284C7',
    cyan: '#06B6D4',
  },
  sector: {
    bg: '#F7F9FC',
    surface: '#FFFFFF',
    secondary: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    muted: '#64748B',
    green: '#16A34A',
    amber: '#D97706',
    red: '#E11D48',
  }
}
```
