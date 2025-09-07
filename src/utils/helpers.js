// Helper utility functions
import { LINKEDIN_SELECTORS } from './constants.js';

export class DOMHelper {
  static wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const newElement = document.querySelector(selector);
        if (newElement) {
          observer.disconnect();
          resolve(newElement);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  static getVisibleElement(selector) {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).find(el => {
      const rect = el.getBoundingClientRect();
      return (
        rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden'
      );
    });
  }

  static isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  static scrollToElement(element, behavior = 'smooth') {
    element.scrollIntoView({ behavior, block: 'center' });
  }

  static simulateClick(element) {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }

  static simulateKeyPress(element, key) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }
}

export class LinkedInHelper {
  static extractJobData() {
    try {
      const jobTitle = document.querySelector(LINKEDIN_SELECTORS.JOB_TITLE)?.textContent?.trim();
      const company = document.querySelector(LINKEDIN_SELECTORS.COMPANY_NAME)?.textContent?.trim();
      const location = document.querySelector(LINKEDIN_SELECTORS.JOB_LOCATION)?.textContent?.trim();
      const description = document
        .querySelector(LINKEDIN_SELECTORS.JOB_DESCRIPTION)
        ?.textContent?.trim();

      return {
        title: jobTitle || 'Unknown Title',
        company: company || 'Unknown Company',
        location: location || 'Unknown Location',
        description: description || '',
        url: window.location.href,
        platform: 'linkedin',
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extracting job data:', error);
      return null;
    }
  }

  static isEasyApplyJob() {
    return !!document.querySelector(LINKEDIN_SELECTORS.EASY_APPLY_BUTTON);
  }

  static getEasyApplyButton() {
    return DOMHelper.getVisibleElement(LINKEDIN_SELECTORS.EASY_APPLY_BUTTON);
  }

  static isJobAlreadyApplied() {
    const appliedIndicator = document.querySelector(LINKEDIN_SELECTORS.APPLIED_INDICATOR);
    return !!appliedIndicator;
  }

  static extractApplicationQuestions() {
    const questions = [];
    const questionElements = document.querySelectorAll(
      '[data-test-form-builder-radio-button-form-component]'
    );

    questionElements.forEach(element => {
      const questionText = element.querySelector('legend')?.textContent?.trim();
      const options = Array.from(element.querySelectorAll('input[type="radio"]')).map(input => ({
        value: input.value,
        label: input.parentElement?.textContent?.trim()
      }));

      if (questionText && options.length > 0) {
        questions.push({
          question: questionText,
          type: 'radio',
          options
        });
      }
    });

    // Extract text input questions
    const textInputs = document.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
      const label = input.closest('.fb-form-element')?.querySelector('label')?.textContent?.trim();
      if (label) {
        questions.push({
          question: label,
          type: 'text',
          element: input
        });
      }
    });

    return questions;
  }
}

export class RateLimiter {
  constructor(maxActions = 30, timeWindow = 3600000) {
    // 30 actions per hour
    this.maxActions = maxActions;
    this.timeWindow = timeWindow;
    this.actions = [];
  }

  async canPerformAction() {
    const now = Date.now();
    this.actions = this.actions.filter(timestamp => now - timestamp < this.timeWindow);
    return this.actions.length < this.maxActions;
  }

  recordAction() {
    this.actions.push(Date.now());
  }

  getTimeUntilNextAction() {
    if (this.actions.length < this.maxActions) { return 0; }

    const oldestAction = Math.min(...this.actions);
    const timeUntilExpiry = this.timeWindow - (Date.now() - oldestAction);
    return Math.max(0, timeUntilExpiry);
  }

  getRemainingActions() {
    return Math.max(0, this.maxActions - this.actions.length);
  }
}

export class MessageHandler {
  static async sendMessage(type, data = {}) {
    try {
      return await chrome.runtime.sendMessage({ type, data });
    } catch (error) {
      console.error('Message send error:', error);
      return { success: false, error: error.message };
    }
  }

  static setupMessageListener(handler) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handler(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
  }
}

export class URLHelper {
  static isLinkedInJobsPage() {
    return (
      window.location.hostname === 'www.linkedin.com' && window.location.pathname.includes('/jobs/')
    );
  }

  static isLinkedInJobDetailPage() {
    return this.isLinkedInJobsPage() && window.location.pathname.includes('/view/');
  }

  static getJobIdFromURL() {
    const match = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
    return match ? match[1] : null;
  }

  static constructJobURL(jobId) {
    return `https://www.linkedin.com/jobs/view/${jobId}`;
  }
}

export class ValidationHelper {
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  static validateUserProfile(profile) {
    const errors = [];

    if (!profile.personal.firstName?.trim()) {
      errors.push('First name is required');
    }

    if (!profile.personal.lastName?.trim()) {
      errors.push('Last name is required');
    }

    if (!profile.personal.email || !this.isValidEmail(profile.personal.email)) {
      errors.push('Valid email is required');
    }

    if (profile.personal.phone && !this.isValidPhone(profile.personal.phone)) {
      errors.push('Valid phone number format required');
    }

    return errors;
  }
}

export class Logger {
  static debug(message, data = {}) {
    console.debug(`[HireHack] ${message}`, data);
  }

  static info(message, data = {}) {
    console.info(`[HireHack] ${message}`, data);
  }

  static warn(message, data = {}) {
    console.warn(`[HireHack] ${message}`, data);
  }

  static error(message, error = {}) {
    console.error(`[HireHack] ${message}`, error);
  }
}

// Export utilities for easy access
export default {
  DOMHelper,
  LinkedInHelper,
  RateLimiter,
  MessageHandler,
  URLHelper,
  ValidationHelper,
  Logger
};
