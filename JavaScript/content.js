// content.js
// Lee los resultados de laboratorio desde la página visible

(function () {
    console.log("content.js UCI: iniciado");

    // Buscar todas las filas de resultados
    const filas = document.querySelectorAll("tr.grid-row");

    if (filas.length === 0) {
        console.warn("No se encontraron filas de laboratorio");
        return;
    }
    
    let resultados = [];
    
    filas.forEach((fila, index) => {
        let registro = {};

        const celdas = fila.querySelectorAll("td.grid-cell");
        
        celdas.forEach(celda => {
            const campo = celda.dataset.name;
            if (!campo) return;

            const valor = celda.innerText.trim();
            registro[campo] = valor;
        });

        // Solo agregar si tiene al menos prueba y resultado
        if (registro.Prueba && registro.Resultado) {
            resultados.push(registro);
        }
    });

    console.log("Resultados extraidos:", resultados);

    // Guardamos los datos en window para que otros script los usen después
    window.__UCI_LABS__ = resultados;

    console.log(`${resultados.length} exámenes cargados en window.__UCI_LABS__`);
})();
