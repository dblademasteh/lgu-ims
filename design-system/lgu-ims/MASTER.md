# Design System: LGU IMS (Minimal & Clean)

## 1. Visual Thesis
A "Quiet Productivity" interface. The goal is to remove all visual noise so the user can focus entirely on the data. No heavy borders, no saturated backgrounds, and generous whitespace. It should feel like a high-end modern SaaS (think Linear or Stripe) but adapted for government inventory.

## 2. Color Palette (Semantic & Muted)
We move away from raw hex in components and use a refined semantic scale.

| Token | Value | Usage |
| :--- | :--- | :--- |
| `primary` | `oklch(45% 0.12 250)` | Deep Slate Blue - Primary actions, active states |
| `secondary` | `oklch(85% 0.02 250)` | Soft Mist - Subtle backgrounds, secondary buttons |
| `accent` | `oklch(60% 0.15 160)` | Sage Green - Positive indicators, success |
| `base-100` | `oklch(99% 0.01 250)` | Pure Off-White - Main page background |
| `base-200` | `oklch(96% 0.01 250)` | Soft Gray - Card backgrounds, subtle sections |
| `base-300` | `oklch(92% 0.01 250)` | Muted Border - Hairline dividers, input borders |
| `content` | `oklch(25% 0.02 250)` | Deep Charcoal - Primary text |
| `muted` | `oklch(55% 0.02 250)` | Slate Gray - Captions, labels, placeholder text |
| `error` | `oklch(60% 0.18 25)` | Muted Crimson - Errors, critical warnings |

## 3. Typography (Clean & Functional)
- **Body**: `Inter`, `-apple-system, BlinkMacSystemFont, "Segoe UI"`.
- **Data/Mono**: `JetBrains Mono`, `ui-monospace`.
- **Scale**:
  - `h1`: 1.5rem / Bold / Tracking-tight
  - `h2`: 1.125rem / Semibold
  - `body`: 0.875rem / Regular / Leading-relaxed
  - `caption`: 0.75rem / Medium / Uppercase / Tracking-wide

## 4. Layout & Structure
- **Containers**: Max-width centered or fluid with 2rem padding.
- **Borders**: 1px solid `base-300`. No heavy shadows. Use `shadow-sm` only for floating elements (modals/dropdowns).
- **Radius**: Consistent `0.5rem` (rounded-lg) for cards/modals; `0.25rem` (rounded-md) for inputs/buttons.
- **Spacing**: 8px base grid. `gap-4` (16px) for standard components; `gap-8` (32px) for section spacing.

## 5. Signature Elements
- **The "Ghost-to-Solid" Interaction**: Buttons start as ghost/outline and transition to a soft solid color on hover.
- **The Hairline Divider**: Instead of card boxes, use horizontal hairline rules to separate content, creating a "document" feel rather than a "widget" feel.
- **Data-First Tables**: No vertical borders. Row hover is a very subtle `base-200` tint.
