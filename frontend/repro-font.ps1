$css = Select-String -Path src\index.css -Pattern 'font-size:\s*([0-9.]+(?:rem|px))' -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value }
$jsx = (Get-ChildItem -Recurse src -Filter *.jsx) | Select-String -Pattern 'fontSize:\s*[''"]([0-9.]+(?:rem|px))' -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value }
Write-Output 'CSS font-sizes:'
$css | Group-Object | Sort-Object Name | ForEach-Object { '{0} x{1}' -f $_.Name, $_.Count }
Write-Output ''
Write-Output 'JSX inline font-sizes:'
$jsx | Group-Object | Sort-Object Name | ForEach-Object { '{0} x{1}' -f $_.Name, $_.Count }
