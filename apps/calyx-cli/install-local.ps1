Write-Host "Building calyx-cli..."
bun run build

$Binary = ".\dist\calyx.exe"
$GlobalBin = "$env:USERPROFILE\.bun\bin\calyx.exe"

Write-Host "Installing to $GlobalBin..."
Copy-Item $Binary $GlobalBin -Force

Write-Host "✅ calyx installed successfully!"
Write-Host "Run 'calyx --help' to get started."