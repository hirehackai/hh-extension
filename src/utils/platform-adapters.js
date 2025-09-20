// Platform-specific adapters for different job sites
import { DOMHelper, Logger, LinkedInFormFiller } from './helpers.js';
import { PLATFORM_CONFIGS } from './constants.js';

const userDataObj = {
  jobs_applied: 162,
  applications_left: 500,
  personal_Info: {
    email: 'agasthayanoone@gmail.com',
    phone: '998877664455',
    github: '',
    resume: {},
    address: 'Austin Texas',
    lastName: 'noone',
    linkedin: '',
    firstName: 'agasthaya',
    otherLink: '',
    portfolio: '',
    dateOfBirth: '2003-05-03'
  },
  work_experience: [
    {
      endDate: '2025-01-27T18:30:00.000Z',
      jobTitle: 'Intern',
      location: 'texas',
      startDate: '2025-03-05T18:30:00.000Z',
      companyName: 'utd',
      reasonForLeaving: '',
      responsibilities: ''
    }
  ],
  skills: [
    {
      skill: 'Java',
      experience: '3 years'
    },
    {
      skill: 'Spring Framework',
      experience: '3 years'
    },
    {
      skill: 'Hibernate',
      experience: '3 years'
    },
    {
      skill: 'JavaScript',
      experience: '4 years'
    },
    {
      skill: 'React.js',
      experience: '3 years'
    },
    {
      skill: 'Node.js',
      experience: '3 years'
    },
    {
      skill: 'default',
      experience: '3 years'
    },
    {
      skill: 'Other',
      experience: '1'
    }
  ],
  education: [],
  additional_info: {
    gpa: '2.4',
    commute: 'yes',
    clearance: 'yes',
    heardFrom: '',
    usCitizen: 'no',
    authorized: 'no',
    disability: 'no',
    joiningDate: '2000-01-24',
    sponsorship: 'yes',
    noticePeriod: '',
    currentSalary: {
      amount: '20000',
      currency: 'USD'
    },
    highestDegree: 'associate',
    hybridSetting: 'yes',
    onsiteSetting: 'yes',
    raceEthnicity: 'asian',
    veteranStatus: 'no',
    driversLicense: 'yes',
    expectedSalary: {
      amount: '2000',
      currency: 'USD'
    },
    backgroundCheck: 'yes',
    startImmediately: 'yes',
    excludedCompanies: [],
    englishProficiency: 'basic',
    authorizedCountries: [],
    workExperienceYears: '5'
  },
  resume_link: null,
  id: 'f9438329-1243-4bf2-bacf-9b4070450b56',
  plan: 'FREE',
  referral_code: null,
  referred_by: '4afb8a38-ab46-4fed-a473-496249711d3e'
};

/**
 * Base PlatformAdapter class
 * All platform-specific adapters should extend this class
 */
export class PlatformAdapter {
  constructor(platform) {
    this.platform = platform;
    this.config = PLATFORM_CONFIGS[platform];
    this.selectors = this.config.selectors;
  }

  /**
   * Detect if current page is a search results page for this platform
   * @returns {boolean}
   */
  isSearchResultsPage() {
    throw new Error('isSearchResultsPage must be implemented by subclass');
  }

  /**
   * Detect if current page is a job detail page for this platform
   * @returns {boolean}
   */
  isJobDetailPage() {
    throw new Error('isJobDetailPage must be implemented by subclass');
  }

  /**
   * Extract all Easy Apply jobs from search results page
   * @returns {Array<JobData>}
   */
  extractJobsFromSearchResults() {
    throw new Error('extractJobsFromSearchResults must be implemented by subclass');
  }

  /**
   * Extract job data from a job detail page
   * @returns {JobData|null}
   */
  extractJobData() {
    throw new Error('extractJobData must be implemented by subclass');
  }

  /**
   * Check if a job has Easy Apply option
   * @param {Element} _jobCard - Job card element from search results
   * @returns {boolean}
   */
  hasEasyApply(_jobCard) {
    throw new Error('hasEasyApply must be implemented by subclass');
  }

