/**
 * Logger utility for tracking user actions and debugging
 * Logs to browser console with structured format
 */

const LogLevels = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
};

const LogColors = {
  DEBUG: 'color: #888; font-weight: bold;',
  INFO: 'color: #0066cc; font-weight: bold;',
  SUCCESS: 'color: #00aa00; font-weight: bold;',
  WARNING: 'color: #ff9900; font-weight: bold;',
  ERROR: 'color: #cc0000; font-weight: bold;',
};

const Logger = {
  _log(level, message, data = null) {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    
    if (data) {
      console.log(`%c${logMessage}`, LogColors[level], data);
    } else {
      console.log(`%c${logMessage}`, LogColors[level]);
    }
  },

  debug(message, data) {
    this._log(LogLevels.DEBUG, message, data);
  },

  info(message, data) {
    this._log(LogLevels.INFO, message, data);
  },

  success(message, data) {
    this._log(LogLevels.SUCCESS, message, data);
  },

  warning(message, data) {
    this._log(LogLevels.WARNING, message, data);
  },

  error(message, data) {
    this._log(LogLevels.ERROR, message, data);
  },

  // User action logging
  logLogin(username, role) {
    this.success(`User Login`, { username, role, timestamp: new Date().toISOString() });
  },

  logLogout(username) {
    this.info(`User Logout`, { username, timestamp: new Date().toISOString() });
  },

  logPageNavigation(fromPage, toPage, user) {
    this.info(`Page Navigation`, { from: fromPage, to: toPage, user: user?.name });
  },

  logFormSubmit(formName, data) {
    this.info(`Form Submitted`, { form: formName, timestamp: new Date().toISOString(), recordCount: data ? Object.keys(data).length : 0 });
  },

  logAPICall(method, endpoint, status) {
    this.debug(`API Call`, { method, endpoint, status });
  },

  logAPICCallError(method, endpoint, error) {
    this.error(`API Error`, { method, endpoint, error: error.message });
  },

  logDataOperation(operation, resource, recordId) {
    this.info(`Data Operation`, { operation, resource, recordId, timestamp: new Date().toISOString() });
  },
};

export default Logger;
