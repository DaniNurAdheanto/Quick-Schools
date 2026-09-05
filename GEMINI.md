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

Example:
Correct:
- bg-background
- text-foreground
- bg-primary
- border-border
- text-muted-foreground

Avoid:
- bg-[#123456]
- text-[#888888]
- border-[#EEEEEE]

If a new color is required, add it to the centralized design token system first and reuse that token consistently.

---

### 2. Spacing System

Use a consistent spacing scale based on the existing design system.

Preferred spacing scale:
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
80px
96px
128px

Do not use arbitrary spacing values such as:
13px
17px
23px
29px
unless there is a strong and documented reason.

Maintain consistent spacing relationships:
- Icon to label: 8px
- Label to input: 8px
- Related elements: 12px–16px
- Component internal padding: 12px–24px
- Card padding: 20px–32px
- Section spacing: 64px–128px

Always use the same spacing pattern for similar UI structures.

---

### 3. Border Radius

Use only the approved radius scale.

Radius tokens:
- radius-sm: 6px
- radius-md: 8px
- radius-lg: 12px
- radius-xl: 16px
- radius-2xl: 24px

Usage rules:
- Small UI elements: 6px–8px
- Inputs and buttons: 8px–12px
- Cards and panels: 12px–16px
- Large containers or feature sections: 16px–24px

Button Border Radius Rules:
- Button SM → 6px
- Button MD → 8px
- Button LG → 10px
- Icon Button → 8px
- Pill Button → 9999px (full)

Do not randomly use different border radius values.
Similar components must always use the same radius.

For example:
All primary buttons should use the same border radius based on their size token.
All input fields should use the same border radius.
All cards should follow the same radius rules.

---

### 4. Typography

Use the existing typography hierarchy.

Maintain consistent styles for:
- Display
- H1
- H2
- H3
- H4
- Body Large
- Body
- Body Small
- Label
- Caption

Do not create arbitrary font sizes or font weights.
Reuse existing typography tokens or classes.
Maintain clear visual hierarchy.

For example:
Display: Large, bold, tight line-height
Heading: Strong hierarchy and consistent spacing
Body: Readable line-height and appropriate contrast
Label: Smaller size with medium or semibold weight

---

### 5. Component Consistency

Before creating a new component, check whether an existing component can be reused.

Do not duplicate:
- Buttons
- Inputs
- Cards
- Modals
- Dropdowns
- Tabs
- Badges
- Tooltips
- Tables

All components should follow the same:
- Spacing
- Radius
- Typography
- Colors
- Border styles
- Hover states
- Focus states
- Disabled states
- Loading states

---

### 6. Interactive States

Every interactive component should consistently support:
- Default
- Hover
- Active
- Focus
- Disabled
- Loading
- Error
- Success

Do not create inconsistent interaction styles between similar components.
Focus states must remain accessible and visible.

---

### 7. Shadows and Borders

Prefer subtle borders and surface contrast over heavy shadows.
Use shadows only when necessary for elevation.
Maintain a limited shadow scale.
Do not introduce random box-shadow values.

---

### 8. Layout Consistency

Use a consistent layout system.

Maintain:
- Consistent container widths
- Consistent page padding
- Consistent grid gaps
- Consistent section spacing

Do not create random widths or margins.
Use reusable layout components and utility classes whenever possible.

---

### 9. Responsive Consistency

Maintain the same design system across:
- Mobile
- Tablet
- Desktop

Do not redesign components unnecessarily for different screen sizes.
Instead, adapt:
- Layout
- Spacing
- Typography
- Grid structure
while maintaining the same visual language.

---

### 10. Before Adding New UI

Before implementing a new section or component:
1. Check existing design tokens.
2. Check existing components.
3. Reuse existing spacing values.
4. Reuse existing radius values.
5. Reuse existing typography styles.
6. Reuse semantic colors.
7. Check responsive behavior.
8. Check component states.

Never introduce visual inconsistency for the sake of creating something new.

---

## STRICT RULE

Do not use arbitrary design values.
If you need a new value that does not exist in the design system, first determine whether an existing token can be reused.
Only create a new token if it is genuinely necessary.

All new UI must visually feel like it belongs to the same product.
When modifying existing UI, preserve the established design language unless explicitly instructed to redesign it.

Prioritize:
Design System Consistency
→ Visual Hierarchy
→ Usability
→ Accessibility
→ Responsive Design
→ Visual Polish

The final result should feel like it was designed and built by one consistent design system, not assembled from unrelated components.
