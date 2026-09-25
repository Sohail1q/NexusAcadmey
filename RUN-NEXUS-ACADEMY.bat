@echo off
title Nexus Academy Management System - Setup & Launcher
cd /d "%~dp0"
echo ==========================================================
echo   NEXUS ACADEMY MANAGEMENT SYSTEM - LAUNCHER
echo ==========================================================
echo Launching PowerShell Game-Style Interactive Setup...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SETUP-INSTALLER.ps1"
if errorlevel 1 (
  echo.
  echo An error occurred. Press any key to exit.
  pause >nul
)
