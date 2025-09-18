// Application constants
export const MESSAGE_TYPES = {
  // Application Control
  START_APPLICATION: 'start_application',
  STOP_APPLICATION: 'stop_application',
  PAUSE_APPLICATION: 'pause_application',
  RESUME_APPLICATION: 'resume_application',
  CHECK_RATE_LIMIT: 'check_rate_limit',

  // Job Processing
  JOB_APPLIED: 'job_applied',
  APPLICATION_FAILED: 'application_failed',
  JOB_SKIPPED: 'job_skipped',
  JOBS_DETECTED: 'jobs_detected',

  // Data Operations
  GET_USER_PROFILE: 'get_user_profile',
  SAVE_USER_PROFILE: 'save_user_profile',
  // Data Operations
  GET_SETTINGS: 'get_settings',
  GET_STATS: 'get_stats'
};

export const APPLICATION_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  PENDING: 'pending'
};

export const STORAGE_KEYS = {
  USER_PROFILE: 'hirehack_user_profile',
  APPLICATION_HISTORY: 'hirehack_application_history',
  SETTINGS: 'hirehack_settings',
  STATS: 'hirehack_stats',
  SESSION: 'hirehack_session'
};

export const DEFAULT_SETTINGS = {
  dailyLimit: 3,
  enabledPlatforms: ['linkedin'],
  autoStart: false
};

export const LINKEDIN_SELECTORS = {
  jobListings: '.job-search-card',
  // easyApplyButton: '#jobs-apply-button-id',
  easyApplyButton: '[data-view-name="job-apply-button"]',
  jobTitle: '.job-details-jobs-unified-top-card__job-title',
  companyName: '.job-details-jobs-unified-top-card__company-name',
  jobLocation: '.job-details-jobs-unified-top-card__tertiary-description-container > span > span',
  salary: '.job-search-card__salary-info',
  applyModal: '.jobs-easy-apply-modal',
  nextButton:
    '.artdeco-button--primary[aria-label*="Continue"], .artdeco-button--primary[aria-label*="Review"], .artdeco-button--primary[aria-label*="Submit"]',
  submitButton: '.artdeco-button--primary[aria-label*="Submit"]',
  formFields: 'input, textarea, select',
  jobDescription: '#job-details > div',
  appliedIndicator: '.jobs-unified-top-card__job-status'
};
