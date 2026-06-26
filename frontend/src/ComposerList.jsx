import { Link } from 'react-router-dom';

function ComposerList({ composers, loading, onDelete }) {
  if (loading) {
    return <p>Loading composers...</p>;
  }

  if (!composers.length) {
    return <p>No composers available yet. Add a composer to get started.</p>;
  }

  return (
    <div className="composer-grid">
      {composers.map((composer) => (
        <article className="composer-card" key={composer.id}>
          <h2>{composer.name}</h2>
          <p><strong>Era:</strong> {composer.era || 'Unknown'}</p>
          <p><strong>Work:</strong> {composer.work || 'No work listed'}</p>
          <div className="composer-actions">
            <Link className="button" to={`/composer/${composer.id}`}>
              Read more
            </Link>
            <button className="button button-secondary" onClick={() => onDelete(composer.id)}>
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export default ComposerList;
