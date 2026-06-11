param(
  [string]$Scope = "bruhad-atiyar",
  [string]$Lang = "gujarati",
  [string]$Shloka = "01",
  [string]$Model = "claude-opus-4.7",
  [int]$MaxCycles = 12,
  [int]$TimeoutMin = 45,
  [string]$Reasoning = ""
)
# Watchdog: keep retrying a single hard-to-generate verse with FRESH connections,
# each capped by PPT_COPILOT_TIMEOUT_MS so a dead socket can't hang for hours.
# Degrades reasoning (high -> medium -> low) as a hedge if the largest outputs keep
# truncating. Stops the instant the target file appears. Dumps raw output per cycle
# (PPT_DUMP_RAW) so a near-complete-but-unparseable response can be salvaged.
$ErrorActionPreference = "Continue"
$repo = "C:\Repos\Panch.Pratikraman"
Set-Location $repo
$ts = Get-Date -Format "yyyy-MM-dd-HH-mm"
$wlog = "data\logs\watchdog-$Scope-$ts.log"
function Log($m){ $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $m; $line | Tee-Object -FilePath $wlog -Append | Out-Null; $line }

$env:PPT_COPILOT_TIMEOUT_MS = ($TimeoutMin * 60 * 1000)
$target = "data\translations\$Scope\${Scope}__$Shloka.$Lang.json"
Log "watchdog start: scope=$Scope shloka=$Shloka lang=$Lang model=$Model timeout=${TimeoutMin}min maxCycles=$MaxCycles target=$target"

for ($i = 1; $i -le $MaxCycles; $i++) {
  if (Test-Path $target) { Log "target already present before cycle $i"; break }
  $r = if ($Reasoning) { $Reasoning } elseif ($i -le 4) { "high" } elseif ($i -le 8) { "medium" } else { "low" }
  $env:PPT_DUMP_RAW = "$repo\data\logs\rawdump-$Scope-c$i-$ts.txt"
  Log "cycle $i/${MaxCycles}: reasoning=$r launching translate ..."
  & node index.js translate --scope $Scope --lang $Lang --model $Model --reasoning $r --context long_context -v *>> $wlog
  if (Test-Path $target) {
    Log "SUCCESS: cycle $i produced target ($([math]::Round((Get-Item $target).Length/1KB,1)) KB)"
    break
  }
  $dumpSize = if (Test-Path $env:PPT_DUMP_RAW) { (Get-Item $env:PPT_DUMP_RAW).Length } else { 0 }
  Log "cycle $i failed; raw dump = $dumpSize bytes at $($env:PPT_DUMP_RAW)"
}

if (Test-Path $target) { Log "DONE target exists." } else { Log "EXHAUSTED cycles; target still missing." }
