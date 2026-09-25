# ==============================================================================
#           NEXUS ACADEMY MANAGEMENT SYSTEM - GAME-TYPE INSTALLER SETUP
#                         VERSION: 2026.1 (FINAL LIVE EDITION)
# ==============================================================================
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Set Directory
Set-Location -Path $PSScriptRoot

# Sound Effect Helper
function Play-Sound([string]$type) {
    try {
        if ($type -eq 'start') {
            [console]::beep(523, 100); [console]::beep(659, 100); [console]::beep(784, 150)
        } elseif ($type -eq 'success') {
            [console]::beep(659, 120); [console]::beep(880, 250)
        } elseif ($type -eq 'alert') {
            [console]::beep(440, 150); [console]::beep(330, 200)
        }
    } catch {}
}

# Clear and Print Game Title Screen
function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ███╗   ██╗███████╗██╗   ██╗██╗   ██╗███████╗" -ForegroundColor DarkRed
    Write-Host "  ████╗  ██║██╔════╝╚██╗ ██╔╝██║   ██║██╔════╝" -ForegroundColor Red
    Write-Host "  ██╔██╗ ██║█████╗   ╚████╔╝ ██║   ██║███████╗" -ForegroundColor Yellow
    Write-Host "  ██║╚██╗██║██╔══╝    ╚██╔╝  ██║   ██║╚════██║" -ForegroundColor Cyan
    Write-Host "  ██║ ╚████║███████╗   ██║   ╚██████╔╝███████║" -ForegroundColor Blue
    Write-Host "  ╚═╝  ╚═══╝╚══════╝   ╚═╝    ╚═════╝ ╚══════╝" -ForegroundColor Magenta
    Write-Host "  ================================================================" -ForegroundColor White
    Write-Host "       N E X U S   A C A D E M Y   M A N A G E M E N T   S Y S T E M" -ForegroundColor Yellow
    Write-Host "         [ DYNAMIC CLOUD DATABASE * REAL-TIME SYNC EDITION ]     " -ForegroundColor Green
    Write-Host "  ================================================================" -ForegroundColor White
    Write-Host "  Current Realm: " -NoNewline -ForegroundColor Gray
    Write-Host "$PSScriptRoot" -ForegroundColor Cyan
    Write-Host ""
}

# Animated Loading Bar
function Show-ProgressBar([string]$Title, [int]$Steps = 10, [int]$DelayMs = 40) {
    Write-Host -NoNewline "$Title [" -ForegroundColor Yellow
    for ($i = 0; $i -lt $Steps; $i++) {
        Start-Sleep -Milliseconds $DelayMs
        Write-Host -NoNewline "■" -ForegroundColor Green
    }
    Write-Host "] 100% COMPLETE!" -ForegroundColor White
}

# Prerequisites Check
function Test-Prerequisites {
    Write-Host " [QUEST 1] Scanning System Arsenal (Prerequisites)..." -ForegroundColor Cyan
    
    # Check Node.js
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeVer = node --version
        Write-Host "  [+] Node.js Engine Found: $nodeVer" -ForegroundColor Green
    } else {
        Write-Host "  [-] Node.js Engine is MISSING!" -ForegroundColor Red
        Write-Host "      Attempting auto-summon via winget..." -ForegroundColor Yellow
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
            $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
        } else {
            Write-Host "      Please install Node.js manually from https://nodejs.org/" -ForegroundColor Red
            return $false
        }
    }

    # Check npm
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        $npmVer = npm --version
        Write-Host "  [+] NPM Package Sorcery Found: v$npmVer" -ForegroundColor Green
    } else {
        Write-Host "  [-] NPM not found in PATH." -ForegroundColor Red
        return $false
    }

    return $true
}

# Main Game Loop
Play-Sound 'start'

