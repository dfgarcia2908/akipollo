from pathlib import Path
import base64
import requests
import re
import unicodedata
import argparse
import csv
from collections import defaultdict

# Carpeta actual donde están las imágenes
CARPETA = Path(".")

# Modelo de visión en Ollama
MODELO = "llava"

# Extensiones de imagen permitidas
EXTENSIONES = [".jpg", ".jpeg", ".png", ".webp"]

# Categorías posibles para nombrar las imágenes
CATEGORIAS = [
    "pollo",
    "pollo_asado",
    "pollo_frito",
    "pollo_broaster",
    "arroz_con_pollo",
    "chuleta",
    "chuleta_de_pollo",
    "chuleta_de_cerdo",
    "pollo_con_papas",
    "pollo_con_arroz",
    "bandeja_con_pollo",
    "pollo_entero",
    "medio_pollo",
    "cuarto_de_pollo",
    "costillas_bbq",
    "pechuga_asada",
    "presa_de_pollo",
    "pechuga",
    "alitas",
    "costilla",
    "carne_asada",
    "hamburguesa",
    "perro_caliente",
    "salchipapa",
    "papas_fritas",
    "yuca_frita",
    "arepa",
    "empanada",
    "ensalada",
    "sopa",
    "arroz",
    "combo_pollo",
    "combo_familiar",
    "bebida",
    "gaseosa",
    "plato_mixto",
    "comida",
]

# Contador para que los nombres repetidos queden:
# pollo_001.jpg, pollo_002.jpg, combo_pollo_001.jpg, etc.
contador_nombres = defaultdict(int)


def limpiar_nombre(texto):
    """
    Limpia el texto para que sea seguro como nombre de archivo en Windows.
    """
    texto = texto.lower().strip()
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    texto = texto.replace(" ", "_")
    texto = re.sub(r"[^a-z0-9_]", "", texto)
    texto = re.sub(r"_+", "_", texto)
    return texto.strip("_")


def nombre_unico(carpeta, base, extension):
    """
    Crea nombres consecutivos por categoría.
    Ejemplo:
    pollo_001.jpg
    pollo_002.jpg
    combo_pollo_001.jpg
    """
    contador_nombres[base] += 1
    numero = contador_nombres[base]

    nuevo = carpeta / f"{base}_{numero:03d}{extension}"

    while nuevo.exists():
        contador_nombres[base] += 1
        numero = contador_nombres[base]
        nuevo = carpeta / f"{base}_{numero:03d}{extension}"

    return nuevo


def analizar_imagen(ruta):
    """
    Envía la imagen a Ollama/LLaVA y devuelve una categoría.
    """
    with open(ruta, "rb") as f:
        imagen_base64 = base64.b64encode(f.read()).decode("utf-8")

    prompt = f"""
Mira esta imagen de menú de restaurante de pollo.
Identifica el producto principal de la imagen.
Escoge SOLO UNA categoría de esta lista.
Evita usar categorías genéricas.

Categorías:
{", ".join(CATEGORIAS)}

Reglas:
- Responde únicamente con el nombre exacto de una categoría.
- No expliques nada.
- No escribas frases.
- No uses puntos.
- No respondas comida ni combo_pollo si puedes identificar algo más específico.
- Usa comida solo si la imagen no muestra claramente ningún plato.
- Si ves pollo con arroz responde pollo_con_arroz.
- Si ves pollo con papas responde pollo_con_papas.
- Si ves solo papas responde papas_fritas.
- Si ves arroz amarillo con pollo responde arroz_con_pollo.
- Si ves presa frita responde pollo_frito.
- Si ves pollo apanado responde pollo_broaster.
"""

    try:
        respuesta = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": MODELO,
                "prompt": prompt,
                "images": [imagen_base64],
                "stream": False,
                "options": {
                    "temperature": 0
                }
            },
            timeout=180
        )
        respuesta.raise_for_status()

    except Exception as e:
        print("\nERROR: Ollama no está abierto o el modelo llava no está instalado.")
        print("Solución:")
        print("1. Abre otra ventana de PowerShell.")
        print("2. Ejecuta: ollama serve")
        print("3. Deja esa ventana abierta.")
        print("4. En otra ventana ejecuta: ollama pull llava")
        print("\nDetalle del error:")
        print(e)
        raise

    data = respuesta.json()
    nombre = data.get("response", "comida").strip()
    nombre = limpiar_nombre(nombre)

    if nombre not in CATEGORIAS:
        nombre = "comida"

    return nombre


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Aplicar renombrado real. Sin esto solo muestra vista previa."
    )
    args = parser.parse_args()

    archivos = sorted([
        f for f in CARPETA.iterdir()
        if f.is_file()
        and f.suffix.lower() in EXTENSIONES
        and f.name.lower() != "resultado_nombres.csv"
    ])

    if not archivos:
        print("No encontré imágenes en esta carpeta.")
        return

    print(f"Imágenes encontradas: {len(archivos)}")
    print("Analizando imágenes...\n")

    resultados = []

    for archivo in archivos:
        try:
            categoria = analizar_imagen(archivo)
            nuevo_path = nombre_unico(CARPETA, categoria, archivo.suffix.lower())

            print(f"{archivo.name}  ->  {nuevo_path.name}")
            resultados.append([archivo.name, nuevo_path.name, categoria])

            if args.apply:
                archivo.rename(nuevo_path)

        except Exception as e:
            print(f"Error con {archivo.name}: {e}")
            resultados.append([archivo.name, "ERROR", str(e)])

    with open("resultado_nombres.csv", "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["archivo_original", "archivo_nuevo", "categoria"])
        writer.writerows(resultados)

    if args.apply:
        print("\nLISTO: imágenes renombradas por contenido con número consecutivo.")
        print("También se creó resultado_nombres.csv con el historial.")
    else:
        print("\nEsto fue solo una vista previa.")
        print("Revisa el archivo resultado_nombres.csv")
        print("Para aplicar el cambio real ejecuta:")
        print('python ".\\renombrar_comida_ia.py" --apply')


if __name__ == "__main__":
    main()
