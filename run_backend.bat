@echo off
title Website Intelligence Assistant - Backend (FastAPI)
echo Starting Website Intelligence Assistant Backend on http://127.0.0.1:8000 ...

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
)
pause
