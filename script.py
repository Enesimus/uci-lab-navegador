'''
Docstring para script
'''

from bs4 import BeautifulSoup as bs
import pandas as pd

html = open("prueba.html", encoding="UTF-8").read()
soup = bs(html, "html.parser")

resultados = []

for fila in soup.select("tr.grid-row"):
    dato = {}
    for celda in fila.select("td.grid-cell"):
        campo = celda.get("data-name")
        valor = celda.get_text(strip= True)
        dato[campo] = valor
    resultados.append(dato)

orden = {}

for fila in soup.select("h4.modal-title"):
    dato2 = []
    valor = fila.get_text(strip=True)
    dato2 = valor.split()
    orden_num = dato2[3]
    orden["Numero Orden"] = orden_num

# dato2.append(valor)

df = pd.DataFrame(resultados,)
