# HireHack - Technical Architecture Document

## Document Information

- **Document Version**: 1.0
- **Created Date**: September 7, 2025
- **Product Name**: HireHack
- **Document Type**: Technical Architecture Specification

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
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   Popup     │  │  Content    │  │   Background        │   │
│  │   Script    │◄─┤   Script    │◄─┤   Service Worker    │   │
│  │ (UI Layer)  │  │(DOM Control)│  │  (Data Processing)  │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│         │                 │                    │            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  Settings   │  │  Platform   │  │   Local Storage     │   │
│  │   Panel     │  │   Pages     │  │   (Chrome APIs)     │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Communication Flow

```
User Action → Popup UI → Background Script → Content Script → Platform DOM
     ↓              ↓            ↓              ↓
Settings Page → Local Storage → Data Processing → Form Filling
     ↓              ↓            ↓              ↓
Export Data ← Application History ← Job Tracking ← Success/Failure
```

### 1.3 Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   User Profile  │    │ Job Application │    │  Application     │
│   JSON Config   │───►│   Processing    │───►│    History       │
│                 │    │                 │    │                  │
│ • Name          │    │ • Form Fill     │    │ • Success Count  │
│ • Skills        │    │ • Validation    │    │ • Failed Jobs    │
│ • Experience    │    │ • Rate Limiting │    │ • Applied Jobs   │
│ • Preferences   │    │ • Error Handling│    │ • Export Data    │
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

#### 2.1.2 Content Scripts

```javascript
// Platform-specific responsibilities:
- DOM manipulation and form filling
- Job listing detection and parsing
- Application submission handling
- Visual feedback and overlays
- Platform adapter implementation
```

#### 2.1.3 Popup Interface

```javascript
// UI responsibilities:
- Real-time status display
- Control panel (start/stop/pause)
- Application statistics
- Quick settings access
- Draggable functionality
- Profile management interface
```

### 2.2 Component Dependencies

```
Background Service Worker (Core)
├── Storage Manager
├── Rate Limiter
├── Job Tracker
└── Platform Router

Content Scripts (Platform-specific)
├── Platform Adapter (Abstract)
├── Form Filler
├── DOM Monitor
└── Visual Overlay

Popup Interface
├── Draggable Handler
├── State Manager
├── Control Panel
├── Statistics Display
├── Profile Manager
├── Settings Controller
└── Data Exporter
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

#### User Profile Model

```javascript
interface UserProfile {
  personal: PersonalInfo;
  professional: ProfessionalInfo;
  preferences: JobPreferences;
  metadata: {
    createdAt: Date,
    updatedAt: Date,
    version: string
  };
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
}

interface ProfessionalInfo {
  currentTitle: string;
  experience: number;
  skills: string[];
  summary: string;
  resumeFiles: ResumeFiles;
}

interface ResumeFiles {
  default?: string;
  technical?: string;
  management?: string;
  [key: string]: string | undefined;
}

