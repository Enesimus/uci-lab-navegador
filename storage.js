/*
UCI Lab Extractor
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

// storage.js

const KEY_RUT_ACTUAL = "UCI_RUT_ACTUAL";

function keyPaciente(rut) {
  return `UCI_${rut}`;
}

async function obtener(rut) {
  const key = keyPaciente(rut);
  const result = await chrome.storage.local.get(key);
  return result[key] || null;
}

async function guardar(rut, data) {
  const key = keyPaciente(rut);
  await chrome.storage.local.set({ [key]: data });
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
  return Object.keys(all)
    .filter(k => k.startsWith("UCI_"))
    .map(k => k.slice(4))
    .sort();
}
