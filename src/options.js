// Options page - Full configuration interface
import _ from 'lodash';
import { StorageManager } from './utils/storage.js';
import { MessageHandler, ValidationHelper, Logger } from './utils/helpers.js';
import { MESSAGE_TYPES } from './utils/constants.js';

class OptionsPage {
  constructor() {
    this.userProfile = null;
    this.settings = null;
    this.applicationHistory = [];
    this.currentPage = 'profile';
    
    this.init();
  }

  async init() {
    try {
      await this.loadData();
      this.renderInterface();
      this.setupEventListeners();
      this.populateData();
      
      Logger.info('Options page initialized');
    } catch (error) {
      Logger.error('Options page initialization failed', error);
    }
  }

  async loadData() {
    try {
      const [profileResponse, settingsResponse, historyResponse] = await Promise.all([
        MessageHandler.sendMessage(MESSAGE_TYPES.GET_USER_PROFILE),
        MessageHandler.sendMessage(MESSAGE_TYPES.GET_SETTINGS),
        MessageHandler.sendMessage(MESSAGE_TYPES.GET_APPLICATION_HISTORY)
      ]);

      this.userProfile = profileResponse?.data || this.getDefaultProfile();
      this.settings = settingsResponse?.data || this.getDefaultSettings();
      this.applicationHistory = historyResponse?.data || [];
    } catch (error) {
      Logger.error('Failed to load options data', error);
      // Set defaults on error
      this.userProfile = this.getDefaultProfile();
      this.settings = this.getDefaultSettings();
      this.applicationHistory = [];
    }
  }

  renderInterface() {
    document.body.innerHTML = `
      <div class="options-container">
        <header class="options-header">
          <div class="logo">
            <img src="icons/icon32.png" alt="HireHack">
            <h1>HireHack Options</h1>
          </div>
          <div class="version">Version 1.0.0</div>
        </header>

        <nav class="options-nav">
          <button class="nav-btn active" data-page="profile">
            <span class="icon">👤</span>
            Profile Setup
          </button>
          <button class="nav-btn" data-page="preferences">
            <span class="icon">⚙️</span>
            Job Preferences
          </button>
          <button class="nav-btn" data-page="automation">
            <span class="icon">🤖</span>
            Automation Settings
          </button>
          <button class="nav-btn" data-page="history">
            <span class="icon">📊</span>
            Application History
          </button>
          <button class="nav-btn" data-page="data">
            <span class="icon">💾</span>
            Data Management
          </button>
        </nav>

        <main class="options-main">
          ${this.renderProfilePage()}
          ${this.renderPreferencesPage()}
          ${this.renderAutomationPage()}
          ${this.renderHistoryPage()}
          ${this.renderDataPage()}
        </main>

        <footer class="options-footer">
          <div class="footer-content">
            <p>&copy; 2024 HireHack. All rights reserved.</p>
            <div class="footer-links">
              <a href="#" id="feedback-link">Send Feedback</a>
              <a href="#" id="help-link">Help & Support</a>
            </div>
          </div>
        </footer>
      </div>
    `;

    this.addStyles();
  }

