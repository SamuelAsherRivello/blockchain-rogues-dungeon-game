# playwright-browser-verification Specification

## Purpose
Provide useful, phase-aware browser verification without slowing OpenSpec work
that does not need a browser session.

## Requirements

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

### Requirement: Phase-aware browser verification selection
OpenSpec guidance SHALL treat browser verification as optional for each change and SHALL select it only when it supports the active phase's purpose. Explore and proposal guidance SHALL assess and record the need for browser coverage without launching a browser session.

#### Scenario: Exploration or proposal assesses a change
- **WHEN** an OpenSpec explore or proposal workflow considers a change
- **THEN** it identifies whether browser-visible behavior needs coverage without installing browsers, starting a server, or running browser tests

#### Scenario: Change has no browser-visible behavior
- **WHEN** a change affects only pure game logic, documentation, or configuration with no browser interaction contract
- **THEN** its plan records browser verification as not applicable and does not make it a delivery gate

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

### Requirement: Thorough finalization verification
Finalization guidance SHALL run all browser checks relevant to the completed change and MAY add relevant viewport, input, persistence, fullscreen, or interaction coverage. It SHALL report unavailable browser capabilities or failed checks rather than treating broad browser coverage as complete without evidence.

#### Scenario: Finalizing a change with browser coverage
- **WHEN** the completed change selected browser verification
- **THEN** finalization runs the applicable browser suite and records the executed coverage and outcome

#### Scenario: Finalization cannot exercise a required browser capability
- **WHEN** an applicable browser check cannot run in the available environment
- **THEN** finalization reports the limitation and does not claim that check passed

### Requirement: Verify visual topology before completion
Finalization SHALL cover the canonical topology matrix and representative seeded worlds with Playwright screenshots inspected against verified atlas or Tiled references. Metadata alone, zero-occurrence assertions, skipped WebGPU checks, and unreviewed generated baselines SHALL NOT establish visual correctness.

#### Scenario: Review the final fixture matrix
- **WHEN** final browser verification completes
- **THEN** evidence covers rooms, convex/concave corners, corridor widths, bends, junctions, sockets, layered joins, start-room and void boundaries
- **AND** the report identifies tested seeds, routes, browser contexts, zooms, screenshots, and any unresolved defects or unavailable capability
