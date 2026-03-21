# Changelog

Versión en inglés disponible en [CHANGELOG.md](CHANGELOG.md).

Todos los cambios relevantes de este proyecto serán documentados aquí.

El formato sigue el estilo de *Keep a Changelog* y versionado semántico aproximado.

---

## [1.6.0] - 2026-03-20

### Added

- Respaldo global automático en actualizaciones.
- Posibilidad de respaldo y restauración manual de los registros.

### Improved

- Ocultar "LAMINA" del "HEMOGRAMA MANUAL" en el visualizador longitudinal.

---

## [1.5.0] - 2026-03-15

### Added

- Exportación directa a **JSON** desde la botonera del viewer.
- Importación directa de **JSON** desde la botonera del viewer.
- Validación de respaldo JSON y reconstrucción de paciente en almacenamiento local.
- Vista modal específica para **Anticuerpos Antinucleares (ANA)**.
- Vista modal específica para **Test rápido de Clostridium difficile**.

### Improved

- Mejora del header del viewer y de la distribución de la botonera de acciones.
- Mejora en la visualización de exámenes inmunológicos con nombres extensos mediante etiquetas clínicas abreviadas.
- Mejora en la consistencia de nombres de cultivos dentro del **Resumen infeccioso**.
- Mejora del layout de impresión para preservar mejor el espacio horizontal de las columnas de resultados.
- Mejora del comportamiento de salto de línea en nombres largos dentro de tablas del resumen infeccioso.
- Mejora de la visualización del panel de orina al renombrar **Cuerpos cetónicos** como **Cetonuria**.

### Fixed

- Corrección de impresión en blanco en la vista **Resumen infeccioso**.
- Corrección de visualización agrupada de **PANEL PCR MENINGITIS** como panel molecular tras reextracción con esquema actualizado.
- Corrección de visualización agrupada de estudios **ANA** en una sola fila con detalle en modal.
- Corrección de visualización agrupada del **Test rápido de Clostridium difficile** en una sola fila con detalle en modal cuando corresponde.
- Corrección de la paginación de impresión para evitar que la última página estire artificialmente las columnas cuando contiene pocas columnas de resultados.
- Corrección del ancho de la columna de nombres de exámenes en impresión.
- Corrección de problemas de legibilidad causados por nombres de estudios excesivamente largos en la matriz.

### Data portability

- **JSON** pasa a ser el formato principal de respaldo portátil para traslado y reconstrucción de pacientes.
- **CSV** se mantiene como formato secundario orientado a análisis tabular externo.

---

## [1.4.1] - 2026-03-12

### Improved

- Definición de ruta de trabajo
  - Incorporar Releases desde GitHub para difusión
- Cambio de nombre de Extractor a Navegador
- Actualización de Resumen Ejecutivo

---

## [1.4] - 2026-03-11

### Added

- Nueva **vista "Resumen infeccioso"** para seguimiento clínico de cultivos y paneles moleculares.
- Botón **"Resumen infeccioso"** en el viewer que abre una visualización especializada.
- Tabla cronológica optimizada para infecciones con columnas:
  - Fecha
  - Examen
  - Resultado
  - Detalle
- Renderizado selectivo de paneles moleculares mostrando **solo resultados positivos**.
- Paneles sin detecciones ahora se muestran como **NEGATIVO** para mejorar legibilidad clínica.
- Coloreado clínico de resultados:
  - `Detectado` → rojo oscuro
  - `NEGATIVO` → gris tenue
- Mejora de layout para impresión del resumen infeccioso.

### Improved

- Optimización del ancho de columnas en la vista infecciosa para priorizar el campo **Resultado**.
- Reutilización de ventana del resumen infeccioso (evita abrir múltiples ventanas).
- Mejor manejo de modales reutilizando el diálogo principal sin pérdida de toolbar.
- Separación clara entre:
  - **Vista longitudinal completa**
  - **Vista infecciosa resumida**

### Data portability

- **Exportación completa de paciente a JSON** (backup portable).
- **Importación de paciente desde JSON**.
- Formato de respaldo versionado:

```json
{
  "format": "uci-lab-navegador",
  "version": 1
}
```
---

## [1.3.0] - 2026-03-09

### Added

- Visualización modal de cultivos.
- Identificación visual de gases arteriales y venosos.
- Mejoras de impresión multipágina.

### Changed

- Reestructuración de directorios del proyecto.
- Ajustes de cabecera de impresión.
- Mejoras de scroll y visualización de la columna "Examen".

### Fixed

- Ajustes de visualización en viewer longitudinal.

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