  /**
   * Check if user has already applied to a job
   * @param {Element} _jobCard - Job card element from search results
   * @returns {boolean}
   */
  hasAlreadyApplied(_jobCard) {
    throw new Error('hasAlreadyApplied must be implemented by subclass');
  }

  /**
   * Apply to a job from search results page
   * @param {JobData} _jobData - Job information
   * @returns {Promise<boolean>} - Success status
   */
  async applyToJob(_jobData) {
    throw new Error('applyToJob must be implemented by subclass');
  }

  /**
   * Navigate to next page of search results
   * @returns {Promise<boolean>} - Whether navigation was successful
   */
  async navigateToNextPage() {
    const nextButton = DOMHelper.getVisibleElement(this.selectors.nextPageButton);
    if (nextButton && !nextButton.disabled) {
      DOMHelper.simulateClick(nextButton);
      await DOMHelper.wait(3000);
      return true;
    }
    return false;
  }

  /**
   * Load more jobs (for infinite scroll pages)
   * @returns {Promise<boolean>} - Whether more jobs were loaded
   */
  async loadMoreJobs() {
    const loadMoreButton = DOMHelper.getVisibleElement(this.selectors.loadMoreButton);
    if (loadMoreButton) {
      DOMHelper.simulateClick(loadMoreButton);
      await DOMHelper.wait(3000);
      return true;
    }
    return false;
  }

  /**
   * Scroll to load more jobs (infinite scroll)
   * @returns {Promise<boolean>}
   */
  async scrollForMoreJobs() {
    const beforeHeight = document.body.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
    await DOMHelper.wait(2000);
    const afterHeight = document.body.scrollHeight;
    return afterHeight > beforeHeight;
  }
}

/**
 * LinkedIn Platform Adapter
 */
export class LinkedInAdapter extends PlatformAdapter {
  constructor() {
    super('linkedin');
  }

  isSearchResultsPage() {
    return (
      window.location.hostname === 'www.linkedin.com' &&
      (window.location.pathname.includes('/jobs/') ||
        window.location.pathname.includes('/jobs/search') ||
        window.location.pathname.includes('/jobs/collections/')) &&
      !window.location.pathname.includes('/view/')
    );
  }

  isJobDetailPage() {
    return (
      window.location.hostname === 'www.linkedin.com' &&
      window.location.pathname.includes('/jobs/view/')
    );
  }

  extractJobsFromSearchResults() {
    const jobs = [];

    try {
      const jobCards = document.querySelectorAll(this.selectors.jobCard);
      Logger.info(`Found ${jobCards.length} job cards on page`);

      jobCards.forEach((card, index) => {
        try {
          // Basic card validation
          if (!card || !card.querySelector) {
            Logger.debug(`Skipping job ${index}: Invalid card element`);
            return;
          }

          // Skip if already applied
          if (this.hasAlreadyApplied(card)) {
            Logger.debug(`Skipping job ${index}: Already applied`);
            return;
          }

          // Skip if not Easy Apply
          if (!this.hasEasyApply(card)) {
            Logger.debug(`Skipping job ${index}: Not Easy Apply`);
            return;
          }

          const titleElement = card.querySelector(this.selectors.jobCardTitle);
          const companyElement = card.querySelector(this.selectors.jobCardCompany);
          const locationElement = card.querySelector(this.selectors.jobCardLocation);

          if (!titleElement) {
            Logger.debug(`Skipping job ${index}: No title found`);
            return;
          }

          const jobData = {
            title: titleElement.textContent?.trim() || 'Unknown Title',
            company: companyElement?.textContent?.trim() || 'Unknown Company',
            location: locationElement?.textContent?.trim() || 'Unknown Location',
            url: titleElement.href || window.location.href,
            platform: 'linkedin',
            jobCard: card,
            jobId: this.extractJobIdFromCard(card),
            extractedAt: new Date().toISOString()
          };

          jobs.push(jobData);
          Logger.debug(`Extracted job: ${jobData.title} at ${jobData.company}`);
        } catch (error) {
          Logger.error(`Error extracting job ${index}:`, error);
          // Continue processing other jobs instead of stopping
        }
      });
    } catch (error) {
      Logger.error('Error in extractJobsFromSearchResults:', error);
    }

    Logger.info(`Extracted ${jobs.length} Easy Apply jobs from search results`);
    return jobs;
  }

