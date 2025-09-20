// Content script for Multi-Platform Job Automation
import { DOMHelper, URLHelper, MessageHandler, RateLimiter, Logger } from './utils/helpers.js';
import { MESSAGE_TYPES, APPLICATION_STATUS } from './utils/constants.js';
import { PlatformAdapterFactory } from './utils/platform-adapters.js';
import JobQueue from './utils/job-queue.js';

class MultiPlatformAutomation {
  constructor() {
    this.isActive = false;
    this.isPaused = false;

    this.isDiscovering = false; // Add flag to prevent concurrent discoveries
    this.platformAdapter = null;
    this.jobQueue = null;

    this.rateLimiter = new RateLimiter();
    this.ui = null;
    this.observer = null;
    this.currentPlatform = null;

    this.init();
  }

  async init() {
    try {
      Logger.info('Multi-platform automation initializing...');

      // Check if we're on a supported platform
      if (!URLHelper.isSupportedPlatform()) {
        Logger.info('Unsupported platform, automation not available');
        return;
      }

      this.currentPlatform = URLHelper.getCurrentPlatform();
      Logger.info(`Detected platform: ${this.currentPlatform}`);

      // Initialize platform adapter
      this.platformAdapter = PlatformAdapterFactory.createAdapter();

      // Initialize job queue
      this.jobQueue = new JobQueue();
      await this.jobQueue.init();

      // Set up event listeners for job queue
      this.setupJobQueueListeners();

      await this.setupUI();
      this.setupMessageHandlers();
      // this.observePageChanges();
      await this.loadAndUpdateStats();

      Logger.info('Multi-platform automation initialized successfully');
    } catch (error) {
      Logger.error('Multi-platform automation initialization failed', error);
    }
  }

