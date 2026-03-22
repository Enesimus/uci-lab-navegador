/*
UCI Lab Navegador
Copyright (C) 2026 Juan Sepúlveda Sepúlveda

Licensed under the GNU General Public License v3.0
*/

// background.js

importScripts("storage.js");

chrome.runtime.onInstalled.addListener((details) => {
  (async () => {
    try {
      const currentVersion = chrome.runtime.getManifest().version || null;
      const reason = details?.reason || "unknown";
      const previousVersion = details?.previousVersion || null;

      console.log("[UCI Lab Navegador] onInstalled", {
        reason,
        previousVersion,
        currentVersion
      });

      // En actualización: crear snapshot automático de rescate
      if (reason === "update") {
        const backup = await crearBackupAutomatico({
          reason: "update",
          previousVersion,
          currentVersion
        });

        console.log(
          "[UCI Lab Navegador] Backup automático creado",
          {
            totalPacientes: Object.keys(backup?.patients || {}).length,
            previousVersion,
            currentVersion
          }
        );
      }

      // Guardar metadato mínimo del storage
      await guardarStorageMeta({
        lastInstallReason: reason,
        lastKnownAppVersion: currentVersion,
        previousVersion: previousVersion || null
      });

    } catch (err) {
      console.error("[UCI Lab Navegador] Error en background onInstalled:", err);
    }
  })();
});