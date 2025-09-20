// Job Queue Management System for Bulk Job Applications
import { Logger, MessageHandler } from './helpers.js';
import { PlatformAdapterFactory } from './platform-adapters.js';
import { MESSAGE_TYPES, APPLICATION_STATUS, DEFAULT_SETTINGS } from './constants.js';

/**
 * JobQueue Class
 * Manages discovery, queuing, and sequential processing of job applications
 */
export class JobQueue {
  constructor(settings = {}) {
    this.platformAdapter = null;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };

    this.stats = {
      discovered: 0,
      queued: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    };

    this.queue = [];
    this.processedJobs = [];
    this.currentJob = null;
    this.isProcessing = false;
    this.isPaused = false;

    this.onProgressCallback = null;
    this.onJobProcessedCallback = null;
    this.onCompleteCallback = null;
  }

  /**
   * Initialize the job queue with current platform adapter
   */
  async init() {
    try {
      this.platformAdapter = PlatformAdapterFactory.createAdapter();
      Logger.info(`Job queue initialized for platform: ${this.platformAdapter.platform}`);
      return true;
    } catch (error) {
      Logger.error('Failed to initialize job queue:', error);
      return false;
    }
  }

  /**
   * Discover Easy Apply jobs from current search results page
   * @returns {Promise<number>} Number of jobs discovered
   */
  async discoverJobs() {
    if (!this.platformAdapter) {
      throw new Error('Platform adapter not initialized');
    }

    if (!this.platformAdapter.isSearchResultsPage()) {
      throw new Error('Not on a search results page');
    }

    try {
      Logger.info('Discovering Easy Apply jobs from search results...');

      // Clear previous stats
      this.stats.discovered = 0;
      this.stats.queued = 0;

      const jobs = this.platformAdapter.extractJobsFromSearchResults();
      Logger.info(`Found ${jobs.length} jobs in search results`, jobs);

      if (!Array.isArray(jobs)) {
        Logger.warn('extractJobsFromSearchResults returned non-array result');
        return 0;
      }

      this.stats.discovered = jobs.length;

      // Filter jobs based on settings
      const filteredJobs = this.filterJobs(jobs);
      console.log('Filtered Jobs:', filteredJobs);
      this.stats.queued = filteredJobs.length;

      // Clear existing queue and add new jobs
      this.queue = [];
      this.queue.push(...filteredJobs);

      Logger.info(`Discovered ${jobs.length} jobs, queued ${filteredJobs.length} for processing`);

      // Notify progress
      if (this.onProgressCallback) {
        this.onProgressCallback({
          type: 'discovery',
          discovered: this.stats.discovered,
          queued: this.stats.queued
        });
      }

      return filteredJobs.length;
    } catch (error) {
      Logger.error('Error discovering jobs:', error);
      // Reset stats on error
      this.stats.discovered = 0;
      this.stats.queued = 0;
      throw error;
    }
  }

  /**
   * Filter jobs based on user settings and preferences
   * @param {Array<JobData>} jobs - Array of job data
   * @returns {Array<JobData>} Filtered jobs
   */
  filterJobs(jobs) {
    return jobs.filter(job => {
      // Skip if already applied (if setting enabled)
      if (this.settings.skipAppliedJobs && this.isJobAlreadyProcessed(job)) {
        Logger.debug(`Skipping ${job.title}: Already processed`);
        return false;
      }

      // Skip if not Easy Apply (if setting enabled)
      if (this.settings.skipNonEasyApply && !this.platformAdapter.hasEasyApply(job.jobCard)) {
        Logger.debug(`Skipping ${job.title}: Not Easy Apply`);
        return false;
      }

      // Additional filtering logic can be added here
      // e.g., job title keywords, company blacklist, location filters, etc.

      return true;
    });
  }

  /**
   * Check if a job has already been processed
   * @param {JobData} job - Job data
   * @returns {boolean}
   */
  isJobAlreadyProcessed(job) {
    return this.processedJobs.some(
      processedJob =>
        processedJob.jobId === job.jobId ||
        (processedJob.title === job.title && processedJob.company === job.company)
    );
  }

  /**
   * Start processing the job queue
   * @returns {Promise<void>}
   */
  async startProcessing() {
    if (this.isProcessing) {
      throw new Error('Job processing already in progress');
    }

    if (this.queue.length === 0) {
      throw new Error('No jobs in queue to process');
    }

    this.isProcessing = true;
    this.isPaused = false;

    Logger.info(`Starting job processing. Queue size: ${this.queue.length}`);

    try {
      while (this.queue.length > 0 && this.isProcessing && !this.isPaused) {
        const job = this.queue.shift();
        await this.processJob(job);

        // Delay between applications to avoid being too aggressive
        if (this.queue.length > 0) {
          await this.delay(this.settings.delayBetweenApplications);
        }

        // Check daily limit
        if (this.stats.successful >= this.settings.dailyLimit) {
          Logger.info(`Daily limit of ${this.settings.dailyLimit} applications reached`);
          break;
        }
      }

      if (this.queue.length === 0) {
        Logger.info('All jobs processed');
        if (this.onCompleteCallback) {
          this.onCompleteCallback(this.stats);
        }
      }
    } catch (error) {
      Logger.error('Error during job processing:', error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.currentJob = null;
    }
  }

  /**
   * Process a single job application
   * @param {JobData} job - Job to process
   * @returns {Promise<boolean>}
   */
  async processJob(job) {
    this.currentJob = job;
    this.stats.processed++;

    Logger.info(
      `Processing job ${this.stats.processed}/${this.stats.processed + this.queue.length}: ${
        job.title
      } at ${job.company}`
    );

    try {
      // Check rate limiting
      const rateLimitCheck = await MessageHandler.sendMessage(MESSAGE_TYPES.CHECK_RATE_LIMIT);
      if (rateLimitCheck.data && !rateLimitCheck.data.canApply) {
        Logger.warn('Rate limit reached, stopping processing');
        this.pauseProcessing();
        return false;
      }

      // Apply to job using platform adapter
      const success = await this.platformAdapter.applyToJob(job);

      if (success) {
        this.stats.successful++;
        job.status = APPLICATION_STATUS.SUCCESS;
        Logger.info(`Successfully applied to: ${job.title}`);
      } else {
        this.stats.failed++;
        job.status = APPLICATION_STATUS.FAILED;
        Logger.warn(`Failed to apply to: ${job.title}`);
      }

      // Record the application attempt
      await this.recordJobApplication(job);

      // Add to processed jobs
      this.processedJobs.push(job);

      // Notify progress
      if (this.onJobProcessedCallback) {
        this.onJobProcessedCallback({
          job,
          success,
          stats: { ...this.stats }
        });
      }

      // Notify progress
      if (this.onProgressCallback) {
        this.onProgressCallback({
          type: 'processing',
          current: this.stats.processed,
          total: this.stats.processed + this.queue.length,
          successful: this.stats.successful,
          failed: this.stats.failed,
          stats: { ...this.stats }
        });
      }

      return success;
    } catch (error) {
      this.stats.failed++;
      job.status = APPLICATION_STATUS.FAILED;
      job.error = error.message;

      Logger.error(`Error processing job ${job.title}:`, error);

      await this.recordJobApplication(job);
      this.processedJobs.push(job);

      if (this.onJobProcessedCallback) {
        this.onJobProcessedCallback({
          job,
          success: false,
          error: error.message,
          stats: { ...this.stats }
        });
      }

      return false;
    }
  }

  /**
   * Record job application in background script
   * @param {JobData} job - Job data with application result
   */
  async recordJobApplication(job) {
    try {
      await MessageHandler.sendMessage(MESSAGE_TYPES.APPLICATION_COMPLETED, {
        jobData: job,
        status: job.status,
        error: job.error
      });
    } catch (error) {
      Logger.error('Failed to record job application:', error);
    }
  }

  /**
   * Pause job processing
   */
  pauseProcessing() {
    this.isPaused = true;
    Logger.info('Job processing paused');
  }

  /**
   * Resume job processing
   */
  async resumeProcessing() {
    if (!this.isProcessing) {
      throw new Error('Job processing is not active');
    }

    this.isPaused = false;
    Logger.info('Job processing resumed');

    // Continue processing
    try {
      while (this.queue.length > 0 && this.isProcessing && !this.isPaused) {
        const job = this.queue.shift();
        await this.processJob(job);

        if (this.queue.length > 0) {
          await this.delay(this.settings.delayBetweenApplications);
        }

        if (this.stats.successful >= this.settings.dailyLimit) {
          Logger.info(`Daily limit of ${this.settings.dailyLimit} applications reached`);
          break;
        }
      }

      if (this.queue.length === 0) {
        Logger.info('All jobs processed');
        if (this.onCompleteCallback) {
          this.onCompleteCallback(this.stats);
        }
      }
    } catch (error) {
      Logger.error('Error during job processing resume:', error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.currentJob = null;
    }
  }

  /**
   * Stop job processing
   */
  stopProcessing() {
    this.isProcessing = false;
    this.isPaused = false;
    this.currentJob = null;
    Logger.info('Job processing stopped');
  }

  /**
   * Clear the job queue
   */
  clearQueue() {
    this.queue = [];
    this.stats.queued = 0;
    Logger.info('Job queue cleared');
  }

  /**
   * Get current queue status
   * @returns {Object}
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      queueSize: this.queue.length,
      processedSize: this.processedJobs.length,
      currentJob: this.currentJob,
      stats: { ...this.stats },
      platform: this.platformAdapter?.platform
    };
  }

  /**
   * Get jobs remaining in queue
   * @returns {Array<JobData>}
   */
  getQueuedJobs() {
    return [...this.queue];
  }

  /**
   * Get processed jobs
   * @returns {Array<JobData>}
   */
  getProcessedJobs() {
    return [...this.processedJobs];
  }

  /**
   * Add event listeners
   */
  onProgress(callback) {
    this.onProgressCallback = callback;
  }

  onJobProcessed(callback) {
    this.onJobProcessedCallback = callback;
  }

  onComplete(callback) {
    this.onCompleteCallback = callback;
  }

  /**
   * Load more jobs from search results (pagination/infinite scroll)
   * @returns {Promise<number>} Number of new jobs discovered
   */
  async loadMoreJobs() {
    if (!this.platformAdapter) {
      throw new Error('Platform adapter not initialized');
    }

    let newJobsCount = 0;

    try {
      // Try pagination first
      const hasNextPage = await this.platformAdapter.navigateToNextPage();
      if (hasNextPage) {
        // Wait for new page to load
        await this.delay(3000);
        const newJobs = await this.discoverJobs();
        newJobsCount += newJobs;
      } else {
        // Try infinite scroll
        const loadedMore = await this.platformAdapter.scrollForMoreJobs();
        if (loadedMore) {
          await this.delay(2000);
          const newJobs = await this.discoverJobs();
          newJobsCount += newJobs;
        }
      }

      Logger.info(`Loaded ${newJobsCount} additional jobs`);
      return newJobsCount;
    } catch (error) {
      Logger.error('Error loading more jobs:', error);
      return 0;
    }
  }

  /**
   * Auto-discovery mode: continuously discover and process jobs
   * @param {Object} options - Auto-discovery options
   * @returns {Promise<void>}
   */
  async startAutoDiscovery(options = {}) {
    const { maxPages = 10, maxJobs = 100, autoLoadMore = true } = options;

    try {
      // Initial discovery
      await this.discoverJobs();

      let pagesProcessed = 1;

      // Auto-load more jobs while processing
      const autoLoadInterval = setInterval(async () => {
        if (
          !this.isProcessing ||
          this.isPaused ||
          pagesProcessed >= maxPages ||
          this.stats.processed >= maxJobs
        ) {
          clearInterval(autoLoadInterval);
          return;
        }

        if (this.queue.length < 5 && autoLoadMore) {
          try {
            const newJobs = await this.loadMoreJobs();
            if (newJobs > 0) {
              pagesProcessed++;
            }
          } catch (error) {
            Logger.error('Error in auto-load:', error);
          }
        }
      }, 10000); // Check every 10 seconds

      // Start processing
      await this.startProcessing();

      clearInterval(autoLoadInterval);
      Logger.info(
        `Auto-discovery completed. Pages: ${pagesProcessed}, Jobs processed: ${this.stats.processed}`
      );
    } catch (error) {
      Logger.error('Error in auto-discovery mode:', error);
      throw error;
    }
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default JobQueue;
