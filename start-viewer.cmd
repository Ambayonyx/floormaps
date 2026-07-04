@echo off
rem Start a local Python HTTP server and open Edge to index.html
cd /d "%~dp0"

set PORT=8000
set URL=http://127.0.0.1:%PORT%/index.html?file=floorplan.yaml

echo Starting Python HTTP server on %URL% ...
start "Python Server" cmd /k "python -m http.server %PORT%"

echo Waiting for the server to initialize...
timeout /t 1 /nobreak >nul

echo Opening Edge...
start "" msedge "%URL%"
echo Done.
