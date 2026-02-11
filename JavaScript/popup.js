document.getElementById("btnExtraer").addEventListener("click", () => {

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {

        chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "extraerOrden" },
            (response) => {

                if (!response || !response.ok) {
                    alert("Error al extraer orden");
                    return;
                }

                const contexto = response.contexto;

                // Aquí llamamos a guardar()
                guardar(contexto);

                alert("Orden guardada correctamente");
            }
        );
    });
});
