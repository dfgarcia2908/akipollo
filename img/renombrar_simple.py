"""
ALTERNATIVA 1 - Simple y directa
Renombra todas las imágenes de una carpeta con nombre base + número.
Ejemplo: foto_001.jpg, foto_002.png, foto_003.webp
"""

import os

# ── CONFIGURACIÓN ──────────────────────────────────────────
CARPETA    = "./imagenes"       # Ruta de la carpeta con imágenes
NOMBRE_BASE = "foto"            # Prefijo para los nuevos nombres
INICIO     = 1                  # Número inicial
EXTENSIONES = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"}
# ───────────────────────────────────────────────────────────

def renombrar(carpeta, nombre_base, inicio=1):
    archivos = sorted([
        f for f in os.listdir(carpeta)
        if os.path.splitext(f)[1].lower() in EXTENSIONES
    ])

    if not archivos:
        print("No se encontraron imágenes.")
        return

    print(f"Se renombrarán {len(archivos)} imágenes...\n")

    for i, archivo in enumerate(archivos, start=inicio):
        ext      = os.path.splitext(archivo)[1].lower()
        nuevo    = f"{nombre_base}_{i:03d}{ext}"
        origen   = os.path.join(carpeta, archivo)
        destino  = os.path.join(carpeta, nuevo)

        os.rename(origen, destino)
        print(f"  {archivo}  →  {nuevo}")

    print(f"\n✅ Listo. {len(archivos)} imágenes renombradas.")

if __name__ == "__main__":
    renombrar(CARPETA, NOMBRE_BASE, INICIO)
