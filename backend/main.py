from pathlib import Path
import os
import sqlite3
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

DB = Path(os.environ.get('TODO_DB', Path(__file__).with_name('todos.db')))

@contextmanager
def database():
    connection = sqlite3.connect(DB)
    try:
        connection.row_factory = sqlite3.Row
        with connection:
            yield connection
    finally:
        connection.close()

with database() as db:
    db.execute('CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL)')

app = FastAPI(title='Everyday Tasks')

class TaskInput(BaseModel):
    title: str = Field(min_length=1, max_length=300)

class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    completed: bool | None = None

class OrderInput(BaseModel):
    ids: list[int]

def clean_title(title):
    title = title.strip()
    if not title:
        raise HTTPException(422, 'Please enter a task.')
    return title

def task(row):
    return {**dict(row), 'completed': bool(row['completed'])}

@app.get('/api/tasks')
def list_tasks():
    with database() as db:
        return [task(row) for row in db.execute('SELECT * FROM tasks ORDER BY position, id')]

@app.post('/api/tasks', status_code=201)
def add_task(data: TaskInput):
    title = clean_title(data.title)
    with database() as db:
        position = db.execute('SELECT COALESCE(MAX(position), -1) + 1 FROM tasks').fetchone()[0]
        cursor = db.execute('INSERT INTO tasks(title, position) VALUES (?, ?)', (title, position))
        return task(db.execute('SELECT * FROM tasks WHERE id=?', (cursor.lastrowid,)).fetchone())

@app.put('/api/tasks/order')
def reorder(data: OrderInput):
    with database() as db:
        existing = {row[0] for row in db.execute('SELECT id FROM tasks')}
        if len(data.ids) != len(existing) or set(data.ids) != existing:
            raise HTTPException(409, 'The task list changed. Refresh and try again.')
        db.executemany('UPDATE tasks SET position=? WHERE id=?', [(index, id) for index, id in enumerate(data.ids)])
    return {'ok': True}

@app.patch('/api/tasks/{id}')
def update_task(id: int, data: TaskUpdate):
    with database() as db:
        if not db.execute('SELECT id FROM tasks WHERE id=?', (id,)).fetchone():
            raise HTTPException(404, 'Task not found.')
        if data.title is not None:
            db.execute('UPDATE tasks SET title=? WHERE id=?', (clean_title(data.title), id))
        if data.completed is not None:
            db.execute('UPDATE tasks SET completed=? WHERE id=?', (data.completed, id))
        return task(db.execute('SELECT * FROM tasks WHERE id=?', (id,)).fetchone())

@app.delete('/api/tasks/{id}', status_code=204)
def delete_task(id: int):
    with database() as db:
        if db.execute('DELETE FROM tasks WHERE id=?', (id,)).rowcount == 0:
            raise HTTPException(404, 'Task not found.')

frontend = Path(__file__).resolve().parent.parent / 'frontend' / 'dist'
if frontend.exists():
    app.mount('/', StaticFiles(directory=frontend, html=True), name='frontend')