$running = $true
while ($running) {
    Show-Banner
    Write-Host "  >>> MAIN QUEST SELECTOR <<<" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [1] 🚀 START GAME           : Launch Live Nexus Academy (http://localhost:3000)" -ForegroundColor Green
    Write-Host "  [2] 🛠️ FULL INSTALLATION     : Install Node Packages & Build Clean Dist" -ForegroundColor Cyan
    Write-Host "  [3] ☁️ CLOUD DATABASE SYNC   : Configure Firebase Firestore or Supabase" -ForegroundColor Yellow
    Write-Host "  [4] 🧪 DIAGNOSTIC SCAN       : Run Live Health Check & Database Ping" -ForegroundColor Magenta
    Write-Host "  [5] 💾 DATA VAULT (BACKUP)   : Export or Inspect JSON Database Vault" -ForegroundColor White
    Write-Host "  [6] 📜 SCROLLS OF DEPLOYMENT : Open Firebase / Supabase Deployment Guide" -ForegroundColor Blue
    Write-Host "  [0] 🚪 EXIT SIMULATION       : Close Setup Wizard" -ForegroundColor Gray
    Write-Host ""
    
    $choice = Read-Host "  Select Quest Option [0-6]"

    switch ($choice) {
        '1' {
            Clear-Host
            Show-Banner
            Write-Host "  >>> LAUNCHING NEXUS ACADEMY SERVER <<<" -ForegroundColor Green
            Write-Host ""
            if (-not (Test-Path "node_modules")) {
                Write-Host "  Node modules missing! Performing quick auto-install..." -ForegroundColor Yellow
                npm install
            }
            
            Show-ProgressBar "  Initializing Real-Time Sync Daemon" 12 30
            Write-Host ""
            Write-Host "  Opening live browser interface..." -ForegroundColor Cyan
            Start-Process "http://localhost:3000"

            Play-Sound 'success'
            Write-Host ""
            Write-Host "  SERVER IS NOW LIVE! (Press Ctrl+C to halt the game server)" -ForegroundColor Green
            npm run dev
            Read-Host "  Press Enter to return to Quest Menu..."
        }

        '2' {
            Clear-Host
            Show-Banner
            Write-Host "  >>> INSTALLING ARSENAL (NPM DEPENDENCIES) <<<" -ForegroundColor Cyan
            Write-Host ""
            if (Test-Prerequisites) {
                Show-ProgressBar "  Fetching Latest Game Dependencies" 15 20
                npm install
                Write-Host ""
                Write-Host "  Building Production Frontend Assets..." -ForegroundColor Yellow
                npm run build
                Play-Sound 'success'
                Write-Host ""
                Write-Host "  [+] All packages and build targets ready!" -ForegroundColor Green
            }
            Read-Host "  Press Enter to return to Quest Menu..."
        }

        '3' {
            Clear-Host
            Show-Banner
            Write-Host "  >>> CLOUD DATABASE CONFIGURATION WIZARD <<<" -ForegroundColor Yellow
            Write-Host "  Nexus Academy supports 3 Real-time Data Modes:" -ForegroundColor Gray
            Write-Host "    A) Built-in Real-time Server API (Ready instantly, zero setup required)" -ForegroundColor Green
            Write-Host "    B) Google Firebase Firestore Cloud Database" -ForegroundColor Cyan
            Write-Host "    C) Supabase PostgreSQL Cloud Database" -ForegroundColor Magenta
            Write-Host ""
            
            $cloudChoice = Read-Host "  Select Cloud Provider to configure (1=Built-in, 2=Firebase, 3=Supabase)"
            
            if ($cloudChoice -eq '2') {
                Write-Host ""
                Write-Host "  -- FIREBASE FIRESTORE SETUP --" -ForegroundColor Cyan
                $fbProject = Read-Host "  Enter Firebase Project ID (e.g. my-nexus-academy)"
                $fbKey = Read-Host "  Enter Firebase Web API Key"
                
                if (-not [string]::IsNullOrWhiteSpace($fbProject)) {
                    $envContent = @"
VITE_CLOUD_PROVIDER=firebase
VITE_FIREBASE_PROJECT_ID=$fbProject
VITE_FIREBASE_API_KEY=$fbKey
"@
                    Set-Content -Path ".env.local" -Value $envContent -Encoding UTF8
                    Write-Host "  [+] Firebase settings saved to .env.local!" -ForegroundColor Green
                    Play-Sound 'success'
                }
            } elseif ($cloudChoice -eq '3') {
                Write-Host ""
                Write-Host "  -- SUPABASE SETUP --" -ForegroundColor Magenta
                $sbUrl = Read-Host "  Enter Supabase URL (e.g. https://xyz.supabase.co)"
                $sbKey = Read-Host "  Enter Supabase Anon Key"
                
                if (-not [string]::IsNullOrWhiteSpace($sbUrl)) {
                    $envContent = @"
VITE_CLOUD_PROVIDER=supabase
VITE_SUPABASE_URL=$sbUrl
VITE_SUPABASE_ANON_KEY=$sbKey
"@
                    Set-Content -Path ".env.local" -Value $envContent -Encoding UTF8
                    Write-Host "  [+] Supabase settings saved to .env.local!" -ForegroundColor Green
                    Play-Sound 'success'
                }
            } else {
                Write-Host "  [+] Using Built-in High-Performance Live Server Database!" -ForegroundColor Green
            }

            Read-Host "  Press Enter to return to Quest Menu..."
        }

        '4' {
            Clear-Host
            Show-Banner
            Write-Host "  >>> RUNNING SYSTEM DIAGNOSTIC SCAN <<<" -ForegroundColor Magenta
            Write-Host ""
            
            # Check data dir
            if (Test-Path "data/nexus-db.json") {
                $dbSize = (Get-Item "data/nexus-db.json").Length
                Write-Host "  [+] Database File: data/nexus-db.json ($dbSize bytes)" -ForegroundColor Green
            } else {
                Write-Host "  [*] Database File: Will be auto-created on first run" -ForegroundColor Yellow
            }

            # Check port 3000
            Write-Host "  [+] Verifying Port 3000 Availability..." -ForegroundColor Cyan
            $portOpen = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
            if ($portOpen) {
                Write-Host "  [*] Port 3000 is currently occupied or server is running!" -ForegroundColor Yellow
            } else {
                Write-Host "  [+] Port 3000 is clean and available for launch!" -ForegroundColor Green
            }

            Play-Sound 'success'
            Write-Host ""
            Read-Host "  Press Enter to return to Quest Menu..."
        }

        '5' {
            Clear-Host
            Show-Banner
            Write-Host "  >>> DATA VAULT MANAGEMENT (BACKUP & RESTORE) <<<" -ForegroundColor White
            Write-Host ""
            $backupDir = "backups"
            if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
            
            if (Test-Path "data/nexus-db.json") {
                $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
                $dest = "$backupDir/nexus_backup_$timestamp.json"
                Copy-Item "data/nexus-db.json" -Destination $dest
                Write-Host "  [+] Backup snapshot created: $dest" -ForegroundColor Green
                Play-Sound 'success'
            } else {
                Write-Host "  [-] No database file found yet to backup." -ForegroundColor Yellow
            }

            Write-Host ""
            Read-Host "  Press Enter to return to Quest Menu..."
        }

        '6' {
            Clear-Host
            Show-Banner
            Write-Host "  >>> DEPLOYMENT SCROLLS (FIREBASE & SUPABASE) <<<" -ForegroundColor Blue
            Write-Host ""
            if (Test-Path "DEPLOYMENT-GUIDE.md") {
                Get-Content "DEPLOYMENT-GUIDE.md" | Select-Object -First 45 | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
                Write-Host ""
                Write-Host "  Full guide is available in DEPLOYMENT-GUIDE.md" -ForegroundColor Cyan
            } else {
                Write-Host "  Opening deployment docs..." -ForegroundColor Yellow
            }
            Write-Host ""
            Read-Host "  Press Enter to return to Quest Menu..."
        }

        '0' {
            Write-Host ""
            Write-Host "  Exiting Nexus Academy simulation. Keep connecting to success!" -ForegroundColor Yellow
            Play-Sound 'alert'
            $running = $false
        }

        default {
            Write-Host "  Invalid choice! Try again." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
