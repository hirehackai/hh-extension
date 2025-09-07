// Storage management utilities
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants.js';

export class StorageManager {
  static async get(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key];
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  static async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  static async getUserProfile() {
    const profile = await this.get(STORAGE_KEYS.USER_PROFILE);
    return profile || this.getDefaultUserProfile();
  }

  static async saveUserProfile(profile) {
    profile.metadata = {
      ...profile.metadata,
      updatedAt: new Date().toISOString()
    };
    return await this.set(STORAGE_KEYS.USER_PROFILE, profile);
  }

  static async getApplicationHistory() {
    const history = await this.get(STORAGE_KEYS.APPLICATION_HISTORY);
    return history || [];
  }

  static async addApplicationRecord(record) {
    const history = await this.getApplicationHistory();
    record.id = this.generateId();
    record.appliedAt = new Date().toISOString();
    history.unshift(record);

    // Keep only last 1000 records
    if (history.length > 1000) {
      history.splice(1000);
    }

    return await this.set(STORAGE_KEYS.APPLICATION_HISTORY, history);
  }

  static async getSettings() {
    const settings = await this.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  static async saveSettings(settings) {
    return await this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  static async getStats() {
    const stats = await this.get(STORAGE_KEYS.STATS);
    return stats || this.getDefaultStats();
  }

  static async updateStats(statsUpdate) {
    const currentStats = await this.getStats();
    const updatedStats = { ...currentStats, ...statsUpdate };
    updatedStats.lastActiveDate = new Date().toISOString();
    return await this.set(STORAGE_KEYS.STATS, updatedStats);
  }

  static async getSession() {
    const session = await this.get(STORAGE_KEYS.SESSION);
    return session || this.getDefaultSession();
  }

  static async updateSession(sessionUpdate) {
    const currentSession = await this.getSession();
    const updatedSession = { ...currentSession, ...sessionUpdate };
    return await this.set(STORAGE_KEYS.SESSION, updatedSession);
  }

  static async exportData() {
    const data = {
      userProfile: await this.getUserProfile(),
      applicationHistory: await this.getApplicationHistory(),
      settings: await this.getSettings(),
      stats: await this.getStats(),
      exportedAt: new Date().toISOString()
    };
    return data;
  }

  static async importData(data) {
    try {
      if (data.userProfile) { await this.saveUserProfile(data.userProfile); }
      if (data.applicationHistory) { await this.set(STORAGE_KEYS.APPLICATION_HISTORY, data.applicationHistory); }
      if (data.settings) { await this.saveSettings(data.settings); }
      if (data.stats) { await this.set(STORAGE_KEYS.STATS, data.stats); }
      return true;
    } catch (error) {
      console.error('Import data error:', error);
      return false;
    }
  }

  static getDefaultUserProfile() {
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
        skills: [],
        summary: '',
        resumeFiles: {}
      },
      preferences: {
        salaryRange: { min: 0, max: 200000 },
        locations: [],
        jobTypes: [],
        excludeKeywords: [],
        includeKeywords: [],
        companies: {
          whitelist: [],
          blacklist: []
        }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  static getDefaultStats() {
    return {
      totalApplications: 0,
      successfulApplications: 0,
      failedApplications: 0,
      streakDays: 0,
      lastActiveDate: new Date().toISOString(),
      platformStats: {
        linkedin: { applied: 0, success: 0 }
      }
    };
  }

  static getDefaultSession() {
    return {
      applicationsToday: 0,
      lastResetDate: new Date().toDateString(),
      currentSession: {
        startTime: null,
        applicationsThisSession: 0,
        isActive: false,
        isPaused: false
      }
    };
  }

  static generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}
