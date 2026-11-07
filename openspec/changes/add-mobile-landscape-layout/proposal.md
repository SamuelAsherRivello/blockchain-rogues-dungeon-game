# Proposal

## Why

The existing desktop composition leaves too little room for the game on a phone, and the current mobile work-in-progress message prevents play. A distinct mobile layout enables a first playable phone test while preserving the desktop experience.

## What Changes

- Codify desktop and mobile layouts, automatically select mobile on mobile devices, and preserve desktop presentation and input.
- Remove the obsolete portrait layout and aspect-switching paths; the game uses landscape on all devices.
- Replace the mobile block with a playable landscape layout: keep the title bar, remove the status bar, initially show the existing primary inventory column, and overlay a square minimap at the game view's upper right. A mobile title-bar Panels button immediately toggles the single column between the existing desktop primary and secondary panels.
- Fit mobile landscape continuously from 16:10 to 20:9, giving extra width to the game view, while retaining existing mobile fullscreen and rotation behavior.
- Treat a tap on a game square as a desktop left-click. Hide the zoom, camera, and movement dropdowns on mobile and use zoom 1.0, centered camera, and grid-tween movement regardless of saved values. Retain existing shared preference storage for desktop.
- Add a persisted desktop developer layout preview and a desktop-only return action in Settings when previewing mobile.
- Keep essential existing actions and dialogs reachable for mobile playtesting. Wait and Sneak are unavailable on mobile for now. Defer additional HUD, touch schemes, and right-click gestures.
- For incompatible development data, clear every localStorage key on the game origin once when the compatibility epoch changes.
- Identify whether layout changes apply to all platforms, desktop, or mobile; preserve the existing desktop layout in this change.

## Capabilities

### New Capabilities

- `mobile-landscape-layout`: Mobile layout selection, touch play, and desktop preview behavior.

### Modified Capabilities

- `pixel-game-presentation`: Replace portrait-specific mobile presentation and preview requirements with the new landscape layout while preserving desktop presentation.
- `campaign-saves`: Reset all origin localStorage when an incompatible development epoch is activated.
- `mouse-path-navigation`: Reflect the current route preview and require an explicit adjacent click to enter a trap or stairs.

## Impact

Impacts layout selection and fitting, React game composition, minimap placement, touch input, developer settings, preferences, and browser verification. Playwright adds useful evidence for desktop regression and mobile sizing and interaction; proposal does not run it. Real-device playtesting remains necessary.
