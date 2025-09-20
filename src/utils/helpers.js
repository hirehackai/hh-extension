// Helper utility functions
import { LINKEDIN_SELECTORS } from './constants.js';
import _ from 'lodash';

const questionsMapping = {
  mobile: {
    queryFields: ['mobile', 'phone', 'contact number'],
    dataRef: 'personal_Info.phone'
  },
  gpa: {
    queryFields: ['gpa', 'gpaScore', 'GPA', 'G.P.A'],
    dataRef: 'additional_info.gpa'
  },
  commute: {
    queryFields: ['commute', 'transportation', 'travel'],
    dataRef: 'additional_info.commute'
  },
  clearance: {
    queryFields: ['security clearance', 'clearance'],
    dataRef: 'additional_info.clearance'
  },
  usCitizen: {
    queryFields: ['us citizen', 'citizenship', 'citizen'],
    dataRef: 'additional_info.usCitizen'
  },
  sponsorship: {
    queryFields: ['H-1B', 'require sponsorship'],
    dataRef: 'additional_info.sponsorship'
  },
  disability: {
    queryFields: ['disability', 'disabilities', 'disabled'],
    dataRef: 'additional_info.disability'
  },
  higestDegree: {
    queryFields: ['highest degree', 'degree', 'education'],
    dataRef: 'additional_info.highestDegree'
  },
  raceEthnicity: {
    queryFields: ['race', 'ethnicity'],
    dataRef: 'additional_info.raceEthnicity'
  },
  veteranStatus: {
    queryFields: ['veteran status', 'veteran'],
    dataRef: 'additional_info.veteranStatus'
  },
  expectedSalary: {
    queryFields: ['expected salary', 'salary expectation', 'salary'],
    dataRef: 'additional_info.expectedSalary'
  },
  englishProficiency: {
    queryFields: ['english proficiency', 'language skills', 'proficiency in English'],
    dataRef: 'additional_info.englishProficiency'
  },
  github: {
    queryFields: ['github', 'github profile', 'github link'],
    dataRef: 'personal_Info.github'
  },
  linkedin: {
    queryFields: ['linkedin', 'linkedin profile', 'linkedin link'],
    dataRef: 'personal_Info.linkedin'
  },
  portfolio: {
    queryFields: ['portfolio', 'portfolio link', 'portfolio website'],
    dataRef: 'personal_Info.portfolio'
  },
  email: {
    queryFields: ['email address'],
    dataRef: 'personal_Info.email'
  },
  gender: {
    queryFields: ['gender', 'sex'],
    dataRef: 'additional_info.gender'
  }
};

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

  static triggerEvent(element, eventType, options = {}) {
    const event = new Event(eventType, _.defaults(options, { bubbles: true, cancelable: true }));
    element.dispatchEvent(event);
  }
}

