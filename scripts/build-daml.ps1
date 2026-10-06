# Build the Lookthrough Daml package on Windows.
#
# The bare dpm binary installs a mismatched component set and its `dpm build`
# exits 0 without producing anything, so this drives damlc directly against the
# package database that ships inside the damlc distribution.

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$dpmHome = if ($env:DPM_HOME) { $env:DPM_HOME } else { "$env:USERPROFILE\.dpm" }

$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
if (-not (Test-Path $javaHome)) {
  $javaHome = (Get-Command java -ErrorAction Stop).Source.Replace("\bin\java.exe", "")
}
$env:JAVA_HOME = $javaHome

$damlc = Get-ChildItem -Path "$dpmHome\cache\components\damlc" -Recurse -Filter "damlc.exe" |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $damlc) { throw "damlc.exe not found. Install the Daml SDK first." }

# damlc.exe sits at <dist>/damlc.exe, so the distribution root is its parent.
$distRoot = Split-Path -Parent $damlc
$packageDb = Join-Path $distRoot "resources\pkg-db_dir"
$evidence = Join-Path $project "docs\evidence"
New-Item -ItemType Directory -Path $evidence -Force | Out-Null
$log = Join-Path $evidence "daml-build.txt"

Write-Host "compiler : $damlc"
Write-Host "package db: $packageDb"
Write-Host "project   : $project"

Push-Location $project
try {
  # damlc writes its progress banner to stderr, which PowerShell surfaces as an
  # error record. Relax the preference around the native call and judge by the
  # exit code instead.
  $ErrorActionPreference = "Continue"
  & $damlc build --package-root . --package-db $packageDb --no-cache -o lookthrough.dar 2>&1 |
    Tee-Object -FilePath $log
  $exit = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  if ($exit -ne 0) {
    Write-Host ""
    Write-Host "build failed, see $log" -ForegroundColor Red
    exit $exit
  }
} finally {
  Pop-Location
}

$dar = Join-Path $project "lookthrough.dar"
if (Test-Path $dar) {
  Write-Host ""
  Write-Host ("built lookthrough.dar, {0:N0} KB" -f ((Get-Item $dar).Length / 1KB))
  Get-FileHash -LiteralPath $dar -Algorithm SHA256 | Format-List | Tee-Object -FilePath $log -Append
} else {
  throw "build reported success but no DAR was produced"
}
