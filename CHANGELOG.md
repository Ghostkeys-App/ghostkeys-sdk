# GhostKeys SDK - Changelog (Aug-Sep 2025, v1.1.8)

## Overview

- The SDK project was created as part of the Ghostkeys Lean Serial Protocol to ease integrations with both internal and third-party frontends. 
- Focus areas: Initial prototyping, test-driven development, ease of use.

## Initial Prototyping
- Developed the initial Serial API and reviewed/refined its capabilites.
- Project created to implement the Ghostkeys Lean Serial Protocol.
- Implemented first proof‑of‑concept serialiser for spreadsheet data.
- Established testing approach and started TDD for serialiser implementations.
- Added eslint/prettier devDependencies and basic dev tooling in package.json.

## Test-driven Development
- Added comprehensive unit tests (Vitest) for core serialisers:
  - serializeSpreadsheet
  - serializeLoginsMetadata
  - serializeSecureNotes
  - serializeGlobalSync

## Ease of use
- Feedback from UI development informed certain data structures to allow a smoother integration with existing Ghostkeys UI framework.
- Integration testing revealed issues that unit tests had not accounted for; issues were fixed and unit tests were upgraded.
- Code uses ES module style exports to improve compatibility for npm consumers and modern TypeScript toolchains.
- TypeScript build setup targets ES modules (recommendation: module: "esnext") to work with verbatimModuleSyntax and Vitest.
- Added package.json scripts for build and test:
  - build: tsc
  - test: npx vitest
  - prepare: npm run build
- Published to `npm`.

## Notes

- This changelog focuses on repository-level changes since creation. Refer to commit history for lower-level details.
- Versioning is maintained in package.json; publish steps are not automated in this changelog.