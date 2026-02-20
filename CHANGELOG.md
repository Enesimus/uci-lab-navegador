# Changelog

All notable changes to this project will be documented in this file.

The format follows a simplified Keep a Changelog structure.
Versions use semantic versioning principles where possible.

---

## [1.2.0] - 2026-02-18

### Added

- Hash-based identification of lab orders (SHA-256 with FNV-1a fallback).
- Canonical exam alias mapping (e.g., Lactato variants unified).
- CSV export including HASH traceability row.
- Vertical zebra grouping by day in viewer.
- Visual day divider lines in longitudinal matrix.
- Highlight of latest column in viewer.
- Numeric alignment for lab values.
- Compact clinical header layout (DD-MMM-YYYY format).

### Changed

- Storage model refactored to use `<hash>` as key instead of `orden__timestamp`.
- Popup UX improved (non-blocking toast feedback).
- Matrix construction adapted to hash-based architecture.
- Improved exam normalization logic.

### Fixed

- Duplicate order handling (idempotent replacement by hash).
- Handling of environments without `crypto.subtle`.
- Alias mismatch causing duplicate rows (e.g., Lactato vs Ácido Láctico).

---

## [1.1.0] - 2026-02-12

### Added

- Initial longitudinal HTML viewer.
- CSV export functionality.
- Persistent storage via `chrome.storage.local`.
- Basic matrix construction from extracted orders.

---

## [1.0.0] - 2026-02-09

### Added

- Initial Chrome extension structure.
- Extraction of lab results from modal.
- Basic patient storage model.
- Order grouping and local persistence.
