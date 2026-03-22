/*
UCI Lab Navegador
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

// storage.js

const KEY_RUT_ACTUAL = "UCI_RUT_ACTUAL";

// Claves técnicas internas (NO deben confundirse con pacientes)
const KEY_AUTO_BACKUP = "__UCI_AUTO_BACKUP__";
const KEY_STORAGE_META = "__UCI_STORAGE_META__";

// Versionado mínimo de esquema interno
const STORAGE_SCHEMA_VERSION = 1;

// Formato backup global
const BACKUP_GLOBAL_FORMAT = "uci-lab-navegador-global";
const BACKUP_GLOBAL_VERSION = 1;

// =========================
// Helpers de claves
// =========================

function keyPaciente(rut) {
  return `UCI_${rut}`;
}

function esKeyPaciente(key) {
  if (typeof key !== "string") return false;
  if (!key.startsWith("UCI_")) return false;
  if (key === KEY_RUT_ACTUAL) return false;

  // Evitar que futuras claves técnicas con prefijo UCI_ contaminen la lista
  const sufijo = key.slice(4).trim();
  if (!sufijo) return false;

  return true;
}

function listarClavesPacienteDesdeObjeto(obj) {
  return Object.keys(obj || {}).filter(esKeyPaciente);
}

function extraerRutDesdeKeyPaciente(key) {
  return esKeyPaciente(key) ? key.slice(4) : null;
}

// =========================
// CRUD paciente
// =========================

async function obtener(rut) {
  const key = keyPaciente(rut);
  const result = await chrome.storage.local.get(key);
  return result[key] || null;
}

async function guardar(rut, data) {
  const key = keyPaciente(rut);

  const payload = {
    ...data,
    schemaVersion: data?.schemaVersion || STORAGE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString()
  };

  await chrome.storage.local.set({ [key]: payload });
}

async function limpiar(rut) {
  const key = keyPaciente(rut);
  await chrome.storage.local.remove(key);
}

async function guardarRutActual(rut) {
  await chrome.storage.local.set({ [KEY_RUT_ACTUAL]: rut });
}

async function obtenerRutActual() {
  const result = await chrome.storage.local.get(KEY_RUT_ACTUAL);
  return result[KEY_RUT_ACTUAL] || null;
}

async function listarPacientes() {
  const all = await chrome.storage.local.get(null);

  return listarClavesPacienteDesdeObjeto(all)
    .map(extraerRutDesdeKeyPaciente)
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), "es", { numeric: true }));
}

// =========================
// Metadatos internos
// =========================

async function obtenerStorageMeta() {
  const result = await chrome.storage.local.get(KEY_STORAGE_META);
  return result[KEY_STORAGE_META] || {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    updatedAt: null
  };
}

async function guardarStorageMeta(meta = {}) {
  const actual = await obtenerStorageMeta();

  const payload = {
    ...actual,
    ...meta,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString()
  };

  await chrome.storage.local.set({ [KEY_STORAGE_META]: payload });
  return payload;
}

// =========================
// Backup global
// =========================

async function construirBackupGlobal() {
  const all = await chrome.storage.local.get(null);
  const patientKeys = listarClavesPacienteDesdeObjeto(all);

  const patients = {};
  for (const key of patientKeys) {
    patients[key] = all[key];
  }

  return {
    format: BACKUP_GLOBAL_FORMAT,
    version: BACKUP_GLOBAL_VERSION,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: chrome?.runtime?.getManifest?.()?.version || null,
    rutActual: all[KEY_RUT_ACTUAL] || null,
    storageMeta: all[KEY_STORAGE_META] || {
      schemaVersion: STORAGE_SCHEMA_VERSION
    },
    patients
  };
}

function validarBackupGlobal(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Archivo JSON inválido.");
  }

  if (payload.format !== BACKUP_GLOBAL_FORMAT) {
    throw new Error("El archivo no corresponde a un respaldo global de UCI Lab Navegador.");
  }

  if (payload.version !== BACKUP_GLOBAL_VERSION) {
    throw new Error(`Versión de backup global no soportada: ${payload.version}`);
  }

  if (!payload.patients || typeof payload.patients !== "object") {
    throw new Error("El backup global no contiene pacientes.");
  }

  for (const key of Object.keys(payload.patients)) {
    if (!esKeyPaciente(key)) {
      throw new Error(`Clave inválida en backup global: ${key}`);
    }
  }

  return true;
}

async function importarBackupGlobal(payload, opciones = {}) {
  validarBackupGlobal(payload);

  const {
    merge = false,
    restaurarRutActual = true
  } = opciones;

  const all = await chrome.storage.local.get(null);
  const clavesPacientesActuales = listarClavesPacienteDesdeObjeto(all);

  if (!merge && clavesPacientesActuales.length) {
    await chrome.storage.local.remove(clavesPacientesActuales);
  }

  const setPayload = {};

  for (const [key, value] of Object.entries(payload.patients || {})) {
    setPayload[key] = {
      ...value,
      schemaVersion: value?.schemaVersion || STORAGE_SCHEMA_VERSION,
      restoredAt: new Date().toISOString()
    };
  }

  if (restaurarRutActual && payload.rutActual) {
    setPayload[KEY_RUT_ACTUAL] = payload.rutActual;
  }

  setPayload[KEY_STORAGE_META] = {
    ...(payload.storageMeta || {}),
    schemaVersion: STORAGE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    restoredFromGlobalBackupAt: new Date().toISOString()
  };

  await chrome.storage.local.set(setPayload);

  return {
    totalPacientes: Object.keys(payload.patients || {}).length,
    rutActual: restaurarRutActual ? (payload.rutActual || null) : null
  };
}

// =========================
// Auto-backup y auto-restore
// =========================

async function crearBackupAutomatico(meta = {}) {
  const backup = await construirBackupGlobal();

  const payload = {
    ...backup,
    auto: true,
    backupType: "auto",
    meta: {
      ...meta,
      createdAt: new Date().toISOString()
    }
  };

  await chrome.storage.local.set({ [KEY_AUTO_BACKUP]: payload });
  return payload;
}

async function obtenerBackupAutomatico() {
  const result = await chrome.storage.local.get(KEY_AUTO_BACKUP);
  return result[KEY_AUTO_BACKUP] || null;
}

async function restaurarBackupAutomaticoSiCorresponde() {
  const pacientes = await listarPacientes();
  if (pacientes.length > 0) {
    return {
      restored: false,
      reason: "patients_present",
      totalPacientes: pacientes.length
    };
  }
  const backup = await obtenerBackupAutomatico();
  if (!backup) {
    return {
      restored: false,
      reason: "no_auto_backup"
    };
  }

  validarBackupGlobal(backup);

  const total = Object.keys(backup.patients || {}).length;
  if (!total) {
    return {
      restored: false,
      reason: "empty_backup"
    };
  }

  await importarBackupGlobal(backup, {
    merge: false,
    restaurarRutActual: true
  });

  return {
    restored: true,
    reason: "auto_backup_restored",
    totalPacientes: total,
    rutActual: backup.rutActual || null
  };
}

// =========================
// Cálculos clínicos - gasometría arterial
// =========================

function normalizarNumeroClinico(valor) {
  if (valor === null || valor === undefined) return null;

  const n = Number(String(valor).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

async function guardarCalculoGasometrico(rut, timestamp, payload = {}) {
  const data = await obtener(rut);

  if (!data) {
    throw new Error("Paciente no encontrado.");
  }

  const ts = String(timestamp || "").trim();
  if (!ts) {
    throw new Error("Timestamp inválido.");
  }

  const fio2 = normalizarNumeroClinico(payload.fio2);
  const map = normalizarNumeroClinico(payload.map);

  if (!(fio2 > 0)) {
    throw new Error("FiO2 inválida. Debe ser mayor a 0.");
  }

  if (!(map > 0)) {
    throw new Error("PAM de vía aérea inválida. Debe ser mayor a 0.");
  }

  data.calculos = data.calculos || {};
  data.calculos.gasometria = data.calculos.gasometria || {};

  data.calculos.gasometria[ts] = {
    fio2,
    map,
    updatedAt: new Date().toISOString()
  };

  await guardar(rut, data);

  return data.calculos.gasometria[ts];
}

async function obtenerCalculosGasometricos(rut) {
  const data = await obtener(rut);
  return data?.calculos?.gasometria || {};
}

async function obtenerCalculoGasometrico(rut, timestamp) {
  const ts = String(timestamp || "").trim();
  if (!ts) return null;

  const calculos = await obtenerCalculosGasometricos(rut);
  return calculos[ts] || null;
}

async function limpiarCalculoGasometrico(rut, timestamp) {
  const data = await obtener(rut);
  if (!data) return false;

  const ts = String(timestamp || "").trim();
  if (!ts) return false;

  if (!data.calculos?.gasometria?.[ts]) return false;

  delete data.calculos.gasometria[ts];

  if (!Object.keys(data.calculos.gasometria).length) {
    delete data.calculos.gasometria;
  }

  if (data.calculos && !Object.keys(data.calculos).length) {
    delete data.calculos;
  }

  await guardar(rut, data);
  return true;
}