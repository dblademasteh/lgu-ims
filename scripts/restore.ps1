#Requires -Version 5.1
param(
  [string]$ComposeFile = "docker-compose.yml",
  [string]$Container = "lguims-db",
  [string]$DbUser = "lguims",
  [string]$DbName = "lgu_ims",
  [Parameter(Mandatory)][string]$InputFile
)

if (-not (Test-Path $InputFile)) {
  Write-Error "File not found: $InputFile"
  exit 1
}

$tmp = "/tmp/restore_$(Get-Random).dump"
Write-Host "Copying $InputFile into $Container..."
docker compose -f $ComposeFile exec -T $Container sh -c "cat > $tmp" < $InputFile

Write-Host "Restoring into $DbName..."
docker compose -f $ComposeFile exec -T $Container `
  pg_restore -U $DbUser -d $DbName --clean --if-exists $tmp

Write-Host "Cleaning up..."
docker compose -f $ComposeFile exec -T $Container rm -f $tmp
Write-Host "Restore complete."
