$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$webOutput = Join-Path $projectRoot 'dist'
$androidAssets = Join-Path $projectRoot 'android\app\src\main\assets\www'

Push-Location $projectRoot
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    if (Test-Path $androidAssets) { Remove-Item -LiteralPath $androidAssets -Recurse -Force }
    New-Item -ItemType Directory -Path $androidAssets -Force | Out-Null
    Copy-Item -Path (Join-Path $webOutput '*') -Destination $androidAssets -Recurse -Force
    Write-Host 'Android web assets synchronized.'
} finally {
    Pop-Location
}