  extractJobData() {
    try {
      const jobTitle = document.querySelector(this.selectors.jobTitle)?.textContent?.trim();
      const company = document.querySelector(this.selectors.companyName)?.textContent?.trim();
      const location = document.querySelector(this.selectors.jobLocation)?.textContent?.trim();
      const description = document
        .querySelector(this.selectors.jobDescription)
        ?.textContent?.trim();

      return {
        title: jobTitle || 'Unknown Title',
        company: company || 'Unknown Company',
        location: location || 'Unknown Location',
        description: description || '',
        url: window.location.href,
        platform: 'linkedin',
        jobId: this.extractJobIdFromUrl(),
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('Error extracting LinkedIn job data:', error);
      return null;
    }
  }

  hasEasyApply(jobCard) {
    // Check for Easy Apply text in footer items
    const footerItems = jobCard.querySelectorAll('.job-card-container__footer-item, li');
    return Array.from(footerItems).some(item => {
      const text = item.textContent || '';
      return text.includes('Easy Apply');
    });
  }

  hasAlreadyApplied(jobCard) {
    // Check for "Applied" status in footer items
    const footerItems = jobCard.querySelectorAll('.job-card-container__footer-item');
    return Array.from(footerItems).some(item => {
      const text = item.textContent || '';
      return text.includes('Applied') || text.includes('Viewed');
    });
  }

  async applyToJob(jobData) {
    try {
      Logger.info(`Applying to: ${jobData.title} at ${jobData.company}`);

      // Click on job card to open job detail
      const titleLink = jobData.jobCard.querySelector(this.selectors.jobCardTitle);
      if (!titleLink) {
        throw new Error('Job title link not found');
      }

      DOMHelper.simulateClick(titleLink);
      await DOMHelper.wait(3000);

      // Wait for job detail page to load
      await DOMHelper.waitForElement(this.selectors.easyApplyButton, 10000);

      // Click Easy Apply button
      const easyApplyButton = DOMHelper.getVisibleElement(this.selectors.easyApplyButton);
      if (!easyApplyButton) {
        throw new Error('Easy Apply button not found on job detail page');
      }

      DOMHelper.simulateClick(easyApplyButton);
      await DOMHelper.wait(2000);

      // Handle application modal
      return await this.handleApplicationModal(jobData);
    } catch (error) {
      Logger.error(`Failed to apply to job: ${jobData.title}`, error);
      return false;
    }
  }

  async handleApplicationModal(jobData) {
    try {
      // Wait for modal to appear
      await DOMHelper.waitForElement(this.selectors.applyModal, 5000);
      const easyApplyModal = document.querySelector(this.selectors.applyModal);

      // Look for submit button (single step application)
      let submitButton = DOMHelper.getVisibleElement(this.selectors.modalSubmitButton);

      if (submitButton && !submitButton.disabled) {
        DOMHelper.simulateClick(submitButton);
        await DOMHelper.wait(2000);

        // Check for success
        const successHeader = document.querySelector(this.selectors.modalSuccessHeader);
        if (successHeader) {
          await this.closeApplicationModal();
          return true;
        }
      }

      // Handle multi-step application
      const maxSteps = 10;
      let currentStep = 0;

      while (currentStep < maxSteps) {
        currentStep++;

        await this.fillApplicationForm(easyApplyModal);
        await DOMHelper.wait(100);

        // Look for Next button
        const nextButton = DOMHelper.getVisibleElement(this.selectors.modalNextButton);
        if (nextButton && !nextButton.disabled) {
          DOMHelper.simulateClick(nextButton);
          await DOMHelper.wait(2000);
          continue;
        }

        const reviewButton = DOMHelper.getVisibleElement(this.selectors.modalReviewButton);
        if (reviewButton && !reviewButton.disabled) {
          DOMHelper.simulateClick(reviewButton);
          await DOMHelper.wait(2000);
          continue;
        }

        // Look for Submit button
        submitButton = DOMHelper.getVisibleElement(this.selectors.modalSubmitButton);
        if (submitButton && !submitButton.disabled) {
          const followCompanyCheckbox = easyApplyModal.querySelector('#follow-company-checkbox');
          if (followCompanyCheckbox && followCompanyCheckbox.checked) {
            followCompanyCheckbox.checked = false;
            followCompanyCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            await DOMHelper.wait(300);
          }

          DOMHelper.simulateClick(submitButton);
          await DOMHelper.wait(2000);

          // Check for success
          await DOMHelper.waitForElement(this.selectors.modalSuccess, 5000);

          const successModal = document.querySelector(this.selectors.modalSuccess);
          if (successModal) {
            await this.closeApplicationModal();
            return true;
          }
        }

        // If no buttons found, break
        if (!nextButton && !reviewButton && !submitButton) {
          break;
        }
      }

      // If we get here, application might need manual intervention
      // Logger.warn(`Application for ${jobData.title} may require manual input`);
      await this.closeApplicationModal();
      return false;
    } catch (error) {
      Logger.error(`Error in application modal for ${jobData.title}:`, error);
      await this.closeApplicationModal();
      return false;
    }
  }

  fetchQuestionContainers(easyApplyModal) {
    let questionContainers = [];

    questionContainers = easyApplyModal.querySelectorAll('.fb-dash-form-element');

    if (questionContainers?.length === 0) {
      questionContainers = easyApplyModal.querySelectorAll('[data-test-form-element]');
    }

    if (questionContainers?.length === 0) {
      questionContainers = easyApplyModal.querySelectorAll(
        '[data-live-test-single-line-text-form-component=""]'
      );
    }

    return questionContainers;
  }

  async fillApplicationForm(easyApplyModal) {
    const questionContainers = this.fetchQuestionContainers(easyApplyModal);
    if (questionContainers?.length > 0) {
      Logger.info(`Found ${questionContainers.length} custom question fields to fill`);
      // await fillCustomQuestions(questionContainers);

      const formFiller = new LinkedInFormFiller(questionContainers, userDataObj);
      formFiller.fillQuestions();
    } else {
      Logger.info('No custom question fields found to fill');
    }

    return true;
  }

  async closeApplicationModal() {
    try {
      const closeButton = DOMHelper.getVisibleElement(this.selectors.modalCloseButton);
      if (closeButton) {
        DOMHelper.simulateClick(closeButton);
        await DOMHelper.wait(300);

        const discardButton = Array.from(
          document.querySelectorAll('button[data-test-dialog-secondary-btn]')
        ).find(button => button.textContent.trim() === 'Discard');

        if (discardButton) {
          DOMHelper.simulateClick(discardButton);
          await DOMHelper.wait(100);
        }
      }
    } catch (error) {
      Logger.error('Error closing application modal:', error);
    }
  }

  extractJobIdFromCard(card) {
    const link = card.querySelector(this.selectors.jobCardTitle);
    if (link && link.href) {
      const match = link.href.match(/\/jobs\/view\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  }

  extractJobIdFromUrl() {
    const match = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
    return match ? match[1] : null;
  }
}

/**
 * Indeed Platform Adapter
 */
export class IndeedAdapter extends PlatformAdapter {
  constructor() {
    super('indeed');
  }

  isSearchResultsPage() {
    return (
      window.location.hostname.includes('indeed.com') &&
      window.location.pathname.includes('/jobs') &&
      !window.location.pathname.includes('/viewjob')
    );
  }

  isJobDetailPage() {
    return (
      window.location.hostname.includes('indeed.com') &&
      window.location.pathname.includes('/viewjob')
    );
  }

  extractJobsFromSearchResults() {
    const jobs = [];
    const jobCards = document.querySelectorAll(this.selectors.jobCard);

    jobCards.forEach((card, index) => {
      try {
        if (this.hasAlreadyApplied(card)) {
          return;
        }
        if (!this.hasEasyApply(card)) {
          return;
        }

        const titleElement = card.querySelector(this.selectors.jobCardTitle);
        const companyElement = card.querySelector(this.selectors.jobCardCompany);
        const locationElement = card.querySelector(this.selectors.jobCardLocation);

        if (!titleElement) {
          return;
        }

        const jobData = {
          title: titleElement.textContent?.trim() || 'Unknown Title',
          company: companyElement?.textContent?.trim() || 'Unknown Company',
          location: locationElement?.textContent?.trim() || 'Unknown Location',
          url: titleElement.href || window.location.href,
          platform: 'indeed',
          jobCard: card,
          jobId: card.getAttribute('data-jk'),
          extractedAt: new Date().toISOString()
        };

        jobs.push(jobData);
      } catch (error) {
        Logger.error(`Error extracting Indeed job ${index}:`, error);
      }
    });

    return jobs;
  }

  extractJobData() {
    try {
      const jobTitle = document.querySelector(this.selectors.jobTitle)?.textContent?.trim();
      const company = document.querySelector(this.selectors.companyName)?.textContent?.trim();
      const location = document.querySelector(this.selectors.jobLocation)?.textContent?.trim();
      const description = document
        .querySelector(this.selectors.jobDescription)
        ?.textContent?.trim();

      return {
        title: jobTitle || 'Unknown Title',
        company: company || 'Unknown Company',
        location: location || 'Unknown Location',
        description: description || '',
        url: window.location.href,
        platform: 'indeed',
        jobId: this.extractJobIdFromUrl(),
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('Error extracting Indeed job data:', error);
      return null;
    }
  }

  hasEasyApply(jobCard) {
    const applyButton = jobCard.querySelector(this.selectors.jobCardEasyApply);
    return !!applyButton;
  }

  hasAlreadyApplied(jobCard) {
    const appliedIndicator = jobCard.querySelector(this.selectors.jobCardApplied);
    return !!appliedIndicator;
  }

  async applyToJob(jobData) {
    try {
      Logger.info(`Applying to Indeed job: ${jobData.title} at ${jobData.company}`);

      const applyButton = jobData.jobCard.querySelector(this.selectors.jobCardEasyApply);
      if (!applyButton) {
        throw new Error('Apply button not found');
      }

      DOMHelper.simulateClick(applyButton);
      await DOMHelper.wait(3000);

      // Handle Indeed application modal/redirect
      return await this.handleIndeedApplication(jobData);
    } catch (error) {
      Logger.error(`Failed to apply to Indeed job: ${jobData.title}`, error);
      return false;
    }
  }

  async handleIndeedApplication(jobData) {
    // Indeed application handling would be implemented here
    // This is a simplified version
    Logger.info(`Indeed application handling for ${jobData.title}`);
    return true;
  }

  extractJobIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('jk');
  }
}

/**
 * Naukri Platform Adapter
 */
export class NaukriAdapter extends PlatformAdapter {
  constructor() {
    super('naukri');
  }

  isSearchResultsPage() {
    return (
      window.location.hostname.includes('naukri.com') &&
      (window.location.pathname.includes('/jobs') || window.location.pathname.includes('/search'))
    );
  }

  isJobDetailPage() {
    return (
      window.location.hostname.includes('naukri.com') &&
      window.location.pathname.includes('/job-detail')
    );
  }

  extractJobsFromSearchResults() {
    const jobs = [];
    const jobCards = document.querySelectorAll(this.selectors.searchResultsList);

    jobCards.forEach((card, index) => {
      try {
        if (this.hasAlreadyApplied(card)) {
          return;
        }

        const titleElement = card.querySelector(this.selectors.jobCardTitle);
        const companyElement = card.querySelector(this.selectors.jobCardCompany);
        const locationElement = card.querySelector(this.selectors.jobCardLocation);

        if (!titleElement) {
          return;
        }

        const jobData = {
          title: titleElement.textContent?.trim() || 'Unknown Title',
          company: companyElement?.textContent?.trim() || 'Unknown Company',
          location: locationElement?.textContent?.trim() || 'Unknown Location',
          url: titleElement.href || window.location.href,
          platform: 'naukri',
          jobCard: card,
          jobId: this.extractJobIdFromCard(card),
          extractedAt: new Date().toISOString()
        };

        jobs.push(jobData);
      } catch (error) {
        Logger.error(`Error extracting Naukri job ${index}:`, error);
      }
    });

    return jobs;
  }

  extractJobData() {
    try {
      const jobTitle = document.querySelector(this.selectors.jobTitle)?.textContent?.trim();
      const company = document.querySelector(this.selectors.companyName)?.textContent?.trim();
      const location = document.querySelector(this.selectors.jobLocation)?.textContent?.trim();
      const description = document
        .querySelector(this.selectors.jobDescription)
        ?.textContent?.trim();

      return {
        title: jobTitle || 'Unknown Title',
        company: company || 'Unknown Company',
        location: location || 'Unknown Location',
        description: description || '',
        url: window.location.href,
        platform: 'naukri',
        jobId: this.extractJobIdFromUrl(),
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('Error extracting Naukri job data:', error);
      return null;
    }
  }

  hasEasyApply(jobCard) {
    const applyButton = jobCard.querySelector(this.selectors.jobCardApplyButton);
    return !!applyButton;
  }

  hasAlreadyApplied(jobCard) {
    const appliedIndicator = jobCard.querySelector(this.selectors.jobCardApplied);
    return !!appliedIndicator;
  }

  async applyToJob(jobData) {
    try {
      Logger.info(`Applying to Naukri job: ${jobData.title} at ${jobData.company}`);

      const applyButton = jobData.jobCard.querySelector(this.selectors.jobCardApplyButton);
      if (!applyButton) {
        throw new Error('Apply button not found');
      }

      DOMHelper.simulateClick(applyButton);
      await DOMHelper.wait(3000);

      // Handle Naukri application flow
      return await this.handleNaukriApplication(jobData);
    } catch (error) {
      Logger.error(`Failed to apply to Naukri job: ${jobData.title}`, error);
      return false;
    }
  }

  async handleNaukriApplication(jobData) {
    // Naukri application handling would be implemented here
    Logger.info(`Naukri application handling for ${jobData.title}`);
    return true;
  }

  extractJobIdFromCard(card) {
    // Extract job ID from Naukri job card
    const link = card.querySelector(this.selectors.jobCardTitle);
    if (link && link.href) {
      const match = link.href.match(/job-detail-([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }
    return null;
  }

  extractJobIdFromUrl() {
    const match = window.location.pathname.match(/job-detail-([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Platform Adapter Factory
 * Creates the appropriate adapter based on current domain
 */
export class PlatformAdapterFactory {
  static createAdapter(url = window.location.href) {
    if (url.includes('linkedin.com')) {
      return new LinkedInAdapter();
    } else if (url.includes('indeed.com')) {
      return new IndeedAdapter();
    } else if (url.includes('naukri.com')) {
      return new NaukriAdapter();
    }

    throw new Error(`Unsupported platform: ${url}`);
  }

  static getSupportedPlatforms() {
    return ['linkedin', 'indeed', 'naukri'];
  }

  static isPlatformSupported(url = window.location.href) {
    try {
      this.createAdapter(url);
      return true;
    } catch {
      return false;
    }
  }
}
