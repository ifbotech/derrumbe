<#
.SYNOPSIS
  Bucle autónomo del estudio DERRUMBE: construye una versión tras otra (V6 → V10) y solo deja pasar
  la que no empeora. Windows PowerShell 5.1 o superior.

.DESCRIPTION
  Por cada versión vN, con su especificación en SPECS\V{N}.md:

    1. Rama estudio/vN desde main.
    2. Celdas: una sesión de Claude Code sin ventana por cada bloque "### Celda: <subagente>" de la
       especificación (claude -p --agent <subagente>), con DUNGEON_HERO puesto para que su sala del
       calabozo (Director, Reglas-Balance, Arte-UI, Juice-UX) se encienda mientras trabaja.
    3. Puertas de CPU, en orden: typecheck, test, analyze:meta (sin avisos), docs, qa:visual, qa:smoke.
       Si una falla, la celda responsable recibe el registro y lo arregla (-Intentos veces).
    4. Cierre: las celdas del director corren después de las puertas, con sus medidas delante, y
       escriben el registro de cambios. Commit candidato "DERRUMBE N.0" en la rama.
    5. Puerta de GPU: el panel simulado de ..\panelAgentesGaming sobre ese commit (RTX 3090), con la
       sala QA-3090 animada mientras corre.
    6. Veredicto: compara aprobación por persona y claridad media con v(N-1). Si no hay regresión,
       fusiona en main y etiqueta vN.0.0; si la hay, main queda como estaba y la rama se aparta como
       rechazado/vN-<fecha>. Nunca reescribe main.

  Todo queda registrado en artifacts\estudio\vN\ (un .log por celda y por puerta, y veredicto.json).

.PARAMETER Desde
  Primera versión que se construye (por defecto 6).
.PARAMETER Hasta
  Última versión (por defecto 10).
.PARAMETER BasePanel
  run_id del panel con el que se compara la primera versión. Sin él, se usa el que guardó la versión
  anterior en artifacts\estudio\estado.json y, si no hay, se audita main antes de empezar.
.PARAMETER Preset
  Preset del panel (por defecto v4-completo: 240 personas, unos 90-105 minutos).
.PARAMETER Intentos
  Rondas de reparación por puerta de CPU antes de apartar la versión (por defecto 2).
.PARAMETER Permisos
  Modo de permisos de las sesiones sin ventana (por defecto acceptEdits, con una lista corta de
  órdenes permitidas: npm, node, npx y git de solo lectura).
.PARAMETER MargenAprobacion
  Puntos de aprobación que puede bajar una versión sin contarse como regresión (por defecto 3).
  Con 240 personas el intervalo de confianza del 95 % es de unos +-6 puntos.
.PARAMETER MargenClaridad
  Lo que puede bajar la claridad media (escala 0-10) sin contarse como regresión (por defecto 0.15).
.PARAMETER SinGpu
  Se salta la puerta de GPU: la versión se acepta solo con las puertas de CPU.
.PARAMETER SinLaboratorio
  Se salta analyze:meta (solo para ensayar el circuito; una versión de verdad no lo usa).
.PARAMETER Publicar
  Tras aceptar una versión, git push origin main --follow-tags (publica en GitHub Pages).
.PARAMETER ReiniciarOllama
  Reinicia ollama serve con las variables recomendadas para la 3090 antes de cada auditoría.
.PARAMETER Ensayo
  No ejecuta nada: enseña las celdas y las puertas de cada versión.

.EXAMPLE
  .\scripts\estudio-autonomo.ps1                          # V6 a V10, sin publicar
  .\scripts\estudio-autonomo.ps1 -Publicar -ReiniciarOllama
  .\scripts\estudio-autonomo.ps1 -Desde 7 -Hasta 7        # solo la V7
  .\scripts\estudio-autonomo.ps1 -Ensayo                  # qué haría, sin tocar nada
#>
param(
  [ValidateRange(5, 99)][int]$Desde = 6,
  [ValidateRange(5, 99)][int]$Hasta = 10,
  [string]$BasePanel = "",
  [string]$Preset = "v4-completo",
  [ValidateRange(0, 5)][int]$Intentos = 2,
  [ValidateSet("acceptEdits", "auto", "dontAsk", "bypassPermissions")][string]$Permisos = "acceptEdits",
  [string]$Modelo = "",
  [double]$MargenAprobacion = 3.0,
  [double]$MargenClaridad = 0.15,
  [switch]$SinGpu,
  [switch]$SinLaboratorio,
  [switch]$Publicar,
  [switch]$ReiniciarOllama,
  [switch]$Ensayo
)

