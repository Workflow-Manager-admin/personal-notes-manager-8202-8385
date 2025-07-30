import React, { useState, useEffect } from 'react';
import './App.css';

// PUBLIC_INTERFACE
function App() {
  /**
   * Modern, minimal notes web app main entrypoint.
   * - Fetches notes from backend (REST API)
   * - Handles create, edit, delete, and view (CRUD)
   * - Presents layout: Topbar, Sidebar, Main, Floating Action Button
   */
  const API_URL = process.env.REACT_APP_NOTES_API_URL || '/api/notes'; // Must be set in .env
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editState, setEditState] = useState({ mode: null, note: null });
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 860);
  const [showNoteEdit, setShowNoteEdit] = useState(false);

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
    function handleResize() {
      setShowSidebar(window.innerWidth > 860);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line
  }, []);

  // PUBLIC_INTERFACE
  async function fetchNotes() {
    setLoading(true);
    setError('');
    try {
      const result = await fetch(API_URL);
      if (!result.ok) throw new Error('Failed to load notes');
      const json = await result.json();
      setNotes(Array.isArray(json) ? json : []);
    } catch (err) {
      setError('Could not fetch notes');
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  async function handleNoteCreate(newNote) {
    setError('');
    try {
      const result = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });
      if (!result.ok) throw new Error('Create failed');
      const created = await result.json();
      setNotes([created, ...notes]);
      setEditState({ mode: null, note: null });
      setSelectedNoteId(created.id);
      setShowNoteEdit(false);
    } catch (err) {
      setError('Could not create note');
    }
  }

  // PUBLIC_INTERFACE
  async function handleNoteEdit(id, updates) {
    setError('');
    try {
      const result = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!result.ok) throw new Error('Update failed');
      const updated = await result.json();
      setNotes(notes.map(n => (n.id === id ? updated : n)));
      setSelectedNoteId(id);
      setEditState({ mode: null, note: null });
      setShowNoteEdit(false);
    } catch (err) {
      setError('Could not update note');
    }
  }

  // PUBLIC_INTERFACE
  async function handleNoteDelete(id) {
    setError('');
    try {
      const result = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!result.ok) throw new Error('Delete failed');
      setNotes(notes.filter(n => n.id !== id));
      if (selectedNoteId === id) setSelectedNoteId(null);
    } catch (err) {
      setError('Could not delete note');
    }
  }

  // Find note object by selectedNoteId
  const selectedNote =
    notes.find(n => n.id === selectedNoteId) || (notes.length > 0 ? notes[0] : null);

  // UI handlers
  function handleEditClick(note) {
    setEditState({ mode: 'edit', note: note });
    setShowNoteEdit(true);
  }
  function handleNewClick() {
    setEditState({ mode: 'create', note: null });
    setShowNoteEdit(true);
  }
  function handleCancelEdit() {
    setEditState({ mode: null, note: null });
    setShowNoteEdit(false);
  }
  function handleSidebarToggle() {
    setShowSidebar(!showSidebar);
  }

  // App color palette for inline style
  const palette = {
    primary: '#1976d2',
    accent: '#ffb300',
    secondary: '#424242'
  };

  return (
    <div className="NotesApp">
      <TopBar 
        onSidebarToggle={handleSidebarToggle}
        showSidebar={showSidebar}
        palette={palette} />
      <div className="LayoutRow">
        {showSidebar && (
          <Sidebar
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelect={id => setSelectedNoteId(id)}
            onEdit={handleEditClick}
            onDelete={handleNoteDelete}
            palette={palette}
          />
        )}
        <main className="MainContent" style={{ background: '#fff' }}>
          {loading && <div className="Status">Loading notes…</div>}
          {error && <div className="Error">{error}</div>}
          {!loading && !showNoteEdit && selectedNote && (
            <NoteView
              note={selectedNote}
              onEdit={() => handleEditClick(selectedNote)}
              onDelete={() => handleNoteDelete(selectedNote.id)}
              palette={palette}
            />
          )}
          {!loading && !showNoteEdit && !selectedNote && (
            <div className="EmptyState">No notes yet. Click + to add one!</div>
          )}
          {!loading && showNoteEdit && (
            <NoteEdit
              mode={editState.mode}
              note={editState.note}
              onSubmit={editState.mode === 'edit'
                ? (note) => handleNoteEdit(note.id, note)
                : handleNoteCreate}
              onCancel={handleCancelEdit}
              palette={palette}
            />
          )}
        </main>
      </div>
      <FloatingActionButton onClick={handleNewClick} palette={palette} />
    </div>
  );
}

