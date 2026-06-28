import { useState, useEffect, useRef } from 'react';
import './Topbar.css';

function Topbar({ currentUser, currentPage, onToggleSidebar, onLogout, onNavigate }) {
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const { fetchDiscussions } = await import('../api');
        const res = await fetchDiscussions(1, 1000);
        const allDiscs = res?.discussions || [];
        
        // Filter discussions to find the ones with active reminders
        const due = allDiscs.filter((d) => {
          if (!d.reminder_date) return false;
          if (d.status === 'Completed' || d.status === 'Cancelled') return false;
          
          const remDate = new Date(d.reminder_date).setHours(0, 0, 0, 0);
          const today = new Date().setHours(0, 0, 0, 0);
          return remDate <= today;
        });

        const list = due.map((d) => ({
          id: d.id,
          title: d.appointment || 'Discussion Meeting',
          subtitle: `${d.file_no || 'No File'} • ${d.meeting_date_time || 'No Time'} • ${d.venue || 'No Venue'}`,
          notes: d.reminder_notes || '',
          time: d.date ? new Date(d.date).toLocaleDateString() : '',
        }));

        setNotifications(list);
      } catch (err) {
        console.error('Failed to load notification reminders:', err);
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.length;

  const pageNames = {
    dashboard: 'Dashboard',
    mc: 'MC Management',
    mcom: 'M.Com Management',
    cfiles: 'C Files',
    complains: 'Complaints',
    registration: 'Registration Form',
    records: 'Records',
    reports: 'Report Generate',
    profile: 'My Profile',
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="cma-topbar">
      <div className="topbar-left">
        <button className="hamburger" onClick={onToggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
        <div>
          <div className="page-title">{pageNames[currentPage] || 'Dashboard'}</div>
          <div className="breadcrumb">Home / {pageNames[currentPage] || 'Dashboard'}</div>
        </div>
      </div>
      <div className="topbar-right">
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button className="topbar-btn" onClick={() => setShowNotif((prev) => !prev)}>
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && <span className="badge-dot"></span>}
          </button>
          {showNotif && (
            <div className="notif-dd" style={{ width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: '600', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Discussion Reminders</span>
                <span style={{ fontSize: '11px', background: 'var(--navy)', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>
                  {notifications.length}
                </span>
              </div>
              {notifications.map((item) => (
                <div 
                  key={item.id} 
                  className="notif-item"
                  onClick={() => {
                    onNavigate?.('discussion');
                    setShowNotif(false);
                  }}
                  style={{ cursor: 'pointer', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}
                >
                  <div className="notif-title" style={{ fontWeight: '700', fontSize: '13px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-calendar-check" style={{ color: 'var(--gold)', fontSize: '12px' }}></i>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '3px', lineHeight: '1.4' }}>
                    {item.subtitle}
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: '11px', color: '#b45309', background: '#fffbeb', padding: '5px 8px', borderRadius: '6px', marginTop: '5px', borderLeft: '2.5px solid #d97706', lineHeight: '1.3' }}>
                      {item.notes}
                    </div>
                  )}
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="notif-item" style={{ cursor: 'default', padding: '20px 14px', textAlign: 'center', color: 'var(--text3)' }}>
                  <i className="fas fa-bell-slash" style={{ fontSize: '20px', display: 'block', marginBottom: '8px', opacity: 0.5 }}></i>
                  <div className="notif-title" style={{ fontSize: '12px' }}>No discussion reminders due today</div>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div className="profile-trigger" onClick={() => setShowProfile((prev) => !prev)}>
            <div className="avatar">{currentUser?.avatar || 'AD'}</div>
            <span className="pname">{currentUser?.name?.split(' ')[0] || 'Admin'}</span>
            <i className="fas fa-chevron-down"></i>
          </div>
          {showProfile && (
            <div className="profile-dd">
              <div className="profile-dd-head">
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{currentUser?.name || 'Admin User'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                  {currentUser?.role === 'Admin' ? 'CMA Administrator' : 'Management Assistant'}
                </div>
              </div>
              <div className="profile-dd-item">
                <i className="fas fa-user"></i>My Profile
              </div>
              <div className="profile-dd-item">
                <i className="fas fa-cog"></i>Settings
              </div>
              <div className="profile-dd-item">
                <i className="fas fa-question-circle"></i>Help
              </div>
              <div className="profile-dd-item danger" onClick={onLogout}>
                <i className="fas fa-sign-out-alt"></i>Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
