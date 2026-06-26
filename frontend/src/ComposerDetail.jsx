import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchComposerById } from './api.js';

function ComposerDetail() {
  const { id } = useParams();
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
        setError(err.message || 'Composer not found');
      } finally {
        setLoading(false);
      }
    };

    loadComposer();
  }, [id]);

  if (loading) {
    return <p>Loading composer...</p>;
  }

  if (error) {
    return (
      <div>
        <p className="error-banner">{error}</p>
        <Link className="button" to="/">Back to list</Link>
      </div>
    );
  }

  if (!composer) {
    return <p>Composer details not available.</p>;
  }

  return (
    <article className="composer-detail">
      <h2>{composer.name}</h2>
      <p><strong>Era:</strong> {composer.era || 'Unknown'}</p>
      <p><strong>Famous work:</strong> {composer.work || 'Not provided'}</p>
      <div className="composer-description">
        <strong>Description:</strong>
        <p>{composer.description || 'No description provided.'}</p>
      </div>
      <div className="composer-actions">
        <Link className="button" to="/">Back to list</Link>
        <Link className="button button-secondary" to={`/edit/${composer.id}`}>
          Edit Composer
        </Link>
      </div>
    </article>
  );
}

export default ComposerDetail;
