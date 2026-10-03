import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [tasks, setTasks] = useState([]), [title, setTitle] = useState('');
  const [filter, setFilter] = useState('All'), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null), [draft, setDraft] = useState('');
  const [dragging, setDragging] = useState(null);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(c => setShared(c.shared)).catch(() => {});
    const timer = setInterval(() => {
      if (!busy && editing === null) refresh().catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [busy, editing]);
  async function api(path = '', method = 'GET', body) {
    const response = await fetch('/api/tasks' + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not save your task. Please try again.'); }
    return response.status === 204 ? null : response.json();
  }
  async function refresh() { setTasks(await api()); }
  useEffect(() => { refresh().catch(() => setError('Could not load tasks. Check that the server is running, then refresh.')).finally(() => setLoading(false)); }, []);
  async function change(action) {
    setBusy(true); setError('');
    try { await action(); await refresh(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function add(e) { e.preventDefault(); if (title.trim()) change(async () => { await api('', 'POST', { title: title.trim() }); setTitle(''); }); }
  function move(id, target) {
    if (busy || id === target) return;
    const ids = tasks.map(t => t.id), from = ids.indexOf(id), to = ids.indexOf(target);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1); ids.splice(to, 0, id);
    change(() => api('/order', 'PUT', { ids }));
  }
  const completed = tasks.filter(t => t.completed).length;
  const visible = tasks.filter(t => filter === 'All' || (filter === 'Done' ? t.completed : !t.completed));
  return <main>
    <header><a className="brand" href="/">▦ <span>everyday</span><span className="brand-dot">.</span></a><span className="local">● {shared ? 'Shared demo · saved online' : 'Saved on this computer'}</span></header>
    {shared && <p className="demo-notice">This is a shared demo. Everyone can view and change these tasks. Try it with sample tasks.</p>}
    <section className="intro"><span className="eyebrow">A LITTLE FOCUS GOES A LONG WAY</span><h1>Make room for<br/><em>what matters.</em></h1><p>A simple place for your plans, big and small.<br/>One task at a time.</p></section>
    <section className="board" aria-label="Task list">
      <div className="board-heading"><div><h2>My tasks <span>{tasks.length}</span></h2><p>{tasks.length ? `${tasks.length - completed} left to do. You’ve got this.` : 'A fresh start. What’s on your mind?'}</p></div><span className="sun">✳</span></div>
      <form className="add" onSubmit={add}><span>＋</span><input aria-label="New task" placeholder="Add something you want to do…" value={title} onChange={e => setTitle(e.target.value)} maxLength={300} disabled={busy || loading}/><button disabled={busy || loading || !title.trim()}>Add task <span>↗</span></button></form>
      <div className="toolbar"><div className="filters">{['All', 'Active', 'Done'].map(f => <button key={f} aria-pressed={filter === f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div><span>{completed} / {tasks.length} complete</span></div>
      <div className="progress"><div style={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }}/></div>
      {error && <p role="alert" className="error">{error}</p>}
      <ul>{visible.map(t => { const index = tasks.findIndex(x => x.id === t.id); return <li key={t.id} className={t.completed ? 'done' : ''} draggable={!busy && editing === null && filter === 'All'} onDragStart={e => { setDragging(t.id); e.dataTransfer.setData('text/plain', String(t.id)); }} onDragEnd={() => setDragging(null)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (filter === 'All') move(dragging, t.id); setDragging(null); }}>
        <span className="grip" aria-hidden="true">⠿</span><input className="check" type="checkbox" checked={t.completed} disabled={busy} aria-label={`Mark ${t.title} ${t.completed ? 'active' : 'done'}`} onChange={() => change(() => api('/' + t.id, 'PATCH', { completed: !t.completed }))}/>
        {editing === t.id ? <form className="edit" onSubmit={e => { e.preventDefault(); if (draft.trim()) change(async () => { await api('/' + t.id, 'PATCH', { title: draft }); setEditing(null); }); }}><input autoFocus aria-label="Edit task" value={draft} maxLength={300} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setEditing(null); }}/><button disabled={busy || !draft.trim()}>Save</button><button type="button" onClick={() => setEditing(null)}>Cancel</button></form> : <><span className="task-title">{t.title}</span><div className="actions"><button title="Move up" aria-label={`Move ${t.title} up`} disabled={busy || index === 0 || filter !== 'All'} onClick={() => move(t.id, tasks[index - 1].id)}>↑</button><button title="Move down" aria-label={`Move ${t.title} down`} disabled={busy || index === tasks.length - 1 || filter !== 'All'} onClick={() => move(t.id, tasks[index + 1].id)}>↓</button><button title="Edit" aria-label={`Edit ${t.title}`} disabled={busy} onClick={() => { setEditing(t.id); setDraft(t.title); }}>✎</button><button title="Delete" aria-label={`Delete ${t.title}`} disabled={busy} onClick={() => change(() => api('/' + t.id, 'DELETE'))}>×</button></div></>}
      </li>; })}</ul>
      {!visible.length && <div className="empty"><div>✓</div><h3>{loading ? 'Loading your tasks…' : filter === 'Done' ? 'Good things take one small step.' : filter === 'Active' && tasks.length ? 'All caught up!' : 'Your next small step starts here.'}</h3><p>{filter === 'Done' ? 'Completed tasks will appear here.' : 'Add a task above and make today your own.'}</p></div>}
      <footer><span>↕ {filter === 'All' ? 'Drag tasks or use the arrows to reorder' : 'Switch to All to reorder tasks'}</span><span>Small steps. Real progress.</span></footer>
    </section><p className="closing">Less to keep in your head. More space for your day.</p>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
