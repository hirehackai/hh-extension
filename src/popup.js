// Popup interface
import _ from 'lodash';
import { MessageHandler, Logger } from './utils/helpers.js';
import { MESSAGE_TYPES } from './utils/constants.js';

class PopupInterface {
  constructor() {
    this.currentTab = 'dashboard';
    this.settings = null;
    this.stats = null;
    this.init();
  }

  async init() {
    try {
      await this.loadData();
      this.renderInterface();
      // Wait for DOM to be fully rendered before setting up event listeners
      setTimeout(() => {
        this.setupEventListeners();
      }, 0);
      this.updateStats();

      Logger.info('Popup interface initialized');
    } catch (error) {
      Logger.error('Popup initialization failed', error);
    }
  }

  async loadData() {
    try {
      const [settingsResponse, statsResponse] = await Promise.all([
        MessageHandler.sendMessage(MESSAGE_TYPES.GET_SETTINGS),
        MessageHandler.sendMessage(MESSAGE_TYPES.GET_STATS)
      ]);

      this.settings = settingsResponse?.data || this.getDefaultSettings();
      this.stats = statsResponse?.data || this.getDefaultStats();
    } catch (error) {
      Logger.error('Failed to load popup data', error);
      // Set defaults in case of error
      this.settings = this.getDefaultSettings();
      this.stats = this.getDefaultStats();
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Quick actions
    document.getElementById('quick-start-btn')?.addEventListener('click', () => {
      this.handleQuickStart();
    });

    document.getElementById('quick-stop-btn')?.addEventListener('click', () => {
      this.handleQuickStop();
    });

    // Settings
    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Data management
  }

  renderInterface() {
    document.body.innerHTML = `
      <div class="popup-container">
        <header class="popup-header">
          <div class="logo">
            <img src="icons/icon.png" alt="HireHack">
            <span>HireHack</span>
          </div>
          <div class="version">v1.0.0</div>
        </header>

        <nav class="popup-nav">
          <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
          <button class="tab-btn" data-tab="settings">Settings</button>
        </nav>

        <main class="popup-main">
          ${this.renderDashboardTab()}
          ${this.renderSettingsTab()}
        </main>


      </div>
    `;

    this.addStyles();
    this.populateData();
  }

  renderDashboardTab() {
    return `
      <div class="tab-content active" data-tab="dashboard">
        <div class="quick-actions">
          <button id="quick-start-btn" class="btn btn-primary">
            <span class="icon">▶</span>
            Start Auto Apply
          </button>
          <button id="quick-stop-btn" class="btn btn-danger" disabled>
            <span class="icon">⏹</span>
            Stop
          </button>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number" id="total-applications">0</div>
            <div class="stat-label">Total Applied</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="applications-today">0</div>
            <div class="stat-label">Today</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="success-rate">0%</div>
            <div class="stat-label">Success Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="streak-days">0</div>
            <div class="stat-label">Day Streak</div>
          </div>
        </div>

        <div class="rate-limit-info">
          <div class="rate-limit-bar">
            <div class="rate-limit-fill" id="daily-progress"></div>
          </div>
          <div class="rate-limit-text">
            <span id="daily-count">0</span> / <span id="daily-limit">30</span> applications today
          </div>
        </div>
      </div>
    `;
  }

  renderSettingsTab() {
    return `
      <div class="tab-content" data-tab="settings">
        <form id="settings-form">
          <div class="form-section">
            <h3>Application Limits</h3>
            <div class="form-group">
              <label>Daily Application Limit</label>
              <input type="number" id="daily-limit" min="1" max="100">
              <small>Recommended: 20-30 applications per day</small>
            </div>
            <div class="form-group">
              <label>Hourly Application Limit</label>
              <input type="number" id="hourly-limit" min="1" max="20">
              <small>Recommended: 5-10 applications per hour</small>
            </div>
          </div>

          <div class="form-section">
            <h3>Application Behavior</h3>
            <div class="form-group">
              <label>
                <input type="checkbox" id="skip-cover-letter">
                Skip jobs requiring cover letters
              </label>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="skip-questions">
                Skip jobs with complex application questions
              </label>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="auto-answer-basic">
                Auto-answer basic questions when possible
              </label>
            </div>
          </div>

          <div class="form-section">
            <h3>Preferences</h3>
            <div class="form-group">
              <label>Minimum Salary ($)</label>
              <input type="number" id="min-salary" min="0" step="1000">
            </div>
            <div class="form-group">
              <label>Maximum Salary ($)</label>
              <input type="number" id="max-salary" min="0" step="1000">
            </div>
            <div class="form-group">
              <label>Exclude Keywords (comma-separated)</label>
              <textarea id="exclude-keywords" placeholder="senior, lead, manager..."></textarea>
            </div>
          </div>

          <button type="button" id="save-settings-btn" class="btn btn-primary">
            Save Settings
          </button>
        </form>
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
        width: 400px;
        font-family: system-ui, -apple-system, sans-serif;
        background: #f8f9fa;
      }

      .popup-container {
        display: flex;
        flex-direction: column;
        height: 600px;
      }

      .popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: #0077b5;
        color: white;
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
      }

      .logo img {
        width: 24px;
        height: 24px;
      }

      .version {
        font-size: 12px;
        opacity: 0.8;
      }

      .popup-nav {
        display: flex;
        background: white;
        border-bottom: 1px solid #ddd;
      }

      .tab-btn {
        flex: 1;
        padding: 12px;
        border: none;
        background: none;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
      }

      .tab-btn.active {
        border-bottom-color: #0077b5;
        color: #0077b5;
        font-weight: 600;
      }

      .popup-main {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
      }

      .quick-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
      }

      .btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
      }

      .btn-primary {
        background: #0077b5;
        color: white;
        flex: 1;
      }

      .btn-primary:hover:not(:disabled) {
        background: #005885;
      }

      .btn-danger {
        background: #dc3545;
        color: white;
        flex: 1;
      }

      .btn-secondary {
        background: #6c757d;
        color: white;
      }

      .btn-link {
        background: none;
        color: #0077b5;
        border: 1px solid #ddd;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }

      .stat-card {
        background: white;
        padding: 16px;
        border-radius: 8px;
        text-align: center;
        border: 1px solid #ddd;
      }

      .stat-number {
        font-size: 24px;
        font-weight: 700;
        color: #0077b5;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 12px;
        color: #666;
      }

      .rate-limit-info {
        background: white;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #ddd;
      }

      .rate-limit-bar {
        width: 100%;
        height: 8px;
        background: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .rate-limit-fill {
        height: 100%;
        background: #0077b5;
        transition: width 0.3s;
      }

      .rate-limit-text {
        text-align: center;
        font-size: 12px;
        color: #666;
      }

      .form-section {
        margin-bottom: 24px;
      }

      .form-section h3 {
        margin-bottom: 16px;
        font-size: 16px;
        color: #333;
      }

      .form-row {
        display: flex;
        gap: 12px;
      }

      .form-group {
        margin-bottom: 16px;
        flex: 1;
      }

      .form-group label {
        display: block;
        margin-bottom: 4px;
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }

      .form-group input,
      .form-group textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }

      .form-group textarea {
        resize: vertical;
        min-height: 60px;
      }

      .form-group small {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: #666;
      }

      .form-group input[type="checkbox"] {
        width: auto;
        margin-right: 8px;
      }

      .popup-footer {
        padding: 12px 16px;
        border-top: 1px solid #ddd;
        background: white;
      }

      .popup-footer .btn {
        width: 100%;
        justify-content: center;
      }
    `;
    document.head.appendChild(style);
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabName);
    });

    this.currentTab = tabName;
  }

  populateData() {
    if (this.settings) {
      // Populate settings form using lodash get for safe property access
      document.getElementById('daily-limit').value = _.get(
        this.settings,
        'rateLimit.dailyLimit',
        30
      );
      document.getElementById('hourly-limit').value = _.get(
        this.settings,
        'rateLimit.hourlyLimit',
        10
      );
      document.getElementById('skip-cover-letter').checked = _.get(
        this.settings,
        'application.skipCoverLetter',
        false
      );
      document.getElementById('skip-questions').checked = _.get(
        this.settings,
        'application.skipQuestions',
        false
      );
      document.getElementById('auto-answer-basic').checked = _.get(
        this.settings,
        'application.autoAnswerBasic',
        true
      );
      document.getElementById('min-salary').value = _.get(
        this.settings,
        'preferences.salary.min',
        0
      );
      document.getElementById('max-salary').value = _.get(
        this.settings,
        'preferences.salary.max',
        200000
      );
      document.getElementById('exclude-keywords').value = _.get(
        this.settings,
        'preferences.excludeKeywords',
        []
      ).join(', ');
    }
  }

  async updateStats() {
    if (!this.stats) {
      return;
    }

    document.getElementById('total-applications').textContent = _.get(
      this.stats,
      'totalApplications',
      0
    );
    document.getElementById('applications-today').textContent = _.get(
      this.stats,
      'applicationsToday',
      0
    );
    document.getElementById('streak-days').textContent = _.get(this.stats, 'streakDays', 0);

    const totalApplications = _.get(this.stats, 'totalApplications', 0);
    const successfulApplications = _.get(this.stats, 'successfulApplications', 0);
    const successRate =
      totalApplications > 0 ? Math.round((successfulApplications / totalApplications) * 100) : 0;
    document.getElementById('success-rate').textContent = `${successRate}%`;

    // Update progress bar
    const dailyLimit = _.get(this.settings, 'rateLimit.dailyLimit', 30);
    const applicationsToday = _.get(this.stats, 'applicationsToday', 0);
    const progress = Math.min((applicationsToday / dailyLimit) * 100, 100);

    document.getElementById('daily-progress').style.width = `${progress}%`;
    document.getElementById('daily-count').textContent = applicationsToday;
    document.getElementById('daily-limit').textContent = dailyLimit;
  }

  async handleQuickStart() {
    try {
      // Get current tab to check if it's LinkedIn
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!currentTab.url.includes('linkedin.com')) {
        alert('Please navigate to LinkedIn job search page first');
        return;
      }

      // Send start message to content script
      await chrome.tabs.sendMessage(currentTab.id, {
        type: MESSAGE_TYPES.START_AUTO_APPLY
      });

      // Update UI
      document.getElementById('quick-start-btn').disabled = true;
      document.getElementById('quick-stop-btn').disabled = false;

      window.close();
    } catch (error) {
      Logger.error('Quick start failed', error);
      alert('Failed to start auto apply. Please try again.');
    }
  }

  async handleQuickStop() {
    try {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      await chrome.tabs.sendMessage(currentTab.id, {
        type: MESSAGE_TYPES.STOP_AUTO_APPLY
      });

      document.getElementById('quick-start-btn').disabled = false;
      document.getElementById('quick-stop-btn').disabled = true;
    } catch (error) {
      Logger.error('Quick stop failed', error);
    }
  }

  async saveSettings() {
    try {
      const settings = {
        ...this.settings,
        rateLimit: {
          ..._.get(this.settings, 'rateLimit', {}),
          dailyLimit: parseInt(document.getElementById('daily-limit').value, 10),
          hourlyLimit: parseInt(document.getElementById('hourly-limit').value, 10)
        },
        application: {
          ..._.get(this.settings, 'application', {}),
          skipCoverLetter: document.getElementById('skip-cover-letter').checked,
          skipQuestions: document.getElementById('skip-questions').checked,
          autoAnswerBasic: document.getElementById('auto-answer-basic').checked
        },
        preferences: {
          ..._.get(this.settings, 'preferences', {}),
          salary: {
            min: parseInt(document.getElementById('min-salary').value, 10) || 0,
            max: parseInt(document.getElementById('max-salary').value, 10) || 200000
          },
          excludeKeywords: document
            .getElementById('exclude-keywords')
            .value.split(',')
            .map(s => s.trim())
            .filter(Boolean)
        }
      };

      const response = await MessageHandler.sendMessage(MESSAGE_TYPES.SAVE_SETTINGS, settings);
      if (response.success) {
        this.settings = settings;
        alert('Settings saved successfully!');
        this.updateStats();
      } else {
        alert('Failed to save settings. Please try again.');
      }
    } catch (error) {
      Logger.error('Save settings failed', error);
      alert('Failed to save settings. Please try again.');
    }
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

  getDefaultStats() {
    return {
      totalApplications: 0,
      applicationsToday: 0,
      successfulApplications: 0,
      failedApplications: 0,
      streakDays: 0,
      lastApplicationDate: null
    };
  }
}

// Initialize popup when DOM is ready
let popupInitialized = false;

function initializePopup() {
  Logger.info('Initializing popup...');

  if (popupInitialized) {
    Logger.info('Popup already initialized, skipping...');
    return;
  }

  popupInitialized = true;
  new PopupInterface();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // DOM is already ready
  initializePopup();
  // document.addEventListener('DOMContentLoaded', initializePopup, { once: true });
}
