#Requires -Version 5.1
param(
  [string]$ComposeFile = "docker-compose.yml",
  [string]$Container = "lguims-db",
  [string]$DbUser = "lguims",
  [string]$DbName = "lgu_ims",
  [string]$BackupDir = (Join-Path $PSScriptRoot ".." "backups"),
  [int]$RetentionDays = 30
)

if (-not (Test-Path $ComposeFile)) {
  Write-Error "$ComposeFile not found. Run from project root or set -ComposeFile."
  exit 1
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$output = Join-Path $BackupDir "lgu_ims_${timestamp}.dump.gz"

Write-Host "Backing up $DbName from container $Container..."
docker compose -f $ComposeFile exec -T $Container `
  pg_dump -U $DbUser -d $DbName -Fc |
  gzip > $output

$size = (Get-Item $output).Length / 1MB
Write-Host "Backup written: $output ($([math]::Round($size, 1)) MB)"

Write-Host "Pruning backups older than $RetentionDays days..."
$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem $BackupDir -Filter "lgu_ims_*.dump.gz" | ForEach-Object {
  if ($_.LastWriteTime -lt $cutoff) {
    Remove-Item $_.FullName -Force
    Write-Host "Deleted $($_.Name)"
  }
}
Write-Host "Done."
