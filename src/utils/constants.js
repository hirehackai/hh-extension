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
  GET_STATS: 'get_stats',

  START_AUTO_APPLY: 'start_auto_apply',
  STOP_AUTO_APPLY: 'stop_auto_apply',
  APPLICATION_COMPLETED: 'application_completed',
  PAUSE_AUTO_APPLY: 'pause_auto_apply',
  RESUME_AUTO_APPLY: 'resume_auto_apply',
  GET_JOB_DATA: 'get_job_data',
  CHECK_EASY_APPLY: 'check_easy_apply',
  GET_APPLICATION_HISTORY: 'get_application_history'
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
  dailyLimit: 30,
  enabledPlatforms: ['linkedin', 'indeed', 'naukri'],
  autoStart: false,
  batchSize: 10,
  delayBetweenApplications: 3000,
  skipAppliedJobs: true,
  skipNonEasyApply: true
};

export const LINKEDIN_SELECTORS = {
  // Job Detail Page Selectors
  jobListings: '.job-search-card',
  easyApplyButton: '.jobs-apply-button',
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
  appliedIndicator: '.jobs-unified-top-card__job-status',

  // Search Results Page Selectors
  searchResultsList: '.jobs-search-results__list, .scaffold-layout__list-item',
  searchResultsContainer: '.jobs-search-results-list',
  jobCard: '.job-card-container, .jobs-search-results__list-item',
  jobCardTitle: '.job-card-list__title--link, .job-card-container__link',
  jobCardCompany: '.job-card-container__primary-description, .artdeco-entity-lockup__subtitle',
  jobCardLocation: '.job-card-container__metadata-item, .job-card-container__metadata-wrapper li',
  jobCardEasyApply: '.job-card-container__footer-item',
  jobCardApplied: '.job-card-container__footer-item',
  jobCardPromoted: '.job-card-container__footer-item',

  // Navigation & Pagination
  nextPageButton: '.artdeco-pagination__button--next',
  loadMoreButton: '[data-infinite-scroller-init]',

  // Application Modal Selectors
  modalCloseButton: '[data-test-modal-close-btn], [aria-label*="Dismiss"]',
  modalNextButton: '[data-easy-apply-next-button]',
  modalReviewButton: 'button[aria-label="Review your application"]',
  modalSubmitButton: '[data-live-test-easy-apply-submit-button]',
  modalSuccess: '[aria-labelledby="post-apply-modal"]'
};

export const INDEED_SELECTORS = {
  // Search Results Page
  searchResultsList: '[data-jk]',
  jobCard: '[data-jk]',
  jobCardTitle: 'h2 a[data-jk], .jobTitle a',
  jobCardCompany: '.companyName',
  jobCardLocation: '.companyLocation',
  jobCardEasyApply: '.indeedApplyButton, .ia-IndeedApplyButton',
  jobCardApplied: '.appliedToJob, .ia-applied',

  // Job Detail Page
  jobTitle: '.jobsearch-JobInfoHeader-title',
  companyName: '.jobsearch-InlineCompanyRating-companyName',
  jobLocation: '.jobsearch-JobInfoHeader-subtitle div',
  applyButton: '.indeedApplyButton, .ia-IndeedApplyButton',
  jobDescription: '#jobDescriptionText',

  // Application Flow
  applyModal: '.ia-Modal-content',
  nextButton: '.ia-continueButton',
  submitButton: '.ia-applyButton',
  formFields: 'input, textarea, select'
};

export const NAUKRI_SELECTORS = {
  // Search Results Page
  searchResultsList: '.jobTuple',
  jobCard: '.jobTuple',
  jobCardTitle: '.title a, .jobTuple-title a',
  jobCardCompany: '.subTitle, .companyInfo',
  jobCardLocation: '.locationsContainer, .jobTuple-location',
  jobCardApplyButton: '.apply, .applyButton',
  jobCardApplied: '.applied',

  // Job Detail Page
  jobTitle: '.jd-header-title',
  companyName: '.jd-header-comp-name',
  jobLocation: '.jd-header-comp-loc',
  applyButton: '.apply-button, .primaryBtn',
  jobDescription: '.dang-inner-html',

  // Application Flow
  applyModal: '.modal-content',
  submitButton: '.btn-primary',
  formFields: 'input, textarea, select'
};

export const PLATFORM_CONFIGS = {
  linkedin: {
    name: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com',
    jobSearchUrl: 'https://www.linkedin.com/jobs/search/',
    selectors: LINKEDIN_SELECTORS,
    features: {
      easyApply: true,
      bulkApply: true,
      searchResults: true
    }
  },
  indeed: {
    name: 'Indeed',
    baseUrl: 'https://www.indeed.com',
    jobSearchUrl: 'https://www.indeed.com/jobs',
    selectors: INDEED_SELECTORS,
    features: {
      easyApply: true,
      bulkApply: true,
      searchResults: true
    }
  },
  naukri: {
    name: 'Naukri',
    baseUrl: 'https://www.naukri.com',
    jobSearchUrl: 'https://www.naukri.com/jobs-search',
    selectors: NAUKRI_SELECTORS,
    features: {
      easyApply: true,
      bulkApply: true,
      searchResults: true
    }
  }
};
