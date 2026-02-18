// storage.js
// Persistencia en chrome.storage.local + migración automática desde localStorage

// --- Claves ---
const STORAGE_PREFIX = "UCI_";
const KEY_RUT_ACTUAL = "UCI_RUT_ACTUAL";
const KEY_MIGRATED = "UCI_MIGRADO_V1";

function obtenerClavePaciente(rut) {
  return `${STORAGE_PREFIX}${rut}`;
}

// --- Helpers Chrome Storage (Promise) ---
function csGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function csSet(items) {
  return new Promise((resolve) => chrome.storage.local.set(items, resolve));
}

function csRemove(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

// --- Migración desde localStorage (solo 1 vez) ---
async function migrarSiHaceFalta() {
  const meta = await csGet([KEY_MIGRATED]);
  if (meta?.[KEY_MIGRATED]) return;

  const payload = {};

  // Migrar pacientes UCI_<rut>
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (!k.startsWith(STORAGE_PREFIX)) continue;
    if (k === KEY_RUT_ACTUAL) continue;
    payload[k] = localStorage.getItem(k);
  }

  // Migrar rut actual si existe
  const rutActual = localStorage.getItem(KEY_RUT_ACTUAL);
  if (rutActual) payload[KEY_RUT_ACTUAL] = rutActual;

  await csSet({ ...payload, [KEY_MIGRATED]: true });
  console.log("[storage] Migración a chrome.storage.local completada", Object.keys(payload).length);
}

// --- Dedupe (firma simple) ---
function firmaRegistros(registros) {
  return (registros || [])
    .map(r => `${r.examen}|${r.fechaValidacion}|${r.valor}|${r.unidad}`)
    .sort()
    .join(";");
}

function yaExisteMismaOrden(data, orden, firma) {
  return Object.values(data?.ordenes || {}).some(o =>
    (o.ordenOriginal === orden) && (o.firma === firma)
  );
}

// --- CRUD Paciente ---
async function guardar(contexto) {
  await migrarSiHaceFalta();

  const { paciente, orden, registros } = contexto || {};

  if (!paciente?.rut || !orden) {
    console.warn("Datos incompletos para guardar");
    return;
  }

  if (!Array.isArray(registros) || !registros.length) {
    console.warn("Orden sin registros");
    return;
  }

  const clave = obtenerClavePaciente(paciente.rut);
  const raw = (await csGet([clave]))?.[clave] || null;
  let data = JSON.parse(raw || "null");

  if (!data) data = { paciente, ordenes: {} };

  // Timestamp representativo: mínima fechaValidacion (si existe)
  const fechas = registros
    .map(r => r?.fechaValidacion)
    .filter(Boolean)
    .sort();

  const ts = fechas[0] || new Date().toISOString();

  // Completar fechaValidacion si viene null
  const registrosNormalizados = registros.map(r => ({
    ...r,
    fechaValidacion: r?.fechaValidacion || ts
  }));

  const firma = firmaRegistros(registrosNormalizados);
  if (yaExisteMismaOrden(data, orden, firma)) {
    console.log("Orden duplicada (misma firma), no se guarda:", orden);
    return;
  }

  // Clave única por extracción
  const claveOrden = `${orden}__${ts}__${Date.now()}`;

  data.ordenes[claveOrden] = {
    ordenOriginal: orden,
    timestamp: ts,
    firma,
    fechaExtraccion: new Date().toISOString(),
    registros: registrosNormalizados
  };

  data.paciente = paciente;

  await csSet({ [clave]: JSON.stringify(data) });
  console.log(`[storage] Orden ${orden} (${ts}) guardada`);
}

async function obtener(rut) {
  await migrarSiHaceFalta();
  const clave = obtenerClavePaciente(rut);
  const raw = (await csGet([clave]))?.[clave] || null;
  return JSON.parse(raw || "null");
}

async function obtenerOrdenes(rut) {
  const data = await obtener(rut);
  if (!data) return [];

  return Object.entries(data.ordenes || {}).map(([orden, contenido]) => ({
    orden,
    ...contenido
  }));
}

async function limpiar(rut) {
  await migrarSiHaceFalta();
  const clave = obtenerClavePaciente(rut);
  await csRemove([clave]);
  console.log(`[storage] Datos del paciente ${rut} eliminados`);
}

// --- Rut actual (para UI del popup) ---
async function getRutActual() {
  await migrarSiHaceFalta();
  const raw = (await csGet([KEY_RUT_ACTUAL]))?.[KEY_RUT_ACTUAL] || "";
  return raw;
}

async function setRutActual(rut) {
  await migrarSiHaceFalta();
  await csSet({ [KEY_RUT_ACTUAL]: rut || "" });
}

async function clearRutActual() {
  await migrarSiHaceFalta();
  await csRemove([KEY_RUT_ACTUAL]);
}

// ===== Utilidades (chrome.storage.local) =====

async function listarPacientes() {
  await migrarSiHaceFalta();
  const all = await csGet(null);

  const pacientes = [];
  for (const [k, v] of Object.entries(all)) {
    if (!k.startsWith(STORAGE_PREFIX)) continue;
    if (k === KEY_RUT_ACTUAL) continue;
    if (k === KEY_MIGRATED) continue;

    try {
      const data = JSON.parse(v);
      pacientes.push({
        key: k,
        rut: data?.paciente?.rut || k.replace(/^UCI_/, ""),
        nombre: data?.paciente?.nombre || "(sin nombre)",
        nOrdenes: data?.ordenes ? Object.keys(data.ordenes).length : 0,
      });
    } catch {
      pacientes.push({ key: k, rut: k.replace(/^UCI_/, ""), nombre: "(no parseable)", nOrdenes: 0 });
    }
  }

  pacientes.sort((a, b) => a.rut.localeCompare(b.rut, undefined, { numeric: true }));
  return pacientes;
}

async function exportarBackupJSONCompleto() {
  await migrarSiHaceFalta();
  const all = await csGet(null);

  // Incluimos solo claves UCI_<rut> (no KEY_RUT_ACTUAL ni migración)
  const pacientes = {};
  for (const [k, v] of Object.entries(all)) {
    if (!k.startsWith(STORAGE_PREFIX)) continue;
    if (k === KEY_RUT_ACTUAL) continue;
    if (k === KEY_MIGRATED) continue;

    // guardamos como objeto si parsea, si no como raw
    try {
      pacientes[k] = JSON.parse(v);
    } catch {
      pacientes[k] = { __raw: v };
    }
  }

  return {
    version: 1,
    creadoEn: new Date().toISOString(),
    origen: "UCI Lab Extractor",
    pacientes,
  };
}

// Importa backup en modo "merge/overwrite por key"
async function importarBackupJSON(backup) {
  await migrarSiHaceFalta();

  if (!backup || typeof backup !== "object") throw new Error("Backup inválido");
  if (!backup.pacientes || typeof backup.pacientes !== "object") throw new Error("Backup sin 'pacientes'");

  const items = {};
  for (const [k, pacienteData] of Object.entries(backup.pacientes)) {
    if (!k.startsWith(STORAGE_PREFIX)) continue;

    // almacenamos como string (misma convención actual)
    if (pacienteData && typeof pacienteData === "object" && pacienteData.__raw) {
      items[k] = String(pacienteData.__raw);
    } else {
      items[k] = JSON.stringify(pacienteData);
    }
  }

  // marcamos migrado (por consistencia)
  items[KEY_MIGRATED] = true;

  await csSet(items);
  return { importados: Object.keys(items).length - 1 };
}
