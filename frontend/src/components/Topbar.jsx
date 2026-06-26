import { useState, useEffect, useRef } from 'react';
import './Topbar.css';

function Topbar({ currentUser, currentPage, onToggleSidebar, onLogout }) {
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const notifications = [
    { id: 1, title: 'New registration filed — MC Application', time: '5 minutes ago' },
    { id: 2, title: 'MC record updated', time: '1 hour ago' },
  ];

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
        <div className="search-bar">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search..." />
        </div>
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button className="topbar-btn" onClick={() => setShowNotif((prev) => !prev)}>
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && <span className="badge-dot"></span>}
          </button>
          {showNotif && (
            <div className="notif-dd">
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: '600', fontSize: '13px' }}>
                Notifications
              </div>
              {notifications.map((item) => (
                <div key={item.id} className="notif-item">
                  <div className="notif-title">{item.title}</div>
                  <div className="notif-time">{item.time}</div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="notif-item" style={{ cursor: 'default' }}>
                  <div className="notif-title">No notifications</div>
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
