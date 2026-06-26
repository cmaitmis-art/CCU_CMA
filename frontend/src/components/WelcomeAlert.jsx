import { useState, useEffect } from 'react';
import './WelcomeAlert.css';

export default function WelcomeAlert({ userName, role, duration = 4000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  return (
    <div className="welcome-alert-overlay">
      <div className="welcome-alert-card">
        <div className="welcome-alert-header">
          <div className="welcome-alert-title"> Welcome!</div>
          <button 
            className="welcome-alert-close"
            onClick={() => setIsVisible(false)}
            aria-label="Close welcome alert"
          >
            ✕
          </button>
        </div>
        
        <div className="welcome-alert-body">
          <div className="welcome-greeting">
            Welcome back, <strong>{userName}</strong>!
          </div>
          <div className="welcome-role">
            Role: <span className="role-badge">{role}</span>
          </div>
          <div className="welcome-message">
            You're now logged into the CMA Management System.
          </div>
        </div>

        <div className="welcome-alert-footer">
          <div className="welcome-progress-bar">
            <div className="progress-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}