interface JobPreferences {
  salaryRange: { min: number, max: number };
  locations: string[];
  jobTypes: string[];
  excludeKeywords: string[];
  includeKeywords: string[];
  companies: {
    whitelist: string[],
    blacklist: string[]
  };
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
├── manifest.json                 # Extension configuration
├── src/
│   ├── background/
│   │   ├── service-worker.js     # Main background script
│   │   ├── storage-manager.js    # Storage operations
│   │   ├── rate-limiter.js       # Rate limiting logic
│   │   ├── job-tracker.js        # Application tracking
│   │   └── platform-router.js    # Platform detection & routing
│   ├── content/
│   │   ├── linkedin/
│   │   │   ├── linkedin-adapter.js
│   │   │   ├── linkedin-selectors.js
│   │   │   └── linkedin-forms.js
│   │   ├── indeed/               # Future platform
│   │   │   ├── indeed-adapter.js
│   │   │   └── indeed-selectors.js
│   │   ├── shared/
│   │   │   ├── platform-adapter.js    # Abstract base class
│   │   │   ├── form-filler.js         # Generic form filling
│   │   │   ├── dom-utils.js           # DOM utilities
│   │   │   └── visual-overlay.js      # UI overlays
│   │   └── content-main.js        # Content script entry point
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js               # Main popup logic
│   │   ├── popup.css
│   │   ├── components/
│   │   │   ├── draggable.js       # Draggable functionality
│   │   │   ├── controls.js        # Control buttons
│   │   │   ├── stats.js           # Statistics display
│   │   │   ├── profile-form.js    # User profile form
│   │   │   ├── resume-manager.js  # Resume upload/management
│   │   │   ├── preferences.js     # Job preferences
│   │   │   ├── data-export.js     # Data export functionality
│   │   │   └── notifications.js   # User notifications
│   │   ├── state-manager.js       # Popup state management
│   │   └── validators.js          # Form validation
│   ├── config/
│   │   ├── user-profile-template.json
│   │   ├── platform-configs.json # Platform-specific configurations
│   │   └── default-settings.json
│   └── utils/
│       ├── constants.js           # Application constants
│       ├── helpers.js             # Utility functions
│       ├── logger.js              # Logging utility
│       ├── crypto.js              # Data encryption
│       └── validators.js          # Data validation
├── assets/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   ├── icon128.png
│   │   └── disabled/              # Disabled state icons
│   ├── styles/
│   │   ├── common.css             # Shared styles
│   │   ├── popup.css              # Popup-specific styles
│   │   └── content.css            # Content script styles
│   └── images/
│       ├── logos/                 # Platform logos
│       └── ui/                    # UI elements
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── setup.md
    ├── platform-integration.md
    ├── api-reference.md
    └── troubleshooting.md
```

### 4.2 Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "HireHack",
  "version": "1.0.0",
  "description": "Automate LinkedIn EasyApply job applications with smart filtering and tracking",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["https://*.linkedin.com/*", "https://*.indeed.com/*"],
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://*.linkedin.com/*"],
      "js": ["src/content/content-main.js"],
      "css": ["assets/styles/content.css"],
      "run_at": "document_end"
    }
  ],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_title": "HireHack Auto-Apply",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["assets/styles/content.css"],
      "matches": ["https://*.linkedin.com/*"]
    }
  ]
}
```

---

## 5. Internal API Design

### 5.1 Message Passing Architecture

#### Background ↔ Content Script Communication

```javascript
// Message Types
const MessageTypes = {
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

  // Platform Events
  PLATFORM_DETECTED: 'platform_detected',
  PLATFORM_CHANGED: 'platform_changed'
};

// Message Structure
interface ExtensionMessage {
  type: string;
  payload: any;
  sender: 'popup' | 'content' | 'background';
  timestamp: number;
  requestId?: string;
}
```

#### Popup ↔ Background Communication

```javascript
const PopupMessages = {
  // State Management
  GET_STATUS: 'get_status',
  GET_STATS: 'get_stats',
  GET_CURRENT_SESSION: 'get_current_session',

  // Control Actions
  TOGGLE_AUTO_APPLY: 'toggle_auto_apply',
  PAUSE_RESUME: 'pause_resume',
  STOP_APPLICATION: 'stop_application',

  // Settings
  UPDATE_SETTINGS: 'update_settings',
  GET_SETTINGS: 'get_settings',

  // Data Export
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data'
};
```

### 5.2 API Methods

#### Background Script API

```javascript
class BackgroundAPI {
  // Storage Operations
  async getUserProfile(): Promise<UserProfile>
  async saveUserProfile(profile: UserProfile): Promise<void>
  async getApplicationHistory(): Promise<ApplicationRecord[]>
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

### 6.1 Popup Interface Architecture

#### Component Structure

```javascript
// Popup Component Hierarchy
PopupApp
├── Header
│   ├── Logo
│   ├── StatusIndicator
│   └── WindowControls (minimize, close)
├── MainPanel
│   ├── StatsDisplay
│   │   ├── ApplicationCounter
│   │   ├── SuccessRate
│   │   └── TotalApplied
│   ├── ControlPanel
│   │   ├── StartButton
│   │   ├── PauseButton
│   │   └── StopButton
│   └── CurrentJobDisplay
│       ├── JobTitle
│       ├── Company
│       └── EstimatedTime
└── Footer
    ├── SettingsButton
    ├── HistoryButton
    └── ExportButton
```

#### Draggable Popup Implementation

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
