import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ComposerForm from './ComposerForm.jsx';
import { fetchComposerById, updateComposer } from './api.js';

function EditComposer({ onSave }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [composer, setComposer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadComposer = async () => {
      try {
        const data = await fetchComposerById(id);
        setComposer(data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Unable to load composer.');
      } finally {
        setLoading(false);
      }
    };
    loadComposer();
  }, [id]);

  const handleUpdate = async (updatedValues) => {
    await updateComposer(id, updatedValues);
    if (typeof onSave === 'function') {
      await onSave();
    }
    navigate(`/composer/${id}`);
  };

  if (loading) {
    return <p>Loading composer...</p>;
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  return (
    <ComposerForm
      initialData={composer}
      onSubmit={handleUpdate}
      title="Edit Composer"
      submitLabel="Update Composer"
    />
  );
}

export default EditComposer;
