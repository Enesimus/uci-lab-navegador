# Changelog

Todos los cambios relevantes de este proyecto serán documentados aquí.

El formato sigue el estilo de *Keep a Changelog* y versionado semántico aproximado.

---

## [1.2] - 2026-03

### Added

- Visualizador clínico longitudinal (`viewer.html`).
- Matriz de exámenes con columnas por orden y fecha.
- Visualización integrada de gases arteriales y venosos en una sola fila (A/V).
- Paneles modales para exámenes especiales:
  - Orina completa
  - Cultivos con antibiograma
  - Estudios moleculares
- Encabezado clínico con datos del paciente, número de órdenes y rango temporal.
- Sistema de filtros:
  - búsqueda por examen
  - ocultar filas vacías
  - mostrar/ocultar exámenes extra.

### Improved

- Renderizado optimizado de la matriz clínica.
- Agrupación de gases arteriales y venosos para lectura rápida.
- Zebra vertical por día para facilitar análisis longitudinal.
- Resaltado dinámico de columna al pasar el cursor.
- Manejo robusto de valores vacíos y datos parciales.

### Printing

- Sistema de impresión paginada.
- División automática de columnas para múltiples páginas.
- Encabezado clínico en cada página con:
  - paciente
  - RUT
  - rango de fechas
  - número de página.
- Compatibilidad con impresoras monocromáticas hospitalarias.

### Internal

- Separación clara entre:
  - lógica de extracción (`content.js`)
  - almacenamiento (`storage.js`)
  - construcción de matriz (`matrix.js`)
  - interfaz clínica (`viewer.js`)
- Mejor manejo de estado en el viewer.

---

## [1.1]

### Added

- Exportación de datos a CSV para análisis externo.

---

## [1.0]

### Initial release

- Extracción de exámenes desde sistema LIS.
- Almacenamiento local por paciente.
- Exportación básica.