  renderProfilePage() {
    return `
      <div class="page-content active" data-page="profile">
        <div class="page-header">
          <h2>Profile Setup</h2>
          <p>Configure your personal and professional information for auto-filling applications.</p>
        </div>

        <form id="profile-form" class="form-container">
          <div class="form-section">
            <h3>Personal Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="first-name">First Name *</label>
                <input type="text" id="first-name" required>
              </div>
              <div class="form-group">
                <label for="last-name">Last Name *</label>
                <input type="text" id="last-name" required>
              </div>
              <div class="form-group">
                <label for="email">Email Address *</label>
                <input type="email" id="email" required>
              </div>
              <div class="form-group">
                <label for="phone">Phone Number</label>
                <input type="tel" id="phone">
              </div>
              <div class="form-group span-2">
                <label for="location">Location</label>
                <input type="text" id="location" placeholder="City, State/Country">
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Professional Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="current-title">Current Job Title</label>
                <input type="text" id="current-title">
              </div>
              <div class="form-group">
                <label for="experience">Years of Experience</label>
                <input type="number" id="experience" min="0" max="50">
              </div>
              <div class="form-group span-2">
                <label for="summary">Professional Summary</label>
                <textarea id="summary" rows="4" placeholder="Brief description of your professional background..."></textarea>
              </div>
              <div class="form-group span-2">
                <label for="skills">Skills (comma-separated)</label>
                <textarea id="skills" rows="3" placeholder="JavaScript, Python, React, Node.js, AWS..."></textarea>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Resume Files</h3>
            <div class="resume-upload">
              <div class="upload-area" id="resume-upload-area">
                <div class="upload-content">
                  <span class="upload-icon">📄</span>
                  <p>Drag & drop resume files here or click to browse</p>
                  <input type="file" id="resume-files" multiple accept=".pdf,.doc,.docx" hidden>
                </div>
              </div>
              <div id="resume-list" class="resume-list"></div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" id="save-profile-btn" class="btn btn-primary">
              Save Profile
            </button>
            <button type="button" id="test-profile-btn" class="btn btn-secondary">
              Test Profile
            </button>
          </div>
        </form>
      </div>
    `;
  }

  renderPreferencesPage() {
    return `
      <div class="page-content" data-page="preferences">
        <div class="page-header">
          <h2>Job Preferences</h2>
          <p>Set your job search criteria and filters.</p>
        </div>

        <form id="preferences-form" class="form-container">
          <div class="form-section">
            <h3>Salary Expectations</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="min-salary">Minimum Salary ($)</label>
                <input type="number" id="min-salary" min="0" step="1000">
              </div>
              <div class="form-group">
                <label for="max-salary">Maximum Salary ($)</label>
                <input type="number" id="max-salary" min="0" step="1000">
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Job Types</h3>
            <div class="checkbox-grid">
              <label class="checkbox-item">
                <input type="checkbox" value="full-time" name="job-types">
                Full-time
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="part-time" name="job-types">
                Part-time
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="contract" name="job-types">
                Contract
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="temporary" name="job-types">
                Temporary
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="internship" name="job-types">
                Internship
              </label>
              <label class="checkbox-item">
                <input type="checkbox" value="remote" name="job-types">
                Remote
              </label>
            </div>
          </div>

          <div class="form-section">
            <h3>Preferred Locations</h3>
            <div class="form-group">
              <textarea id="preferred-locations" rows="3" placeholder="New York, NY&#10;San Francisco, CA&#10;Remote"></textarea>
              <small>Enter one location per line</small>
            </div>
          </div>

          <div class="form-section">
            <h3>Keywords</h3>
            <div class="form-grid">
              <div class="form-group span-2">
                <label for="include-keywords">Include Keywords</label>
                <textarea id="include-keywords" rows="3" placeholder="React, JavaScript, Frontend, Remote..."></textarea>
                <small>Jobs must contain at least one of these keywords</small>
              </div>
              <div class="form-group span-2">
                <label for="exclude-keywords">Exclude Keywords</label>
                <textarea id="exclude-keywords" rows="3" placeholder="Senior, Lead, Manager, PHP..."></textarea>
                <small>Jobs containing these keywords will be skipped</small>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Company Preferences</h3>
            <div class="form-grid">
              <div class="form-group span-2">
                <label for="preferred-companies">Preferred Companies</label>
                <textarea id="preferred-companies" rows="3" placeholder="Google, Microsoft, Apple..."></textarea>
                <small>Prioritize applications to these companies</small>
              </div>
              <div class="form-group span-2">
                <label for="blocked-companies">Blocked Companies</label>
                <textarea id="blocked-companies" rows="3" placeholder="Company A, Company B..."></textarea>
                <small>Never apply to these companies</small>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" id="save-preferences-btn" class="btn btn-primary">
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    `;
  }

