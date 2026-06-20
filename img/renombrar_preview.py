"""
ALTERNATIVA 2 - Interactiva con vista previa
Muestra una tabla con los cambios ANTES de aplicarlos y pide confirmación.
Ejemplo de uso: python renombrar_preview.py ./mis_fotos vacaciones
"""

import os
import sys

EXTENSIONES = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"}


def previsualizar(carpeta, nombre_base, inicio=1):
    archivos = sorted([
        f for f in os.listdir(carpeta)
        if os.path.splitext(f)[1].lower() in EXTENSIONES
    ])

    if not archivos:
        print("No se encontraron imágenes.")
        return

    print(f"\n{'NOMBRE ORIGINAL':<35} {'NUEVO NOMBRE':<35}")
    print("─" * 70)

    cambios = []
    for i, archivo in enumerate(archivos, start=inicio):
        ext    = os.path.splitext(archivo)[1].lower()
        nuevo  = f"{nombre_base}_{i:03d}{ext}"
        cambios.append((archivo, nuevo))
        print(f"  {archivo:<33} {nuevo:<33}")

    print("─" * 70)
    print(f"\nTotal: {len(cambios)} imágenes\n")

    respuesta = input("¿Aplicar cambios? (s/n): ").strip().lower()
    if respuesta == "s":
        for original, nuevo in cambios:
            os.rename(
                os.path.join(carpeta, original),
                os.path.join(carpeta, nuevo)
            )
        print(f"\n✅ {len(cambios)} imágenes renombradas correctamente.")
    else:
        print("\n❌ Operación cancelada. No se realizaron cambios.")


if __name__ == "__main__":
    # Uso: python renombrar_preview.py [carpeta] [nombre_base] [inicio]
    carpeta     = sys.argv[1] if len(sys.argv) > 1 else "./imagenes"
    nombre_base = sys.argv[2] if len(sys.argv) > 2 else "imagen"
    inicio      = int(sys.argv[3]) if len(sys.argv) > 3 else 1

    previsualizar(carpeta, nombre_base, inicio)
