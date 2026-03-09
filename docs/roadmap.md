# Actualización del Roadmap — UCI Lab Extractor

## v1.3 — Clinical Metrics

**Objetivo**: agregar interpretación fisiológica básica.

### Nuevas capacidades

#### Métricas respiratorias

- PAFI (PaO₂ / FiO₂)
- Oxygenation Index

#### Métricas metabólicas

- Lactato clearance
- Variación porcentual de lactato

#### Métricas renales

- Variación de creatinina
- detección básica de AKI

### Requerimientos

Introducción manual opcional de:

- FiO₂
- presión media de vía aérea

---

## v1.4 — Data Portability

**Objetivo**: permitir trabajar con datos fuera del LIS.

Poder usar el sistema en más de un equipo sin tener que reextraer todo.

### Funciones nuevas

#### Importar CSV

Permitir cargar archivos exportados previamente por el sistema.

``` text
Importar CSV
↓
Reconstruir matriz clínica
↓
Visualizar igual que si fuera extraído del LIS
```

#### Exportar / Importar JSON (backup completo)

Otra opción más robusta:

``` text
Exportar paciente → JSON
Importar JSON → restaurar paciente
```

Ventaja:

- preserva estructura completa
- preserva hash
- preserva timestamps

---

### Beneficios clínicos

#### 1️⃣ Trabajo en múltiples equipos

Ejemplo real:

- computador del hospital
- computador personal
- laptop de docencia

Flujo:

``` text
Hospital
↓
Exportar CSV / JSON
↓
Pendrive / correo / nube
↓
Importar en otro equipo
↓
Continuar análisis
```

---

#### 2️⃣ Preparación de presentaciones

Puedes preparar:

- reuniones clínicas
- revisiones de casos
- docencia

sin necesidad de conectarte al HIS.

---

#### 3️⃣ Investigación clínica

El CSV exportado ya contiene:

- estructura longitudinal
- trazabilidad con HASH
- metadatos de paciente

Eso es ideal para análisis en:

- R
- Python
- Excel
- SPSS

---

### Cambios técnicos necesarios

Son muy pequeños.

#### 1️⃣ Nuevo botón en popup

``` HTML
<button id="btnImportCSV">Importar CSV</button>
```

#### 2️⃣ Función nueva

``` JavaScript
async function importarPacienteCSV(file) {
  const texto = await file.text();
  const filas = texto.split("\n").map(r => r.split(";"));

  // reconstruir matriz
  // reconstruir paciente
  // guardar en storage
}
```

#### 3️⃣ Reconstrucción del modelo

Tu modelo actual:

``` text
paciente
ordenes
  hash
    registros
```

Podrías reconstruirlo desde:

``` text
timestamp
examen
valor
```

O simplemente crear un modo CSV-only.

---

## v2.0 — Clinical Intelligence Layer

Se mantiene igual:

- detección de patrones
- alertas
- tendencias

---

## v3.0 — Multi-paciente

Dashboard UCI.

---

## v4.0 — Decision Support

Soporte clínico.