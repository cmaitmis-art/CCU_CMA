import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const emptyComposer = {
  name: '',
  era: '',
  work: '',
  description: '',
};

function ComposerForm({ onSubmit, initialData = null, title = 'Add Composer', submitLabel = 'Create Composer' }) {
  const [form, setForm] = useState(initialData ?? emptyComposer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        era: initialData.era || '',
        work: initialData.work || '',
        description: initialData.description || '',
      });
    } else {
      setForm(emptyComposer);
    }
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form);
      setError(null);
      if (!initialData) {
        setForm(emptyComposer);
      }
    } catch (err) {
      setError(err.message || 'Unable to save composer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="composer-form-shell">
      <h2>{title}</h2>
      {error && <div className="error-banner">{error}</div>}
      <form className="composer-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Era
          <input name="era" value={form.era} onChange={handleChange} placeholder="e.g. Baroque, Romantic" />
        </label>
        <label>
          Famous Work
          <input name="work" value={form.work} onChange={handleChange} placeholder="e.g. Symphony No. 5" />
        </label>
        <label>
          Description
          <textarea name="description" value={form.description} onChange={handleChange} rows="5" />
        </label>
        <div className="form-actions">
          <button className="button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : submitLabel}
          </button>
          <Link className="button button-secondary" to="/">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

export default ComposerForm;
