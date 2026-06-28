import './Sidebar.css';

function Sidebar({ currentUser, currentPage, onNavigate, isOpen, onToggleOpen }) {
  const navItems = [
    { id: 'dashboard', icon: 'fas fa-th-large', label: 'Dashboard', section: 'Main' },
    { id: 'mc', icon: 'fas fa-building', label: 'MC Management', section: 'Modules' },
    { id: 'mcom', icon: 'fas fa-city', label: 'M.Com Management', section: 'Modules' },
    { id: 'cfiles', icon: 'fas fa-folder-open', label: 'C Files', section: 'Modules' },
    { id: 'complains', icon: 'fas fa-comment-exclamation', label: 'Complaints', section: 'Modules' },
    { id: 'discussion', icon: 'fas fa-comments', label: 'Discussions', section: 'Modules' },
    { id: 'registration', icon: 'fas fa-file-signature', label: 'Registration Form', section: 'Modules' },
    { id: 'records', icon: 'fas fa-database', label: 'Records', section: 'Data' },
    { id: 'reports', icon: 'fas fa-chart-bar', label: 'Report Generate', section: 'Reports' },
    { id: 'profile', icon: 'fas fa-user-circle', label: 'My Profile', section: 'Settings' },
  ];

  const renderSections = () => {
    let currentSection = '';
    return navItems.map((item) => {
      const showSection = currentSection !== item.section;
      currentSection = item.section;
      return (
        <div key={item.id}>
          {showSection && <div className="nav-section">{item.section}</div>}
          <div
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => {
              onNavigate(item.id);
              onToggleOpen(false);
            }}
          >
            <div className="nav-icon-wrap">
              <i className={item.icon}></i>
            </div>
            <span className="nav-label">{item.label}</span>
          </div>
        </div>
      );
    });
  };

  return (
    <>
      <nav className={`cma-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-area">
            <div className="cma-emblem">
              <img src="/assets/cma-logo.png" alt="CMA Logo" className="logo-image" />
            </div>
            <div className="logo-text">
              <div className="brand">Condominium Management Authority</div>
              <div className="sub">Sri Lanka</div>
            </div>
          </div>
        </div>
        <div className="sidebar-nav">{renderSections()}</div>
        <div className="sidebar-bottom">
          <div className="user-pill" onClick={() => onNavigate('profile')}>
            <div className="user-avatar">{currentUser?.avatar || 'AD'}</div>
            <div className="user-info">
              <div className="user-name">{currentUser?.name || 'Admin User'}</div>
              <div className="user-role">{currentUser?.role === 'Admin' ? 'CMA Administrator' : 'Management Assistant'}</div>
            </div>
          </div>
          <div className="sidebar-footer">
            <span className="footer-team">Developed by CMA team</span>
            <span className="footer-version">V1.0.0</span>
          </div>
        </div>
      </nav>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={() => onToggleOpen(false)}></div>
    </>
  );
}

export default Sidebar;
