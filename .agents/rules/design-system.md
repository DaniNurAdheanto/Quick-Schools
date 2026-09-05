# DESIGN SYSTEM RULES

You are responsible for maintaining strict design system consistency across the entire project.

Before creating, modifying, or refactoring any UI, always review and follow the existing design system. Do not introduce arbitrary values, styles, colors, spacing, border radius, or typography.

## DESIGN SYSTEM RULES

### 1. Color Consistency
Only use colors defined in the project's design tokens.
Do not introduce random HEX, RGB, HSL, or Tailwind color values directly inside components unless absolutely necessary.

Use semantic color tokens such as:
- background
- foreground
- primary
- secondary
- muted
- accent
- border
- destructive
- success
- warning

---

### 2. Spacing System
Use a consistent spacing scale based on the existing design system.
Preferred spacing scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px, 128px.
Maintain consistent spacing relationships (Icon to label: 8px, Component padding: 12px–24px, Card padding: 20px–32px).

---

### 3. Border Radius
Radius tokens:
- radius-sm: 6px
- radius-md: 8px
- radius-lg: 12px
- radius-xl: 16px
- radius-2xl: 24px

Button Border Radius Rules:
- Button SM → 6px
- Button MD → 8px
- Button LG → 10px
- Icon Button → 8px
- Pill Button → 9999px (full)

Usage rules:
- Small UI elements: 6px–8px
- Inputs and buttons: 8px–12px
- Cards and panels: 12px–16px
- Large containers or feature sections: 16px–24px

---

### 4. Typography
Use the existing typography hierarchy (Display, H1, H2, H3, H4, Body Large, Body, Body Small, Label, Caption).

---

### 5. Component Consistency
Reuse existing UI components (Buttons, Inputs, Cards, Modals, Dropdowns, Tabs, Badges, Tooltips, Tables) before creating new ones.

---

### 6. Interactive States
Every interactive component must consistently support Default, Hover, Active, Focus, Disabled, Loading, Error, Success.

---

### 7. Shadows and Borders
Prefer subtle borders and surface contrast over heavy shadows.

---

### 8. Layout Consistency
Maintain consistent container widths, page padding, grid gaps, and section spacing.

---

### 9. Responsive Consistency
Maintain design system visual language across Mobile, Tablet, and Desktop.

---

### 10. Before Adding New UI
Check design tokens, components, spacing, radius, typography, colors, responsive behavior, and states first.

---

## STRICT RULE
Do not use arbitrary design values. Preserve established design language.
