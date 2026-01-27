# Clawdbot Windows Companion - Build & Package Script
# Run from apps/windows directory

param(
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",
    
    [switch]$SelfContained,
    [switch]$SingleFile,
    [switch]$CreateInstaller
)

$ErrorActionPreference = "Stop"

# Paths
$ProjectPath = "src\Clawdbot.Windows\Clawdbot.Windows.csproj"
$OutputDir = "publish"
$InstallerDir = "installer"

Write-Host "=== Clawdbot Windows Companion Build ===" -ForegroundColor Cyan
Write-Host "Configuration: $Configuration"
Write-Host "Self-Contained: $SelfContained"
Write-Host "Single File: $SingleFile"
Write-Host ""

# Clean previous builds
if (Test-Path $OutputDir) {
    Write-Host "Cleaning previous publish output..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $OutputDir
}

# Build arguments
$PublishArgs = @(
    "publish",
    $ProjectPath,
    "-c", $Configuration,
    "-o", $OutputDir,
    "-r", "win-x64"
)

if ($SelfContained) {
    $PublishArgs += "--self-contained", "true"
    Write-Host "Building self-contained (includes .NET runtime)..." -ForegroundColor Green
} else {
    $PublishArgs += "--self-contained", "false"
    Write-Host "Building framework-dependent (requires .NET 9 runtime)..." -ForegroundColor Green
}

if ($SingleFile) {
    $PublishArgs += "-p:PublishSingleFile=true"
    $PublishArgs += "-p:IncludeNativeLibrariesForSelfExtract=true"
    Write-Host "Creating single-file executable..." -ForegroundColor Green
}

# Run dotnet publish
Write-Host ""
Write-Host "Running: dotnet $($PublishArgs -join ' ')" -ForegroundColor Gray
& dotnet @PublishArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Get output info
$ExePath = Join-Path $OutputDir "Clawdbot.exe"
if (Test-Path $ExePath) {
    $ExeSize = (Get-Item $ExePath).Length / 1MB
    Write-Host ""
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host "Output: $ExePath"
    Write-Host "Size: $([math]::Round($ExeSize, 2)) MB"
    
    # List all files
    Write-Host ""
    Write-Host "Published files:" -ForegroundColor Cyan
    Get-ChildItem $OutputDir -Recurse | Where-Object { !$_.PSIsContainer } | ForEach-Object {
        $RelPath = $_.FullName.Replace((Resolve-Path $OutputDir).Path + "\", "")
        $Size = [math]::Round($_.Length / 1KB, 1)
        Write-Host "  $RelPath ($Size KB)"
    }
}

# Create installer if requested
if ($CreateInstaller) {
    Write-Host ""
    Write-Host "=== Creating Installer ===" -ForegroundColor Cyan
    
    # Check for Inno Setup
    $InnoPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    if (!(Test-Path $InnoPath)) {
        Write-Host "Inno Setup not found at: $InnoPath" -ForegroundColor Yellow
        Write-Host "Download from: https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
        Write-Host "Skipping installer creation." -ForegroundColor Yellow
    } else {
        # Create installer script if not exists
        $IssPath = Join-Path $InstallerDir "clawdbot.iss"
        if (!(Test-Path $IssPath)) {
            Write-Host "Installer script not found: $IssPath" -ForegroundColor Yellow
            Write-Host "Run: .\scripts\create-installer-script.ps1 first" -ForegroundColor Yellow
        } else {
            Write-Host "Building installer with Inno Setup..."
            & $InnoPath $IssPath
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Installer created successfully!" -ForegroundColor Green
            }
        }
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run: .\$ExePath"
Write-Host "To test: dotnet test"
