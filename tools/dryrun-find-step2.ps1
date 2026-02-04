param([string]$Path="C:\dev\fairfare-netlify\src\components\IntakeWizard.jsx")
Set-StrictMode -Version Latest
$ErrorActionPreference="Stop"

$text = Get-Content $Path -Raw
Write-Host ("len=" + $text.Length) -ForegroundColor Cyan

$reStep2A = New-Object System.Text.RegularExpressions.Regex('(?ms)^\s*\/\/\s*-+\s*Step\s*2:.*?\r?\n\s*if\s*\(\s*step\s*===\s*2\s*\)\s*\{')
$reStep2B = New-Object System.Text.RegularExpressions.Regex('(?m)^\s*if\s*\(\s*step\s*===\s*2\s*\)\s*\{')
$m = $reStep2A.Match($text)
if(-not $m.Success){ $m = $reStep2B.Match($text) }
if(-not $m.Success){ throw "Could not find Step 2 start" }
$start=$m.Index

$reHdr = New-Object System.Text.RegularExpressions.Regex('(?m)^\s*\/\/\s*-+\s*Step\s*\d+\s*:')
$next = $reHdr.Match($text, $start + 1)
if(-not $next.Success){ throw "Could not find next Step header after Step 2" }
$end=$next.Index

Write-Host ("start=" + $start + " end=" + $end) -ForegroundColor Cyan
