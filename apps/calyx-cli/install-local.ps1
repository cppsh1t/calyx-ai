# calyx-cli local installation script
# For quick local testing of packaged calyx-cli

$ErrorActionPreference = "Stop"

# Color output functions
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Green { Write-ColorOutput Green $args }
function Write-Yellow { Write-ColorOutput Yellow $args }
function Write-Red { Write-ColorOutput Red $args }

# Get script directory
if ($PSScriptRoot) {
    $ScriptDir = $PSScriptRoot
} elseif ($MyInvocation.MyCommand.Path) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
} else {
    $ScriptDir = Get-Location
}

# If script is in apps/calyx-cli directory, ProjectRoot is its grandparent
$ScriptDir = Resolve-Path $ScriptDir
if ($ScriptDir -match "[\\/]apps[\\/]calyx-cli$") {
    $ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
    $CliDir = $ScriptDir
} else {
    # If executed from other location, use current directory as CliDir
    $CliDir = Get-Location
    $ProjectRoot = Split-Path -Parent (Split-Path -Parent $CliDir)
}

Write-Green "=== calyx-cli Local Installation Script ==="
Write-Output ""

# Step 1: Remove existing .tgz packages
Write-Yellow "[1/5] Checking and removing existing .tgz packages..."
$TgzFiles = Get-ChildItem -Path $CliDir -Filter "calyx-cli-*.tgz" -ErrorAction SilentlyContinue
if ($TgzFiles) {
    $TgzFiles | ForEach-Object { Remove-Item $_.FullName -Force }
    Write-Green "[OK] Removed old .tgz packages"
} else {
    Write-Green "[OK] No existing .tgz packages found"
}

# Step 2: Uninstall global package
Write-Output ""
Write-Yellow "[2/5] Uninstalling global calyx-cli..."
try {
    $GlobalPackages = bun pm ls -g 2>$null
    if ($GlobalPackages -match "calyx-cli") {
        bun rm -g calyx-cli
        Write-Green "[OK] Uninstalled global calyx-cli"
    } else {
        Write-Green "[OK] Global calyx-cli not installed"
    }
} catch {
    Write-Green "[OK] Global calyx-cli not installed"
}

# Step 3: Build calyx-cli
Write-Output ""
Write-Yellow "[3/5] Building calyx-cli..."
Push-Location $ProjectRoot
try {
    bun run build --filter=calyx-cli
    Write-Green "[OK] Build completed"
} finally {
    Pop-Location
}

# Step 4: Pack
Write-Output ""
Write-Yellow "[4/5] Packing calyx-cli..."
Push-Location $CliDir
try {
    npm pack
    Write-Green "[OK] Pack completed"
} finally {
    Pop-Location
}

# Step 5: Global install
Write-Output ""
Write-Yellow "[5/5] Installing calyx-cli globally..."
$TgzFile = Get-ChildItem -Path $CliDir -Filter "calyx-cli-*.tgz" | Select-Object -First 1
if (-not $TgzFile) {
    Write-Red "[ERROR] .tgz package not found"
    exit 1
}
bun add -g $TgzFile.FullName
Write-Green "[OK] Installation completed"

# Verify installation
Write-Output ""
Write-Yellow "Verifying installation..."
$CalyxCommand = Get-Command calyx -ErrorAction SilentlyContinue
if ($CalyxCommand) {
    Write-Green "[OK] calyx command is available"
    Write-Output "Location: $($CalyxCommand.Source)"
    try {
        $Version = & calyx --version 2>$null
        if ($Version) {
            Write-Output "Version: $Version"
        }
    } catch {
        Write-Yellow "[NOTE] Could not get version info"
    }
} else {
    Write-Red "[WARN] calyx command not found in PATH"
    Write-Output "You may need to restart your terminal or add bun global bin to PATH"
}

Write-Output ""
Write-Green "=== Installation Complete! ==="
