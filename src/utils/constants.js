// Application constants
export const MESSAGE_TYPES = {
  // Application Control
  START_APPLICATION: 'start_application',
  STOP_APPLICATION: 'stop_application',
  PAUSE_APPLICATION: 'pause_application',
  RESUME_APPLICATION: 'resume_application',
  
  // Job Processing
  JOB_APPLIED: 'job_applied',
  APPLICATION_FAILED: 'application_failed',
  JOB_SKIPPED: 'job_skipped',
  JOBS_DETECTED: 'jobs_detected',
  
  // Status Updates
  UPDATE_STATUS: 'update_status',
  UPDATE_PROGRESS: 'update_progress',
  
  // Data Operations
  GET_USER_PROFILE: 'get_user_profile',
  SAVE_APPLICATION_DATA: 'save_application_data',
  GET_SETTINGS: 'get_settings',
  GET_STATS: 'get_stats',
  
  // Platform Events
  PLATFORM_DETECTED: 'platform_detected',
  PLATFORM_CHANGED: 'platform_changed'
};

export const POPUP_MESSAGES = {
  GET_STATUS: 'get_status',
  GET_STATS: 'get_stats',
  GET_CURRENT_SESSION: 'get_current_session',
  TOGGLE_AUTO_APPLY: 'toggle_auto_apply',
  PAUSE_RESUME: 'pause_resume',
  STOP_APPLICATION: 'stop_application',
  UPDATE_SETTINGS: 'update_settings',
  EXPORT_DATA: 'export_data'
};

export const APPLICATION_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  PENDING: 'pending'
};

export const EXTENSION_STATES = {
  INACTIVE: 'inactive',
  STARTING: 'starting',
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPING: 'stopping',
  ERROR: 'error'
};

export const PLATFORM_TYPES = {
  LINKEDIN: 'linkedin',
  INDEED: 'indeed',
  GLASSDOOR: 'glassdoor'
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
  autoStart: false,
  notifications: true,
  rateLimiting: {
    minDelay: 30000, // 30 seconds
    maxDelay: 120000, // 2 minutes
    enabled: true
  }
};

export const LINKEDIN_SELECTORS = {
  jobListings: '.job-search-card',
  easyApplyButton: '.jobs-apply-button--top-card, .jobs-apply-button',
  jobTitle: '.job-search-card__title, .job-title',
  company: '.job-search-card__subtitle-link, .job-search-card__subtitle',
  location: '.job-search-card__location, .job-search-card__location-text',
  salary: '.job-search-card__salary-info',
  applyModal: '.jobs-easy-apply-modal',
  nextButton: '.artdeco-button--primary[aria-label*="Continue"], .artdeco-button--primary[aria-label*="Review"], .artdeco-button--primary[aria-label*="Submit"]',
  submitButton: '.artdeco-button--primary[aria-label*="Submit"]',
  formFields: 'input, textarea, select'
};
