import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard_enhanced.jsx';
import CMALogin from './pages/Login.jsx';
import WelcomeAlert from './components/WelcomeAlert.jsx';
import Logger from './utils/logger.js';

import MCManagement from './pages/MCManagement';
import MComManagement from './pages/MComManagement';
import CFiles from './pages/CFiles';
import Complaints from './pages/Complaints';
import Discussions from './pages/Discussions';
import RegistrationForm from './pages/RegistrationForm';
import Records from './pages/Records';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import './CMAStyles.css';
import { ConfirmDialogProvider } from './ConfirmDialogContext.jsx';

function CMAApp() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('cma_currentUser');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [showWelcome, setShowWelcome] = useState(false);

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('cma_currentPage');
    const allowed = new Set([
      'dashboard',
      'mc',
      'mcom',
      'cfiles',
      'complains',
      'discussion',
      'registration',
      'records',
      'reports',
      'profile',
    ]);

    return allowed.has(saved) ? saved : 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pages = {
    dashboard: Dashboard,
    mc: MCManagement,
    mcom: MComManagement,
    cfiles: CFiles,
    complains: Complaints,
    discussion: Discussions,
    registration: RegistrationForm,
    records: Records,
    reports: Reports,
    profile: Profile,
  };

  const CurrentPage = pages[currentPage] || Dashboard;

  useEffect(() => {
    try {
      localStorage.setItem('cma_currentPage', currentPage);
      // Log page navigation
      if (currentUser) {
        Logger.logPageNavigation('(previous)', currentPage, currentUser);
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [currentPage, currentUser]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('cma_currentUser', JSON.stringify(user));
    setCurrentPage('dashboard');
    setShowWelcome(true);
    
    // Log user login
    Logger.logLogin(user.username, user.role);
  };

  const handleLogout = () => {
    const username = currentUser?.username;
    setCurrentUser(null);
    localStorage.removeItem('cma_currentUser');
    
    // Log user logout
    if (username) {
      Logger.logLogout(username);
    }
  };

  if (!currentUser) {
    return <CMALogin onLogin={handleLogin} />;
  }

  return (
    <ConfirmDialogProvider>
      {showWelcome && (
        <WelcomeAlert 
          userName={currentUser.name} 
          role={currentUser.role}
          duration={4000}
        />
      )}
      <div className="cma-app">
        <Sidebar currentUser={currentUser} currentPage={currentPage} onNavigate={setCurrentPage} onToggleOpen={setSidebarOpen} isOpen={sidebarOpen} />
        <div className="cma-main-wrap">
          <Topbar currentUser={currentUser} currentPage={currentPage} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />
          <main className="cma-main">
            <CurrentPage onNavigate={setCurrentPage} currentUser={currentUser} />
          </main>
        </div>
      </div>
    </ConfirmDialogProvider>
  );
}

export default CMAApp;

