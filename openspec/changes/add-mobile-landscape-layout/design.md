# Design

## Context

The app currently selects a landscape surface for all devices, applies a mobile fullscreen and rotation path, and branches game composition on orientation. The durable presentation spec still describes an older portrait mobile layout. Preferences already use shared browser storage; desktop developer settings are in the status bar.

## Goals / Non-Goals

**Goals:** Separate device identity from selected layout so desktop preview does not impersonate a mobile browser. Preserve desktop rendering and input while making the mobile composition and touch path independently adjustable.

**Non-Goals:** Mobile Wait or Sneak controls for this first pass, new right-click gestures, virtual sticks, a redesigned inventory column, additional HUD elements, or a completed mobile control system.

## Decisions

- Keep physical platform and layout as separate state. Mobile always selects mobile; desktop uses a persisted developer override defaulting to desktop. This avoids triggering mobile fullscreen or rotation behavior on a desktop preview. An orientation-only switch cannot express two landscape compositions.
- Remove the obsolete portrait shell, its controls and styles, and aspect-switching paths. Retain rotation of the landscape surface when a mobile device is physically upright.
- Mark the selected layout explicitly on a shared UI ancestor, independently of physical platform. Keep styles genuinely shared by both layouts unscoped, and scope layout-specific structure and styles to desktop or mobile. Classify existing desktop geometry deliberately and preserve its appearance and behavior; reuse shared React components within layout-specific composition.
- Give mobile its own landscape fit range from 16:10 to 20:9. Retain the current desktop range and height-relative primary column width; the game view receives remaining width. Preserve existing surface rotation, fullscreen, and pointer-coordinate transforms.
- Branch the game shell by layout, retaining the title bar and initially showing the primary panel. Add a mobile-only Panels title-bar button that immediately toggles the single column between the existing primary and secondary panels. Render the existing minimap in a square overlay anchored inside the world region, retain the secondary panel's minimap when selected, and remove the mobile block. Keep overlays and controls from inadvertently triggering world taps.
- Identify the platform scope of layout changes explicitly: all platforms, desktop only, or mobile only. This change leaves the desktop user experience intact and scopes its new composition and Panels button to mobile layout.
- Route touch taps through the existing left-click world interaction semantics, including camera-coordinate conversion and existing input suppression. Do not synthesize an additional right-click gesture. Make existing essential actions and dialogs touch-reachable without introducing a new general control scheme.
- Hide the three zoom, camera, and movement dropdowns only in mobile layout. Use mobile defaults regardless of saved values without overwriting the existing desktop preferences or introducing platform-specific preference keys. Layout preview persistence is a separate developer preference; switching layouts changes effective settings as needed but must not rewrite saved preferences or campaign state.
- Keep developer controls desktop-only; expose the return action in Settings only for desktop mobile-preview sessions. On switching back, restore the ordinary desktop developer area.

## Risks / Trade-offs

- [Small phone controls and panel content] → Verify at representative aspect ratios and on the Galaxy A56; refine mobile sizing after playtesting.
- [Touch and rotated surface coordinates] → Exercise actual taps, overlays, and rotation in focused browser verification and real-device playtesting.
- [Stale portrait requirements] → Replace or remove affected delta requirements and reconcile project-specific guidance during implementation when authorized.
- [Fullscreen support varies by browser] → Preserve the existing behavior and report actual device limitations during verification.

## Migration Plan

Retain saved game and preference keys. Default an absent or invalid developer override to desktop. Revert the implementation to roll back; no save migration is expected.
