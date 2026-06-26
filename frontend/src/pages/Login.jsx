import { useState } from 'react';
import '../CMAStyles.css';

const cmaLogo = '/assets/cma-logo.png';

const USERS = [
  // Admins
  { id: 'A01', username: 'admin', password: 'password', role: 'Admin', name: 'K. D. Silva', avatar: 'KS' },
  { id: 'A02', username: 'admin.perera', password: 'Admin@2026', role: 'Admin', name: 'R. M. Perera', avatar: 'RP' },
  // Management Assistants
  { id: 'MA01', username: 'MA', password: 'password', role: 'MA', name: 'S. Jayawardena', avatar: 'SJ' },
  { id: 'MA02', username: 'MA1', password: 'password', role: 'MA', name: 'T. Fernando', avatar: 'TF' },
  { id: 'MA03', username: 'ma.bandara', password: 'MA@2026', role: 'MA', name: 'A. Bandara', avatar: 'AB' },
  { id: 'MA04', username: 'ma.dissanayake', password: 'MA@2026', role: 'MA', name: 'N. Dissanayake', avatar: 'ND' },
  { id: 'MA05', username: 'ma.wickrama', password: 'MA@2026', role: 'MA', name: 'P. Wickramasinghe', avatar: 'PW' },
  { id: 'MA06', username: 'ma.gunawardena', password: 'MA@2026', role: 'MA', name: 'C. Gunawardena', avatar: 'CG' },
  { id: 'MA07', username: 'ma.ranasinghe', password: 'MA@2026', role: 'MA', name: 'H. Ranasinghe', avatar: 'HR' },
  { id: 'MA08', username: 'ma.seneviratne', password: 'MA@2026', role: 'MA', name: 'L. Seneviratne', avatar: 'LS' },
  { id: 'MA09', username: 'ma.rajapaksa', password: 'MA@2026', role: 'MA', name: 'M. Rajapaksa', avatar: 'MR' },
  { id: 'MA10', username: 'ma.karunarathne', password: 'MA@2026', role: 'MA', name: 'D. Karunarathne', avatar: 'DK' },
  { id: 'MA11', username: 'ma.liyanage', password: 'MA@2026', role: 'MA', name: 'U. Liyanage', avatar: 'UL' },
  { id: 'MA12', username: 'ma.amarasinghe', password: 'MA@2026', role: 'MA', name: 'B. Amarasinghe', avatar: 'BA' },
];

export default function CMALogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();

    const uname = username.trim();
    if (!uname) {
      setError('Please enter your username.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 300));

    const user = USERS.find((u) => u.username.toLowerCase() === uname.toLowerCase());

    if (!user) {
      setError('Username not found.');
      setLoading(false);
      return;
    }
    if (password !== user.password) {
      setError('Incorrect password. Please try again.');
      setLoading(false);
      return;
    }

    onLogin?.(user);
    setLoading(false);
  };

  return (
    <>
      <div className="cma-login-root">
        <div className="grid-overlay" />

        {/* Top Bar */}
        <div className="login-topbar">
          <div className="login-topbar-logo">
            <div className="logo-emblem">
              <img src={cmaLogo} alt="CMA Logo" />
            </div>
            <div>
              <div className="logo-text-main">CMA — CCU</div>
              <div className="logo-text-sub">Condominium Management Authority</div>
            </div>
          </div>
               </div>

        {/* Main */}
        <div className="login-main">
          <form className="login-card" onSubmit={handleLogin}>
            <div className="login-card-header">
              <div className="login-card-emblem">
                <img src={cmaLogo} alt="CMA Logo" />
              </div>
              <h1>CMA_CCU</h1>
              <p>Enter your username and password to continue</p>
            </div>

            <div className="field-block">
              <div className="field-label">Username</div>
              <input
                className="text-input"
                type="text"
                placeholder="e.g. admin.silva"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="field-block">
              <div className="field-label">Password</div>
              <div className="pw-field-wrap">
                <input
                  className="pw-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="pw-error">
                ⚠️ {error}
              </div>
            )}

            <button className="pw-submit-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>

        <div className="login-footer">
          © 2026 Condominium Management Authority · Sri Lanka .
        </div>
      </div>
    </>
  );
}

