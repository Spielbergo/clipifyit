import React, { useState } from 'react';

export default function ProjectsSidebar({
  projects = [],
  selectedProjectId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  expanded,
  onClose,
  creatingProject,
  onSaveNewProject,
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [sortMode, setSortMode] = useState('latest'); // 'alpha', 'oldest', 'latest'
  const [search, setSearch] = useState('');

  // Sorting logic
  let sortedProjects = [...projects];

  if (sortMode === 'alpha') {
    sortedProjects.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortMode === 'descAlpha') {
    sortedProjects.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortMode === 'oldest') {
    sortedProjects.sort((a, b) => a.createdAt - b.createdAt);
  } else if (sortMode === 'latest') {
    sortedProjects.sort((a, b) => b.createdAt - a.createdAt);
  }

  const filteredProjects = sortedProjects.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className={`projects-sidebar${expanded ? ' expanded' : ''}`}>
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 18 }}>Projects</span>
        {onClose && (
          <button className="close-btn" onClick={onClose} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }}>
            ×
          </button>
        )}
      </div>
      {/* Sort Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '0 0 8px 0' }}>
        <button
          style={{ fontWeight: sortMode === 'alpha' || sortMode === 'descAlpha' ? 700 : 400 }}
          onClick={() => setSortMode(sortMode === 'alpha' ? 'descAlpha' : 'alpha')}
          title={sortMode === 'alpha' ? "Sort Z-A" : "Sort A-Z"}
        >
          {sortMode === 'alpha' ? 'A-Z' : 'Z-A'}
      </button>
        <button
          style={{ fontWeight: sortMode === 'oldest' ? 700 : 400 }}
          onClick={() => setSortMode('oldest')}
          title="Sort by oldest"
        >Oldest</button>
        <button
          style={{ fontWeight: sortMode === 'latest' ? 700 : 400 }}
          onClick={() => setSortMode('latest')}
          title="Sort by latest"
        >Latest</button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', margin: '0 0 12px 0', padding: '0 13px' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          style={{
            width: '100%',
            padding: '8px 36px 8px 12px',
            color: '#eee',
            borderRadius: '20px',
            border: '1px solid #666',
            outline: 'none',
            fontSize: '15px',
            background: '#333',
            boxSizing: 'border-box'
          }}
        />
        <span style={{
          position: 'absolute',
          right: 26,
          top: '55%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#888'
        }}>
          {/* SVG search icon */}
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="7" stroke="#888" strokeWidth="2"/>
            <line x1="14.2" y1="14.2" x2="18" y2="18" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
      </div>

      {/* New Project Button */}
      <button
        onClick={onCreate}
        style={{
          width: '90%',
          margin: '12px 5%',
          padding: '8px 0',
          borderRadius: 4,
          background: '#6599a6',
          color: '#fff',
          fontWeight: 600,
          fontSize: 16,
          border: 'none',
          cursor: 'pointer',
        }}
        disabled={creatingProject}
      >
        + New Project
      </button>
      <ul style={{ padding: 0, margin: 0 }}>
        {creatingProject && (
          <li style={{
            display: 'flex',
            alignItems: 'center',
            background: 'transparant',
            color: '#eee',
            padding: '6px 12px',
            borderRadius: 4,
            marginBottom: 2,
          }}>
            <form
              style={{ flex: 1, display: 'flex', alignItems: 'center' }}
              onSubmit={e => {
                e.preventDefault();
                onSaveNewProject(newProjectName);
                setNewProjectName('');
              }}
            >
              <input
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                autoFocus
                style={{ flex: 1, marginRight: 6, borderRadius: 4, border: '1px solid #555', background: '#333', padding: 4 }}
                placeholder="Project name"
                onBlur={() => {
                  if (newProjectName.trim()) {
                    onSaveNewProject(newProjectName);
                  } else {
                    onSaveNewProject('');
                  }
                  setNewProjectName('');
                }}
              />
              <button type="submit" style={{ marginRight: 4 }}>Save</button>
            </form>
          </li>
        )}
        {filteredProjects.map(project => (
          <li
            key={project.id}
            className={project.id === selectedProjectId ? 'selected' : ''}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: project.id === selectedProjectId ? '#333' : 'transparent',
              color: '#eee',
              padding: '6px 12px',
              borderRadius: 4,
              marginBottom: 2,
            }}
          >
            {renamingId === project.id ? (
              <form
                style={{ flex: 1, display: 'flex', alignItems: 'center' }}
                onSubmit={e => {
                  e.preventDefault();
                  if (renameValue.trim()) {
                    onRename(project.id, renameValue.trim());
                  }
                  setRenamingId(null);
                }}
              >
                <input
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  autoFocus
                  style={{ flex: 1, marginRight: 6, borderRadius: 4, border: '1px solid #ccc', padding: 4 }}
                  onBlur={() => setRenamingId(null)}
                />
                <button type="submit" style={{ marginRight: 4 }}>Save</button>
              </form>
            ) : (
              <>
                <span
                  className="project-title"
                  title={project.name}
                  onClick={() => onSelect && onSelect(project.id)}
                >
                  {project.name}
                </span>
                <button
                  title="Rename"
                  style={{ marginRight: 4 }}
                  onClick={() => {
                    setRenamingId(project.id);
                    setRenameValue(project.name);
                  }}
                >✎</button>
                <button
                  title="Delete"
                  onClick={() => onDelete && onDelete(project.id)}
                >🗑</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}