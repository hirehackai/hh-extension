// Content script for LinkedIn automation
import {
  DOMHelper,
  LinkedInHelper,
  URLHelper,
  MessageHandler,
  RateLimiter,
  Logger
} from './utils/helpers.js';
import { MESSAGE_TYPES, APPLICATION_STATUS, LINKEDIN_SELECTORS } from './utils/constants.js';

class LinkedInAutomation {
  constructor() {
    this.isActive = false;
    this.isPaused = false;
    this.currentJob = null;
    this.rateLimiter = new RateLimiter();
    this.ui = null;
    this.observer = null;

    this.init();
  }

  async init() {
    try {
      Logger.info('LinkedIn automation initializing...');

      // Only initialize on LinkedIn job pages
      if (!URLHelper.isLinkedInJobsPage()) {
        return;
      }

      await this.setupUI();
      this.setupMessageHandlers();
      this.observePageChanges();
      await this.loadAndUpdateStats();

      Logger.info('LinkedIn automation initialized');
    } catch (error) {
      Logger.error('LinkedIn automation initialization failed', error);
    }
  }

  setupMessageHandlers() {
    MessageHandler.setupMessageListener(async (message, sender, sendResponse) => {
      const { type, data } = message;

      switch (type) {
        case MESSAGE_TYPES.START_AUTO_APPLY:
          await this.startAutoApply(data);
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.STOP_AUTO_APPLY:
          this.stopAutoApply();
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.PAUSE_AUTO_APPLY:
          this.pauseAutoApply();
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.RESUME_AUTO_APPLY:
          this.resumeAutoApply();
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.GET_JOB_DATA:
          const jobData = LinkedInHelper.extractJobData();
          sendResponse({ success: true, data: jobData });
          break;

        case MESSAGE_TYPES.CHECK_EASY_APPLY:
          const isEasyApply = LinkedInHelper.isEasyApplyJob();
          const isApplied = LinkedInHelper.isJobAlreadyApplied();
          sendResponse({
            success: true,
            data: { isEasyApply, isApplied }
          });
          break;
      }
    });
  }

  async setupUI() {
    // Create draggable automation UI
    this.ui = this.createAutomationUI();
    document.body.appendChild(this.ui);
    // Add event listeners
    if (this.ui) {
      this.ui.addEventListener('click', e => {
        const { action } = e.target.dataset;
        this.handleUIAction(action);
      });
    }
    this.makeUIDraggable();
  }

  createAutomationUI() {
    const ui = document.createElement('div');
    ui.id = 'hirehack-automation-ui';
    ui.innerHTML = `
      <div class="hh-header">
        <img src="${chrome.runtime.getURL('icons/icon.png')}" alt="HireHack">
        <span>HireHack</span>
        <button class="hh-close" data-action="close">×</button>
      </div>
      <div class="hh-content">
        <div class="hh-status">
          <div class="hh-status-indicator" id="hh-status-indicator"></div>
          <span id="hh-status-text">Ready</span>
        </div>
        <div class="hh-controls">
          <button id="hh-start-btn" class="hh-btn hh-primary" data-action="start">
            Start Auto Apply
          </button>
          <button id="hh-pause-btn" class="hh-btn hh-secondary" data-action="pause" disabled>
            Pause
          </button>
          <button id="hh-stop-btn" class="hh-btn hh-danger" data-action="stop" disabled>
            Stop
          </button>
        </div>
        <div class="hh-progress-section">
          <div class="hh-progress-header">
            <span class="hh-progress-label">Daily Progress</span>
            <span class="hh-progress-text"><span id="hh-daily-count">0</span> / <span id="hh-daily-limit">30</span></span>
          </div>
          <div class="hh-progress-bar">
            <div class="hh-progress-fill" id="hh-progress-fill"></div>
          </div>
        </div>
        <div class="hh-stats">
          <div class="hh-stat">
            <span class="hh-stat-label">Total Applied:</span>
            <span id="hh-total-applications" class="hh-stat-value">0</span>
          </div>
          <div class="hh-stat">
            <span class="hh-stat-label">Applied Today:</span>
            <span id="hh-applied-today" class="hh-stat-value">0</span>
          </div>
          <div class="hh-stat">
            <span class="hh-stat-label">This Session:</span>
            <span id="hh-session-count" class="hh-stat-value">0</span>
          </div>
          <div class="hh-stat">
            <span class="hh-stat-label">Success Rate:</span>
            <span id="hh-success-rate" class="hh-stat-value">0%</span>
          </div>
        </div>
        <div class="hh-current-job" id="hh-current-job" style="display: none;">
          <div class="hh-job-title" id="hh-job-title"></div>
          <div class="hh-job-company" id="hh-job-company"></div>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = this.getUIStyles();
    document.head.appendChild(style);
    return ui;
  }

  getUIStyles() {
    return `
      #hirehack-automation-ui {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 280px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 10000;
        cursor: move;
      }
      
