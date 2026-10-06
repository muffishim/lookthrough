param([switch]$CompileOnly, [string]$Compiler = "")
$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
$version = [regex]::Match((Get-Content (Join-Path $project "daml.yaml") -Raw), '(?m)^sdk-version:\s*(\S+)').Groups[1].Value
$roots = @()
if ($env:DPM_HOME) { $roots += $env:DPM_HOME }
$roots += (Join-Path $env:APPDATA "dpm"), (Join-Path $env:USERPROFILE ".dpm")
$scriptDar = $null
foreach ($root in $roots) {
  if (-not $Compiler) {
    $compilerRoot = Join-Path $root "cache/components/damlc/$version"
    if (Test-Path -LiteralPath $compilerRoot) { $Compiler = Get-ChildItem -LiteralPath $compilerRoot -Recurse -Filter damlc.exe -File | Select-Object -First 1 -ExpandProperty FullName }
  }
  $candidate = Join-Path $root "cache/components/daml-script/$version/daml-script-2.2.dar"
  if (-not $scriptDar -and (Test-Path -LiteralPath $candidate)) { $scriptDar = $candidate }
}
if (-not $Compiler -or -not $scriptDar) { throw "A complete official Daml SDK $version is required. Compiler and Daml Script DAR are needed." }
& (Join-Path $PSScriptRoot "build-daml.ps1") -Compiler $Compiler
New-Item -ItemType Directory -Path (Join-Path $project "tests/.deps") -Force | Out-Null
Copy-Item -LiteralPath $scriptDar -Destination (Join-Path $project "tests/.deps/daml-script.dar") -Force
$packageDb = Join-Path (Split-Path -Parent $Compiler) "resources/pkg-db_dir"
Push-Location $project
try {
  $ErrorActionPreference = "Continue"
  & $Compiler build --package-root tests --package-db $packageDb --no-cache -o tests/lookthrough-tests.dar 2>&1 |
    ForEach-Object { $_.ToString() } | Tee-Object -FilePath "docs/evidence/daml-test-build.txt"
  $buildExit = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  if ($buildExit -ne 0) { throw "Daml test package did not compile." }
  if ($CompileOnly) { Write-Host "Test sources compiled. Runtime assertions have NOT run."; return }
  $junit = Join-Path $project "docs/evidence/daml-junit.xml"
  if (Test-Path -LiteralPath $junit) { Remove-Item -LiteralPath $junit -Force }
  $ErrorActionPreference = "Continue"
  & $Compiler test --package-root tests --package-db $packageDb --junit $junit 2>&1 |
    ForEach-Object { $_.ToString() } | Tee-Object -FilePath "docs/evidence/daml-runtime.txt"
  $testExit = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  if ($testExit -ne 0) { throw "Daml runtime did not pass; see docs/evidence/daml-runtime.txt." }
  if (-not (Test-Path -LiteralPath "docs/evidence/daml-junit.xml")) { throw "Runtime returned without a JUnit result; tests are unverified." }
} finally { Pop-Location }
