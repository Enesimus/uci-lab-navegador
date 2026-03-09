const resultado =  "Microorganismo: Pseudomonas aeruginosa Cefepima: C.I.M. 16 Resistente Ceftazidima: C.I.M. >16 Resistente Ceftazidima/Avibactam: C.I.M. 4/4 Sensible Ciprofloxacino: C.I.M. 0.25 Sensible Colistina: C.I.M. <=1 Sensible  Imipenem: C.I.M. 2 Sensible Meropenem: C.I.M. <=0.5 Sensible Piperacilina-Tazobactam: C.I.M. 32/4 Resistente"

function traduceCultivo(resultado) {
    let list = resultado.split(" ");

}

let list = resultado.split(" ");

console.log(list);

resultado_esperado ={
    "Microorganismo" : "Pseudomonas aeruginosa",
    "Recuento de colonias": "",
    "Antibiograma" : {
            "Cefepima" : { 
                "CIM": "16", 
                "Estado": "Resistente"
                },
            "Ceftazidima": {
                "CIM": ">16", 
                "Estado": "Resistente"
            },
            "Ceftazidima/Avibactam": {
                "CIM": "4/4", 
                "Estado": "Sensible"
            },
            

            

        }
};

