// Background service worker
import { StorageManager } from './utils/storage.js';
import { Logger } from './utils/helpers.js';
import { MESSAGE_TYPES, APPLICATION_STATUS, DEFAULT_SETTINGS } from './utils/constants.js';

class BackgroundService {
  constructor() {
    this.setupMessageHandlers();
    this.init();
  }

  async init() {
    try {
      Logger.info('Background service initializing...');

      // Initialize default settings if not exists
      const settings = await StorageManager.getSettings();
      if (!settings.rateLimit) {
        await StorageManager.saveSettings(DEFAULT_SETTINGS);
      }

      // Reset daily session if needed
      await this.resetDailySessionIfNeeded();

      Logger.info('Background service initialized successfully');
    } catch (error) {
      Logger.error('Background service initialization failed', error);
    }
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener(details => {
      this.handleInstallation(details);
    });

    // Handle tab updates to track navigation
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url?.includes('linkedin.com/jobs')) {
        this.handleJobPageVisit(tab);
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    const { type, data } = message;

    try {
      switch (type) {
        case MESSAGE_TYPES.GET_USER_PROFILE:
          const profile = await StorageManager.getUserProfile();
          sendResponse({ success: true, data: profile });
          break;

        case MESSAGE_TYPES.SAVE_USER_PROFILE:
          const saveResult = await StorageManager.saveUserProfile(data);
          sendResponse({ success: saveResult });
          break;

        case MESSAGE_TYPES.GET_SETTINGS:
          const settings = await StorageManager.getSettings();
          sendResponse({ success: true, data: settings });
          break;

        case MESSAGE_TYPES.SAVE_SETTINGS:
          const settingsResult = await StorageManager.saveSettings(data);
          sendResponse({ success: settingsResult });
          break;

        case MESSAGE_TYPES.START_AUTO_APPLY:
          await this.handleStartAutoApply(data, sendResponse);
          break;

        case MESSAGE_TYPES.STOP_AUTO_APPLY:
          await this.handleStopAutoApply(sendResponse);
          break;

        case MESSAGE_TYPES.APPLICATION_COMPLETED:
          await this.handleApplicationCompleted(data, sendResponse);
          break;

        case MESSAGE_TYPES.GET_STATS:
          const stats = await StorageManager.getStats();
          sendResponse({ success: true, data: stats });
          break;

        case MESSAGE_TYPES.GET_APPLICATION_HISTORY:
          const history = await StorageManager.getApplicationHistory();
          sendResponse({ success: true, data: history });
          break;

        case MESSAGE_TYPES.CHECK_RATE_LIMIT:
          const canApply = await this.checkRateLimit();
          sendResponse({ success: true, data: { canApply } });
          break;

        case MESSAGE_TYPES.EXPORT_DATA:
          const exportData = await StorageManager.exportData();
          sendResponse({ success: true, data: exportData });
          break;

        case MESSAGE_TYPES.IMPORT_DATA:
          const importResult = await StorageManager.importData(data);
          sendResponse({ success: importResult });
          break;

        default:
          Logger.warn('Unknown message type:', type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      Logger.error('Message handling error', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleStartAutoApply(data, sendResponse) {
    try {
      // Check rate limit
      const canApply = await this.checkRateLimit();
      if (!canApply.allowed) {
        sendResponse({
          success: false,
          error: 'Rate limit exceeded',
          rateLimitInfo: canApply
        });
        return;
      }

      // Update session state
      await StorageManager.updateSession({
        currentSession: {
          startTime: new Date().toISOString(),
          applicationsThisSession: 0,
          isActive: true,
          isPaused: false
        }
      });

      Logger.info('Auto-apply session started');
      sendResponse({ success: true });
    } catch (error) {
      Logger.error('Start auto-apply error', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleStopAutoApply(sendResponse) {
    try {
      const session = await StorageManager.getSession();
      await StorageManager.updateSession({
        currentSession: {
          ...session.currentSession,
          isActive: false,
          isPaused: false
        }
      });

      Logger.info('Auto-apply session stopped');
      sendResponse({ success: true });
    } catch (error) {
      Logger.error('Stop auto-apply error', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleApplicationCompleted(data, sendResponse) {
    try {
      const { jobData, status, error } = data;

      // Record application in history
      await StorageManager.addApplicationRecord({
        jobData,
        status,
        error: error || null,
        platform: 'linkedin'
      });

      // Update statistics
      const stats = await StorageManager.getStats();
      const updatedStats = {
        totalApplications: stats.totalApplications + 1,
        platformStats: {
          ...stats.platformStats,
          linkedin: {
            applied: stats.platformStats.linkedin.applied + 1,
            success:
              stats.platformStats.linkedin.success + (status === APPLICATION_STATUS.SUCCESS ? 1 : 0)
          }
        }
      };

      if (status === APPLICATION_STATUS.SUCCESS) {
        updatedStats.successfulApplications = stats.successfulApplications + 1;
      } else {
        updatedStats.failedApplications = stats.failedApplications + 1;
      }

      await StorageManager.updateStats(updatedStats);

      // Update session
      const session = await StorageManager.getSession();
      await StorageManager.updateSession({
        applicationsToday: session.applicationsToday + 1,
        currentSession: {
          ...session.currentSession,
          applicationsThisSession: session.currentSession.applicationsThisSession + 1
        }
      });

      Logger.info('Application recorded', { jobData, status });
      sendResponse({ success: true });
    } catch (error) {
      Logger.error('Application completion handling error', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async checkRateLimit() {
    try {
      const settings = await StorageManager.getSettings();
      const session = await StorageManager.getSession();

      // Reset daily applications if new day
      await this.resetDailySessionIfNeeded();
      const updatedSession = await StorageManager.getSession();

      const dailyLimitReached = updatedSession.applicationsToday >= settings.rateLimit.dailyLimit;
      const hourlyLimitReached =
        updatedSession.currentSession.applicationsThisSession >= settings.rateLimit.hourlyLimit;

      return {
        allowed: !dailyLimitReached && !hourlyLimitReached,
        dailyApplications: updatedSession.applicationsToday,
        dailyLimit: settings.rateLimit.dailyLimit,
        sessionApplications: updatedSession.currentSession.applicationsThisSession,
        hourlyLimit: settings.rateLimit.hourlyLimit
      };
    } catch (error) {
      Logger.error('Rate limit check error', error);
      return { allowed: false, error: error.message };
    }
  }

  async resetDailySessionIfNeeded() {
    const session = await StorageManager.getSession();
    const today = new Date().toDateString();

    if (session.lastResetDate !== today) {
      await StorageManager.updateSession({
        applicationsToday: 0,
        lastResetDate: today,
        currentSession: {
          startTime: null,
          applicationsThisSession: 0,
          isActive: false,
          isPaused: false
        }
      });

      // Update streak
      const stats = await StorageManager.getStats();
      const lastActiveDate = new Date(stats.lastActiveDate).toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      let { streakDays } = stats;
      if (lastActiveDate === yesterday) {
        streakDays += 1;
      } else if (lastActiveDate !== today) {
        streakDays = 0;
      }

      await StorageManager.updateStats({ streakDays });
      Logger.info('Daily session reset completed');
    }
  }

  async handleJobPageVisit(tab) {
    try {
      // Inject content script if not already injected
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-script.js']
      });
    } catch (error) {
      // Content script might already be injected, ignore error
      Logger.debug('Content script injection result', error);
    }
  }

  async handleInstallation(details) {
    if (details.reason === 'install') {
      Logger.info('Extension installed');

      // Initialize default data
      await StorageManager.saveSettings(DEFAULT_SETTINGS);

      // Open options page
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    } else if (details.reason === 'update') {
      Logger.info('Extension updated');
      // Handle any migration logic here if needed
    }
  }
}

// Initialize the background service
new BackgroundService();
