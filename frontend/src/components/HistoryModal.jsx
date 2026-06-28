import React from 'react';

const defaultTheme = {
  navy: '#1a3a6b',
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#1a1a2e',
  text2: '#5a6478',
  text3: '#94a0b4',
  border: '#e2e8f0',
  green: '#16a34a',
  red: '#dc2626',
  blue: '#2563eb',
  orange: '#ea580c',
};

export default function HistoryModal({ isOpen, onClose, record, theme = defaultTheme }) {
  if (!isOpen || !record) return null;

  // Helper to format ISO date to readable string
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const pad = (n) => String(n).padStart(2, '0');
      const dateVal = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      const timeVal = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      return `${dateVal} ${timeVal}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Parse history log
  let historyLog = [];
  if (record.history) {
    try {
      historyLog = typeof record.history === 'string' ? JSON.parse(record.history) : record.history;
    } catch (e) {
      console.error("Failed to parse history JSON", e);
    }
  }

  // Synthesize history log if empty but audit info is available
  if (!Array.isArray(historyLog) || historyLog.length === 0) {
    historyLog = [];
    if (record.created_at || record.created_by) {
      historyLog.push({
        name:
          record.created_by ||
          record.modified_by ||
          record.operator ||
          record.username ||
          'System',
        action: 'Added',
        time: record.created_at,
      });
    }
    if (record.updated_at && record.modified_by && record.updated_at !== record.created_at) {
      historyLog.push({
        name:
          record.created_by ||
          record.modified_by ||
          record.operator ||
          record.username ||
          'System',
        action: 'Modified',
        time: record.updated_at,
      });
    }
  }

  // Add this helper inside the component, before the return
  const resolveName = (entry) => {
    return (
      entry?.name ||
      entry?.user ||
      entry?.username ||
      entry?.performed_by ||
      entry?.modified_by ||
      entry?.created_by ||
      entry?.operator ||
      entry?.email ||
      null
    );
  };

  // Sort history log chronologically descending (newest first)
  const sortedHistory = [...historyLog].sort((a, b) => {
    const timeA = a.time ? new Date(a.time).getTime() : 0;
    const timeB = b.time ? new Date(b.time).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        fontFamily: 'inherit',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: theme.card,
          borderRadius: 12,
          boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
          maxWidth: 600,
          width: '90%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: theme.navy,
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-history" style={{ fontSize: 18 }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#ffffff' }}>
              Audit & Change History
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#ffffff',
              opacity: 0.8,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.target.style.opacity = '0.8'; }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: '#fcfcfd' }}>

          {/* Top summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                <i className="fas fa-plus-circle" style={{ color: theme.green }} /> Created By
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{record.created_by || '—'}</div>
              <div style={{ fontSize: 12, color: theme.text2, marginTop: 4 }}>
                {formatDateTime(record.created_at)}
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              padding: '12px 16px',
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.text3, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                <i className="fas fa-edit" style={{ color: theme.orange }} /> Last Modified By
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{record.modified_by || '—'}</div>
              <div style={{ fontSize: 12, color: theme.text2, marginTop: 4 }}>
                {formatDateTime(record.updated_at)}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ marginBottom: 10 }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: theme.text, fontWeight: 700, borderBottom: `1px solid ${theme.border}`, paddingBottom: 8 }}>
              Change Log Timeline (Daily/Full List)
            </h4>

            {sortedHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: theme.text3, fontSize: 13 }}>
                <i className="fas fa-info-circle" style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                No change log history available for this record.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 8 }}>
                {sortedHistory.map((item, index) => {
                  const isAdded = String(item.action).toLowerCase() === 'added' || String(item.action).toLowerCase() === 'created';
                  const actionColor = isAdded ? theme.green : theme.orange;
                  const actionBg = isAdded ? `${theme.green}15` : `${theme.orange}15`;

                  return (
                    <div key={index} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                      {/* Timeline Line */}
                      {index < sortedHistory.length - 1 && (
                        <div style={{
                          position: 'absolute',
                          left: 11,
                          top: 24,
                          bottom: -20,
                          width: 2,
                          backgroundColor: theme.border,
                        }} />
                      )}

                      {/* Icon Indicator */}
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: isAdded ? theme.green : theme.orange,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        zIndex: 2,
                        flexShrink: 0,
                      }}>
                        <i className={isAdded ? "fas fa-plus" : "fas fa-pen"} />
                      </div>

                      {/* Content Card */}
                      <div style={{
                        flex: 1,
                        background: '#ffffff',
                        border: `1px solid ${theme.border}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>
                            {resolveName(item) || 'System'}
                          </span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: actionColor,
                            background: actionBg,
                            padding: '2px 8px',
                            borderRadius: 12,
                            textTransform: 'uppercase',
                          }}>
                            {item.action || 'Edited'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: theme.text2, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-clock" style={{ fontSize: 12, color: theme.text3 }} />
                          {formatDateTime(item.time || item.date)}
                        </div>
                        {item.note && (
                          <div style={{
                            fontSize: 12,
                            color: '#78350f',
                            background: '#fffbeb',
                            borderLeft: '3px solid #d97706',
                            padding: '6px 10px',
                            borderRadius: 6,
                            marginTop: 8,
                            lineHeight: '1.4'
                          }}>
                            <i className="fas fa-info-circle" style={{ marginRight: 6, color: '#d97706' }} />
                            {item.note}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#ffffff',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: `1px solid ${theme.border}`,
              background: '#ffffff',
              color: theme.text2,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f8fafc';
              e.target.style.borderColor = theme.text3;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#ffffff';
              e.target.style.borderColor = theme.border;
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