  renderAutomationPage() {
    return `
      <div class="page-content" data-page="automation">
        <div class="page-header">
          <h2>Automation Settings</h2>
          <p>Configure how the auto-apply feature behaves.</p>
        </div>

        <form id="automation-form" class="form-container">
          <div class="form-section">
            <h3>Rate Limiting</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="daily-limit">Daily Application Limit</label>
                <input type="number" id="daily-limit" min="1" max="100" value="30">
                <small>Maximum applications per day (recommended: 20-30)</small>
              </div>
              <div class="form-group">
                <label for="hourly-limit">Hourly Application Limit</label>
                <input type="number" id="hourly-limit" min="1" max="20" value="10">
                <small>Maximum applications per hour (recommended: 5-10)</small>
              </div>
              <div class="form-group">
                <label for="delay-between">Delay Between Applications</label>
                <select id="delay-between">
                  <option value="30">30 seconds</option>
                  <option value="60" selected>1 minute</option>
                  <option value="120">2 minutes</option>
                  <option value="300">5 minutes</option>
                </select>
                <small>Time to wait between applications</small>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Application Behavior</h3>
            <div class="settings-grid">
              <div class="setting-item">
                <label class="toggle-switch">
                  <input type="checkbox" id="skip-cover-letter">
                  <span class="toggle-slider"></span>
                </label>
                <div class="setting-info">
                  <h4>Skip Cover Letter Requirements</h4>
                  <p>Skip jobs that require uploading a cover letter</p>
                </div>
              </div>
              <div class="setting-item">
                <label class="toggle-switch">
                  <input type="checkbox" id="skip-complex-questions">
                  <span class="toggle-slider"></span>
                </label>
                <div class="setting-info">
                  <h4>Skip Complex Questions</h4>
                  <p>Skip jobs with more than 3 application questions</p>
                </div>
              </div>
              <div class="setting-item">
                <label class="toggle-switch">
                  <input type="checkbox" id="auto-answer-basic">
                  <span class="toggle-slider"></span>
                </label>
                <div class="setting-info">
                  <h4>Auto-answer Basic Questions</h4>
                  <p>Automatically answer common questions when possible</p>
                </div>
              </div>
              <div class="setting-item">
                <label class="toggle-switch">
                  <input type="checkbox" id="randomize-timing">
                  <span class="toggle-slider"></span>
                </label>
                <div class="setting-info">
                  <h4>Randomize Timing</h4>
                  <p>Add random delays to appear more human-like</p>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Smart Filtering</h3>
            <div class="settings-grid">
              <div class="setting-item">
                <label class="toggle-switch">
                  <input type="checkbox" id="check-salary-match">
                  <span class="toggle-slider"></span>
                </label>
                <div class="setting-info">
                  <h4>Check Salary Requirements</h4>
                  <p>Only apply to jobs that match your salary expectations</p>
                </div>
              </div>
              <div class="setting-item">
                <label class="toggle-switch">
                  <input type="checkbox" id="check-location-match">
                  <span class="toggle-slider"></span>
                </label>
                <div class="setting-info">
                  <h4>Check Location Match</h4>
                  <p>Only apply to jobs in your preferred locations</p>
                </div>
              </div>
              <div class="setting-item">
                <label class="toggle-switch">
                  <input type="checkbox" id="check-experience-match">
                  <span class="toggle-slider"></span>
                </label>
                <div class="setting-info">
                  <h4>Check Experience Requirements</h4>
                  <p>Skip jobs requiring significantly more experience</p>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" id="save-automation-btn" class="btn btn-primary">
              Save Settings
            </button>
            <button type="button" id="test-automation-btn" class="btn btn-secondary">
              Test Settings
            </button>
          </div>
        </form>
      </div>
    `;
  }

