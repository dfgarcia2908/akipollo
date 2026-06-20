"""
ALTERNATIVA 3 - Avanzada con backup y log
Personalizado para Windows - G:\Mi unidad\imag
"""

import os
import shutil
import csv
from datetime import datetime

# ── CONFIGURACIÓN ──────────────────────────────────────────
CARPETA          = r"G:\Mi unidad\imag"
NOMBRE_BASE      = "nombre_formato"
INICIO           = 1
AGRUPAR_POR_TIPO = False
HACER_BACKUP     = True
EXTENSIONES = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"}
# ───────────────────────────────────────────────────────────


def hacer_backup(carpeta):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    carpeta_limpia = carpeta.rstrip("/\\")
    destino = carpeta_limpia + "__backup_" + timestamp
    shutil.copytree(carpeta, destino)
    print(f"Backup creado en: {destino}")
    return destino


def renombrar_avanzado(carpeta, nombre_base, inicio=1):
    if not os.path.exists(carpeta):
        print(f"No se encontro la carpeta: {carpeta}")
        return

    archivos = sorted([
        f for f in os.listdir(carpeta)
        if os.path.isfile(os.path.join(carpeta, f))
        and os.path.splitext(f)[1].lower() in EXTENSIONES
    ])

    if not archivos:
        print("No se encontraron imagenes en la carpeta.")
        return

    if HACER_BACKUP:
        hacer_backup(carpeta)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path  = os.path.join(carpeta, "log_renombrado_" + timestamp + ".csv")
    log_filas = [["#", "Nombre original", "Nombre nuevo", "Ruta final"]]

    print(f"\nProcesando {len(archivos)} imagenes...\n")

    for i, archivo in enumerate(archivos, start=inicio):
        ext          = os.path.splitext(archivo)[1].lower()
        nombre_nuevo = nombre_base + "_" + str(i).zfill(4) + ext

        if AGRUPAR_POR_TIPO:
            subcarpeta   = os.path.join(carpeta, ext.lstrip("."))
            os.makedirs(subcarpeta, exist_ok=True)
            ruta_destino = os.path.join(subcarpeta, nombre_nuevo)
        else:
            ruta_destino = os.path.join(carpeta, nombre_nuevo)

        ruta_origen = os.path.join(carpeta, archivo)
        os.rename(ruta_origen, ruta_destino)

        log_filas.append([i, archivo, nombre_nuevo, ruta_destino])
        print(f"  [{str(i).zfill(4)}] {archivo:<30} -> {nombre_nuevo}")

    with open(log_path, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(log_filas)

    print(f"\nListo! {len(archivos)} imagenes renombradas.")
    print(f"Log guardado en: {log_path}")


if __name__ == "__main__":
    renombrar_avanzado(CARPETA, NOMBRE_BASE, INICIO)
