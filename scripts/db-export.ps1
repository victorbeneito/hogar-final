# db-export.ps1 — Exporta la BD a un fichero SQL en el disco externo
# Usar antes de cambiar de dispositivo
# Uso: .\scripts\db-export.ps1

$dumpPath = "I:\Projecte_2a\nextjs\hogar-final\db_backups\mi_tienda_latest.sql"
New-Item -ItemType Directory -Force "I:\Projecte_2a\nextjs\hogar-final\db_backups" | Out-Null

Write-Host "Exportando base de datos..."
docker exec mi_tienda mysqldump -u root -proot --single-transaction mi_tienda | Out-File -FilePath $dumpPath -Encoding utf8
Write-Host "OK — dump guardado en: $dumpPath"
Write-Host "Ahora puedes desconectar el disco y conectarlo al otro dispositivo."