  renderHistoryPage() {
    return `
      <div class="page-content" data-page="history">
        <div class="page-header">
          <h2>Application History</h2>
          <p>View and manage your job application history.</p>
        </div>

        <div class="history-controls">
          <div class="filters">
            <select id="status-filter">
              <option value="">All Applications</option>
              <option value="success">Successful</option>
              <option value="failed">Failed</option>
            </select>
            <select id="date-filter">
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <input type="text" id="search-filter" placeholder="Search jobs, companies...">
          </div>
          <div class="actions">
            <button id="export-history-btn" class="btn btn-secondary">Export History</button>
            <button id="clear-history-btn" class="btn btn-danger">Clear History</button>
          </div>
        </div>

        <div class="history-stats">
          <div class="stat-card">
            <div class="stat-number" id="total-applications-stat">0</div>
            <div class="stat-label">Total Applications</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="success-rate-stat">0%</div>
            <div class="stat-label">Success Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="this-week-stat">0</div>
            <div class="stat-label">This Week</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="avg-per-day-stat">0</div>
            <div class="stat-label">Avg. Per Day</div>
          </div>
        </div>

        <div class="history-table-container">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Job Title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="history-table-body">
              <tr class="empty-row">
                <td colspan="6">No applications found</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderDataPage() {
    return `
      <div class="page-content" data-page="data">
        <div class="page-header">
          <h2>Data Management</h2>
          <p>Import, export, and manage your HireHack data.</p>
        </div>

        <div class="data-sections">
          <div class="data-section">
            <h3>Backup & Restore</h3>
            <p>Keep your data safe by creating regular backups.</p>
            <div class="data-actions">
              <button id="export-all-btn" class="btn btn-primary">
                <span class="icon">📥</span>
                Export All Data
              </button>
              <button id="import-data-btn" class="btn btn-secondary">
                <span class="icon">📤</span>
                Import Data
              </button>
              <input type="file" id="import-file" accept=".json" hidden>
            </div>
          </div>

          <div class="data-section">
            <h3>Privacy & Cleanup</h3>
            <p>Manage your privacy and clean up old data.</p>
            <div class="data-actions">
              <button id="clear-history-data-btn" class="btn btn-warning">
                <span class="icon">🗑️</span>
                Clear Application History
              </button>
              <button id="reset-settings-btn" class="btn btn-warning">
                <span class="icon">⚙️</span>
                Reset Settings
              </button>
              <button id="clear-all-data-btn" class="btn btn-danger">
                <span class="icon">💀</span>
                Clear All Data
              </button>
            </div>
          </div>

          <div class="data-section">
            <h3>Data Usage</h3>
            <div class="data-usage">
              <div class="usage-item">
                <span class="label">Profile Data:</span>
                <span class="value" id="profile-size">0 KB</span>
              </div>
              <div class="usage-item">
                <span class="label">Application History:</span>
                <span class="value" id="history-size">0 KB</span>
              </div>
              <div class="usage-item">
                <span class="label">Settings:</span>
                <span class="value" id="settings-size">0 KB</span>
              </div>
              <div class="usage-item total">
                <span class="label">Total Storage:</span>
                <span class="value" id="total-size">0 KB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: system-ui, -apple-system, sans-serif;
        background: #f8f9fa;
        line-height: 1.6;
      }

      .options-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .options-header {
        background: #0077b5;
        color: white;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .logo img {
        width: 32px;
        height: 32px;
      }

      .logo h1 {
        font-size: 24px;
        font-weight: 600;
      }

      .version {
        font-size: 14px;
        opacity: 0.8;
      }

      .options-nav {
        background: white;
        border-bottom: 1px solid #ddd;
        padding: 0 20px;
        display: flex;
        gap: 4px;
      }

      .nav-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px 20px;
        border: none;
        background: none;
        cursor: pointer;
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
        font-size: 14px;
        font-weight: 500;
      }

      .nav-btn:hover {
        background: #f8f9fa;
      }

      .nav-btn.active {
        border-bottom-color: #0077b5;
        color: #0077b5;
      }

      .options-main {
        flex: 1;
        padding: 40px;
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
      }

      .page-content {
        display: none;
      }

      .page-content.active {
        display: block;
      }

      .page-header {
        margin-bottom: 32px;
      }

      .page-header h2 {
        font-size: 28px;
        margin-bottom: 8px;
        color: #333;
      }

      .page-header p {
        color: #666;
        font-size: 16px;
      }

