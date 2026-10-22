# Spec Delta

## MODIFIED Requirements

### Requirement: Local browser-verification capability
The project SHALL provide a documented, repository-root browser-verification command backed by a project development dependency and a locally configured Chromium target. Generated reports, traces, screenshots, and local browser data SHALL remain untracked.

#### Scenario: Developer prepares browser verification
- **WHEN** a developer follows the documented local setup for browser verification
- **THEN** they can install the supported Chromium target and run the documented command without adding a production dependency

#### Scenario: Browser run creates diagnostics
- **WHEN** a browser-verification run produces reports or failure artifacts
- **THEN** those generated files do not appear as files to commit

#### Scenario: Open a deterministic Wang rendering session
- **WHEN** the focused browser command opens a dungeon fixture or seeded generated floor
- **THEN** the URL includes `?mute=1`, a deterministic seed or fixture selector, and the documented route
- **AND** the test can identify the rendered game viewport and the absence of initialization or console errors

### Requirement: Time-bounded apply verification
When a change includes browser-visible behavior, its apply tasks SHALL define one focused smoke check after the related implementation group. The Wang check SHALL verify a deterministic production scene with zero unresolved cells and exact rendered roles. Unsupported input SHALL have a separate negative test. Failed checks SHALL be repaired and rerun.

#### Scenario: Apply implements a selected browser flow
- **WHEN** the related implementation group and focused browser test are complete
- **THEN** the apply workflow runs that focused check once and records its result before proceeding

#### Scenario: Automated game session starts
- **WHEN** a browser test opens Rogue's Dungeon
- **THEN** its application URL includes `?mute=1`

#### Scenario: Chromium verifies Wang output
- **WHEN** the focused check renders the selected deterministic fixture
- **THEN** it confirms initialization, healthy consoles, zero unresolved production cells, and positive coordinate-specific evidence of expected rendered tiles
- **AND** screenshots of the actual canvas show correct shapes without temporary text or guidelines

## ADDED Requirements

### Requirement: Verify visual topology before completion
Finalization SHALL cover the canonical topology matrix and representative seeded worlds with Playwright screenshots inspected against verified atlas or Tiled references. Metadata alone, zero-occurrence assertions, skipped WebGPU checks, and unreviewed generated baselines SHALL NOT establish visual correctness.

#### Scenario: Review the final fixture matrix
- **WHEN** final browser verification completes
- **THEN** evidence covers rooms, convex/concave corners, corridor widths, bends, junctions, sockets, layered joins, start-room and void boundaries
- **AND** the report identifies tested seeds, routes, browser contexts, zooms, screenshots, and any unresolved defects or unavailable capability
