# Resumen Ejecutivo

## UCI Lab Extractor

Visualización longitudinal de exámenes de laboratorio para apoyo clínico en UCI Pediátrica

Autor:
Dr. Juan Sepúlveda Sepúlveda

Herramienta desarrollada a partir de una necesidad clínica real para facilitar la revisión longitudinal de exámenes de laboratorio en pacientes hospitalizados.

Desarrollo clínico asistido por herramientas de programación basadas en IA (ChatGPT).

El código se encuentra publicado bajo licencia de software libre GNU General Public License v3 (GPL-3.0), permitiendo su revisión, auditoría y eventual mejora en contextos académicos o institucionales.

**Repositorio público del proyecto:**
[https://github.com/Enesimus/uci-lab-navegador](https://github.com/Enesimus/uci-lab-navegador)

### 1. Problema clínico

En los sistemas actuales de laboratorio, los resultados se presentan en forma episódica y dispersa, obligando a los clínicos a reconstruir manualmente la evolución de un paciente a partir de múltiples informes.

Este proceso consume tiempo, aumenta la carga cognitiva y puede favorecer errores de transcripción.

Para comprender la evolución de un paciente hospitalizado, los equipos clínicos deben:

- abrir múltiples informes
- revisar manualmente resultados dispersos
- reconstruir mentalmente tendencias

Esto genera:

- mayor carga cognitiva
- tiempo de revisión prolongado
- riesgo de pasar por alto cambios clínicamente relevantes

La necesidad de una visualización longitudinal clara es particularmente crítica en unidades de paciente crítico.

### 2. Solución propuesta

UCI Lab Extractor es una herramienta de apoyo clínico que permite:

- extraer resultados de laboratorio desde la interfaz del LIS
- organizarlos longitudinalmente por paciente
- visualizar la evolución de parámetros en una matriz clínica

Además permite visualizar estudios complejos en formatos específicos, como:

- orina completa
- citoquímico de LCR
- cultivos microbiológicos y antibiogramas
- entre otros.

Esto facilita una lectura clínica rápida y estructurada.

### 3. Funcionalidades actuales

La herramienta actualmente permite:

- extracción de órdenes de laboratorio desde el LIS
- almacenamiento local por paciente
- visualización longitudinal de resultados
- visualización estructurada de estudios especiales
- exportación de datos a CSV para análisis
- exportación e importación en JSON para respaldo y portabilidad
- impresión de resúmenes para reuniones clínicas

### 4. Beneficios clínicos

La herramienta permite:

- visualizar tendencias de laboratorio en segundos
- facilitar la revisión durante visitas médicas
- mejorar el seguimiento de infecciones y cultivos
- apoyar discusiones clínicas multidisciplinarias
- reducir el tiempo de navegación en el sistema
- facilitar la revisión en casos de auditorías

### 5. Seguridad y arquitectura

El sistema fue diseñado bajo principios estrictos de seguridad:

- no modifica el sistema LIS
- no accede a bases de datos institucionales
- no transmite información a servidores externos
- todo el procesamiento ocurre localmente en el navegador del usuario

La herramienta opera únicamente como capa de visualización clínica.

### 6. Potencial de desarrollo

El modelo permite evolucionar hacia:

- análisis automático de tendencias
- detección de cambios clínicamente relevantes
- generación de gráficos
- apoyo a reportes clínicos
- integración futura con herramientas de análisis institucional

### 7. Estado actual

Versión actual: 1.3.x

El proyecto se encuentra en etapa funcional inicial y se presenta para evaluación de su potencial utilidad clínica y posibles líneas de desarrollo institucional.
