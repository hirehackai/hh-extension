# HireHack - Technical Architecture Document

## Document Information

- **Document Version**: 2.0
- **Created Date**: September 7, 2025
- **Updated Date**: September 19, 2025
- **Product Name**: HireHack
- **Document Type**: Technical Architecture Specification

## Recent Changes (v2.0)

- **Popup Removal**: Eliminated separate popup interface in favor of embedded
  content script UI
- **Simplified Architecture**: Streamlined to two main components (Background +
  Content Script)
- **Code Cleanup**: Removed unused functions, constants, and profile management
  features
- **Enhanced Content UI**: Added real-time stats display, progress bars, and
  embedded controls directly on LinkedIn pages
- **Storage Simplification**: Removed user profile storage, focused on settings
  and application history
- **Manifest Updates**: Updated to simplified Manifest V3 structure without
  popup action

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Component Architecture](#2-component-architecture)
3. [Data Architecture](#3-data-architecture)
4. [Code Organization](#4-code-organization)
5. [Internal API Design](#5-internal-api-design)
6. [User Interface Architecture](#6-user-interface-architecture)
7. [Platform Integration Strategy](#7-platform-integration-strategy)
8. [Performance & Security](#8-performance--security)
9. [Development Guidelines](#9-development-guidelines)
10. [Future Architecture Considerations](#10-future-architecture-considerations)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HireHack Chrome Extension                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────┐  ┌─────────────┐   │
│  │  Content    │  │   Background        │  │   Local     │   │
│  │   Script    │◄─┤   Service Worker    │◄─┤   Storage   │   │
│  │(UI + DOM)   │  │  (Data Processing)  │  │ (Chrome API)│   │
│  └─────────────┘  └─────────────────────┘  └─────────────┘   │
│         │                    │                    │          │
│  ┌─────────────┐  ┌─────────────────────┐  ┌─────────────┐   │
│  │  LinkedIn   │  │    Rate Limiting    │  │Application  │   │
│  │   Pages     │  │   & Job Tracking    │  │  History    │   │
│  └─────────────┘  └─────────────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Communication Flow

```
User Action → Content UI → Background Script → Data Storage → Stats Update
     ↓              ↓            ↓              ↓
LinkedIn Page → Form Detection → Job Processing → Application History
     ↓              ↓            ↓              ↓
EasyApply → Auto-Fill Forms → Rate Limiting → Success/Failure Tracking
```

### 1.3 Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Extension     │    │ Job Application │    │  Application     │
│   Settings      │───►│   Processing    │───►│    History       │
│                 │    │                 │    │                  │
│ • Rate Limits   │    │ • Form Fill     │    │ • Success Count  │
│ • Behavior      │    │ • LinkedIn API  │    │ • Failed Jobs    │
│ • Preferences   │    │ • Rate Limiting │    │ • Daily Stats    │
│ • Daily Limits  │    │ • Error Handling│    │ • Progress Data  │
└─────────────────┘    └─────────────────┘    └──────────────────┘
```

---

## 2. Component Architecture

### 2.1 Extension Components

#### 2.1.1 Background Service Worker

```javascript
// Primary responsibilities:
- Data persistence and retrieval
- Cross-component communication
- Rate limiting enforcement
- Application state management
- Platform detection and routing
```

#### 2.1.2 Content Script with Embedded UI

```javascript
// Primary responsibilities:
- DOM manipulation and form filling
- Job listing detection and parsing
- Application submission handling
- Embedded UI overlay for controls
- Real-time stats display
- User interaction handling
- Platform adapter implementation
```

### 2.2 Component Dependencies

```
Background Service Worker (Core)
├── Storage Manager
├── Rate Limiter
├── Job Tracker
└── Settings Manager

Content Script with UI (LinkedIn Integration)
├── LinkedIn Automation Engine
├── Embedded UI Controller
├── Form Filler
├── DOM Monitor
├── Stats Display Manager
├── Progress Bar Controller
└── Draggable Interface Handler
```

---

## 3. Data Architecture

### 3.1 Storage Strategy

#### Local Chrome Storage Structure

```javascript
const StorageSchema = {
  // User Configuration
  'hirehack_user_profile': {
    personal: {
      firstName: string,
      lastName: string,
      email: string,
      phone: string,
      location: string
    },
    professional: {
      currentTitle: string,
      experience: number,
      skills: string[],
      summary: string,
      resumeFiles: {
        default: string,
        technical: string,
        management: string
      }
    },
    preferences: {
      salaryRange: { min: number, max: number },
      locations: string[],
      jobTypes: string[],
      excludeKeywords: string[],
      includeKeywords: string[]
    }
  },

  // Application History
  'hirehack_application_history': ApplicationRecord[],

  // Extension Settings
  'hirehack_settings': {
    dailyLimit: number,
    enabledPlatforms: string[],
    autoStart: boolean,
    notifications: boolean
  },

  // Usage Statistics
  'hirehack_stats': {
    totalApplications: number,
    successfulApplications: number,
    failedApplications: number,
    streakDays: number,
    lastActiveDate: string,
    platformStats: {
      linkedin: { applied: number, success: number },
      indeed: { applied: number, success: number }
    }
  },

  // Session Data
  'hirehack_session': {
    applicationsToday: number,
    lastResetDate: string,
    currentSession: {
      startTime: Date,
      applicationsThisSession: number,
      isActive: boolean,
      isPaused: boolean
    }
  }
};
```

### 3.2 Data Models

#### Extension Settings Model

```javascript
interface ExtensionSettings {
  rateLimit: RateLimitConfig;
  application: ApplicationBehavior;
  preferences: UserPreferences;
  metadata: {
    updatedAt: Date,
    version: string
  };
}

interface RateLimitConfig {
  dailyLimit: number;
  hourlyLimit: number;
  delayBetween: number;
}

interface ApplicationBehavior {
  skipCoverLetter: boolean;
  skipQuestions: boolean;
  autoAnswerBasic: boolean;
  randomizeTiming: boolean;
}

interface UserPreferences {
  salary: { min: number, max: number };
  excludeKeywords: string[];
}
```

#### Application Record Model

```javascript
interface ApplicationRecord {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  salary?: string;
  platform: PlatformType;
  appliedAt: Date;
  status: ApplicationStatus;
  failureReason?: string;
  jobUrl: string;
  jobDescription?: string;
  resumeUsed: string;
  metadata: {
    processingTime: number,
    retryCount: number,
    formFields: Record<string, any>
  };
}

type PlatformType = 'linkedin' | 'indeed' | 'glassdoor';
type ApplicationStatus = 'success' | 'failed' | 'skipped' | 'pending';
```

#### Extension State Model

```javascript
interface ExtensionState {
  isActive: boolean;
  isPaused: boolean;
  currentPlatform: PlatformType;
  applicationsToday: number;
  totalApplications: number;
  successRate: number;
  rateLimitStatus: {
    remaining: number,
    resetTime: Date
  };
  currentJob?: {
    title: string,
    company: string,
    estimatedTime: number
  };
}
```

---

## 4. Code Organization

### 4.1 Directory Structure

```
hirehack-extension/
├── manifest.json                 # Extension configuration (Manifest V3)
├── src/
│   ├── background.js             # Background service worker
│   ├── content-script.js         # Main content script with embedded UI
│   └── utils/
│       ├── constants.js          # Application constants and selectors
│       ├── helpers.js            # Utility functions and classes
│       └── storage.js            # Storage management utilities
├── icons/                        # Extension icons
│   └── icon.png                  # Single icon file (16/48/128px)
├── webpack.config.js             # Build configuration
├── package.json                  # Dependencies and scripts
└── docs/                         # Documentation
    ├── README.md
    ├── TECHNICAL_ARCHITECTURE.md
    └── PRD.md
```

### 4.2 Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "HireHack",
  "version": "1.0.0",
  "description": "Automate LinkedIn EasyApply job applications with smart filtering and tracking",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["https://*.linkedin.com/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://*.linkedin.com/*"],
      "js": ["content-script.js"],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon.png",
    "48": "icons/icon.png",
    "128": "icons/icon.png"
  }
}
```

---

## 5. Internal API Design

### 5.1 Message Passing Architecture

#### Background ↔ Content Script Communication

```javascript
// Message Types (Simplified)
const MessageTypes = {
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
  GET_SETTINGS: 'get_settings',
  GET_STATS: 'get_stats'
};

// Message Structure
interface ExtensionMessage {
  type: string;
  payload: any;
  sender: 'content' | 'background';
  timestamp: number;
  requestId?: string;
}
```

### 5.2 API Methods

#### Background Script API

```javascript
class BackgroundAPI {
  // Storage Operations
  async getSettings(): Promise<ExtensionSettings>
  async saveSettings(settings: ExtensionSettings): Promise<void>
  async getApplicationHistory(): Promise<ApplicationRecord[]>
  async addApplicationRecord(record: ApplicationRecord): Promise<void>

  // Statistics
  async getStats(): Promise<ExtensionStats>
  async updateStats(update: Partial<ExtensionStats>): Promise<void>

  // Rate Limiting
  async checkRateLimit(): Promise<boolean>
  async recordApplication(): Promise<void>
}
  async addApplicationRecord(record: ApplicationRecord): Promise<void>

  // State Management
  async getExtensionState(): Promise<ExtensionState>
  async updateExtensionState(state: Partial<ExtensionState>): Promise<void>

  // Rate Limiting
  async canApplyToJob(): Promise<boolean>
  async recordApplication(): Promise<void>
  async getRemainingApplications(): Promise<number>

  // Statistics
  async getStats(): Promise<ExtensionStats>
  async updateStats(update: Partial<ExtensionStats>): Promise<void>
}
```

#### Platform Adapter API

```javascript
abstract class PlatformAdapter {
  // Job Detection
  abstract detectJobListings(): Promise<JobElement[]>
  abstract extractJobDetails(element: JobElement): Promise<JobDetails>
  abstract isEasyApplyJob(element: JobElement): boolean

  // Application Process
  abstract fillApplicationForm(jobData: JobDetails, userProfile: UserProfile): Promise<void>
  abstract submitApplication(): Promise<ApplicationResult>
  abstract validateSubmission(): Promise<boolean>

  // UI Integration
  abstract addVisualIndicators(elements: JobElement[]): void
  abstract showProgressOverlay(message: string): void
  abstract hideProgressOverlay(): void

  // Platform-specific
  abstract getPlatformName(): PlatformType
  abstract getSelectors(): PlatformSelectors
  abstract getFormMappings(): FormFieldMappings
}
```

---

## 6. User Interface Architecture

### 6.1 Embedded Content Script UI

#### Component Structure

```javascript
// Content Script UI Hierarchy (Embedded on LinkedIn)
LinkedInAutomationUI
├── Header
│   ├── Logo & Title
│   ├── StatusIndicator (Ready/Active/Paused)
│   └── CloseButton
├── ControlPanel
│   ├── StartButton
│   ├── PauseButton
│   └── StopButton
├── ProgressSection
│   ├── DailyProgressBar
│   └── ProgressText (X / Y applications today)
├── StatsDisplay
│   ├── TotalApplications
│   ├── ApplicationsToday
│   ├── ThisSession
│   └── SuccessRate
└── CurrentJobDisplay (when active)
    ├── JobTitle
    └── Company
```

#### Draggable UI Implementation

```javascript
class DraggablePopup {
  constructor() {
    this.isDragging = false;
    this.isMinimized = false;
    this.position = { x: 20, y: 20 };
    this.dragOffset = { x: 0, y: 0 };
  }

  features = {
    draggable: true,
    minimizable: true,
    resizable: false,
    alwaysOnTop: true,
    snapToEdges: true
  };

  // Dragging logic
  handleMouseDown(event) {
    /* Implementation */
  }
  handleMouseMove(event) {
    /* Implementation */
  }
  handleMouseUp(event) {
    /* Implementation */
  }

  // State management
  minimize() {
    /* Implementation */
  }
  restore() {
    /* Implementation */
  }
  savePosition() {
    /* Implementation */
  }
  loadPosition() {
    /* Implementation */
  }
}
```

### 6.2 Visual States and Transitions

#### Popup State Machine

```javascript
const PopupStates = {
  INACTIVE: 'inactive',
  STARTING: 'starting',
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPING: 'stopping',
  ERROR: 'error'
};

const StateTransitions = {
  [PopupStates.INACTIVE]: [PopupStates.STARTING],
  [PopupStates.STARTING]: [PopupStates.ACTIVE, PopupStates.ERROR],
  [PopupStates.ACTIVE]: [PopupStates.PAUSED, PopupStates.STOPPING],
  [PopupStates.PAUSED]: [PopupStates.ACTIVE, PopupStates.STOPPING],
  [PopupStates.STOPPING]: [PopupStates.INACTIVE],
  [PopupStates.ERROR]: [PopupStates.INACTIVE]
};
```

### 6.3 Visual Design Specifications

#### Layout Specifications

```css
/* Popup Container */
.hirehack-popup {
  width: 320px;
  height: 240px;
  min-height: 180px;
  max-height: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  position: fixed;
  z-index: 999999;
  background: white;
  border: 1px solid #e1e5e9;
}

/* Minimized State */
.hirehack-popup.minimized {
  height: 40px;
  width: 200px;
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .hirehack-popup {
    background: #1a1a1a;
    border-color: #333;
    color: #fff;
  }
}
```

---

## 7. Platform Integration Strategy

### 7.1 Abstract Platform Layer

#### Platform Detection

```javascript
class PlatformDetector {
  static detectPlatform(url) {
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('indeed.com')) return 'indeed';
    if (url.includes('glassdoor.com')) return 'glassdoor';
    return 'unknown';
  }

  static isPlatformSupported(platform) {
    return ['linkedin', 'indeed'].includes(platform);
  }
}
```

#### Platform Configuration

```javascript
// Platform-specific configurations
const PlatformConfigs = {
  linkedin: {
    name: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com',
    jobSearchPath: '/jobs/search/',
    selectors: {
      jobListings: '.job-search-card',
      easyApplyButton: '.jobs-apply-button--top-card',
      jobTitle: '.job-search-card__title',
      company: '.job-search-card__subtitle-link',
      location: '.job-search-card__location',
      salary: '.job-search-card__salary-info'
    },
    formMappings: {
      firstName: 'input[name="firstName"]',
      lastName: 'input[name="lastName"]',
      email: 'input[name="email"]',
      phone: 'input[name="phone"]'
    },
    rateLimits: {
      applicationsPerDay: 100,
      delayBetweenApplications: { min: 30000, max: 120000 }
    }
  },

  indeed: {
    name: 'Indeed',
    baseUrl: 'https://www.indeed.com'
    // Future implementation
  }
};
```

### 7.2 LinkedIn Implementation

#### LinkedIn Adapter

```javascript
class LinkedInAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.config = PlatformConfigs.linkedin;
    this.selectors = this.config.selectors;
  }

  async detectJobListings() {
    const jobElements = document.querySelectorAll(this.selectors.jobListings);
    return Array.from(jobElements).filter(el => this.isEasyApplyJob(el));
  }

  isEasyApplyJob(element) {
    return element.querySelector(this.selectors.easyApplyButton) !== null;
  }

  async extractJobDetails(element) {
    return {
      title: element
        .querySelector(this.selectors.jobTitle)
        ?.textContent?.trim(),
      company: element
        .querySelector(this.selectors.company)
        ?.textContent?.trim(),
      location: element
        .querySelector(this.selectors.location)
        ?.textContent?.trim(),
      salary: element.querySelector(this.selectors.salary)?.textContent?.trim(),
      url: element.querySelector('a')?.href,
      element: element
    };
  }

  async fillApplicationForm(jobData, userProfile) {
    // Implementation for LinkedIn form filling
  }

  async submitApplication() {
    // Implementation for LinkedIn application submission
  }
}
```

### 7.3 Future Platform Support

#### Indeed Integration (Future)

```javascript
class IndeedAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.config = PlatformConfigs.indeed;
  }

  // Indeed-specific implementation
  async detectJobListings() {
    // Indeed job detection logic
  }

  // Other Indeed-specific methods
}
```

#### Platform Factory

```javascript
class PlatformFactory {
  static createAdapter(platform) {
    switch (platform) {
      case 'linkedin':
        return new LinkedInAdapter();
      case 'indeed':
        return new IndeedAdapter();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  static getSupportedPlatforms() {
    return ['linkedin', 'indeed'];
  }
}
```

---

## 8. Performance & Security

### 8.1 Performance Considerations

#### Memory Management

```javascript
// Efficient DOM handling
class DOMManager {
  constructor() {
    this.observers = new Map();
    this.cachedElements = new WeakMap();
  }

  // Use MutationObserver for efficient DOM monitoring
  observeJobListings(callback) {
    const observer = new MutationObserver(callback);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    return observer;
  }

  // Cleanup unused resources
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}
```

#### Rate Limiting Implementation

```javascript
class RateLimiter {
  constructor() {
    this.dailyLimit = 3; // Free version
    this.applicationsToday = 0;
    this.lastResetDate = new Date().toDateString();
    this.minDelay = 30000; // 30 seconds
    this.maxDelay = 120000; // 2 minutes
    this.lastApplicationTime = 0;
  }

  canApply() {
    this.checkDailyReset();
    const timeSinceLastApp = Date.now() - this.lastApplicationTime;
    const hasDelayPassed = timeSinceLastApp >= this.minDelay;
    const underDailyLimit = this.applicationsToday < this.dailyLimit;

    return hasDelayPassed && underDailyLimit;
  }

  getRandomDelay() {
    return (
      Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) +
      this.minDelay
    );
  }

  recordApplication() {
    this.applicationsToday++;
    this.lastApplicationTime = Date.now();
    this.saveToStorage();
  }
}
```

### 8.2 Security Implementation

#### Data Encryption

```javascript
class DataEncryption {
  static async encryptData(data) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode('hirehack-key'), // In practice, use a proper key
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Implementation for data encryption
    return encryptedData;
  }

  static async decryptData(encryptedData) {
    // Implementation for data decryption
    return decryptedData;
  }
}
```

#### Content Security

```javascript
class SecurityManager {
  static sanitizeInput(input) {
    // Sanitize user input to prevent XSS
    return input.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ''
    );
  }

  static validateOrigin(origin) {
    const allowedOrigins = [
      'https://www.linkedin.com',
      'https://www.indeed.com'
    ];
    return allowedOrigins.includes(origin);
  }

  static isSecureContext() {
    return window.isSecureContext && location.protocol === 'https:';
  }
}
```

---

## 9. Development Guidelines

### 9.1 Code Standards

#### JavaScript Standards

```javascript
// Use modern ES6+ features
// Prefer async/await over promises
// Use strict type checking where possible
// Follow consistent naming conventions

// Example: Async function with error handling
async function applyToJob(jobData, userProfile) {
  try {
    const result = await platformAdapter.fillApplicationForm(
      jobData,
      userProfile
    );
    await platformAdapter.submitApplication();
    return { success: true, result };
  } catch (error) {
    logger.error('Application failed:', error);
    return { success: false, error: error.message };
  }
}
```

#### Error Handling

```javascript
class ErrorHandler {
  static handle(error, context) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString(),
      platform: window.location.hostname
    };

    // Log locally (no external sending)
    this.logError(errorInfo);

    // Show user-friendly message
    this.showUserError(this.getUserMessage(error));
  }

  static getUserMessage(error) {
    if (error.name === 'RateLimitError') {
      return 'Daily application limit reached. Please try again tomorrow.';
    }
    if (error.name === 'FormError') {
      return 'Unable to fill application form. Please check your profile settings.';
    }
    return 'An unexpected error occurred. Please try again.';
  }
}
```

### 9.2 Testing Strategy

#### Unit Testing

```javascript
// Example test structure
describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  test('should allow applications under daily limit', () => {
    expect(rateLimiter.canApply()).toBe(true);
  });

  test('should enforce daily limit', () => {
    for (let i = 0; i < 3; i++) {
      rateLimiter.recordApplication();
    }
    expect(rateLimiter.canApply()).toBe(false);
  });
});
```

---

## 10. Future Architecture Considerations

### 10.1 Backend Integration Preparation

#### API Integration Points

```javascript
// Future API structure
const FutureAPIs = {
  authentication: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh'
  },
  userProfile: {
    get: '/api/user/profile',
    update: '/api/user/profile',
    sync: '/api/user/sync'
  },
  applications: {
    history: '/api/applications/history',
    create: '/api/applications',
    update: '/api/applications/:id'
  },
  analytics: {
    track: '/api/analytics/track',
    stats: '/api/analytics/stats'
  },
  premium: {
    validate: '/api/premium/validate',
    upgrade: '/api/premium/upgrade'
  }
};
```

#### Data Sync Strategy

```javascript
class DataSyncManager {
  constructor() {
    this.syncQueue = [];
    this.lastSyncTime = null;
    this.conflictResolver = new ConflictResolver();
  }

  async syncToCloud() {
    const localData = await this.getLocalData();
    const serverData = await this.api.uploadData(localData);
    this.updateLocalTimestamp(serverData.timestamp);
  }

  async syncFromCloud() {
    const serverData = await this.api.downloadData();
    const conflicts = await this.detectConflicts(serverData);

    if (conflicts.length > 0) {
      const resolved = await this.conflictResolver.resolve(conflicts);
      await this.applyResolution(resolved);
    } else {
      await this.updateLocalData(serverData);
    }
  }

  async handleConflicts(localData, serverData) {
    // Implement conflict resolution strategy
    // Priority: server wins for user profile, local wins for applications
  }
}
```

### 10.2 Scalability Considerations

#### Multi-Platform Architecture

```javascript
// Platform registry for easy expansion
class PlatformRegistry {
  constructor() {
    this.platforms = new Map();
    this.loadPlatforms();
  }

  registerPlatform(name, adapterClass, config) {
    this.platforms.set(name, {
      adapter: adapterClass,
      config: config,
      enabled: true
    });
  }

  async loadPlatform(name) {
    const platform = this.platforms.get(name);
    if (!platform) throw new Error(`Platform ${name} not found`);

    return new platform.adapter(platform.config);
  }

  getSupportedPlatforms() {
    return Array.from(this.platforms.keys()).filter(
      name => this.platforms.get(name).enabled
    );
  }
}
```

#### Performance Monitoring

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      formFillTime: 5000, // 5 seconds
      applicationTime: 30000, // 30 seconds
      memoryUsage: 50 * 1024 * 1024 // 50MB
    };
  }

  startTimer(operation) {
    this.metrics.set(operation, performance.now());
  }

  endTimer(operation) {
    const startTime = this.metrics.get(operation);
    const duration = performance.now() - startTime;

    if (duration > this.thresholds[operation]) {
      console.warn(`Performance warning: ${operation} took ${duration}ms`);
    }

    return duration;
  }

  checkMemoryUsage() {
    if ('memory' in performance) {
      const used = performance.memory.usedJSHeapSize;
      if (used > this.thresholds.memoryUsage) {
        console.warn(`Memory warning: Using ${used} bytes`);
        this.triggerGarbageCollection();
      }
    }
  }
}
```

---

## Document Status

- **Status**: Draft v1.0
- **Next Review**: October 7, 2025
- **Maintained By**: Development Team
- **Dependencies**: PRD.md, Setup Guidelines