export class LinkedInHelper {
  static extractJobData() {
    try {
      const jobTitle = document.querySelector(LINKEDIN_SELECTORS.jobTitle)?.textContent?.trim();
      const company = document.querySelector(LINKEDIN_SELECTORS.companyName)?.textContent?.trim();
      const location = document.querySelector(LINKEDIN_SELECTORS.jobLocation)?.textContent?.trim();
      const description = document
        .querySelector(LINKEDIN_SELECTORS.jobDescription)
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
    return !!document.querySelector(LINKEDIN_SELECTORS.easyApplyButton);
  }

  static getEasyApplyButton() {
    return DOMHelper.getVisibleElement(LINKEDIN_SELECTORS.easyApplyButton);
  }

  static isJobAlreadyApplied() {
    const appliedIndicator = document.querySelector(LINKEDIN_SELECTORS.appliedIndicator);
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

/*
LinkedInFormFiller: process questions from LinkedIn application forms
takes a container of question DOM elements, cleans the text, and fills data
And returns error if anything goes wrong
*/
export class LinkedInFormFiller {
  constructor(questionsDomContainer, userData) {
    this.userData = userData;
    this.questions = this.cleanedQuestions(questionsDomContainer);
  }

  fillQuestions() {
    this.questions.forEach(question => {
      const type = question?.type;

      // if (!mappingKey || !dataRef) {
      //   Logger.warn(`No mapping found for question: ${title}`);
      //   return;
      // }

      // const value = _.get(userData, dataRef);
      // if (!value) {
      //   Logger.warn(`No user data found for question: ${title} (dataRef: ${dataRef})`);
      //   return;
      // }

      if (type === 'text') {
        this.fillInputField(question);
      } else if (type === 'radio') {
        this.fillRadioField(question);
      } else if (type === 'select') {
        console.log('filling select field', question);
        this.fillSelectField(question);
      }
    });
  }

  fillInputField(question) {
    const { title, element } = question;
    let { fillData } = question;

    if (
      title.toLowerCase().includes('years of experience') ||
      title.toLowerCase().includes('years of work experience') ||
      title.toLowerCase().includes('how many years of')
    ) {
      const skillData = this.findQuestionForSkill(title);
      if (skillData) {
        const value = skillData.yearsInNumber ? skillData.yearsInNumber : '1';
        fillData = value;
      }
    }

    const inputField = element.querySelector('.artdeco-text-input--input');
    if (inputField && fillData) {
      inputField.value = fillData;

      ['keydown', 'keypress', 'input', 'keyup'].forEach(eventType => {
        inputField.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
      });

      inputField.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }

  fillRadioField(question) {
    const { element, fillData } = question;

    let modifiedValue = fillData;
    if (fillData === 'yes' || fillData === 'Yes' || fillData === 'YES') {
      modifiedValue = 'Yes';
    } else if (fillData === 'no' || fillData === 'No' || fillData === 'NO') {
      modifiedValue = 'No';
    }

    const radioField =
      element.querySelector(`[data-test-text-selectable-option__input="${modifiedValue}"]`) ||
      element.querySelector(`input[type="radio"][value="${modifiedValue}"]`);

    if (radioField) {
      const radioButtonWithValue = radioField;

      if (radioButtonWithValue) {
        radioButtonWithValue.checked = true;
        radioButtonWithValue.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        console.warn(`Radio button with value "${modifiedValue}" not found.`);
      }
      return true;
    } else {
      // pick first option
      const firstOption = element.querySelector('input[type="radio"]');
      if (firstOption) {
        firstOption.checked = true;
        firstOption.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
  }

  fillSelectField(question) {
    const { element, fillData } = question;

    const selectField = element.querySelector('select');
    if (selectField) {
      //check if options has fillData
      const options = Array.from(selectField?.options).map(opt => opt.text.trim());
      if (options?.includes(fillData)) {
        selectField.value = fillData;
        // selectField.value = modifiedValue;

        selectField.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
  }

  //utils
  findQuestionForSkill(label) {
    // check if label matches any of the skills in skillsArray
    const skillsArray = this.userData?.skills || [];
    if (!skillsArray || skillsArray.length === 0) {
      return null;
    }
    const skillKey = skillsArray.find(skillObj =>
      label.toLowerCase().includes(skillObj?.skill?.toLowerCase?.())
    );
    if (skillKey) {
      return {
        skill: skillKey.skill,
        yearsInNumber: parseInt(skillKey.experience.split(' ')[0], 10)
      };
    }
    // if not found, return default
    const defaultSkill = skillsArray.find(skillObj => 'other' === skillObj?.skill?.toLowerCase?.());
    if (defaultSkill && defaultSkill?.experience) {
      return {
        skill: defaultSkill.skill,
        yearsInNumber: parseInt(defaultSkill.experience.split(' ')[0], 10)
      };
    }

    return null;
  }

  getNestedValue(path) {
    try {
      const obj = this.userData;
      // if path has . then we need to split it
      if (typeof path !== 'string' || !path.includes('.')) {
        return obj[path];
      }
      return path.split('.').reduce((current, prop) => current?.[prop], obj);
    } catch (error) {
      console.error('Error in getNestedValue:', error);
      return null;
    }
  }

  findQuestionMappingKey(questionText) {
    for (const key in questionsMapping) {
      if (
        questionsMapping[key].queryFields.some(q =>
          questionText.toLowerCase().includes(q.toLowerCase())
        )
      ) {
        // console.log("found key", key);
        return key;
      }
    }

    return null;
  }

  cleanedQuestions(questionsDomContainer) {
    const questions = [];
    questionsDomContainer.forEach(q => {
      if (!q) {
        return;
      }

      let labelDom = q.querySelector('label');

      let type = '';
      if (q.querySelector('input[type="text"], textarea')) {
        labelDom = q.querySelector('.artdeco-text-input--label') || labelDom;
        type = 'text';
      } else if (q.querySelector('select')) {
        labelDom = q.querySelector('label > span.visually-hidden') || labelDom;
        type = 'select';
      } else if (q.querySelector('input[type="radio"]')) {
        labelDom = q.querySelector('.fb-dash-form-element__label > span.visually-hidden');
        type = 'radio';
      }
      // else if (q.querySelector('input[type="checkbox"]')) {
      //   type = 'checkbox';
      // }
      //todo: need add for file upload, currently gives empty
      // need to add for date picker ,  dropdown multi select, country code, email
      const text = labelDom?.textContent?.trim() || '';
      const key = this.findQuestionMappingKey(text);
      const dataRef = key ? questionsMapping[key].dataRef : null;
      const fillData = dataRef ? this.getNestedValue(dataRef) : null;
      if (type) {
        questions.push({
          title: text,
          element: q,
          mappingKey: key,
          dataRef: key ? questionsMapping[key].dataRef : null,
          type,
          fillData
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
    if (this.actions.length < this.maxActions) {
      return 0;
    }

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
  static isLinkedIn() {
    return window.location.hostname?.includes?.('linkedin.com');
  }

  static isLinkedInJobsPage() {
    return this.isLinkedIn() && window.location.pathname.includes('/jobs/');
  }

  static isLinkedInJobDetailPage() {
    return this.isLinkedInJobsPage() && window.location.pathname.includes('/view/');
  }

  static isLinkedInSearchResultsPage() {
    return (
      this.isLinkedIn() &&
      (window.location.pathname.includes('/jobs/') ||
        window.location.pathname.includes('/jobs/search') ||
        window.location.pathname.includes('/jobs/collections/')) &&
      !window.location.pathname.includes('/view/')
    );
  }

  static isIndeedJobsPage() {
    return (
      window.location.hostname.includes('indeed.com') && window.location.pathname.includes('/jobs')
    );
  }

  static isIndeedJobDetailPage() {
    return (
      window.location.hostname.includes('indeed.com') &&
      window.location.pathname.includes('/viewjob')
    );
  }

  static isIndeedSearchResultsPage() {
    return this.isIndeedJobsPage() && !this.isIndeedJobDetailPage();
  }

  static isNaukriJobsPage() {
    return (
      window.location.hostname.includes('naukri.com') &&
      (window.location.pathname.includes('/jobs') || window.location.pathname.includes('/search'))
    );
  }

  static isNaukriJobDetailPage() {
    return (
      window.location.hostname.includes('naukri.com') &&
      window.location.pathname.includes('/job-detail')
    );
  }

  static isNaukriSearchResultsPage() {
    return this.isNaukriJobsPage() && !this.isNaukriJobDetailPage();
  }

  static getCurrentPlatform() {
    const { hostname } = window.location;
    if (hostname.includes('linkedin.com')) {
      return 'linkedin';
    } else if (hostname.includes('indeed.com')) {
      return 'indeed';
    } else if (hostname.includes('naukri.com')) {
      return 'naukri';
    }
    return null;
  }

  static isSearchResultsPage() {
    return (
      this.isLinkedInSearchResultsPage() ||
      this.isIndeedSearchResultsPage() ||
      this.isNaukriSearchResultsPage()
    );
  }

  static isJobDetailPage() {
    return (
      this.isLinkedInJobDetailPage() || this.isIndeedJobDetailPage() || this.isNaukriJobDetailPage()
    );
  }

  static isSupportedPlatform() {
    return this.getCurrentPlatform() !== null;
  }

  static getJobIdFromURL() {
    const platform = this.getCurrentPlatform();
    try {
      if (platform === 'linkedin') {
        const match = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
        return match ? match[1] : null;
      } else if (platform === 'indeed') {
        const params = new URLSearchParams(window.location.search);
        return params.get('jk');
      } else if (platform === 'naukri') {
        const match = window.location.pathname.match(/job-detail-([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
      }
    } catch (error) {
      console.error('Error extracting job ID from URL:', error);
    }

    return null;
  }

  static constructJobURL(jobId, platform = null) {
    const currentPlatform = platform || this.getCurrentPlatform();

    if (currentPlatform === 'linkedin') {
      return `https://www.linkedin.com/jobs/view/${jobId}`;
    } else if (currentPlatform === 'indeed') {
      return `https://www.indeed.com/viewjob?jk=${jobId}`;
    } else if (currentPlatform === 'naukri') {
      return `https://www.naukri.com/job-detail-${jobId}`;
    }

    throw new Error(`Unsupported platform: ${currentPlatform}`);
  }

  static getPlatformBaseURL(platform = null) {
    const currentPlatform = platform || this.getCurrentPlatform();

    if (currentPlatform === 'linkedin') {
      return 'https://www.linkedin.com';
    } else if (currentPlatform === 'indeed') {
      return 'https://www.indeed.com';
    } else if (currentPlatform === 'naukri') {
      return 'https://www.naukri.com';
    }

    throw new Error(`Unsupported platform: ${currentPlatform}`);
  }

  static getJobSearchURL(platform = null) {
    const currentPlatform = platform || this.getCurrentPlatform();

    if (currentPlatform === 'linkedin') {
      return 'https://www.linkedin.com/jobs/search/';
    } else if (currentPlatform === 'indeed') {
      return 'https://www.indeed.com/jobs';
    } else if (currentPlatform === 'naukri') {
      return 'https://www.naukri.com/jobs-search';
    }

    throw new Error(`Unsupported platform: ${currentPlatform}`);
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
  Logger
};
