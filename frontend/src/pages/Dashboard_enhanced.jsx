import { useState, useEffect } from 'react';
import {
  fetchDashboardStats,
  fetchPendingComplaints,
  fetchPendingCfiles,
  fetchDiscussions,
} from '../api';
import '../CMAStyles.css';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    mc: 0,
    mcom: 0,
    cfiles: 0,
    pendingCfiles: 0,
    pendingComplaints: 0,
    pendingMc: 0,
    pendingMcom: 0,
  });
  const [pendingComplaints, setPendingComplaints] = useState([]);
  const [pendingCfiles, setPendingCfiles] = useState([]);
  const [reminderDiscussions, setReminderDiscussions] = useState([]);
  const [newDiscussions, setNewDiscussions] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activityData] = useState([
    { date: 'Today', activity: 'MC record updated — Building A-01' },
    { date: 'Yesterday', activity: 'New registration filed — MC Application' },
    { date: '2 days ago', activity: 'Complaint resolved — Case #2026-045' },
    { date: '3 days ago', activity: 'Report generated — Monthly Summary' },
  ]);

  useEffect(() => {
    loadDashboardData();

    const timer = setInterval(() => {
      const now = new Date();
      const clockDisplay = document.getElementById('clockDisplay');
      if (clockDisplay) clockDisplay.textContent = now.toLocaleTimeString();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [dashStats, pendingComplaintsData, pendingCfilesData, discussionsData] = await Promise.all([
        fetchDashboardStats().catch(() => ({
          mc: 0,
          mcom: 0,
          cfiles: 0,
          pendingCfiles: 0,
          pendingComplaints: 0,
        })),
        fetchPendingComplaints(5).catch(() => ([])),
        fetchPendingCfiles(5).catch(() => ([])),
        fetchDiscussions(1, 1000).catch(() => ({ discussions: [] })),
      ]);

      setStats(dashStats);
      setPendingComplaints(pendingComplaintsData || []);
      setPendingCfiles(pendingCfilesData || []);

      const allDiscs = discussionsData?.discussions || [];

      // Filter discussions to find the ones with active reminders
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const due = allDiscs.filter((d) => {
        if (!d.reminder_date) return false;
        if (d.status === 'Completed' || d.status === 'Cancelled') return false;
        const rd = new Date(d.reminder_date);
        if (Number.isNaN(rd.getTime())) return false;
        rd.setHours(0, 0, 0, 0);
        return rd <= today;
      });

      setReminderDiscussions(due);

      // Filter for new status discussions, sort by creation time desc, limit to 5
      const newDiscs = allDiscs
        .filter((d) => d.status === 'New')
        .sort((a, b) => {
          const dateA = new Date(a.created_at || a.createdAt || 0);
          const dateB = new Date(b.created_at || b.createdAt || 0);
          return dateB - dateA;
        })
        .slice(0, 5);

      setNewDiscussions(newDiscs);

      if (due.length > 0) {
        const hasShown = sessionStorage.getItem('cma_dashboard_reminder_shown');
        if (!hasShown) {
          setShowReminderModal(true);
          sessionStorage.setItem('cma_dashboard_reminder_shown', 'true');
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cma-page">
      <div className="page-header-banner">
        <div>
          <div className="title">Condominium Management Authority</div>
          <div className="sub">Management System — 2026 | Sri Lanka</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,.7)' }} id="clockDisplay">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon si-blue"><i className="fas fa-building"></i></div>
          <div className="stat-label">MC Records</div>
          <div className="stat-value">{stats.mc}</div>
          <div className="stat-change up"><i className="fas fa-arrow-up"></i> Active MCs</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon si-teal"><i className="fas fa-city"></i></div>
          <div className="stat-label">M.Com Records</div>
          <div className="stat-value">{stats.mcom}</div>
          <div className="stat-change up"><i className="fas fa-arrow-up"></i> Registered</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon si-amber"><i className="fas fa-folder-open"></i></div>
          <div className="stat-label">C Files</div>
          <div className="stat-value">{stats.cfiles}</div>
          <div className="stat-change up"><i className="fas fa-arrow-up"></i> +5 this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon si-orange"><i className="fas fa-exclamation-circle"></i></div>
          <div className="stat-label">Pending C-Files</div>
          <div
            className="stat-value"
            style={{ color: stats.pendingCfiles > 5 ? '#dc2626' : '#f59e0b' }}
          >
            {stats.pendingCfiles}
          </div>
          <div className="stat-change up"><i className="fas fa-arrow-up"></i> 15+ Days Overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon si-red"><i className="fas fa-comment-exclamation"></i></div>
          <div className="stat-label">Pending Complaints</div>
          <div className="stat-value">{stats.pendingComplaints}</div>
          <div className="stat-change up"><i className="fas fa-arrow-up"></i> Requires Action</div>
        </div>
      </div>

      {/* PENDING TASKS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
        <div className="dashboard-pending-card mc-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#eef2ff',
                  color: '#1a3a6b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                <i className="fas fa-building"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1a1a2e' }}>MC Management</h3>
                <span style={{ fontSize: '12px', color: '#5a6478' }}>Pending Tasks</span>
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: stats.pendingMc > 0 ? '#d32f2f' : '#16a34a', marginBottom: '10px' }}>
              {stats.pendingMc || 0}
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('cma_mc_filter', 'Pending');
              onNavigate?.('mc');
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f4f6fb',
              color: '#1a3a6b',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#e2e8f0')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#f4f6fb')}
          >
            View Pending Tasks <i className="fas fa-arrow-right" style={{ marginLeft: '5px' }}></i>
          </button>
        </div>

        <div className="dashboard-pending-card mcom-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#e0f2f1',
                  color: '#00796b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                <i className="fas fa-city"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1a1a2e' }}>M.Com Management</h3>
                <span style={{ fontSize: '12px', color: '#5a6478' }}>Pending Tasks</span>
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: stats.pendingMcom > 0 ? '#d32f2f' : '#16a34a', marginBottom: '10px' }}>
              {stats.pendingMcom || 0}
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem('cma_mcom_filter', 'Pending');
              onNavigate?.('mcom');
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f4f6fb',
              color: '#00796b',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#e2e8f0')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#f4f6fb')}
          >
            View Pending Tasks <i className="fas fa-arrow-right" style={{ marginLeft: '5px' }}></i>
          </button>
        </div>

        <div className="dashboard-pending-card cfiles-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: '#fff3e0',
                  color: '#f57c00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                <i className="fas fa-folder-open"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1a1a2e' }}>C Files</h3>
                <span style={{ fontSize: '12px', color: '#5a6478' }}>Pending Tasks {'>'}15 Days</span>
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: stats.pendingCfiles > 0 ? '#d32f2f' : '#16a34a', marginBottom: '10px' }}>
              {stats.pendingCfiles || 0}
            </div>
          </div>
          <button
            onClick={() => {
              onNavigate?.('cfiles');
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f4f6fb',
              color: '#f57c00',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#e2e8f0')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#f4f6fb')}
          >
            View Pending Tasks <i className="fas fa-arrow-right" style={{ marginLeft: '5px' }}></i>
          </button>
        </div>
      </div>


      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
            <button className="btn btn-link">View All</button>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activityData.map((item, idx) => (
                <div key={idx} style={{ paddingBottom: '10px', borderBottom: '1px solid #e0e0e0' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '4px' }}>{item.date}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{item.activity}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">System Summary — 2026</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="stat-value" style={{ color: '#1976d2' }}>{stats.mc}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Active MCs</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="stat-value" style={{ color: '#d32f2f' }}>2</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Closed Files</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="stat-value" style={{ color: '#f57c00' }}>{stats.pendingComplaints}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="stat-value" style={{ color: '#388e3c' }}>15</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Resolved</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Due Reminder Alert Modal */}
      {showReminderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowReminderModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '700',
                }}
              >
                <i className="fas fa-bell" style={{ color: '#d97706' }}></i>
                Active Discussion Reminders
              </h3>
              <button
                onClick={() => setShowReminderModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#92400e',
                  lineHeight: 1,
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(217, 119, 6, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                You have <strong>{reminderDiscussions.length}</strong> discussion meeting(s) with active reminders due today or pending action:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reminderDiscussions.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      background: '#fefcf6',
                      border: '1.5px solid #fde68a',
                      borderRadius: '12px',
                      padding: '14px',
                      boxShadow: '0 2px 4px rgba(217,119,6,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#d97706',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {d.file_no || 'NO FILE NO.'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          background: '#fff3e0',
                          color: '#e65100',
                          fontWeight: '700',
                        }}
                      >
                        {d.status || 'New'}
                      </span>
                    </div>
                    <h4 style={{ margin: '6px 0 4px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                      {d.appointment || 'Untitled Meeting'}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      {d.meeting_date_time && (
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-clock" style={{ fontSize: '11px', color: '#94a3b8' }}></i>
                          <span>{d.meeting_date_time}</span>
                        </div>
                      )}
                      {d.venue && (
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-map-marker-alt" style={{ fontSize: '11px', color: '#94a3b8' }}></i>
                          <span>{d.venue}</span>
                        </div>
                      )}
                    </div>
                    {d.reminder_notes && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#78350f',
                          background: '#fef9ec',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          marginTop: '8px',
                          borderLeft: '3px solid #f59e0b',
                        }}
                      >
                        <strong>Notes:</strong> {d.reminder_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              <button
                onClick={() => setShowReminderModal(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  localStorage.setItem('cma_discussion_filter', 'New');
                  onNavigate?.('discussion');
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1a3a6b 0%, #102a52 100%)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(26,58,107,0.2)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(26,58,107,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(26,58,107,0.2)';
                }}
              >
                Go to Discussions
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Due Reminder Alert Modal */}
      {showReminderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowReminderModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '700',
                }}
              >
                <i className="fas fa-bell" style={{ color: '#d97706' }}></i>
                Active Discussion Reminders
              </h3>
              <button
                onClick={() => setShowReminderModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#92400e',
                  lineHeight: 1,
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(217, 119, 6, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                You have <strong>{reminderDiscussions.length}</strong> discussion meeting(s) with active reminders due today or pending action:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reminderDiscussions.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      background: '#fefcf6',
                      border: '1.5px solid #fde68a',
                      borderRadius: '12px',
                      padding: '14px',
                      boxShadow: '0 2px 4px rgba(217,119,6,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#d97706',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {d.file_no || 'NO FILE NO.'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          background: '#fff3e0',
                          color: '#e65100',
                          fontWeight: '700',
                        }}
                      >
                        {d.status || 'New'}
                      </span>
                    </div>
                    <h4 style={{ margin: '6px 0 4px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                      {d.appointment || 'Untitled Meeting'}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      {d.meeting_date_time && (
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-clock" style={{ fontSize: '11px', color: '#94a3b8' }}></i>
                          <span>{d.meeting_date_time}</span>
                        </div>
                      )}
                      {d.venue && (
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-map-marker-alt" style={{ fontSize: '11px', color: '#94a3b8' }}></i>
                          <span>{d.venue}</span>
                        </div>
                      )}
                    </div>
                    {d.reminder_notes && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#78350f',
                          background: '#fef9ec',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          marginTop: '8px',
                          borderLeft: '3px solid #f59e0b',
                        }}
                      >
                        <strong>Notes:</strong> {d.reminder_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              <button
                onClick={() => setShowReminderModal(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  localStorage.setItem('cma_discussion_filter', 'New');
                  onNavigate?.('discussion');
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1a3a6b 0%, #102a52 100%)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(26,58,107,0.2)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(26,58,107,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(26,58,107,0.2)';
                }}
              >
                Go to Discussions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

