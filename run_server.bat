@echo off
title Campus Water-Pipeline Fault Isolation Tool (BFS Engine)
color 0b

echo ======================================================================
echo   Campus Water-Pipeline Fault Isolation Tool Using BFS
echo   Karunya Institute of Technology and Sciences
echo   Course: Fundamentals of Artificial Intelligence (25DC204)
echo ======================================================================
echo.

:: Get local IP address dynamically via Python
for /f "delims=" %%i in ('python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2^>nul') do set LOCAL_IP=%%i

echo   On this Laptop:       http://localhost:5000
if defined LOCAL_IP (
    echo   On your Phone/Mobile: http://%LOCAL_IP%:5000
) else (
    echo   On your Phone/Mobile: http://10.42.21.81:5000
)
echo.
echo   * Both phone and laptop must be connected to the same Wi-Fi / Hotspot!
echo ======================================================================
echo.

start "" "http://localhost:5000"
python backend\app.py

pause
