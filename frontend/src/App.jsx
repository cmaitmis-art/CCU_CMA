import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import ComposerList from './ComposerList.jsx';
import ComposerForm from './ComposerForm.jsx';
import ComposerDetail from './ComposerDetail.jsx';
import EditComposer from './EditComposer.jsx';
import { fetchComposers, createComposer, deleteComposer } from './api.js';
import { useConfirmDialog } from './ConfirmDialogContext.jsx';

function App() {
  const [composers, setComposers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadComposers = async () => {
    setLoading(true);
    try {
      const data = await fetchComposers();
      setComposers(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load composers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComposers();
  }, []);

  const handleCreate = async (composer) => {
    await createComposer(composer);
    await loadComposers();
    navigate('/');
  };

  const confirm = useConfirmDialog();

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete composer',
      message: 'Delete this composer? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      await deleteComposer(id);
      await loadComposers();
    } catch (err) {
      setError(err.message || 'Failed to delete composer');
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>CMA Composer Catalog</h1>
          <p>Create, browse, and read more about composers in SQLite + Express.</p>
        </div>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/add">Add Composer</Link>
        </nav>
      </header>

      <main>
        {error && <div className="error-banner">{error}</div>}
        <Routes>
          <Route path="/" element={<ComposerList composers={composers} loading={loading} onDelete={handleDelete} />} />
          <Route path="/add" element={<ComposerForm onSubmit={handleCreate} />} />
          <Route path="/composer/:id" element={<ComposerDetail />} />
          <Route path="/edit/:id" element={<EditComposer onSave={loadComposers} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
