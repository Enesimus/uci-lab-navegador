# UCI Lab Extractor – Documentación del Proyecto

![GPL v3 License badge showing blue background with white text](https://img.shields.io/badge/License-GPLv3-blue.svg)

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).

Author: Juan Sepúlveda Sepúlveda
Year: 2026  

This software was developed as an independent clinical-academic initiative for longitudinal visualization of pediatric ICU laboratory data.

Commercial integration into proprietary laboratory information systems (LIS) or redistribution as part of closed-source software requires explicit authorization from the author.

---

Este proyecto está licenciado bajo la GNU General Public License v3.0 (GPL-3.0)

Autor: Juan Sepúlveda Sepúlveda
Año: 2026

Este software fue desarrollado como una iniciativa clínica-académica para la visualización longitudinal de los datos de laboratorio de una UCI Pediátrica.

La integración comercial en Sistemas de Información de Laboratorio (LIS) o su redistribución como parte de software de fuente cerrada requiere la autorización explícita del autor.

---

## 1. Descripción General

UCI Lab Extractor es una extensión de Chrome diseñada para:

- Extraer exámenes de laboratorio desde el sistema clínico institucional.
- Estructurarlos longitudinalmente por paciente.
- Visualizarlos en formato matricial clínico.
- Permitir exportación e impresión.
- Evolucionar hacia análisis automático de cambios clínicamente relevantes.
- Generar reportes que faciliten la comprension de la evolucion clínica (gráficas, tablas) para la confección de resúmenes (de evolución, traslado o para reuniones clínicas).

El objetivo es transformar información fragmentada en una vista clínica longitudinal clara, rápida y usable.

## 2. Contexto Clínico

- Entorno: Unidad de Cuidados Intensivos Pediátricos como punto de partida. Pudiera extenderse a cualquier unidad de paciente hospitalizado, o en atencion ambulatoria cuando se requiera un seguimiento longitudinal de examenes.
- Necesidad: Visualización rápida de tendencias y evolución de parámetros.
- Problema actual: Sistemas institucionales presentan resultados en forma episódica, no longitudinal.

La herramienta busca reducir:

- Carga cognitiva.
- Tiempo de navegación.
- Riesgo de omitir cambios relevantes.

## 3. Arquitectura Técnica Actual

### 3.1 Tipo de aplicación

Extensión Chrome (Manifest V3).

### 3.2 Almacenamiento

```chrome.storage.local```

Persistencia por paciente (UCI_\<rut>)

### 3.3 Modelo de datos

``` JSON

{
  "paciente": { "rut": "...", "nombre": "..." },
  "ordenes": {
    "<hash>": {
      "ordenOriginal": "...",
      "timestamp": "...",
      "fechaExtraccion": "...",
      "registros": [...]
    }
  }
}

```

## 4. Fases del Proyecto

### Fase 1 – Viewer y UX

- Vista HTML longitudinal
- Sidebar
- Impresión
- Mejora visual del encabezado

### Fase 2 – Estudios especiales (Cultivos)

- Modelo distinto al matricial
- Visualización específica
- Estructura jerárquica

### Fase 3 – Inteligencia clínica

- Detección de cambios significativos
- Resaltado automático
- Indicadores visuales
- Reglas configurables
- Creación de gráficas

## 5. Roadmap General

- Consolidación UX
- Modularización de visualización
- Soporte estudios complejos
- Capa de análisis clínico
- Posible escalabilidad multiusuario

## 6. Principios de Diseño

- Prioridad clínica sobre técnica.
- Minimizar ruido visual.
- Reducir fricción cognitiva.
- Transparencia del procesamiento.
- No alterar datos originales del HIS.
- Procesamiento completamente local.

## 7. Seguridad y Privacidad

- No envía datos a servidores externos.
- Procesamiento 100% local.
- No almacena información fuera del navegador del usuario.
- No modifica registros institucionales.

## 8. Reconocimiento de Desarrollo Asistido

Este proyecto fue desarrollado con asistencia técnica de ChatGPT (OpenAI), utilizado como herramienta de apoyo en:

- Arquitectura técnica
- Depuración
- Diseño de experiencia de usuario
- Modelado de datos
- Planificación de roadmap

La dirección clínica, conceptual y las decisiones funcionales corresponden al autor del proyecto.

## 9. Estado Actual

Versión: 1.2
Estado: Versión estable con arquitectura hash-based, trazabilidad y viewer clínico funcional.

## 10. Flujo de Procesamiento de Datos

### Paso 1 – Extracción

- ```content.js``` extrae:
  - Paciente
  - Orden
  - Registros crudos

### Paso 2 – Normalización

- Alias mapping de exámenes
- Normalización de fecha
- Normalización numérica
- Unificación semántica (ej. Lactato)

### Paso 3 – Canonicalización

Se construye una representación determinística de la orden.

### Paso 4 – Hash

Se calcula:

- SHA-256 (principal)
- FNV-1a (fallback)

El hash se convierte en clave única.

### Paso 5 – Persistencia

Se guarda en:

``` YAML

chrome.storage.local
Clave: UCI_<rut>
Subclave: <hash>

```

### Paso 6 – Construcción de matriz

- Se ordenan columnas cronológicamente
- Se construyen filas según MAP_EXAMENES
- Se agregan extras dinámicos

### Paso 7 – Visualización

- Agrupación por día
- Highlight última columna
- Alineación numérica
- Separadores visuales

### Paso 8 – Exportación

- Construcción matriz bidimensional
- Inserción de metadata
- Inserción de fila HASH
- Generación CSV

<!-- >💡 **Nota**: los permisos de acceso en el ```manifest.json``` para intranet como en acceso externo son:
>
> ``` JSON
>"host_permissions": [
>  "http://200.72.31.213/*",
>  "http://10.6.127.136/*"
>],
>"content_scripts": [
>  {
>    "matches": [
>      "http://200.72.31.213/GestionIntegrada/*",
>      "https://10.6.127.136/GestionIntegrada/*"
>    ],
>    "js": ["content.js"]
>  }
>]
>``` -->

## Disclaimer

This tool does not modify or interfere with any laboratory information system. It operates exclusively at the user interface level and stores data locally.

The author assumes no responsibility for clinical decisions derived from its use.

---

Esta herramienta no modifica ni interfiere con ningún sistema de información de laboratorio. Opera exclusivamente en el nivel de interfase de usuario y almacena datos localmente.

El autor no se responsabiliza por decisiones clínicas derivadas de su uso.

---
