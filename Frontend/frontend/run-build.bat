@echo off
cd /d "%~dp0"
node_modules\.bin\vite.cmd build > build-check.txt 2>&1
echo EXIT:%ERRORLEVEL% >> build-check.txt
