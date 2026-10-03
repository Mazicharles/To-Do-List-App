# Everyday Tasks

A single-user task list built with React, Python FastAPI, and SQLite. Add, edit, complete, delete, filter, and reorder tasks. Changes are saved immediately on your computer.

## Run on Windows

Install Python and Node.js, then open PowerShell in this folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

The script installs dependencies, builds React, opens http://127.0.0.1:8765, and starts FastAPI. Keep the terminal open; press Ctrl+C to stop. If that port is already in use, stop the earlier server first.

## Project layout

- `backend/main.py`: FastAPI routes and SQLite database access.
- `backend/todos.db`: your saved tasks (created automatically; excluded from Git).
- `frontend/src/main.jsx`: React interface.
- `frontend/src/style.css`: styling.

FastAPI serves the built React app and API from the same address. Interactive API documentation is at http://127.0.0.1:8765/docs.

For frontend development, run `.venv\Scripts\python.exe -m uvicorn backend.main:app --reload` from the project root and `npm.cmd run dev` from `frontend` in a second terminal. Vite forwards API requests to FastAPI.

This app runs locally without accounts or cloud sync. To back up tasks, stop the server and copy `backend/todos.db`. To reset tasks, stop the server and remove that database. Reordering is available in the All filter; drag a row or use its arrow buttons. Editing supports Escape to cancel.