      .hh-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: #0077b5;
        color: white;
        border-radius: 8px 8px 0 0;
        cursor: move;
      }
      
      .hh-header img {
        width: 16px;
        height: 16px;
      }
      
      .hh-close {
        margin-left: auto;
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
      }
      
      .hh-content {
        padding: 16px;
      }
      
      .hh-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
      }
      
      .hh-status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ccc;
      }
      
      .hh-status-indicator.ready { background: #28a745; }
      .hh-status-indicator.active { background: #007bff; animation: pulse 1s infinite; }
      .hh-status-indicator.paused { background: #ffc107; }
      .hh-status-indicator.error { background: #dc3545; }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .hh-controls {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }
      
      .hh-btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .hh-primary {
        background: #0077b5;
        color: white;
      }
      
      .hh-primary:hover:not(:disabled) {
        background: #005885;
      }
      
      .hh-secondary {
        background: #6c757d;
        color: white;
      }
      
      .hh-danger {
        background: #dc3545;
        color: white;
      }
      
      .hh-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .hh-progress-section {
        border-top: 1px solid #eee;
        padding-top: 12px;
        margin-bottom: 12px;
      }
      
      .hh-progress-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .hh-progress-label {
        color: #666;
        font-size: 12px;
        font-weight: 500;
      }
      
      .hh-progress-text {
        color: #333;
        font-size: 12px;
        font-weight: 600;
      }
      
      .hh-progress-bar {
        width: 100%;
        height: 8px;
        background: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      
      .hh-progress-fill {
        height: 100%;
        background: #0077b5;
        transition: width 0.3s ease;
        width: 0%;
      }
      
      .hh-stats {
        border-top: 1px solid #eee;
        padding-top: 12px;
        margin-bottom: 12px;
      }
      
      .hh-stat {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      
      .hh-stat-label {
        color: #666;
        font-size: 12px;
      }
      
      .hh-stat-value {
        color: #333;
        font-size: 12px;
        font-weight: 600;
      }
      
      .hh-current-job {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 4px;
        border-top: 1px solid #eee;
        margin-top: 12px;
      }
      
      .hh-job-title {
        font-weight: 600;
        margin-bottom: 4px;
      }
      
      .hh-job-company {
        color: #666;
        font-size: 12px;
      }
    `;
  }

  makeUIDraggable() {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    const header = this.ui.querySelector('.hh-header');

    header.addEventListener('mousedown', e => {
      if (e.target.closest('.hh-close')) {
        return;
      }

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = this.ui.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
    });

    const handleMouseMove = e => {
      if (!isDragging) {
        return;
      }

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      this.ui.style.left = `${initialX + deltaX}px`;
      this.ui.style.top = `${initialY + deltaY}px`;
      this.ui.style.right = 'auto';
    };

    const handleMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }

  async handleUIAction(action) {
    switch (action) {
      case 'start':
        await this.startAutoApply();
        break;
      case 'pause':
        this.pauseAutoApply();
        break;
      case 'stop':
        this.stopAutoApply();
        break;
      case 'close':
        this.ui.style.display = 'none';
        break;
    }
  }

  async startAutoApply() {
    try {
      // Check with background service if we can start
      const response = await MessageHandler.sendMessage(MESSAGE_TYPES.START_AUTO_APPLY);
      Logger.info('Start auto apply response', response);

      if (!response.success) {
        this.updateStatus('error', response.error);
        return;
      }

      this.isActive = true;
      this.isPaused = false;
      this.updateUIState();
      this.updateStatus('active', 'Auto applying...');

      // Start the automation process
      this.processCurrentPage();
    } catch (error) {
      Logger.error('Start auto apply error', error);
      this.updateStatus('error', 'Failed to start');

      this.isActive = false;
      this.isPaused = false;
      this.updateUIState();
    }
  }

  stopAutoApply() {
    console.log('Stopping auto apply...');
    this.isActive = false;
    this.isPaused = false;
    this.updateUIState();
    this.updateStatus('ready', 'Stopped');

    MessageHandler.sendMessage(MESSAGE_TYPES.STOP_AUTO_APPLY);
  }

  pauseAutoApply() {
    this.isPaused = true;
    this.updateUIState();
    this.updateStatus('paused', 'Paused');
  }

  resumeAutoApply() {
    this.isPaused = false;
    this.updateUIState();
    this.updateStatus('active', 'Resumed');
    this.processCurrentPage();
  }

  async processCurrentPage() {
    if (!this.isActive || this.isPaused) {
      return;
    }

    try {
      // Check if this is a job detail page
      if (!URLHelper.isLinkedInJobDetailPage()) {
        this.updateStatus('active', 'Navigating to jobs...');
        await this.navigateToNextJob();
        Logger.warn('Not a job detail page, navigating to next job');
        return;
      }

      // Extract job data
      const jobData = LinkedInHelper.extractJobData();
      if (!jobData) {
        Logger.warn('Could not extract job data');
        await this.navigateToNextJob();
        return;
      }

      this.displayCurrentJob(jobData);

      // Check if job is eligible for application
      const isEasyApply = LinkedInHelper.isEasyApplyJob();
      const isAlreadyApplied = LinkedInHelper.isJobAlreadyApplied();

      if (isAlreadyApplied) {
        Logger.info('Job already applied to, skipping');
        await this.navigateToNextJob();
        return;
      }

      if (!isEasyApply) {
        Logger.info('Not an Easy Apply job, skipping');
        await this.navigateToNextJob();
        return;
      }

      // Check rate limit
      const rateLimitCheck = await MessageHandler.sendMessage(MESSAGE_TYPES.CHECK_RATE_LIMIT);
      //TODO: review this logic
      // if (rateLimitCheck.data && !rateLimitCheck.data.canApply?.allowed) {
      //   this.updateStatus('error', 'Rate limit reached');
      //   this.stopAutoApply();
      //   Logger.warn('Rate limit reached, stopping automation');
      //   return;
      // }

      // Apply to the job
      await this.applyToJob(jobData);
    } catch (error) {
      Logger.error('Process page error', error);
      await this.handleApplicationError(error);
    }
  }

  async applyToJob(jobData) {
    try {
      this.updateStatus('active', `Applying to ${jobData.title}...`);

      // Click Easy Apply button
      const easyApplyButton = LinkedInHelper.getEasyApplyButton();
      if (!easyApplyButton) {
        throw new Error('Easy Apply button not found');
      }

      DOMHelper.simulateClick(easyApplyButton);

      // Wait for application modal
      await DOMHelper.wait(2000);

      // Handle application flow
      await this.handleApplicationFlow(jobData);
    } catch (error) {
      Logger.error('Apply to job error', error);
      await this.handleApplicationError(error, jobData);
    }
  }

  async handleApplicationFlow(jobData) {
    try {
      // Look for submit button or next button
      const submitButton = DOMHelper.getVisibleElement(
        '[data-easy-apply-next-btn], [aria-label*="Submit"], [data-easy-apply-submit-btn]'
      );

      if (submitButton) {
        DOMHelper.simulateClick(submitButton);
        await DOMHelper.wait(1000);

        // Check if application was successful
        const successIndicator = document.querySelector('[data-easy-apply-success-header]');
        if (successIndicator) {
          await this.handleApplicationSuccess(jobData);
        } else {
          // Might be multi-step application, handle questions
          await this.handleApplicationQuestions(jobData);
        }
      } else {
        throw new Error('Submit button not found');
      }
    } catch (error) {
      throw new Error(`Application flow error: ${error.message}`);
    }
  }

  async handleApplicationQuestions(jobData) {
    // This is a simplified version - in a real implementation,
    // you'd want to handle various question types based on user profile
    Logger.info('Handling application questions...');

    // For now, just try to submit if there are no required fields
    const submitButton = DOMHelper.getVisibleElement('[data-easy-apply-submit-btn]');
    if (submitButton && !submitButton.disabled) {
      DOMHelper.simulateClick(submitButton);
      await DOMHelper.wait(2000);

      const successIndicator = document.querySelector('[data-easy-apply-success-header]');
      if (successIndicator) {
        await this.handleApplicationSuccess(jobData);
      } else {
        throw new Error('Could not complete application - manual intervention required');
      }
    } else {
      throw new Error('Application requires manual input');
    }
  }

  async handleApplicationSuccess(jobData) {
    Logger.info('Application successful', jobData);

    // Record successful application
    await MessageHandler.sendMessage(MESSAGE_TYPES.APPLICATION_COMPLETED, {
      jobData,
      status: APPLICATION_STATUS.SUCCESS
    });

    // Update session count
    const sessionCountElement = this.ui.querySelector('#hh-session-count');
    if (sessionCountElement) {
      const currentCount = parseInt(sessionCountElement.textContent, 10) || 0;
      sessionCountElement.textContent = currentCount + 1;
    }

    // Refresh stats from background
    await this.loadAndUpdateStats();

    this.updateSessionStats();

    // Close application modal
    const closeButton = DOMHelper.getVisibleElement(
      '[data-easy-apply-close-btn], [aria-label*="Dismiss"]'
    );
    if (closeButton) {
      DOMHelper.simulateClick(closeButton);
    }

    await DOMHelper.wait(2000);
    await this.navigateToNextJob();
  }

  async handleApplicationError(error, jobData = null) {
    Logger.error('Application error', error);

    if (jobData) {
      await MessageHandler.sendMessage(MESSAGE_TYPES.APPLICATION_COMPLETED, {
        jobData,
        status: APPLICATION_STATUS.FAILED,
        error: error.message
      });
    }

    // Close any open modals
    const closeButton = DOMHelper.getVisibleElement(
      '[data-easy-apply-close-btn], [aria-label*="Dismiss"]'
    );
    if (closeButton) {
      DOMHelper.simulateClick(closeButton);
    }

    await DOMHelper.wait(2000);
    await this.navigateToNextJob();
  }

  async navigateToNextJob() {
    // Simple navigation - in a real implementation, you'd want more sophisticated job discovery
    try {
      const nextJobLink = document.querySelector(
        '.jobs-search-results__list-item:not(.jobs-search-results__list-item--viewed) a'
      );
      if (nextJobLink) {
        DOMHelper.simulateClick(nextJobLink);
        await DOMHelper.wait(3000);
        this.processCurrentPage();
      } else {
        this.updateStatus('ready', 'No more jobs found');
        this.stopAutoApply();
      }
    } catch (error) {
      Logger.error('Navigation error', error);
      this.stopAutoApply();
    }
  }

  updateUIState() {
    const startBtn = this.ui.querySelector('#hh-start-btn');
    const pauseBtn = this.ui.querySelector('#hh-pause-btn');
    const stopBtn = this.ui.querySelector('#hh-stop-btn');

    if (this.isActive && !this.isPaused) {
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      pauseBtn.textContent = 'Pause';
    } else if (this.isActive && this.isPaused) {
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      pauseBtn.textContent = 'Resume';
    } else {
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      pauseBtn.textContent = 'Pause';
    }
  }

  updateStatus(status, message) {
    const indicator = this.ui.querySelector('#hh-status-indicator');
    const text = this.ui.querySelector('#hh-status-text');

    indicator.className = `hh-status-indicator ${status}`;
    text.textContent = message;
  }

  async loadAndUpdateStats() {
    try {
      // Load stats from background script
      const [statsResponse, settingsResponse] = await Promise.all([
        MessageHandler.sendMessage(MESSAGE_TYPES.GET_STATS),
        MessageHandler.sendMessage(MESSAGE_TYPES.GET_SETTINGS)
      ]);

      if (statsResponse?.success && statsResponse.data) {
        const stats = statsResponse.data;
        this.updateStatsDisplay(stats);
      }

      if (settingsResponse?.success && settingsResponse.data) {
        const settings = settingsResponse.data;
        this.updateDailyLimitDisplay(settings);
      }
    } catch (error) {
      Logger.error('Failed to load stats', error);
    }
  }

  updateStatsDisplay(stats) {
    if (!this.ui) {
      return;
    }

    // Update total applications
    const totalElement = this.ui.querySelector('#hh-total-applications');
    if (totalElement) {
      totalElement.textContent = stats.totalApplications || 0;
    }

    // Update applied today
    const todayElement = this.ui.querySelector('#hh-applied-today');
    if (todayElement) {
      todayElement.textContent = stats.applicationsToday || 0;
    }

    // Update success rate
    const successRateElement = this.ui.querySelector('#hh-success-rate');
    if (successRateElement) {
      const total = stats.totalApplications || 0;
      const successful = stats.successfulApplications || 0;
      const rate = total > 0 ? Math.round((successful / total) * 100) : 0;
      successRateElement.textContent = `${rate}%`;
    }

    // Update daily progress bar
    this.updateProgressBar(stats.applicationsToday || 0);
  }

  updateDailyLimitDisplay(settings) {
    if (!this.ui) {
      return;
    }

    const dailyLimit = settings.rateLimit?.dailyLimit || 30;
    const dailyLimitElement = this.ui.querySelector('#hh-daily-limit');
    if (dailyLimitElement) {
      dailyLimitElement.textContent = dailyLimit;
    }
  }

  updateProgressBar(applicationsToday) {
    if (!this.ui) {
      return;
    }

    const dailyCountElement = this.ui.querySelector('#hh-daily-count');
    const progressFillElement = this.ui.querySelector('#hh-progress-fill');
    const dailyLimitElement = this.ui.querySelector('#hh-daily-limit');

    if (dailyCountElement) {
      dailyCountElement.textContent = applicationsToday;
    }

    if (progressFillElement && dailyLimitElement) {
      const dailyLimit = parseInt(dailyLimitElement.textContent, 10) || 30;
      const progress = Math.min((applicationsToday / dailyLimit) * 100, 100);
      progressFillElement.style.width = `${progress}%`;
    }
  }

  displayCurrentJob(jobData) {
    const currentJobDiv = this.ui.querySelector('#hh-current-job');
    const titleEl = this.ui.querySelector('#hh-job-title');
    const companyEl = this.ui.querySelector('#hh-job-company');

    titleEl.textContent = jobData.title;
    companyEl.textContent = jobData.company;
    currentJobDiv.style.display = 'block';
  }

  async updateSessionStats() {
    try {
      const response = await MessageHandler.sendMessage(MESSAGE_TYPES.GET_STATS);
      if (response.success) {
        // Update UI with latest stats
        // This would be implemented based on the response structure
      }
    } catch (error) {
      Logger.error('Failed to update session stats', error);
    }
  }

  observePageChanges() {
    this.observer = new MutationObserver(_mutations => {
      // Handle page navigation and dynamic content changes
      if (this.isActive && !this.isPaused) {
        const hasJobContent = document.querySelector(LINKEDIN_SELECTORS.jobTitle);
        if (hasJobContent && URLHelper.isLinkedInJobDetailPage()) {
          // Debounce processing to avoid multiple triggers
          clearTimeout(this.processTimeout);
          this.processTimeout = setTimeout(() => {
            this.processCurrentPage();
          }, 1000);
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize the automation when the page loads
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  const existingUI = document.getElementById('hirehack-automation-ui');
  if (!existingUI) {
    new LinkedInAutomation();
  }
}
