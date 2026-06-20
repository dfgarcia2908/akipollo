import os, shutil, csv
from datetime import datetime

CARPETA = r"G:\Mi unidad\imag"
NOMBRE_BASE = "nombre_formato"
INICIO = 1
HACER_BACKUP = True
EXTENSIONES = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"}

def hacer_backup(carpeta):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    destino = carpeta + "__backup_" + timestamp
    shutil.copytree(carpeta, destino)
    print("Backup en: " + destino)

def renombrar(carpeta, nombre_base, inicio=1):
    if not os.path.exists(carpeta):
        print("Carpeta no encontrada")
        return
    archivos = sorted([f for f in os.listdir(carpeta)
        if os.path.isfile(os.path.join(carpeta, f))
        and os.path.splitext(f)[1].lower() in EXTENSIONES])
    if not archivos:
        print("No hay imagenes")
        return
    if HACER_BACKUP:
        hacer_backup(carpeta)
    log_filas = [["#", "Original", "Nuevo"]]
    for i, archivo in enumerate(archivos, start=inicio):
        ext = os.path.splitext(archivo)[1].lower()
        nuevo = nombre_base + "_" + str(i).zfill(4) + ext
        os.rename(os.path.join(carpeta, archivo), os.path.join(carpeta, nuevo))
        log_filas.append([i, archivo, nuevo])
        print(archivo + " -> " + nuevo)
    log = os.path.join(carpeta, "log.csv")
    with open(log, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(log_filas)
    print("Listo! " + str(len(archivos)) + " imagenes renombradas.")

renombrar(CARPETA, NOMBRE_BASE, INICIO)
