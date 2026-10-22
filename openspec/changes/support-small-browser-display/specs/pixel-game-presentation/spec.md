# Spec Delta

## ADDED Requirements

### Requirement: Use a prioritized compact landscape presentation
The PC landscape shell SHALL preserve its generous presentation first, then adapt container dimensions and spacing, then adapt typography and controls, and only then use an alternate compact arrangement for non-critical information.

#### Scenario: Render the generous landscape shell
- **WHEN** the fitted PC landscape shell has enough width for the current HUD composition
- **THEN** the existing ideal-size visual hierarchy, card proportions, typography, titlebar, statusbar, and panel arrangement remain unchanged

#### Scenario: Render a reduced-width landscape shell
- **WHEN** the PC browser width is reduced below the generous layout budget
- **THEN** containers, gaps, and non-critical text reflow before the world view or primary gameplay controls are removed or structurally rearranged

#### Scenario: Reach the compact landscape threshold
- **WHEN** the fitted PC shell cannot keep all secondary information readable after container and typography adaptation
- **THEN** secondary information uses the approved compact arrangement while the world view, titlebar actions, Settings access, and gameplay controls remain reachable

### Requirement: Keep compact landscape HUD content readable and non-overlapping
At the smallest supported PC landscape size, titlebar, statusbar, cards, quest content, saved-game labels, tooltips, and dialog controls SHALL remain readable, reachable, and within the shell without page-level scrolling. The existing internal scrollbar policy for Log, Slots, and Inventory SHALL remain intact.

#### Scenario: Read compact gameplay HUD
- **WHEN** gameplay is shown at the smallest supported PC landscape size
- **THEN** titlebar utilities, statusbar content, card headings, values, and quest text do not collide, clip, or overlap the world view

#### Scenario: Open compact main-menu content
- **WHEN** a player views the main menu, Settings, or Create Character at the smallest supported PC landscape size
- **THEN** saved slots, actions, explanatory text, and close controls remain usable, with overflow handled inside the relevant content region

#### Scenario: Preserve scrolling policy
- **WHEN** compact landscape adaptation is active
- **THEN** only Log, Slots, Inventory, and explicitly bounded dialog bodies scroll, while the page and primary shell do not acquire an independent scrollbar
