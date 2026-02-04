param(
  [string]$Path = ".\src\components\IntakeWizard.jsx"
)

if(-not (Test-Path $Path)){
  Write-Error "File not found: $Path"
  exit 1
}

$lines = Get-Content $Path
function Show-Range([int]$Start,[int]$End,[string]$Title){
  Write-Host ""
  Write-Host "===== $Title ($Start..$End) =====" -ForegroundColor Cyan
  for($i=$Start; $i -le $End; $i++){
    if($i -ge 1 -and $i -le $lines.Count){
      "{0,4}: {1}" -f $i, $lines[$i-1]
    }
  }
}

# Find likely step/validation area near where returnDate comparisons appear
$idxReturnCompare = (Select-String -Path $Path -Pattern "trip\.returnDate < trip\.departDate" -SimpleMatch).LineNumber | Select-Object -First 1
if($idxReturnCompare){ Show-Range ([Math]::Max(1,$idxReturnCompare-40)) ([Math]::Min($lines.Count,$idxReturnCompare+60)) "Validation / step gating region" }

# Find the returnDate input block
$idxReturnInput = (Select-String -Path $Path -Pattern "value={trip.returnDate" -SimpleMatch).LineNumber | Select-Object -First 1
if($idxReturnInput){ Show-Range ([Math]::Max(1,$idxReturnInput-60)) ([Math]::Min($lines.Count,$idxReturnInput+120)) "Return date UI block" }

# Find departDate setter block (where departDate is set and return adjusted)
$idxDepartSetter = (Select-String -Path $Path -Pattern "setTrip({ ...trip, departDate" -SimpleMatch).LineNumber | Select-Object -First 1
if($idxDepartSetter){ Show-Range ([Math]::Max(1,$idxDepartSetter-60)) ([Math]::Min($lines.Count,$idxDepartSetter+80)) "Depart date setter block" }

# Find any step variable / navigation buttons
$idxStep = (Select-String -Path $Path -Pattern "setStep(" -SimpleMatch).LineNumber | Select-Object -First 1
if($idxStep){ Show-Range ([Math]::Max(1,$idxStep-80)) ([Math]::Min($lines.Count,$idxStep+120)) "Step navigation region" }

Write-Host ""
Write-Host "Done. Paste the printed sections here and I'll give you a complete patch script to split Depart/Return into separate pages." -ForegroundColor Green
