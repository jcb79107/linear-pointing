# Pointed design system

Status: alpha

This system adapts the public analysis in
[VoltAgent's Linear DESIGN.md](https://github.com/voltagent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md)
for an open-source pointing-poker product. It borrows layout and interface
principles, not Linear's proprietary typefaces, logo, screenshots, or brand
assets.

## Product character

Pointed should feel focused, technical, and quiet. The interface keeps
the Linear issue and the team's decision at the center. Decoration is avoided
when hierarchy, spacing, or a one-pixel rule can do the job.

## Brand

- Name: **Pointed**
- Descriptor: **Pointing poker for Linear**
- Positioning: the pointing room that starts and ends in Linear
- Mark: three independent votes resolving around one decided point
- Personality: quietly sharp, direct, and useful

Use “pointing poker” in customer-facing copy. “Planning poker” may appear in
search metadata and explanatory documentation where it helps people recognize
the category.

The dark marketing surface is the closest expression of the source system. The
authenticated product supports both light and dark appearance preferences with
the same component hierarchy.

## Principles

1. Use one chromatic accent: lavender `#5e6ad2`.
2. Build depth with stepped surfaces and hairline borders, not drop shadows.
3. Reserve the accent for primary actions, selected controls, focus, links, and
   the product mark.
4. Keep buttons compact and rectangular with 8px corners; pills are only for
   statuses and compact filters.
5. Use 600 weight and negative tracking for display type, 400 for body type,
   and 500 for controls.
6. Make the ticket, agenda, and participant state the visual protagonists.
7. Preserve semantic red, amber, and green only where product state requires
   error, warning, or success feedback.

## Color tokens

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| Canvas | `#010102` | `#f7f7f8` | Page background |
| Surface 1 | `#0f1011` | `#ffffff` | Primary panels |
| Surface 2 | `#141516` | `#f1f1f3` | Selected or nested panels |
| Surface 3 | `#18191a` | `#eaeaed` | Menus and stronger lift |
| Surface 4 | `#191a1b` | `#e4e4e8` | Highest non-modal lift |
| Hairline | `#23252a` | `#e2e2e5` | Dividers and borders |
| Hairline strong | `#34343a` | `#c9c9cf` | Hover and focus boundaries |
| Ink | `#f7f8f8` | `#1f2023` | Primary text |
| Ink muted | `#d0d6e0` | `#60636b` | Secondary text |
| Ink subtle | `#8a8f98` | `#60636b` | Metadata and disabled text |
| Accent | `#5e6ad2` | `#5e6ad2` | Primary action and focus |
| Accent hover | `#828fff` | `#4854b8` | Interactive hover |
| Success | `#27a644` | `#248f4d` | Confirmed state only |

## Typography

Use the system fallback stack because Linear's custom families are proprietary:

```css
font-family: "SF Pro Text", "SF Pro Display", Inter, ui-sans-serif,
  -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

- Marketing display: 52–80px, 600, line-height 1.02, tracking `-0.045em`.
- Product page title: 34–48px, 600, line-height 1.1, tracking `-0.035em`.
- Card title: 20–22px, 500–600.
- Body: 14–16px, 400, line-height 1.5.
- Button: 14px, 500.
- Eyebrow and metadata: 12–13px, 500, slight positive tracking.
- Mono is reserved for issue IDs, timers, and shortcuts.

## Shape and spacing

- Base spacing unit: 4px.
- Control radius: 8px.
- Card radius: 12px.
- Product frame radius: 16px.
- Panel padding: 24px by default.
- Section spacing: 64–96px on marketing pages, 32–56px in product screens.
- Buttons are at least 40px high on desktop and 44px on touch layouts.
- Inputs are at least 44px high on touch layouts.

## Component rules

### Buttons

- Primary: lavender background, white text, 8px corners.
- Secondary: surface background, hairline border, primary ink.
- Inverse: ink background on light canvas; lifted charcoal on dark canvas.
- Never add a shadow or vertical hover translation.

### Cards and panels

- Default to Surface 1 with a one-pixel Hairline border.
- Selected or nested content moves one surface level up.
- Use a stronger hairline for hover rather than a shadow.
- Product mockups may use a 16px frame; working cards stay at 12px.

### Inputs

- Surface 1 background, Hairline border, 8px corners.
- Focus uses the accent border plus a two-pixel translucent ring.
- Errors may use semantic red but must retain readable text contrast.

### Statuses

- Pills are acceptable for statuses, filters, and estimates.
- Status color should never compete with the primary action.
- Labels and priorities from Linear may retain their semantic product colors.

## Responsive behavior

- Marketing: two columns on desktop, one below 1024px.
- Product cards: two columns where space allows, one below tablet width.
- Live room: preserve the issue as the primary pane; agenda and room collapse
  through the existing mobile controls. At 700px and below, the document owns
  scrolling: ticket, votes, and facilitator controls stay in normal flow rather
  than competing for a fixed viewport. Short landscape windows also allow page
  scrolling. Changing tickets returns the reader to the new ticket's title.
- Mobile display type scales toward 38px.
- All frequent touch actions remain at least 44px high.

## Accessibility

- Focus is always visible with the lavender focus ring.
- Surface changes must preserve WCAG AA contrast for body text.
- Do not use color as the only state indicator.
- Respect reduced-motion preferences.
- Keyboard shortcuts must never fire while a user is typing in an input,
  textarea, select, or editable region.

## Cycle workflow (September 2026)

Keep preparation focused on a relative cycle and one agenda preview. Reuse the
native controls in TeamDefaultFields across settings and preparation. Team defaults
are explicitly saved; appearance is immediately saved on-device. Use the existing
surface-1/surface-2, ink/muted, line, and blue tokens; do not add a second visual system.

On narrow screens, agenda navigation stays above the issue and individual revealed
votes appear in the vote dock. Browsing another ticket must visibly offer Return to
current ticket and disable voting until the active issue is back in view. Explicit
Move up/down controls supplement drag-and-drop at every width.

UX-CONTRACT.md defines the interaction owners and verification paths.
