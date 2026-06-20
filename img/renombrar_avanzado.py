"""
ALTERNATIVA 3 - Avanzada con backup y log
- Crea una copia de seguridad antes de renombrar
- Genera un log CSV con todos los cambios
- Organiza las imágenes en subcarpetas por extensión (opcional)
"""

import os
import shutil
import csv
from datetime import datetime

# ── CONFIGURACIÓN ──────────────────────────────────────────
CARPETA      = "./imagenes"
NOMBRE_BASE  = "foto"
INICIO       = 1
AGRUPAR_POR_TIPO = False   # True = subcarpeta por extensión (jpg/, png/, etc.)
HACER_BACKUP     = True    # True = copia la carpeta antes de renombrar
EXTENSIONES = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"}
# ───────────────────────────────────────────────────────────


def hacer_backup(carpeta):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    destino   = f"{carpeta.rstrip('/\\')}__backup_{timestamp}"
    shutil.copytree(carpeta, destino)
    print(f"📦 Backup creado en: {destino}")
    return destino


def renombrar_avanzado(carpeta, nombre_base, inicio=1):
    archivos = sorted([
        f for f in os.listdir(carpeta)
        if os.path.isfile(os.path.join(carpeta, f))
        and os.path.splitext(f)[1].lower() in EXTENSIONES
    ])

    if not archivos:
        print("No se encontraron imágenes.")
        return

    # Backup opcional
    if HACER_BACKUP:
        hacer_backup(carpeta)

    # Preparar log
    timestamp  = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path   = os.path.join(carpeta, f"log_renombrado_{timestamp}.csv")
    log_filas  = [["#", "Nombre original", "Nombre nuevo", "Ruta final"]]

    print(f"\nProcesando {len(archivos)} imágenes...\n")

    for i, archivo in enumerate(archivos, start=inicio):
        ext          = os.path.splitext(archivo)[1].lower()
        nombre_nuevo = f"{nombre_base}_{i:04d}{ext}"

        # Subcarpeta por tipo (opcional)
        if AGRUPAR_POR_TIPO:
            subcarpeta = os.path.join(carpeta, ext.lstrip("."))
            os.makedirs(subcarpeta, exist_ok=True)
            ruta_destino = os.path.join(subcarpeta, nombre_nuevo)
        else:
            ruta_destino = os.path.join(carpeta, nombre_nuevo)

        ruta_origen = os.path.join(carpeta, archivo)
        os.rename(ruta_origen, ruta_destino)

        log_filas.append([i, archivo, nombre_nuevo, ruta_destino])
        print(f"  [{i:04d}] {archivo:<30} → {nombre_nuevo}")

    # Guardar log CSV
    with open(log_path, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(log_filas)

    print(f"\n✅ {len(archivos)} imágenes renombradas.")
    print(f"📋 Log guardado en: {log_path}")


if __name__ == "__main__":
    renombrar_avanzado(CARPETA, NOMBRE_BASE, INICIO)
