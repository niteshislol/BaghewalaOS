#!/usr/bin/env powershell
# BaghewalaOS — One-Click Startup Script
# Starts backend (FastAPI) and frontend (Vite) simultaneously

Write-Host "🛢️  BaghewalaOS Digital Twin — Starting..." -ForegroundColor Yellow
Write-Host "    SIH26120 · Oil India Limited · Baghewala Field" -ForegroundColor Gray
Write-Host ""

$rootDir = $PSScriptRoot

# Start Backend
Write-Host "⚙️  Starting FastAPI Backend (port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Set-Location '$rootDir\backend'
    Write-Host '--- BaghewalaOS Backend ---' -ForegroundColor Yellow
    pip install -r requirements.txt --quiet
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"@

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "🖥️  Starting React Frontend (port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Set-Location '$rootDir\frontend'
    Write-Host '--- BaghewalaOS Frontend ---' -ForegroundColor Yellow
    npm install --silent
    npm run dev
"@

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ BaghewalaOS is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "   📊 Frontend  →  http://localhost:5173" -ForegroundColor White
Write-Host "   ⚙️  Backend   →  http://localhost:8000" -ForegroundColor White
Write-Host "   📖 API Docs  →  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop." -ForegroundColor Gray

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