// Top navbar
// PUBLIC_INTERFACE
function TopBar({ onSidebarToggle, showSidebar, palette }) {
  return (
    <header className="TopBar" style={{background: palette.primary, color: '#fff'}}>
      <button className="SidebarToggle" onClick={onSidebarToggle} aria-label="Show/hide sidebar">
        <span style={{fontSize: 22, color: '#fff'}}>☰</span>
      </button>
      <div className="AppLogoTitle">
        <svg width={32} height={32} viewBox="0 0 32 32" style={{ marginRight: 8 }}>
          <circle cx="16" cy="16" r="14" fill={palette.accent} />
          <rect x="8" y="9" width="16" height="14" rx="3" fill="white" />
          <text x="16" y="21" textAnchor="middle" fontSize="11" fill={palette.primary} fontWeight="bold" fontFamily="sans-serif">N</text>
        </svg>
        <span className="TitleText" style={{ fontWeight: 600 }}>Notes</span>
      </div>
    </header>
  );
}

// Sidebar for navigation
// PUBLIC_INTERFACE
function Sidebar({ notes, selectedNoteId, onSelect, onEdit, onDelete, palette }) {
  return (
    <aside className="Sidebar" style={{background: '#f4f6fa'}}>
      <div className="SidebarHeader">All Notes</div>
      <ul className="NotesList">
        {notes.map(note => (
          <li
            key={note.id}
            className={
              "NoteListItem" + (note.id === selectedNoteId ? " selected" : "")
            }
            onClick={() => onSelect(note.id)}
            tabIndex={0}
            aria-current={note.id === selectedNoteId}
          >
            <div className="NoteTitleWrap">
              <span className="NoteTitle">{note.title}</span>
              <span className="NoteListItemBtns">
                <button className="NoteListBtn" aria-label="Edit"
                  title="Edit" onClick={e => { e.stopPropagation(); onEdit(note); }}>
                  ✎
                </button>
                <button className="NoteListBtn" aria-label="Delete"
                  title="Delete" onClick={e => { e.stopPropagation(); onDelete(note.id); }}>
                  🗑️
                </button>
              </span>
            </div>
            <span className="NoteSnippet">{note.content?.slice(0, 42)}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// Note viewer
// PUBLIC_INTERFACE
function NoteView({ note, onEdit, onDelete, palette }) {
  if (!note) return null;
  return (
    <article className="NoteView">
      <header>
        <h2 className="NoteViewTitle">{note.title}</h2>
        <span className="NoteViewBtns">
          <button className="Btn Outlined" onClick={onEdit} style={{color:palette.primary,borderColor:palette.primary}}>Edit</button>
          <button className="Btn Danger" onClick={onDelete} style={{color:'#fff',background:palette.secondary}}>Delete</button>
        </span>
      </header>
      <pre className="NoteContent">{note.content}</pre>
    </article>
  );
}

// Note create/edit form
// PUBLIC_INTERFACE
function NoteEdit({ mode, note, onSubmit, onCancel, palette }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(
      note
        ? { ...note, title: title.trim(), content }
        : { title: title.trim(), content }
    );
  }
  return (
    <form className="NoteEditForm" onSubmit={submit}>
      <h2>{mode === 'edit' ? "Edit Note" : "New Note"}</h2>
      <input
        className="EditTitleInput"
        placeholder="Title"
        aria-label="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
        autoFocus
      />
      <textarea
        className="EditContentInput"
        placeholder="Write your note..."
        aria-label="Content"
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={10}
      />
      <div className="EditBtns">
        <button className="Btn Primary" type="submit" style={{background:palette.primary}}>Save</button>
        <button className="Btn Outlined" type="button" onClick={onCancel} style={{color:palette.primary,borderColor:palette.primary}}>Cancel</button>
      </div>
    </form>
  );
}

// PUBLIC_INTERFACE
function FloatingActionButton({ onClick, palette }) {
  return (
    <button
      className="FloatingActionButton"
      onClick={onClick}
      aria-label="Add Note"
      style={{ background: palette.accent }}
    >
      +
    </button>
  );
}

export default App;
