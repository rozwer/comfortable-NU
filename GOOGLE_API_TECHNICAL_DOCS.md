# Google API Implementation Details
## Technical Documentation for Comfortable NU Extension

### API Integration Overview

This document provides technical details about how Comfortable NU integrates with Google APIs, including implementation specifics, error handling, and security measures.

### OAuth 2.0 Implementation

#### Configuration
```json
{
  "oauth2": {
    "client_id": "320934121909-3mo570972bcc19chatsu8pcp6bevj7fm.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  }
}
```

#### Authentication Flow
1. **User Initiation:** User clicks "Connect to Google Calendar" in extension popup
2. **Token Request:** Extension calls `chrome.identity.getAuthToken()` with interactive mode
3. **User Consent:** Google OAuth consent screen displayed to user
4. **Token Storage:** Received token stored securely using Chrome Storage API
5. **API Calls:** Token used for subsequent Google API requests

#### Token Management
- **Caching:** Tokens cached locally for improved user experience
- **Refresh:** Automatic token refresh handled by Chrome Identity API
- **Revocation:** Users can revoke access through extension settings
- **Expiry:** Expired tokens automatically refreshed or re-requested

### Google Calendar API Usage

#### Calendar Event Creation
**Endpoint:** `POST https://www.googleapis.com/calendar/v3/calendars/primary/events`

**Event Structure:**
```typescript
interface CalendarEvent {
  summary: string;        // "[Course Code] Assignment Title"
  description: string;    // Assignment details and submission link
  start: {
    dateTime: string;     // Due date in ISO format
    timeZone: string;     // User's timezone
  };
  end: {
    dateTime: string;     // Due date + 1 hour
    timeZone: string;     // User's timezone
  };
  source: {
    title: string;        // "Comfortable NU"
    url: string;          // Assignment URL
  };
  extendedProperties: {
    private: {
      sakaiAssignmentId: string;  // Unique identifier
      extensionVersion: string;   // For compatibility tracking
      syncTimestamp: string;      // Last sync time
    };
  };
}
```

#### Event Management
- **Duplicate Prevention:** Uses `extendedProperties.private.sakaiAssignmentId` to track synced items
- **Update Logic:** Compares existing events with current assignment data
- **Deletion:** Removes events when assignments are no longer available
- **Batch Operations:** Groups API calls to respect rate limits

#### Error Handling
```typescript
try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, refresh and retry
      await refreshToken();
      return retryOperation();
    } else if (response.status === 403) {
      // Rate limit or permissions issue
      throw new Error('Calendar access denied');
    }
  }
} catch (error) {
  console.error('Calendar API error:', error);
  showUserNotification('Sync failed. Please try again.');
}
```

### User Info API Usage

#### Profile Information Retrieval
**Endpoint:** `GET https://www.googleapis.com/oauth2/v2/userinfo`

**Response Data Used:**
```typescript
interface UserInfo {
  email: string;          // For account verification
  name: string;           // For personalized UI
  picture: string;        // For user avatar (optional)
  verified_email: boolean; // For security validation
}
```

**Implementation:**
```typescript
async function getUserInfo(token: string): Promise<UserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }
  
  return await response.json();
}
```

### Data Flow and Storage

#### Sync Process Flow
1. **Data Collection:** Extract assignments and quizzes from Sakai LMS DOM
2. **Data Processing:** Convert to standardized format with due dates
3. **Authentication Check:** Verify Google account authentication status
4. **Calendar Query:** Retrieve existing events to prevent duplicates
5. **Event Creation/Update:** Create new or update existing calendar events
6. **Local Storage Update:** Save sync timestamp and event mappings
7. **User Notification:** Inform user of sync results

#### Local Storage Schema
```typescript
interface StorageData {
  // Authentication
  googleAuthToken?: string;
  userEmail?: string;
  userName?: string;
  
  // Sync Configuration
  autoSyncEnabled: boolean;          // Default: true
  calendarSyncInterval: number;      // Default: 240 minutes
  lastSyncTime?: number;             // Timestamp
  
  // Event Tracking
  sentEventKeys: string[];           // Synced assignment IDs
  syncedAssignments: SyncedItem[];   // Assignment metadata
  syncedQuizzes: SyncedItem[];       // Quiz metadata
  
  // User Preferences
  enableNotifications: boolean;      // Default: true
  syncTimeZone: string;              // User's timezone
}
```

### Security Measures

#### Token Security
- **Secure Storage:** Tokens stored using Chrome Storage API with encryption
- **Scope Limitation:** Requests only necessary permissions
- **Token Validation:** Verifies token validity before API calls
- **Automatic Cleanup:** Clears tokens on extension uninstall

#### Data Protection
- **Local Processing:** All data processing within extension context
- **No External Transmission:** No data sent to external servers
- **Input Validation:** Sanitizes all data before API submission
- **Error Sanitization:** Removes sensitive information from error logs

#### Privacy Implementation
```typescript
// Example of privacy-safe error handling
function logError(error: any, context: string) {
  const safeError = {
    message: error.message,
    context: context,
    timestamp: Date.now(),
    // Exclude any user data or tokens
  };
  console.error('Extension error:', safeError);
}
```

### Rate Limiting and Performance

#### API Rate Limits
- **Calendar API:** 1,000 requests per 100 seconds per user
- **User Info API:** 10,000 requests per 100 seconds per user
- **Implementation:** Built-in retry logic with exponential backoff

#### Performance Optimizations
- **Batch Operations:** Groups multiple calendar operations
- **Caching:** Caches user info and calendar data appropriately
- **Background Sync:** Uses service worker alarms for scheduled syncing
- **Lazy Loading:** Loads Google APIs only when needed

#### Monitoring and Debugging
```typescript
// Performance monitoring
const syncStartTime = performance.now();
await performCalendarSync();
const syncDuration = performance.now() - syncStartTime;
console.log(`Sync completed in ${syncDuration}ms`);
```

### Testing and Quality Assurance

#### API Testing Strategy
- **Unit Tests:** Mock Google API responses for consistent testing
- **Integration Tests:** Test with real Google APIs in development environment
- **Error Scenarios:** Test token expiry, network failures, permission denials
- **User Acceptance:** Test full user workflow including OAuth consent

#### Development Environment Setup
1. **Google Cloud Project:** Separate project for development testing
2. **Test Users:** Whitelisted email addresses for OAuth testing
3. **Development Client ID:** Separate OAuth client for development
4. **Logging:** Enhanced logging for development debugging

### Compliance and Audit Trail

#### Data Usage Logging
```typescript
// Example audit log entry
interface AuditLogEntry {
  timestamp: number;
  action: 'calendar_create' | 'calendar_update' | 'user_auth' | 'data_delete';
  dataType: 'assignment' | 'quiz' | 'user_info';
  success: boolean;
  error?: string;
}
```

#### Compliance Checklist
- ✅ Limited data collection to functional requirements
- ✅ Clear user consent for all data access
- ✅ Local data processing without external transmission
- ✅ User control over data deletion and opt-out
- ✅ Transparent privacy policy and terms of service
- ✅ Regular security audits and updates

### Support and Maintenance

#### Error Reporting
- **User-Friendly Messages:** Clear, actionable error messages for users
- **Developer Logs:** Detailed logging for troubleshooting
- **Fallback Mechanisms:** Graceful degradation when APIs unavailable

#### Update Strategy
- **Backward Compatibility:** Maintain compatibility with existing user data
- **Migration Scripts:** Handle data format changes between versions
- **API Version Management:** Monitor and update API versions as needed

---

*This technical documentation is maintained for development reference and compliance verification. All implementation details reflect current production code.*
