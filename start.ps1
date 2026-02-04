$ErrorActionPreference = "Stop"
$proj = "C:\Users\jmkus\Desktop\fairfare-netlify"
Set-Location $proj

# If PowerShell ever shows ">>", press Ctrl+C and run again.

# Install deps if needed
if (!(Test-Path (Join-Path $proj "node_modules"))) {
  npm install
}

# Start Vite in a new PowerShell window so this script can open the browser
Start-Process powershell -ArgumentList "-NoExit","-Command","cd `"$proj`"; npm run dev"

# Open the site
Start-Process "http://localhost:5173/"