# UCI Lab Extractor – Documentación del Proyecto

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
    "orden__timestamp": {
      "ordenOriginal": "...",
      "timestamp": "...",
      "fechaExtraccion": "...",
      "firma": "...",
      "registros": [
        {
          "examen": "...",
          "valor": "...",
          "unidad": "...",
          "referencia": "...",
          "fechaValidacion": "..."
        }
      ]
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

Versión: 1.x
Estado: MVP funcional con almacenamiento persistente y exportación básica.
En transición hacia mejora integral de experiencia de usuario.
