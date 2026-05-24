# db-import.ps1 — Restaura la BD desde el fichero SQL del disco externo
# Usar la primera vez en un dispositivo nuevo, o tras cambiar de dispositivo
# Uso: .\scripts\db-import.ps1

$dumpPath = "I:\Projecte_2a\nextjs\hogar-final\db_backups\mi_tienda_latest.sql"

if (-not (Test-Path $dumpPath)) {
    Write-Host "ERROR: No se encuentra el dump en: $dumpPath"
    Write-Host "Ejecuta db-export.ps1 en el otro dispositivo primero."
    exit 1
}

Write-Host "Esperando que MariaDB este lista..."
Start-Sleep -Seconds 5

# Recrear la BD con UTF-8 correcto
Write-Host "Recreando base de datos..."
docker exec mi_tienda mysql -u root -proot -e "DROP DATABASE IF EXISTS mi_tienda; CREATE DATABASE mi_tienda CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Copiar el dump dentro del contenedor (evita problemas de encoding con PowerShell pipe)
Write-Host "Copiando dump al contenedor..."
docker cp $dumpPath mi_tienda:/tmp/mi_tienda_restore.sql

# Restaurar desde dentro del contenedor
Write-Host "Restaurando base de datos..."
docker exec mi_tienda bash -c "mysql -u root -proot mi_tienda < /tmp/mi_tienda_restore.sql"

# Limpiar fichero temporal
docker exec mi_tienda rm /tmp/mi_tienda_restore.sql

Write-Host "OK — base de datos restaurada correctamente."