$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Panel = Join-Path (Split-Path -Parent $Raiz) "panelAgentesGaming"
$Py = Join-Path $Panel ".venv\Scripts\python.exe"
$Gancho = Join-Path $env:USERPROFILE ".claude\dungeon_hook.mjs"
$Registro = Join-Path $Raiz "artifacts\estudio"
$ArchivoEstado = Join-Path $Registro "estado.json"
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$SALAS = @{ "director" = "Director"; "reglas-balance" = "Reglas-Balance"; "arte-ui" = "Arte-UI"; "juice-ux" = "Juice-UX" }
$PERMITIDAS = @(
  "Read", "Edit", "Write", "Glob", "Grep",
  "Bash(npm run:*)", "Bash(npm test:*)", "Bash(npx tsc:*)", "Bash(npx vite:*)", "Bash(npx tsx:*)", "Bash(node:*)",
  "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(git show:*)",
  "PowerShell(npm run:*)", "PowerShell(npm test:*)", "PowerShell(npx tsc:*)", "PowerShell(npx vite:*)", "PowerShell(npx tsx:*)", "PowerShell(node:*)",
  "PowerShell(git status:*)", "PowerShell(git diff:*)", "PowerShell(git log:*)", "PowerShell(git show:*)"
)

# ───────────────────────── Utilidades ─────────────────────────

function Decir([string]$texto, [string]$color = "Gray") { Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $texto) -ForegroundColor $color }

# Enciende una sala de Pixel Dungeon. Nunca detiene el bucle: si el calabozo no está, se sigue igual.
function Sala([string]$heroe, [string]$estado, [string]$detalle) {
  if ($Ensayo -or -not (Test-Path $Gancho)) { return }
  try { & node $Gancho set $heroe $estado $detalle 2>$null | Out-Null } catch { }
}

