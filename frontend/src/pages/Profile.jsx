import { useEffect, useMemo, useState } from 'react';

const theme = {
  navy: '#1a3a6b',
  navy2: '#2251a3',
  gold: '#c9a84c',
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#1a1a2e',
  text2: '#5a6478',
  text3: '#94a0b4',
  border: '#e2e8f0',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
  blue: '#2563eb',
};

function Badge({ kind, children }) {
  const cls =
    kind === 'green'
      ? { bg: '#f0fdf4', color: '#16a34a' }
      : kind === 'navy'
        ? { bg: '#eff3ff', color: '#1a3a6b' }
        : kind === 'blue'
          ? { bg: '#eff6ff', color: '#2563eb' }
          : { bg: '#f0fdf4', color: '#16a34a' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: cls.bg,
        color: cls.color,
      }}
    >
      {children}
    </span>
  );
}

function Timeline({ items }) {
  if (!items?.length) return null;
  return (
    <div className="timeline">
      {items.map((it, idx) => (
        <div key={idx} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-date">{it.time}</div>
          <div className="timeline-text">{it.text}</div>
        </div>
      ))}
    </div>
  );
}

function toYMD(d) {
  return d.toISOString().slice(0, 10);
}

export default function Profile({ currentUser }) {
  const [toast, setToast] = useState(null);

  const userId = currentUser?.id;

  // Daily Activity form (single record per date)
  const [activityDate, setActivityDate] = useState(() => toYMD(new Date()));
  const [activityText, setActivityText] = useState('');
  const [activityCategory, setActivityCategory] = useState('');
  const [activityStatus, setActivityStatus] = useState('');

  const [savingActivity, setSavingActivity] = useState(false);

  // Activities list
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesDateFilter, setActivitiesDateFilter] = useState(() => toYMD(new Date()));
  const [showAllDays, setShowAllDays] = useState(false);

  const profile = useMemo(() => {
    const isSystemAdmin = currentUser?.role === 'Admin';
    const roleLabel = isSystemAdmin ? 'System Administrator' : 'Management Assistant';
    const username = currentUser?.username || 'admin.user';

    return {
      avatarText: currentUser?.avatar || 'AD',
      fullName: currentUser?.name || 'Admin User',
      subtitle: `${roleLabel} · CMA System 2026`,
      roleTags: [
        { kind: 'green', label: 'Active' },
        { kind: isSystemAdmin ? 'navy' : 'blue', label: currentUser?.role || 'Admin' },
      ],
      email: `${username}@cma.gov.lk`,
      phone: isSystemAdmin ? '+94 11 234 5678' : '+94 11 876 5432',
      role: roleLabel,
      department: isSystemAdmin ? 'CMA — IT / System Division' : 'CMA — CCU Division',
      year: '2026',
      timeline: [
        { time: '10 min ago', text: 'MC record updated — Liberty Plaza' },
        { time: '1 hour ago', text: 'C File updated — CF-2026-004' },
        { time: '3 hours ago', text: 'Complaint resolved — CMP-2026-002' },
        { time: 'Yesterday', text: 'M.Com record — Peterson Court updated' },
      ],
    };
  }, [currentUser]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchActivities({ date, allDays } = {}) {
    if (!userId) return;

    setActivitiesLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const url = new URL(`${API_BASE}/daily-activities`);
      url.searchParams.append('user_id', String(userId));
      if (!allDays && date) url.searchParams.append('date', date);

      const resp = await fetch(url.toString());
      const data = await resp.json();

      setActivities(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      showToast(e?.message || 'Failed to load activities', 'error');
    } finally {
      setActivitiesLoading(false);
    }
  }

  async function fetchSingleToForm(date) {
    if (!userId) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const url = new URL(`${API_BASE}/daily-activities`);
      url.searchParams.append('user_id', String(userId));
      url.searchParams.append('date', date);

      const resp = await fetch(url.toString());
      const data = await resp.json();
      const items = Array.isArray(data.items) ? data.items : [];
      const first = items[0];

      if (!first) {
        setActivityText('');
        setActivityCategory('');
        setActivityStatus('');
        return;
      }

      setActivityText(first.activity_text || '');
      setActivityCategory(first.activity_category || '');
      setActivityStatus(first.status || '');
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!userId) return;
    fetchActivities({ date: activitiesDateFilter, allDays: showAllDays });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activitiesDateFilter, showAllDays]);

  useEffect(() => {
    if (!userId) return;
    fetchSingleToForm(activityDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activityDate]);

  async function handleUpsertDailyActivity() {
    if (!userId) return;

    // Auto-capture: always set "activityDate" to the selected date
    // and if user is typing, treat "Update" as committing today's activity.

    if (!userId) return;

    const text = activityText.trim();
    if (!text) {
      showToast('Please enter daily activity text', 'error');
      return;
    }

    setSavingActivity(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const resp = await fetch(`${API_BASE}/daily-activities/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          activity_date: activityDate,
          activity_text: text,
          activity_category: activityCategory.trim() || null,
          status: activityStatus.trim() || null,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save daily activity');
      }

      showToast('Daily activity updated', 'success');

      // refresh list + form
      await fetchActivities({ date: activitiesDateFilter, allDays: showAllDays });
      await fetchSingleToForm(activityDate);
    } catch (e) {
      showToast(e?.message || 'Failed to save daily activity', 'error');
    } finally {
      setSavingActivity(false);
    }
  }

  const groupedByDate = useMemo(() => {
    const map = new Map();
    for (const item of activities) {
      const key = item.activity_date ? String(item.activity_date).slice(0, 10) : '—';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((k) => ({ date: k, items: map.get(k) || [] }));
  }, [activities]);

  return (
    <div className="cma-page" style={{ background: theme.bg }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* Header Card */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div
            className="card-body"
            style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: theme.navy,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 700,
                border: `4px solid ${theme.gold}`,
                flexShrink: 0,
              }}
            >
              {profile.avatarText}
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>
                {profile.fullName}
              </div>
              <div style={{ fontSize: 13, color: theme.text3, margin: '4px 0 6px 0' }}>
                {profile.subtitle}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {profile.roleTags.map((t) => (
                  <Badge key={t.label} kind={t.kind}>
                    {t.label}
                  </Badge>
                ))}
              </div>
            </div>

            <button className="btn btn-outline" onClick={() => showToast('Profile edit mode — coming soon', 'info')}>
              <i className="fas fa-edit" /> Edit
            </button>
          </div>
        </div>

        <div className="two-col">
          {/* Personal Details */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Personal Details</span>
            </div>
            <div className="card-body">
              <table style={{ width: '100%', fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0', width: '40%' }}>Full Name</td>
                    <td style={{ fontWeight: 600 }}>{profile.fullName}</td>
                  </tr>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0' }}>Email</td>
                    <td style={{ fontWeight: 600 }}>{profile.email}</td>
                  </tr>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0' }}>Phone</td>
                    <td style={{ fontWeight: 600 }}>{profile.phone}</td>
                  </tr>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0' }}>Role</td>
                    <td style={{ fontWeight: 600 }}>{profile.role}</td>
                  </tr>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0' }}>Department</td>
                    <td style={{ fontWeight: 600 }}>{profile.department}</td>
                  </tr>
                  <tr>
                    <td style={{ color: theme.text3, padding: '7px 0' }}>Year</td>
                    <td style={{ fontWeight: 600 }}>{profile.year}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Activity Summary</span>
            </div>
            <div className="card-body">
              <Timeline items={profile.timeline} />
            </div>
          </div>
        </div>

        {/* Daily Activity Update */}
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-header">
            <span className="card-title">Daily Activity Update</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>Date</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 180 }}
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleUpsertDailyActivity} disabled={savingActivity}>
                <i className="fas fa-save" /> {savingActivity ? 'Saving...' : 'Update Daily Activity'}
              </button>
            </div>
          </div>

          <div className="card-body">
            <div className="daily-activity-grid">
              <div className="daily-activity-row">
                <div style={{ flex: '1 1 280px' }}>
                  <div className="daily-activity-label">Activity</div>
                  <textarea
                    className="form-control daily-activity-textarea"
                    placeholder="Write what you did today (e.g., reviewed MC applications, updated complaints, followed up discussions...)"
                    value={activityText}
                    onChange={(e) => setActivityText(e.target.value)}
                  />
                </div>
              </div>

              <div className="daily-activity-meta">
                <div style={{ minWidth: 240, flex: '1 1 240px' }}>
                  <div className="daily-activity-label">Category (optional)</div>
                  <input
                    className="form-control"
                    placeholder="e.g., MC / Complaints / C Files"
                    value={activityCategory}
                    onChange={(e) => setActivityCategory(e.target.value)}
                  />
                </div>
                <div style={{ minWidth: 200, flex: '1 1 200px' }}>
                  <div className="daily-activity-label">Status (optional)</div>
                  <input
                    className="form-control"
                    placeholder="e.g., Completed / In Progress"
                    value={activityStatus}
                    onChange={(e) => setActivityStatus(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All Activities (Daily view) */}
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-header">
            <span className="card-title">All Activities (Daily View)</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>Filter</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 180 }}
                  value={activitiesDateFilter}
                  onChange={(e) => setActivitiesDateFilter(e.target.value)}
                  disabled={showAllDays}
                />
              </div>
              <button
                className={`btn ${showAllDays ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowAllDays((v) => !v)}
              >
                <i className="fas fa-list" /> {showAllDays ? 'Showing: All Days' : 'Show All Days'}
              </button>
            </div>
          </div>

          <div className="card-body">
            {activitiesLoading ? (
              <div style={{ color: 'var(--text3)', padding: '10px 0' }}>Loading activities...</div>
            ) : groupedByDate.length === 0 ? (
              <div style={{ color: 'var(--text3)', padding: '10px 0' }}>No activities found.</div>
            ) : (
              <div className="daily-activity-list">
                {groupedByDate.map((g) => (
                  <div key={g.date}>
                    <div className="daily-activity-day">{g.date}</div>
                    {g.items.map((it) => (
                      <div className="daily-activity-item" key={it.id}>
                        <div className="daily-activity-item-top">
                          <div style={{ fontWeight: 800, color: 'var(--navy)' }}>Daily Activity</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span className="daily-activity-pill gray">ID: {it.id}</span>
                            {it.activity_category ? (
                              <span className="daily-activity-pill amber">{it.activity_category}</span>
                            ) : (
                              <span className="daily-activity-pill gray">No Category</span>
                            )}
                            {it.status ? (
                              <span className="daily-activity-pill green">{it.status}</span>
                            ) : (
                              <span className="daily-activity-pill gray">No Status</span>
                            )}
                          </div>
                        </div>
                        <div className="daily-activity-text">{it.activity_text}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-header">
            <span className="card-title">Change Password</span>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" className="form-control" placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-control" placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" className="form-control" placeholder="••••••••" />
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-start' }}>
              <button className="btn btn-primary" onClick={() => showToast('Password updated successfully', 'success')}>
                <i className="fas fa-save" /> Update Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 22,
            right: 22,
            zIndex: 9999,
            background: '#fff',
            border: `1px solid ${theme.border}`,
            borderLeft: `4px solid ${
              toast.type === 'success' ? theme.green : toast.type === 'info' ? theme.blue : theme.red
            }`,
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 30px rgba(0,0,0,.12)',
            minWidth: 240,
          }}
        >
          <i
            className={`fas fa-${toast.type === 'success' ? 'check-circle' : toast.type === 'info' ? 'info-circle' : 'times-circle'}`}
            style={{
              color:
                toast.type === 'success'
                  ? theme.green
                  : toast.type === 'info'
                    ? theme.blue
                    : theme.red,
              fontSize: 15,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

