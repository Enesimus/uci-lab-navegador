# Changelog

Spanish version available in [CHANGELOG.es.md](CHANGELOG.es.md).

All notable changes to this project will be documented here.

This format follows the *Keep a Changelog* style with approximate semantic versioning.

---

## [1.6.1] - 2026-03-22

### Added
- Integrated clinical calculations for arterial blood gases:
  - PaO2/FiO2 ratio (PAFI)
  - Oxygenation Index (IOX)
- Interface for manual input of FiO2 and mean airway pressure (PMVA) per sample
- Persistence of gasometric calculations by timestamp
- Button to delete individual gasometric calculations
- Visual highlighting of PAFI and IOX in the clinical matrix

### Changed
- Visualization simplification:
  - Intermediate rows (FiO2 and PMVA) are hidden
  - Only clinically relevant results are displayed (PAFI, IOX)
- Improved cell rendering consistency (removal of `undefined` values)
- Refactor of `matrix.js` to separate calculation logic from persistence

### Fixed
- Viewer initialization error due to undefined functions
- Rendering issues when applying formatting to calculation cells
- Duplication of gasometric calculation functions in `storage.js`
- Inconsistencies when updating existing calculations

### Technical
- Introduction of a persistent clinical calculation model in `storage.js`
- Structure prepared for future clinical rules (semantic highlighting)

---

## [1.6.0] - 2026-03-20

### Added

- Automatic global backup at actualization.
- Allow manual global backup and restore.

### Improved

- Hide "LAMINA" from "HEMOGRAMA MANUAL" at longitudinal viewer.

---

## [1.5.0] - 2026-03-15

### Added

- Direct **JSON export** from the viewer toolbar.
- Direct **JSON import** from the viewer toolbar.
- JSON backup validation and patient reconstruction into local storage.
- Dedicated modal view for **Antinuclear Antibodies (ANA)**.
- Dedicated modal view for **Rapid Clostridium difficile Test**.

### Improved

- Viewer header and action toolbar layout.
- Display of long immunology exam names using shorter clinical labels.
- Infectious summary naming consistency for culture studies.
- Print layout to better preserve horizontal space for result columns.
- Wrapping behavior for long labels in infectious summary tables.
- Urine panel display by renaming urinary ketones as **Cetonuria**.

### Fixed

- Blank print output in **Infectious Summary** view.
- Correct grouped rendering of **PCR Meningitis Panel** as a molecular panel after re-extraction with the updated schema.
- Correct grouped rendering of **ANA** studies into a single row with modal detail.
- Correct grouped rendering of **Rapid Clostridium difficile Test** into a single row with modal detail when any component is positive.
- Print pagination so the last page no longer stretches columns when it contains only a few result columns.
- Exam-name column width behavior during print output.
- Inconsistent rendering of long study names that affected matrix readability.

### Data portability

- **JSON** is now the main portable backup format for patient transfer and reconstruction.
- **CSV** is kept as a secondary export option for tabular external analysis.

---

## [1.4.1] - 2026-03-12

### Improved

- Defined project workflow path
  - Added the use of GitHub Releases for distribution
- Renamed the project from **Extractor** to **Navegador**
- Updated the Executive Summary

---

## [1.4] - 2026-03-11

### Added

- New **"Infectious Summary"** view for clinical follow-up of cultures and molecular panels.
- **"Infectious Summary"** button in the viewer that opens a specialized visualization.
- Infection-oriented chronological table with columns for:
  - Date
  - Exam
  - Result
  - Detail
- Selective rendering of molecular panels showing **only positive results**.
- Panels without detections are now displayed as **NEGATIVE** to improve clinical readability.
- Clinical result color coding:
  - `Detected` → dark red
  - `NEGATIVE` → light gray
- Improved print layout for the infectious summary.

### Improved

- Column width optimization in the infectious view to prioritize the **Result** field.
- Reuse of the infectious summary window to avoid opening multiple windows.
- Improved modal handling by reusing the main dialog without losing the toolbar.
- Clear separation between:
  - **Full longitudinal view**
  - **Condensed infectious view**

### Data portability

- Full **patient export to JSON** (portable backup).
- **Patient import from JSON**.
- Versioned backup format:

```json
{
  "format": "uci-lab-extractor",
  "version": 1
}
```
---

## [1.3.0] - 2026-03-09

### Added

- Modal visualization for cultures.
- Visual identification of arterial and venous blood gases.
- Multipage print improvements.

### Changed

- Project directory restructuring.
- Print header adjustments.
- Scrolling and Exam column display improvements.

### Fixed

- Display adjustments in the longitudinal viewer.

---

## [1.2] - 2026-03

### Added

- Longitudinal clinical viewer (viewer.html).
- Exam matrix with columns by order and date.
- Integrated display of arterial and venous blood gases in a single row (A/V).
- Modal panels for special exams:
  - Complete urinalysis
  - Cultures with antibiogram
  - Molecular studies
- Clinical header with patient data, number of orders, and time range.
- Filter system:
  - exam search
  - hide empty rows
  - show/hide extra exams.

### Improved

- Optimized clinical matrix rendering.
- Grouping of arterial and venous blood gases for faster reading.
- Vertical zebra striping by day to support longitudinal analysis.
- Dynamic column highlighting on hover.
- Robust handling of empty values and partial data.

### Printing

- Paginated print system.
- Automatic column splitting across multiple pages.
- Clinical header on each page including:
  - patient
  - national ID (RUT)
  - date range
  - page number.
- Compatibility with monochrome hospital printers.

### Internal

- Clear separation between:
  - extraction logic (content.js)
  - storage (storage.js)
  - matrix construction (matrix.js)
  - clinical interface (viewer.js)
- Improved state handling in the viewer.

---

## [1.1]

### Added

- CSV data export for external analysis.

---

## [1.0]

### Initial release

- Exam extraction from the LIS system.
- Local per-patient storage.
- Basic export.