      .form-container {
        background: white;
        border-radius: 12px;
        padding: 32px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .form-section {
        margin-bottom: 40px;
      }

      .form-section:last-child {
        margin-bottom: 0;
      }

      .form-section h3 {
        font-size: 20px;
        margin-bottom: 20px;
        color: #333;
        border-bottom: 2px solid #f0f0f0;
        padding-bottom: 8px;
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
      }

      .form-group.span-2 {
        grid-column: span 2;
      }

      .form-group label {
        font-weight: 500;
        margin-bottom: 6px;
        color: #333;
      }

      .form-group input,
      .form-group textarea,
      .form-group select {
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s;
      }

      .form-group input:focus,
      .form-group textarea:focus,
      .form-group select:focus {
        outline: none;
        border-color: #0077b5;
        box-shadow: 0 0 0 3px rgba(0, 119, 181, 0.1);
      }

      .form-group small {
        margin-top: 4px;
        color: #666;
        font-size: 12px;
      }

      .checkbox-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
      }

      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .checkbox-item:hover {
        background: #f8f9fa;
      }

      .checkbox-item input[type="checkbox"]:checked + label {
        background: #e8f4fd;
        border-color: #0077b5;
      }

      .settings-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .setting-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #fafafa;
      }

      .toggle-switch {
        position: relative;
        width: 50px;
        height: 24px;
        min-width: 50px;
      }

      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: 0.4s;
        border-radius: 24px;
      }

      .toggle-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
      }

      input:checked + .toggle-slider {
        background-color: #0077b5;
      }

      input:checked + .toggle-slider:before {
        transform: translateX(26px);
      }

      .setting-info h4 {
        margin-bottom: 4px;
        color: #333;
      }

      .setting-info p {
        color: #666;
        font-size: 14px;
      }

      .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid #eee;
      }

      .btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
      }

      .btn-primary {
        background: #0077b5;
        color: white;
      }

      .btn-primary:hover {
        background: #005885;
      }

      .btn-secondary {
        background: #6c757d;
        color: white;
      }

      .btn-warning {
        background: #ffc107;
        color: #212529;
      }

      .btn-danger {
        background: #dc3545;
        color: white;
      }

      .history-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        gap: 20px;
      }

      .filters {
        display: flex;
        gap: 12px;
        flex: 1;
      }

      .filters select,
      .filters input {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }

      .actions {
        display: flex;
        gap: 8px;
      }

      .history-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 32px;
      }

      .stat-card {
        background: white;
        padding: 24px;
        border-radius: 8px;
        text-align: center;
        border: 1px solid #ddd;
      }

      .stat-number {
        font-size: 32px;
        font-weight: 700;
        color: #0077b5;
        margin-bottom: 8px;
      }

      .stat-label {
        color: #666;
        font-size: 14px;
      }

      .history-table-container {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #ddd;
      }

      .history-table {
        width: 100%;
        border-collapse: collapse;
      }

      .history-table th,
      .history-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #eee;
      }

      .history-table th {
        background: #f8f9fa;
        font-weight: 600;
        color: #333;
      }

      .empty-row td {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 40px;
      }

      .data-sections {
        display: flex;
        flex-direction: column;
        gap: 32px;
      }

      .data-section {
        background: white;
        padding: 32px;
        border-radius: 12px;
        border: 1px solid #ddd;
      }

      .data-section h3 {
        margin-bottom: 12px;
        color: #333;
      }

      .data-section p {
        margin-bottom: 20px;
        color: #666;
      }

      .data-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .data-usage {
        border: 1px solid #ddd;
        border-radius: 6px;
        overflow: hidden;
      }

      .usage-item {
        display: flex;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #eee;
      }

      .usage-item:last-child {
        border-bottom: none;
      }

      .usage-item.total {
        background: #f8f9fa;
        font-weight: 600;
      }

      .options-footer {
        background: white;
        border-top: 1px solid #ddd;
        padding: 20px;
      }

      .footer-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .footer-links {
        display: flex;
        gap: 20px;
      }

      .footer-links a {
        color: #0077b5;
        text-decoration: none;
      }

      .footer-links a:hover {
        text-decoration: underline;
      }

      @media (max-width: 768px) {
        .options-nav {
          flex-direction: column;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .form-group.span-2 {
          grid-column: span 1;
        }

        .history-controls {
          flex-direction: column;
          align-items: stretch;
        }

        .history-stats {
          grid-template-columns: 1fr 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchPage(e.target.dataset.page);
      });
    });

    // Form submissions
    document.getElementById('save-profile-btn')?.addEventListener('click', () => {
      this.saveProfile();
    });

    document.getElementById('save-preferences-btn')?.addEventListener('click', () => {
      this.savePreferences();
    });

    document.getElementById('save-automation-btn')?.addEventListener('click', () => {
      this.saveAutomationSettings();
    });

    // Data management
    document.getElementById('export-all-btn')?.addEventListener('click', () => {
      this.exportAllData();
    });

    document.getElementById('import-data-btn')?.addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file')?.addEventListener('change', (e) => {
      this.importData(e.target.files[0]);
    });

    // History filters
    document.getElementById('status-filter')?.addEventListener('change', () => {
      this.filterHistory();
    });

    document.getElementById('date-filter')?.addEventListener('change', () => {
      this.filterHistory();
    });

    document.getElementById('search-filter')?.addEventListener('input', () => {
      this.filterHistory();
    });
  }

  switchPage(pageName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageName);
    });

    // Update page content
    document.querySelectorAll('.page-content').forEach(content => {
      content.classList.toggle('active', content.dataset.page === pageName);
    });

    this.currentPage = pageName;

    // Load page-specific data
    if (pageName === 'history') {
      this.loadHistoryData();
    }
  }

  populateData() {
    if (this.userProfile) {
      this.populateProfileForm();
    }

    if (this.settings) {
      this.populateSettingsForm();
    }
  }

  populateProfileForm() {
    const profile = this.userProfile;
    
    document.getElementById('first-name').value = profile.personal.firstName || '';
    document.getElementById('last-name').value = profile.personal.lastName || '';
    document.getElementById('email').value = profile.personal.email || '';
    document.getElementById('phone').value = profile.personal.phone || '';
    document.getElementById('location').value = profile.personal.location || '';
    document.getElementById('current-title').value = profile.professional.currentTitle || '';
    document.getElementById('experience').value = profile.professional.experience || 0;
    document.getElementById('summary').value = profile.professional.summary || '';
    document.getElementById('skills').value = profile.professional.skills.join(', ') || '';
  }

  populateSettingsForm() {
    const settings = this.settings;
    
    // Preferences
    document.getElementById('min-salary').value = settings.preferences.salary.min || 0;
    document.getElementById('max-salary').value = settings.preferences.salary.max || 200000;
    document.getElementById('preferred-locations').value = settings.preferences.locations.join('\n');
    document.getElementById('include-keywords').value = settings.preferences.includeKeywords.join(', ');
    document.getElementById('exclude-keywords').value = settings.preferences.excludeKeywords.join(', ');
    document.getElementById('preferred-companies').value = settings.preferences.companies.whitelist.join(', ');
    document.getElementById('blocked-companies').value = settings.preferences.companies.blacklist.join(', ');
    
    // Job types
    settings.preferences.jobTypes.forEach(type => {
      const checkbox = document.querySelector(`input[name="job-types"][value="${type}"]`);
      if (checkbox) checkbox.checked = true;
    });

    // Automation settings
    document.getElementById('daily-limit').value = settings.rateLimit.dailyLimit;
    document.getElementById('hourly-limit').value = settings.rateLimit.hourlyLimit;
    document.getElementById('delay-between').value = settings.rateLimit.delayBetween || 60;
    document.getElementById('skip-cover-letter').checked = settings.application.skipCoverLetter;
    document.getElementById('skip-complex-questions').checked = settings.application.skipQuestions;
    document.getElementById('auto-answer-basic').checked = settings.application.autoAnswerBasic;
    document.getElementById('randomize-timing').checked = settings.application.randomizeTiming || false;
    document.getElementById('check-salary-match').checked = settings.smartFiltering?.checkSalary || false;
    document.getElementById('check-location-match').checked = settings.smartFiltering?.checkLocation || false;
    document.getElementById('check-experience-match').checked = settings.smartFiltering?.checkExperience || false;
  }

  async saveProfile() {
    try {
      const selectedJobTypes = Array.from(document.querySelectorAll('input[name="job-types"]:checked'))
        .map(cb => cb.value);

      const profile = {
        ...this.userProfile,
        personal: {
          firstName: document.getElementById('first-name').value,
          lastName: document.getElementById('last-name').value,
          email: document.getElementById('email').value,
          phone: document.getElementById('phone').value,
          location: document.getElementById('location').value
        },
        professional: {
          ...this.userProfile.professional,
          currentTitle: document.getElementById('current-title').value,
          experience: parseInt(document.getElementById('experience').value) || 0,
          summary: document.getElementById('summary').value,
          skills: document.getElementById('skills').value.split(',').map(s => s.trim()).filter(Boolean)
        },
        preferences: {
          ...this.userProfile.preferences,
          jobTypes: selectedJobTypes
        }
      };

      const errors = ValidationHelper.validateUserProfile(profile);
      if (errors.length > 0) {
        alert('Please fix the following errors:\n' + errors.join('\n'));
        return;
      }

      const response = await MessageHandler.sendMessage(MESSAGE_TYPES.SAVE_USER_PROFILE, profile);
      if (response.success) {
        this.userProfile = profile;
        this.showNotification('Profile saved successfully!', 'success');
      } else {
        this.showNotification('Failed to save profile. Please try again.', 'error');
      }
    } catch (error) {
      Logger.error('Save profile failed', error);
      this.showNotification('Failed to save profile. Please try again.', 'error');
    }
  }

  async savePreferences() {
    try {
      const preferences = {
        salary: {
          min: parseInt(document.getElementById('min-salary').value) || 0,
          max: parseInt(document.getElementById('max-salary').value) || 200000
        },
        locations: document.getElementById('preferred-locations').value
          .split('\n').map(l => l.trim()).filter(Boolean),
        includeKeywords: document.getElementById('include-keywords').value
          .split(',').map(k => k.trim()).filter(Boolean),
        excludeKeywords: document.getElementById('exclude-keywords').value
          .split(',').map(k => k.trim()).filter(Boolean),
        companies: {
          whitelist: document.getElementById('preferred-companies').value
            .split(',').map(c => c.trim()).filter(Boolean),
          blacklist: document.getElementById('blocked-companies').value
            .split(',').map(c => c.trim()).filter(Boolean)
        }
      };

      const updatedProfile = {
        ...this.userProfile,
        preferences: { ...this.userProfile.preferences, ...preferences }
      };

      const response = await MessageHandler.sendMessage(MESSAGE_TYPES.SAVE_USER_PROFILE, updatedProfile);
      if (response.success) {
        this.userProfile = updatedProfile;
        this.showNotification('Preferences saved successfully!', 'success');
      } else {
        this.showNotification('Failed to save preferences. Please try again.', 'error');
      }
    } catch (error) {
      Logger.error('Save preferences failed', error);
      this.showNotification('Failed to save preferences. Please try again.', 'error');
    }
  }

  async saveAutomationSettings() {
    try {
      const settings = {
        ...this.settings,
        rateLimit: {
          dailyLimit: parseInt(document.getElementById('daily-limit').value),
          hourlyLimit: parseInt(document.getElementById('hourly-limit').value),
          delayBetween: parseInt(document.getElementById('delay-between').value)
        },
        application: {
          skipCoverLetter: document.getElementById('skip-cover-letter').checked,
          skipQuestions: document.getElementById('skip-complex-questions').checked,
          autoAnswerBasic: document.getElementById('auto-answer-basic').checked,
          randomizeTiming: document.getElementById('randomize-timing').checked
        },
        smartFiltering: {
          checkSalary: document.getElementById('check-salary-match').checked,
          checkLocation: document.getElementById('check-location-match').checked,
          checkExperience: document.getElementById('check-experience-match').checked
        }
      };

      const response = await MessageHandler.sendMessage(MESSAGE_TYPES.SAVE_SETTINGS, settings);
      if (response.success) {
        this.settings = settings;
        this.showNotification('Automation settings saved successfully!', 'success');
      } else {
        this.showNotification('Failed to save settings. Please try again.', 'error');
      }
    } catch (error) {
      Logger.error('Save automation settings failed', error);
      this.showNotification('Failed to save settings. Please try again.', 'error');
    }
  }

  async loadHistoryData() {
    try {
      const response = await MessageHandler.sendMessage(MESSAGE_TYPES.GET_APPLICATION_HISTORY);
      if (response.success) {
        this.applicationHistory = response.data;
        this.renderHistoryTable();
        this.updateHistoryStats();
      }
    } catch (error) {
      Logger.error('Failed to load history data', error);
    }
  }

  renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    
    if (this.applicationHistory.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No applications found</td></tr>';
      return;
    }

    tbody.innerHTML = this.applicationHistory.map(app => `
      <tr>
        <td>${new Date(app.appliedAt).toLocaleDateString()}</td>
        <td>${app.jobData.title}</td>
        <td>${app.jobData.company}</td>
        <td>${app.jobData.location}</td>
        <td>
          <span class="status ${app.status}">
            ${app.status === 'success' ? '✅ Applied' : '❌ Failed'}
          </span>
        </td>
        <td>
          <button onclick="window.open('${app.jobData.url}', '_blank')" class="btn-link">
            View Job
          </button>
        </td>
      </tr>
    `).join('');
  }

  updateHistoryStats() {
    const total = this.applicationHistory.length;
    const successful = this.applicationHistory.filter(app => app.status === 'success').length;
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;
    
    const thisWeek = this.applicationHistory.filter(app => {
      const appDate = new Date(app.appliedAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return appDate >= weekAgo;
    }).length;

    const avgPerDay = total > 0 ? Math.round(total / 30) : 0; // Last 30 days estimate

    document.getElementById('total-applications-stat').textContent = total;
    document.getElementById('success-rate-stat').textContent = `${successRate}%`;
    document.getElementById('this-week-stat').textContent = thisWeek;
    document.getElementById('avg-per-day-stat').textContent = avgPerDay;
  }

  filterHistory() {
    // Implementation for filtering history table
    // This would filter the applicationHistory array and re-render the table
  }

  async exportAllData() {
    try {
      const response = await MessageHandler.sendMessage(MESSAGE_TYPES.EXPORT_DATA);
      if (response.success) {
        const data = JSON.stringify(response.data, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `hirehack-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully!', 'success');
      } else {
        this.showNotification('Failed to export data. Please try again.', 'error');
      }
    } catch (error) {
      Logger.error('Export data failed', error);
      this.showNotification('Failed to export data. Please try again.', 'error');
    }
  }

  async importData(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const response = await MessageHandler.sendMessage(MESSAGE_TYPES.IMPORT_DATA, data);
      if (response.success) {
        this.showNotification('Data imported successfully!', 'success');
        await this.loadData();
        this.populateData();
      } else {
        this.showNotification('Failed to import data. Please check the file format.', 'error');
      }
    } catch (error) {
      Logger.error('Import data failed', error);
      this.showNotification('Failed to import data. Please check the file format.', 'error');
    }
  }

  showNotification(message, type = 'info') {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  getDefaultProfile() {
    return {
      personal: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        location: ''
      },
      professional: {
        currentTitle: '',
        experience: 0,
        summary: '',
        skills: []
      },
      preferences: {
        salary: { min: 0, max: 200000 },
        locations: [],
        includeKeywords: [],
        excludeKeywords: [],
        jobTypes: [],
        companies: {
          whitelist: [],
          blacklist: []
        }
      }
    };
  }

  getDefaultSettings() {
    return {
      rateLimit: {
        dailyLimit: 30,
        hourlyLimit: 10,
        delayBetween: 60
      },
      application: {
        skipCoverLetter: false,
        skipQuestions: false,
        autoAnswerBasic: true,
        randomizeTiming: false
      },
      smartFiltering: {
        checkSalary: false,
        checkLocation: false,
        checkExperience: false
      },
      preferences: {
        salary: { min: 0, max: 200000 },
        locations: [],
        includeKeywords: [],
        excludeKeywords: [],
        jobTypes: [],
        companies: {
          whitelist: [],
          blacklist: []
        }
      }
    };
  }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});