  setupJobQueueListeners() {
    // Progress callback
    this.jobQueue.onProgress(progress => {
      Logger.info('Job queue progress:', progress);
      this.updateProgressDisplay(progress);
    });

    // Job processed callback
    this.jobQueue.onJobProcessed(result => {
      Logger.info('Job processed:', result);
      this.updateCurrentJobDisplay(result.job);
      this.updateSessionStats();
    });

    // Complete callback
    this.jobQueue.onComplete(stats => {
      Logger.info('Job queue processing complete:', stats);
      this.updateStatus('ready', `Completed: ${stats.successful}/${stats.processed} applications`);
      this.isActive = false;
      this.updateUIState();
    });
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
          const jobData = this.platformAdapter?.extractJobData();
          sendResponse({ success: true, data: jobData });
          break;

        case MESSAGE_TYPES.CHECK_EASY_APPLY:
          const status = this.getPageStatus();
          sendResponse({ success: true, data: status });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    });
  }

  getPageStatus() {
    if (!this.platformAdapter) {
      return {
        isSearchResults: false,
        isJobDetail: false,
        platform: null,
        jobsAvailable: 0
      };
    }

    const isSearchResults = this.platformAdapter.isSearchResultsPage();
    const isJobDetail = this.platformAdapter.isJobDetailPage();
    let jobsAvailable = 0;

    if (isSearchResults) {
      const jobs = this.platformAdapter.extractJobsFromSearchResults();
      jobsAvailable = jobs.length;
    }

    return {
      isSearchResults,
      isJobDetail,
      platform: this.currentPlatform,
      jobsAvailable
    };
  }

  async setupUI() {
    // Create draggable automation UI
    this.ui = this.createAutomationUI();
    document.body.appendChild(this.ui);

    // Add event listeners
    if (this.ui) {
      this.ui.addEventListener('click', e => {
        const { action } = e.target.dataset;
        if (action) {
          this.handleUIAction(action);
        }
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
        <span class="hh-platform-badge">${this.currentPlatform.toUpperCase()}</span>
        <button class="hh-close" data-action="close">×</button>
      </div>
      <div class="hh-content">
        <div class="hh-status">
          <div class="hh-status-indicator" id="hh-status-indicator"></div>
          <span id="hh-status-text">Ready</span>
        </div>
        <div class="hh-controls">
          <button id="hh-discover-btn" class="hh-btn hh-secondary" data-action="discover">
            Discover Jobs
          </button>
          <button id="hh-start-btn" class="hh-btn hh-primary" data-action="start" disabled>
            Start Bulk Apply
          </button>
          <button id="hh-pause-btn" class="hh-btn hh-secondary" data-action="pause" disabled>
            Pause
          </button>
          <button id="hh-stop-btn" class="hh-btn hh-danger" data-action="stop" disabled>
            Stop
          </button>
        </div>
        <div class="hh-queue-section">
          <div class="hh-queue-header">
            <span class="hh-queue-label">Job Queue</span>
            <span class="hh-queue-text">
              <span id="hh-queue-size">0</span> queued | 
              <span id="hh-processed-count">0</span> processed
            </span>
          </div>
          <div class="hh-progress-bar">
            <div class="hh-progress-fill" id="hh-progress-fill"></div>
          </div>
        </div>
        <div class="hh-stats">
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
          <div class="hh-stat">
            <span class="hh-stat-label">Queue Status:</span>
            <span id="hh-queue-status" class="hh-stat-value">Empty</span>
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

    // Update page info initially
    this.updatePageInfo();

    return ui;
  }

  getUIStyles() {
    return `
      #hirehack-automation-ui {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
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

      .hh-platform-badge {
        margin-left: auto;
        background: rgba(255,255,255,0.2);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
      }
      
      .hh-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        margin-left: 8px;
      }
      
      .hh-content {
        padding: 16px;
      }
      
      .hh-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
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
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 16px;
      }

      .hh-controls button:first-child {
        grid-column: 1 / -1;
      }
      
      .hh-btn {
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
        font-weight: 500;
      }
      
      .hh-primary {
        background: #28a745;
        color: white;
        grid-column: 1 / -1;
      }
      
      .hh-primary:hover:not(:disabled) {
        background: #218838;
      }
      
      .hh-secondary {
        background: #6c757d;
        color: white;
      }

      .hh-secondary:hover:not(:disabled) {
        background: #545b62;
      }
      
      .hh-danger {
        background: #dc3545;
        color: white;
      }

      .hh-danger:hover:not(:disabled) {
        background: #c82333;
      }
      
      .hh-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .hh-queue-section {
        border-top: 1px solid #eee;
        padding-top: 12px;
        margin-bottom: 12px;
      }
      
      .hh-queue-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      
      .hh-queue-label {
        color: #666;
        font-size: 12px;
        font-weight: 500;
      }
      
      .hh-queue-text {
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
        background: #28a745;
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
        font-size: 13px;
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
    try {
      switch (action) {
        case 'discover':
          await this.discoverJobs();
          break;
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
    } catch (error) {
      Logger.error('UI action error:', error);
      this.updateStatus('error', error.message);
    }
  }

  updatePageInfo() {
    if (!this.platformAdapter || !this.ui) {
      return;
    }

    const pageTypeElement = this.ui.querySelector('#hh-page-type');
    const jobsCountElement = this.ui.querySelector('#hh-jobs-count');

    if (this.platformAdapter.isSearchResultsPage()) {
      pageTypeElement.textContent = 'Search Results';
      const jobs = this.platformAdapter.extractJobsFromSearchResults();
      jobsCountElement.textContent = `${jobs.length} jobs found`;
    } else if (this.platformAdapter.isJobDetailPage()) {
      pageTypeElement.textContent = 'Job Detail';
      jobsCountElement.textContent = 'Single job page';
    } else {
      pageTypeElement.textContent = 'Unknown Page';
      jobsCountElement.textContent = 'No jobs detected';
    }
  }

  async discoverJobs() {
    // Prevent concurrent discovery attempts
    if (this.isDiscovering) {
      Logger.info('Job discovery already in progress, skipping...');
      return 0;
    }

    try {
      this.isDiscovering = true;
      this.updateUIState(); // Update UI to show discovery in progress
      this.updateStatus('active', 'Discovering jobs...');

      if (!this.platformAdapter.isSearchResultsPage()) {
        throw new Error('Not on a search results page. Please navigate to job search results.');
      }

      const jobCount = await this.jobQueue.discoverJobs();

      if (jobCount === 0) {
        this.updateStatus('ready', 'No Easy Apply jobs found');
      } else {
        this.updateStatus('ready', `Found ${jobCount} Easy Apply jobs`);
        this.updateQueueDisplay();

        // Enable start button
        const startBtn = this.ui.querySelector('#hh-start-btn');
        if (startBtn) {
          startBtn.disabled = false;
        }
      }

      return jobCount;
    } catch (error) {
      Logger.error('Discover jobs error:', error);
      this.updateStatus('error', error.message);
      return 0;
    } finally {
      this.isDiscovering = false;
      this.updateUIState(); // Update UI to reflect discovery completed
    }
  }

  async startAutoApply(data = {}) {
    try {
      if (this.isActive) {
        throw new Error('Auto apply already running');
      }

      if (!this.jobQueue || this.jobQueue.getStatus().queueSize === 0) {
        // Try to discover jobs first
        await this.discoverJobs();

        if (this.jobQueue.getStatus().queueSize === 0) {
          throw new Error('No jobs in queue. Please discover jobs first.');
        }
      }

      // Check with background service if we can start
      const response = await MessageHandler.sendMessage(MESSAGE_TYPES.START_AUTO_APPLY, data);
      Logger.info('Start auto apply response', response);

      if (!response.success) {
        this.updateStatus('error', response.error);
        return;
      }

      this.isActive = true;
      this.isPaused = false;
      this.updateUIState();
      this.updateStatus('active', 'Starting bulk application process...');

      // Start the job queue processing
      await this.jobQueue.startProcessing();
    } catch (error) {
      Logger.error('Start auto apply error', error);
      this.updateStatus('error', error.message);

      this.isActive = false;
      this.isPaused = false;
      this.updateUIState();
    }
  }

  stopAutoApply() {
    Logger.info('Stopping bulk auto apply...');

    if (this.jobQueue) {
      this.jobQueue.stopProcessing();
    }

    this.isActive = false;
    this.isPaused = false;
    this.updateUIState();
    this.updateStatus('ready', 'Stopped');

    MessageHandler.sendMessage(MESSAGE_TYPES.STOP_AUTO_APPLY);
  }

  pauseAutoApply() {
    if (this.jobQueue) {
      this.jobQueue.pauseProcessing();
    }

    this.isPaused = true;
    this.updateUIState();
    this.updateStatus('paused', 'Paused');
  }

  async resumeAutoApply() {
    if (!this.isActive) {
      throw new Error('Auto apply is not active');
    }

    if (this.jobQueue) {
      await this.jobQueue.resumeProcessing();
    }

    this.isPaused = false;
    this.updateUIState();
    this.updateStatus('active', 'Resumed');
  }

  updateUIState() {
    if (!this.ui) {
      return;
    }

    const discoverBtn = this.ui.querySelector('#hh-discover-btn');
    const startBtn = this.ui.querySelector('#hh-start-btn');
    const pauseBtn = this.ui.querySelector('#hh-pause-btn');
    const stopBtn = this.ui.querySelector('#hh-stop-btn');

    if (this.isDiscovering) {
      // Disable all buttons during discovery
      discoverBtn.disabled = true;
      startBtn.disabled = true;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
    } else if (this.isActive && !this.isPaused) {
      discoverBtn.disabled = true;
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      pauseBtn.textContent = 'Pause';
    } else if (this.isActive && this.isPaused) {
      discoverBtn.disabled = true;
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      pauseBtn.textContent = 'Resume';
    } else {
      discoverBtn.disabled = false;
      const hasJobs = this.jobQueue && this.jobQueue.getStatus().queueSize > 0;
      startBtn.disabled = !hasJobs;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      pauseBtn.textContent = 'Pause';
    }
  }

  updateStatus(status, message) {
    if (!this.ui) {
      return;
    }

    const indicator = this.ui.querySelector('#hh-status-indicator');
    const text = this.ui.querySelector('#hh-status-text');

    if (indicator) {
      indicator.className = `hh-status-indicator ${status}`;
    }
    if (text) {
      text.textContent = message;
    }
  }

  updateQueueDisplay() {
    if (!this.ui || !this.jobQueue) {
      return;
    }

    const queueStatus = this.jobQueue.getStatus();

    const queueSizeElement = this.ui.querySelector('#hh-queue-size');
    const processedCountElement = this.ui.querySelector('#hh-processed-count');
    const queueStatusElement = this.ui.querySelector('#hh-queue-status');

    if (queueSizeElement) {
      queueSizeElement.textContent = queueStatus.queueSize;
    }

    if (processedCountElement) {
      processedCountElement.textContent = queueStatus.processedSize;
    }

    if (queueStatusElement) {
      if (queueStatus.queueSize === 0 && queueStatus.processedSize === 0) {
        queueStatusElement.textContent = 'Empty';
      } else if (queueStatus.isProcessing) {
        queueStatusElement.textContent = 'Processing';
      } else if (queueStatus.isPaused) {
        queueStatusElement.textContent = 'Paused';
      } else {
        queueStatusElement.textContent = 'Ready';
      }
    }
  }

  updateProgressDisplay(progress) {
    if (!this.ui) {
      return;
    }

    const progressFill = this.ui.querySelector('#hh-progress-fill');

    if (progressFill && progress.type === 'processing' && progress.total > 0) {
      const percentage = Math.min((progress.current / progress.total) * 100, 100);
      progressFill.style.width = `${percentage}%`;
    }

    // Update queue display
    this.updateQueueDisplay();
  }

  updateCurrentJobDisplay(job) {
    if (!this.ui) {
      return;
    }

    const currentJobDiv = this.ui.querySelector('#hh-current-job');
    const titleEl = this.ui.querySelector('#hh-job-title');
    const companyEl = this.ui.querySelector('#hh-job-company');

    if (job) {
      if (titleEl) {
        titleEl.textContent = job.title;
      }
      if (companyEl) {
        companyEl.textContent = job.company;
      }
      if (currentJobDiv) {
        currentJobDiv.style.display = 'block';
      }
    } else {
      if (currentJobDiv) {
        currentJobDiv.style.display = 'none';
      }
    }
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
        // Update job queue settings
        if (this.jobQueue) {
          this.jobQueue.settings = { ...this.jobQueue.settings, ...settingsResponse.data };
        }
      }
    } catch (error) {
      Logger.error('Failed to load stats', error);
    }
  }

  updateStatsDisplay(stats) {
    if (!this.ui) {
      return;
    }

    // Update applied today
    const todayElement = this.ui.querySelector('#hh-applied-today');
    if (todayElement) {
      todayElement.textContent = stats.applicationsToday || 0;
    }

    // Update session count (from job queue if available)
    const sessionElement = this.ui.querySelector('#hh-session-count');
    if (sessionElement) {
      const sessionCount = this.jobQueue ? this.jobQueue.stats.successful : 0;
      sessionElement.textContent = sessionCount;
    }

    // Update success rate
    const successRateElement = this.ui.querySelector('#hh-success-rate');
    if (successRateElement) {
      const total = stats.totalApplications || 0;
      const successful = stats.successfulApplications || 0;
      const rate = total > 0 ? Math.round((successful / total) * 100) : 0;
      successRateElement.textContent = `${rate}%`;
    }
  }

  updateSessionStats() {
    if (!this.ui || !this.jobQueue) {
      return;
    }

    const sessionElement = this.ui.querySelector('#hh-session-count');
    if (sessionElement) {
      sessionElement.textContent = this.jobQueue.stats.successful;
    }

    const successRateElement = this.ui.querySelector('#hh-success-rate');
    if (successRateElement && this.jobQueue.stats.processed > 0) {
      const rate = Math.round(
        (this.jobQueue.stats.successful / this.jobQueue.stats.processed) * 100
      );
      successRateElement.textContent = `${rate}%`;
    }
  }

  observePageChanges() {
    this.observer = new MutationObserver(_mutations => {
      // Handle page navigation and dynamic content changes
      // if (this.isActive && !this.isPaused) {
      //   const hasJobContent = document.querySelector(this.platformAdapter.selectors.jobTitle);
      //   if (hasJobContent && URLHelper.isLinkedInJobDetailPage()) {
      //     // Debounce processing to avoid multiple triggers
      //     clearTimeout(this.processTimeout);
      //     this.processTimeout = setTimeout(() => {
      //       this.processCurrentPage();
      //     }, 1000);
      //   }
      // }
      // // Update page info when content changes
      // this.updatePageInfo();
      // Note: Removed automatic job discovery to prevent infinite loops
      // Users should manually click "Discover Jobs" button
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Clean up
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.jobQueue) {
      this.jobQueue.stopProcessing();
    }

    if (this.ui) {
      this.ui.remove();
    }
  }
}

// Initialize the automation when the page loads
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  const existingUI = document.getElementById('hirehack-automation-ui');
  if (!existingUI) {
    new MultiPlatformAutomation();
  }
}

// else {
//   document.addEventListener('DOMContentLoaded', () => {
//     const existingUI = document.getElementById('hirehack-automation-ui');
//     if (!existingUI) {
//       new MultiPlatformAutomation();
//     }
//   });
// }