# Ejecuta una orden en la raíz del juego con toda su salida en un registro. Devuelve el código de salida.
function Correr([string]$orden, [string]$log, [string]$en = $Raiz) {
  Push-Location $en
  try {
    cmd /c "$orden > `"$log`" 2>&1"
    return $LASTEXITCODE
  } finally { Pop-Location }
}

function Repo([string]$argumentos) {
  Push-Location $Raiz
  try {
    $salida = cmd /c "git $argumentos 2>&1"
    if ($LASTEXITCODE -ne 0) { throw "git $argumentos falló: $salida" }
    return $salida
  } finally { Pop-Location }
}

function Cola([string]$log, [int]$lineas = 60) {
  if (-not (Test-Path $log)) { return "" }
  return ((Get-Content -Path $log -Tail $lineas -Encoding UTF8) -join "`n")
}

function LeerEstado {
  if (Test-Path $ArchivoEstado) { return (Get-Content -Raw -Encoding UTF8 $ArchivoEstado | ConvertFrom-Json) }
  return (New-Object psobject)
}

function GuardarEstado($estado) {
  New-Item -ItemType Directory -Force $Registro | Out-Null
  [System.IO.File]::WriteAllText($ArchivoEstado, ($estado | ConvertTo-Json -Depth 6), $Utf8)
}

# Las celdas de una especificación: bloques "### Celda: <subagente>" hasta la celda o sección siguiente.
function LeerCeldas([int]$n) {
  $ruta = Join-Path $Raiz "SPECS\V$n.md"
  if (-not (Test-Path $ruta)) { throw "Falta SPECS\V$n.md: el director tiene que escribir la especificación antes." }
  $texto = Get-Content -Raw -Encoding UTF8 $ruta
  $tema = "V$n"
  # el título de la especificación, sin su «V6 · » de cabecera
  if ($texto -match "(?m)^#\s+(.+)$") { $tema = ($Matches[1].Trim() -replace '^V\d+\s*\S\s+', '') }
  $celdas = @()
  foreach ($m in [regex]::Matches($texto, "(?ms)^###\s+Celda:\s*([a-z\-]+)\s*\r?\n(.*?)(?=^###\s+Celda:|^##\s|\z)")) {
    $nombre = $m.Groups[1].Value
    if (-not $SALAS.ContainsKey($nombre)) { throw "SPECS\V$n.md: la celda '$nombre' no es un subagente del estudio." }
    $celdas += [pscustomobject]@{ Nombre = $nombre; Encargo = $m.Groups[2].Value.Trim() }
  }
  if ($celdas.Count -eq 0) { throw "SPECS\V$n.md no tiene ninguna celda '### Celda: <subagente>'." }
  return [pscustomobject]@{ Tema = $tema; Celdas = $celdas; Ruta = $ruta }
}

# Una sesión de Claude Code sin ventana con el subagente de la celda. El encargo entra por la entrada estándar.
function LanzarCelda([int]$n, [string]$nombre, [string]$encargo, [string]$etiqueta) {
  $carpeta = Join-Path $Registro "v$n"
  New-Item -ItemType Directory -Force $carpeta | Out-Null
  $pedido = Join-Path $carpeta "$etiqueta.pedido.md"
  $log = Join-Path $carpeta "$etiqueta.log"
  $cabecera = @"
Sprint DERRUMBE V$n, rama estudio/v$n. Eres la celda '$nombre' del estudio: sigue tu reglamento.
Otras celdas ya trabajaron o trabajarán después de ti en esta misma rama: toca solo tus archivos.
No ejecutes git commit, push, stash, reset, restore ni checkout: el commit lo hace el orquestador.
Cuando termines, deja en verde tus propias comprobaciones y acaba con un informe breve de lo que cambió.

"@
  [System.IO.File]::WriteAllText($pedido, $cabecera + $encargo + "`n", $Utf8)
  $sala = $SALAS[$nombre]
  $lista = ($PERMITIDAS | ForEach-Object { "`"$_`"" }) -join " "
  $orden = "claude -p --agent $nombre --permission-mode $Permisos --allowedTools $lista"
  if ($Modelo) { $orden += " --model $Modelo" }
  $orden += " < `"$pedido`""
  Decir "Celda $nombre ($etiqueta) -> $log" "Cyan"
  Sala $sala "working" "V$n · $etiqueta"
  $env:DUNGEON_HERO = $sala
  try { $codigo = Correr $orden $log } finally { Remove-Item Env:\DUNGEON_HERO -ErrorAction SilentlyContinue }
  if ($codigo -eq 0) { Sala $sala "done" "V$n · $etiqueta terminada" } else { Sala $sala "blocked" "V$n · $etiqueta salió con código $codigo" }
  return ($codigo -eq 0)
}

# A qué celda le toca arreglar una puerta que falla.
function Responsable([string]$puerta, [string]$log) {
  switch ($puerta) {
    "analyze-meta" { return "reglas-balance" }
    "test" { return "reglas-balance" }
    "docs" { return "reglas-balance" }
    "qa-visual" { return "arte-ui" }
    "qa-smoke" { return "juice-ux" }
  }
  # typecheck: decide el primer archivo con error
  $texto = Cola $log 200
  if ($texto -match "src/rules/|tests/|scripts/(analyze-meta|lab|reglas|simulate)") { return "reglas-balance" }
  if ($texto -match "src/client/(audio|fx|nav|prompts|whispers|tutorial-ui)\.ts|scripts/(smoke|gamepad-qa)") { return "juice-ux" }
  return "arte-ui"
}

# Una puerta de CPU. La del laboratorio, además de terminar bien, no puede dejar avisos en el informe.
function Puerta([int]$n, [string]$nombre, [string]$orden) {
  $log = Join-Path $Registro "v$n\puerta-$nombre.log"
  for ($intento = 0; $intento -le $Intentos; $intento++) {
    Decir "Puerta $nombre$(if ($intento) { " (reintento $intento)" })" "Yellow"
    $codigo = Correr $orden $log
    $motivo = ""
    if ($codigo -ne 0) { $motivo = "terminó con código $codigo" }
    elseif ($nombre -eq "analyze-meta") {
      $avisos = & node -e "const r=require(process.argv[1]);console.log((r.flags||[]).join(' | '))" (Join-Path $Raiz "scripts\meta-report.json")
      if ($avisos) { $motivo = "el laboratorio deja avisos: $avisos" }
    }
    if (-not $motivo) { Decir "Puerta ${nombre}: pasa" "Green"; return $true }
    Decir "Puerta ${nombre}: $motivo" "Red"
    if ($intento -ge $Intentos) { break }
    $celda = Responsable $nombre $log
    $arreglo = @"
La puerta '$nombre' ($orden) no pasa en la rama estudio/v${n}: $motivo.
Arregla la causa en tus archivos (no relajes la comprobación ni cambies el objetivo) y vuelve a ejecutarla hasta que pase.

Final del registro:

$(Cola $log 80)
"@
    LanzarCelda $n $celda $arreglo "arreglo-$nombre-$($intento + 1)" | Out-Null
  }
  return $false
}

# Aprobación por persona y claridad media de una corrida del panel (lo calcula node: el JSON es grande).
function LeerPanel([string]$runId) {
  $ruta = Join-Path $Panel "salidas\$runId\agregados.json"
  if (-not (Test-Path $ruta)) { throw "No encuentro $ruta" }
  $js = "const a=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const c=a.resenas.map(r=>r.claridad).filter(x=>typeof x==='number');console.log(JSON.stringify({aprobacion:a.aprobacion.personas.pct,n:a.aprobacion.personas.n,claridad:Math.round(c.reduce((s,x)=>s+x,0)/Math.max(1,c.length)*100)/100}))"
  return ((& node -e $js $ruta) | ConvertFrom-Json)
}

# Puerta de GPU: snapshot del commit, corrida del panel y la sala QA-3090 animada con su avance.
function AuditarConPanel([string]$etiqueta, [string]$sha, [string]$compararCon) {
  if (-not (Test-Path $Py)) { throw "No encuentro $Py. Crea el entorno del panel (ver su LEEME.md) o usa -SinGpu." }
  $carpeta = Join-Path $Registro $etiqueta
  New-Item -ItemType Directory -Force $carpeta | Out-Null
  $log = Join-Path $carpeta "panel.log"
  $env:OLLAMA_FLASH_ATTENTION = "1"; $env:OLLAMA_KV_CACHE_TYPE = "q8_0"; $env:OLLAMA_NUM_PARALLEL = "2"; $env:OLLAMA_MAX_LOADED_MODELS = "1"
  $env:PYTHONUTF8 = "1"; $env:PYTHONUNBUFFERED = "1"
  if ($ReiniciarOllama) {
    Sala "QA-3090" "working" "Reiniciando Ollama para la 3090"
    Get-Process -Name "ollama app", "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force -Confirm:$false
    Start-Sleep -Seconds 2
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Minimized
    $ok = $false
    for ($i = 0; $i -lt 30; $i++) { try { Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 | Out-Null; $ok = $true; break } catch { Start-Sleep -Seconds 1 } }
    if (-not $ok) { throw "ollama serve no respondió en 30 s" }
  }
  Sala "QA-3090" "working" "$etiqueta · snapshot del commit $($sha.Substring(0, 7))"
  $codigo = Correr "`"$Py`" -m panel_gaming snapshot --derrumbe-path `"$Raiz`" --commit-esperado $sha" (Join-Path $carpeta "panel-snapshot.log") $Panel
  if ($codigo -ne 0) { Sala "QA-3090" "blocked" "$etiqueta · el snapshot falló"; throw "El snapshot del panel falló: $(Cola (Join-Path $carpeta 'panel-snapshot.log') 15)" }
  $orden = "`"$Py`" -m panel_gaming run --preset $Preset --snapshot ultimo --commit-esperado $sha"
  if ($compararCon) { $orden += " --comparar-con $compararCon" }
  Decir "Puerta de GPU: panel $Preset sobre $($sha.Substring(0, 7)) -> $log" "Magenta"
  # el panel corre en segundo plano; mientras, su última línea de avance va a la sala QA-3090
  $trabajo = Start-Job -ScriptBlock { param($en, $orden, $log) Set-Location $en; cmd /c "$orden > `"$log`" 2>&1"; $LASTEXITCODE } -ArgumentList $Panel, $orden, $log
  while ($trabajo.State -eq "Running") {
    Start-Sleep -Seconds 20
    $ultima = (Cola $log 1)
    if ($ultima) { Sala "QA-3090" "working" ("{0} · {1}" -f $etiqueta, $ultima) }
  }
  $codigo = Receive-Job $trabajo | Select-Object -Last 1
  Remove-Job $trabajo -Force
  $texto = Get-Content -Raw -Encoding UTF8 $log
  $runId = ""
  if ($texto -match "Corrida\s+(\S+)\s+\S+\s+preset") { $runId = $Matches[1] }
  if ($codigo -ne 0 -or -not $runId) { Sala "QA-3090" "blocked" "$etiqueta · el panel no terminó"; throw "El panel no terminó (código $codigo). Se retoma con: python -m panel_gaming run --resume $runId. Registro: $log" }
  $r = LeerPanel $runId
  Sala "QA-3090" "done" ("{0} · aprobación {1} % · claridad {2}" -f $etiqueta, $r.aprobacion, $r.claridad)
  return [pscustomobject]@{ RunId = $runId; Aprobacion = [double]$r.aprobacion; Claridad = [double]$r.claridad; N = [int]$r.n }
}

# La rama no entra en main: se guarda lo que haya, se vuelve a main y la rama se aparta con otro nombre.
function Apartar([int]$n, [string]$motivo) {
  Decir "V$n apartada: $motivo" "Red"
  if (Repo "status --porcelain") {
    Repo "add -A" | Out-Null
    Repo "commit -m `"V$n apartada: trabajo sin terminar`"" | Out-Null
  }
  $nombre = "rechazado/v$n-$(Get-Date -Format 'yyyyMMdd-HHmm')"
  Repo "switch main" | Out-Null
  Repo "branch -m estudio/v$n $nombre" | Out-Null
  Sala "Director" "blocked" "V$n apartada: $motivo"
  [System.IO.File]::WriteAllText((Join-Path $Registro "v$n\veredicto.json"), (@{ version = $n; aceptada = $false; motivo = $motivo; rama = $nombre } | ConvertTo-Json), $Utf8)
  Decir "main queda como estaba. La rama apartada es $nombre." "Red"
}

# ───────────────────────── Comprobaciones previas ─────────────────────────

if ($Hasta -lt $Desde) { throw "-Hasta ($Hasta) no puede ser menor que -Desde ($Desde)." }
Set-Location $Raiz
New-Item -ItemType Directory -Force $Registro | Out-Null

$PUERTAS = @(
  @{ Nombre = "typecheck"; Orden = "npm run typecheck" },
  @{ Nombre = "test"; Orden = "npm test" },
  @{ Nombre = "analyze-meta"; Orden = "npm run analyze:meta" },
  @{ Nombre = "docs"; Orden = "npm run docs" },
  @{ Nombre = "qa-visual"; Orden = "npm run qa:visual" },
  @{ Nombre = "qa-smoke"; Orden = "npm run qa:smoke" }
)
if ($SinLaboratorio) { $PUERTAS = $PUERTAS | Where-Object { $_.Nombre -ne "analyze-meta" } }

if ($Ensayo) {
  Decir "ENSAYO: no se ejecuta nada." "Yellow"
  for ($n = $Desde; $n -le $Hasta; $n++) {
    $spec = LeerCeldas $n
    Write-Host ""
    Write-Host "V$n · $($spec.Tema)" -ForegroundColor White
    Write-Host "  rama      estudio/v$n"
    foreach ($c in $spec.Celdas) { Write-Host ("  celda     {0,-15} sala {1,-15} {2} caracteres de encargo" -f $c.Nombre, $SALAS[$c.Nombre], $c.Encargo.Length) }
    Write-Host ("  puertas   " + (($PUERTAS | ForEach-Object { $_.Orden }) -join " -> "))
    if ($SinGpu) { Write-Host "  GPU       (omitida con -SinGpu)" } else { Write-Host "  GPU       panel $Preset en $Panel · sala QA-3090 · margen -$MargenAprobacion puntos de aprobación, -$MargenClaridad de claridad" }
    Write-Host ("  si pasa   fusiona en main, etiqueta v$n.0.0" + $(if ($Publicar) { " y publica (git push --follow-tags)" } else { " (sin publicar: añade -Publicar)" }))
    Write-Host "  si no     main intacta; rama apartada como rechazado/v$n-<fecha>"
  }
  exit 0
}

foreach ($herramienta in @("git", "node", "npm", "claude")) {
  if (-not (Get-Command $herramienta -ErrorAction SilentlyContinue)) { throw "No encuentro '$herramienta' en el PATH." }
}
if ((Repo "rev-parse --abbrev-ref HEAD") -ne "main") { throw "Empieza desde la rama main." }
if (Repo "status --porcelain") { throw "Hay cambios sin guardar en el árbol de trabajo. Haz commit o descártalos antes de lanzar el bucle." }
for ($n = $Desde; $n -le $Hasta; $n++) { LeerCeldas $n | Out-Null }

# que la máquina no se duerma mientras dure el bucle (solo este proceso; no toca la configuración de energía)
Add-Type -Namespace Estudio -Name Energia -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
[Estudio.Energia]::SetThreadExecutionState([uint32]"0x80000001") | Out-Null

$estado = LeerEstado
$base = $null

try {
  # ── línea base de la puerta de GPU: la corrida del panel de la versión anterior ──
  if (-not $SinGpu) {
    $anterior = "v$($Desde - 1)"
    $runBase = $BasePanel
    if (-not $runBase -and $estado.PSObject.Properties[$anterior]) { $runBase = $estado.$anterior.run_id }
    if ($runBase) {
      $r = LeerPanel $runBase
      $base = [pscustomobject]@{ RunId = $runBase; Aprobacion = [double]$r.aprobacion; Claridad = [double]$r.claridad; N = [int]$r.n }
    } else {
      Decir "No hay auditoría de $anterior con la que comparar: se audita main antes de empezar." "Magenta"
      $log = Join-Path $Registro "base-qa-visual.log"
      if ((Correr "npm run qa:visual" $log) -ne 0) { throw "main no pasa qa:visual: no sirve de línea base. Registro: $log" }
      $base = AuditarConPanel "base-$anterior" (Repo "rev-parse HEAD") ""
      $estado | Add-Member -NotePropertyName $anterior -NotePropertyValue ([pscustomobject]@{ run_id = $base.RunId; aprobacion = $base.Aprobacion; claridad = $base.Claridad; sha = (Repo "rev-parse HEAD") }) -Force
      GuardarEstado $estado
    }
    Decir ("Línea base {0}: aprobación {1} % · claridad {2} (n = {3})" -f $base.RunId, $base.Aprobacion, $base.Claridad, $base.N) "Magenta"
  }

  for ($n = $Desde; $n -le $Hasta; $n++) {
    $spec = LeerCeldas $n
    $carpeta = Join-Path $Registro "v$n"
    New-Item -ItemType Directory -Force $carpeta | Out-Null
    Write-Host ""
    Decir "════ V$n · $($spec.Tema) ════" "White"
    Sala "Director" "working" "V$n · reparte $($spec.Celdas.Count) celdas"
    Repo "switch -c estudio/v$n" | Out-Null

    # ── celdas de obra, en el orden de la especificación (las del director van al cierre) ──
    $i = 0
    $fallida = ""
    foreach ($c in ($spec.Celdas | Where-Object { $_.Nombre -ne "director" })) {
      $i++
      if (-not (LanzarCelda $n $c.Nombre $c.Encargo ("celda-{0}-{1}" -f $i, $c.Nombre))) { $fallida = $c.Nombre; break }
    }
    if ($fallida) { Apartar $n "la celda $fallida no terminó (ver artifacts\estudio\v$n)"; break }

    # ── puertas de CPU ──
    Sala "Director" "working" "V$n · puertas de CPU"
    $rota = ""
    foreach ($p in $PUERTAS) { if (-not (Puerta $n $p.Nombre $p.Orden)) { $rota = $p.Nombre; break } }
    if ($rota) { Apartar $n "la puerta $rota no pasa tras $Intentos reintentos"; break }

    # ── cierre: el director escribe el registro de cambios con las medidas reales de las puertas ──
    $medidas = ($PUERTAS | ForEach-Object { "### $($_.Orden)`n$(Cola (Join-Path $carpeta "puerta-$($_.Nombre).log") 25)" }) -join "`n`n"
    foreach ($c in ($spec.Celdas | Where-Object { $_.Nombre -eq "director" })) {
      $i++
      $cierre = "$($c.Encargo)`n`nLas puertas de CPU ya pasaron. Usa solo estas medidas (final de cada registro); el veredicto del panel lo escribe el orquestador en la etiqueta de la versión, no tú.`n`n$medidas"
      if (-not (LanzarCelda $n $c.Nombre $cierre ("celda-{0}-{1}" -f $i, $c.Nombre))) { $fallida = $c.Nombre; break }
    }
    if ($fallida) { Apartar $n "la celda de cierre del director no terminó"; break }

    # ── commit candidato (solo con la autoría de quien lanza el bucle) ──
    Correr "npm version $n.0.0 --no-git-tag-version --allow-same-version" (Join-Path $carpeta "version.log") | Out-Null
    Repo "add -A" | Out-Null
    if (-not (Repo "status --porcelain")) { Apartar $n "las celdas no cambiaron nada"; break }
    $mensaje = Join-Path $carpeta "commit.txt"
    [System.IO.File]::WriteAllText($mensaje, "DERRUMBE $n.0: $($spec.Tema)`n", $Utf8)
    Repo "commit -F `"$mensaje`"" | Out-Null
    $sha = Repo "rev-parse HEAD"
    Decir "Commit candidato $($sha.Substring(0, 7))" "Green"

    # ── puerta de GPU y veredicto ──
    $panel = $null
    if (-not $SinGpu) {
      Sala "Director" "working" "V$n · esperando al panel de la 3090"
      $panel = AuditarConPanel "v$n" $sha $base.RunId
      $dA = [math]::Round($panel.Aprobacion - $base.Aprobacion, 1)
      $dC = [math]::Round($panel.Claridad - $base.Claridad, 2)
      Decir ("Panel V{0}: aprobación {1} % ({2:+0.0;-0.0}) · claridad {3} ({4:+0.00;-0.00}) frente a {5}" -f $n, $panel.Aprobacion, $dA, $panel.Claridad, $dC, $base.RunId) "Magenta"
      if ($dA -lt (-1 * $MargenAprobacion) -or $dC -lt (-1 * $MargenClaridad)) {
        Apartar $n ("regresión en el panel: aprobación {0:+0.0;-0.0} puntos, claridad {1:+0.00;-0.00} (corrida {2})" -f $dA, $dC, $panel.RunId)
        break
      }
    }

    Repo "switch main" | Out-Null
    Repo "merge --ff-only estudio/v$n" | Out-Null
    # la etiqueta lleva el veredicto del panel: queda en el historial sin tocar más archivos
    $nota = "DERRUMBE $n.0"
    if ($panel) { $nota = "DERRUMBE {0}.0 - panel {1}: aprobacion {2} % ({3:+0.0;-0.0}), claridad {4} ({5:+0.00;-0.00})" -f $n, $panel.RunId, $panel.Aprobacion, $dA, $panel.Claridad, $dC }
    Repo "tag -a v$n.0.0 -m `"$nota`"" | Out-Null
    Repo "branch -d estudio/v$n" | Out-Null
    if ($Publicar) { Repo "push origin main --follow-tags" | Out-Null; Decir "Publicada: main y v$n.0.0 en origin." "Green" }
    $veredicto = [pscustomobject]@{ version = $n; aceptada = $true; sha = $sha; etiqueta = "v$n.0.0"; publicada = [bool]$Publicar }
    if ($panel) {
      $veredicto | Add-Member -NotePropertyName panel -NotePropertyValue ([pscustomobject]@{ run_id = $panel.RunId; aprobacion = $panel.Aprobacion; claridad = $panel.Claridad; base = $base.RunId; delta_aprobacion = $dA; delta_claridad = $dC })
      $estado | Add-Member -NotePropertyName "v$n" -NotePropertyValue ([pscustomobject]@{ run_id = $panel.RunId; aprobacion = $panel.Aprobacion; claridad = $panel.Claridad; sha = $sha }) -Force
      GuardarEstado $estado
      $base = $panel
    }
    [System.IO.File]::WriteAllText((Join-Path $carpeta "veredicto.json"), ($veredicto | ConvertTo-Json -Depth 5), $Utf8)
    Sala "Director" "done" "V$n aceptada y etiquetada v$n.0.0"
    Decir "V$n aceptada: etiqueta v$n.0.0." "Green"
  }
} finally {
  [Estudio.Energia]::SetThreadExecutionState([uint32]"0x80000000") | Out-Null
  Remove-Item Env:\DUNGEON_HERO -ErrorAction SilentlyContinue
}
