# Google Cloud API Scope Documentation
## For Comfortable NU Chrome Extension

### Application Overview
**Application Name:** Comfortable NU  
**Type:** Chrome Browser Extension  
**Purpose:** Academic assignment and quiz management system with Google Calendar integration for Sakai LMS  
**Target Users:** Students and educators using Sakai Learning Management System  

### Application Description for Google Cloud Console

Comfortable NU is a Chrome browser extension designed to enhance the user experience of Sakai Learning Management System (LMS) by providing streamlined assignment and quiz management capabilities with Google Calendar integration.

**Core Functionality:**
- **Assignment & Quiz Management:** Automatically detects and organizes assignments and quizzes from Sakai LMS
- **Google Calendar Sync:** Seamlessly synchronizes academic deadlines to user's Google Calendar
- **Real-time Notifications:** Provides automated reminders for upcoming deadlines
- **User-friendly Interface:** Modern, intuitive UI with dark mode support and customizable color coding
- **Background Synchronization:** Automatic periodic sync to keep calendar events up-to-date

**Technical Implementation:**
- Built as a Manifest V3 Chrome extension
- Uses Google OAuth 2.0 for secure authentication
- Implements background service workers for reliable synchronization
- Stores user preferences and sync data locally using Chrome Storage API
- Respects user privacy with minimal data collection and local processing

**User Benefits:**
- Centralized academic deadline management
- Reduced risk of missing important assignments
- Seamless integration with existing Google Calendar workflows
- Enhanced productivity for academic users

### Required Google API Scopes

#### 1. Calendar API Scope
**Scope:** `https://www.googleapis.com/auth/calendar`  
**Permission Level:** Full calendar access  

**Justification:**
- **Primary Use:** Create, update, and delete calendar events for assignments and quizzes
- **Data Access:** Read/write access to user's Google Calendar
- **Specific Operations:**
  - Create calendar events for assignment due dates
  - Create calendar events for quiz deadlines
  - Update existing events when assignment details change
  - Delete events when assignments are removed or completed
  - Read existing calendar events to avoid duplicates

**Data Handling:**
- Event titles contain assignment/quiz names and course information
- Event descriptions include assignment details and submission links
- Event times correspond to due dates/deadlines
- All data is processed locally within the extension
- No calendar data is transmitted to external servers

**User Control:**
- Users can enable/disable calendar sync at any time
- Sync interval is user-configurable (default: 4 hours)
- Users can manually trigger sync or set automatic background sync

#### 2. User Email Scope
**Scope:** `https://www.googleapis.com/auth/userinfo.email`  
**Permission Level:** Read-only access to user email address  

**Justification:**
- **Primary Use:** User identification and authentication verification
- **Data Access:** User's primary Google account email address only
- **Specific Operations:**
  - Verify user identity for OAuth authentication
  - Display current authenticated user in extension interface
  - Ensure calendar events are created in the correct user account
  - Provide user context for error reporting and debugging

**Data Handling:**
- Email address is stored locally for session management
- Used only for display purposes and account verification
- No email addresses are transmitted to external servers
- Data is cleared when user logs out or revokes permissions

#### 3. User Profile Scope
**Scope:** `https://www.googleapis.com/auth/userinfo.profile`  
**Permission Level:** Read-only access to basic profile information  

**Justification:**
- **Primary Use:** Enhanced user experience and interface personalization
- **Data Access:** User's name, profile picture, and basic profile information
- **Specific Operations:**
  - Display user name in extension interface
  - Show profile picture for better user experience
  - Provide personalized greetings and notifications
  - Enable user identification in multi-account scenarios

**Data Handling:**
- Profile information is stored locally for UI enhancement
- Used only for display and personalization purposes
- No profile data is transmitted to external servers
- Data is cleared when user logs out or revokes permissions

### Data Collection and Usage Summary

**Data Collected:**
1. **Calendar Events:** Assignment and quiz information synchronized to Google Calendar
2. **User Email:** For authentication and account verification
3. **User Profile:** Name and profile picture for UI enhancement

**Data Usage:**
1. **Local Processing Only:** All data processing occurs within the browser extension
2. **No External Transmission:** No user data is sent to external servers or third parties
3. **Temporary Storage:** Data is stored locally only for operational purposes
4. **User Control:** Users can revoke permissions and delete data at any time

**Data Retention:**
- Calendar sync data is maintained until user disables the feature
- Authentication tokens are cached for user convenience but can be cleared
- All data is automatically removed when the extension is uninstalled

### Security and Privacy Measures

**Authentication Security:**
- Uses Google OAuth 2.0 standard for secure authentication
- Tokens are stored using Chrome's secure storage APIs
- No credentials are hardcoded or transmitted insecurely

**Data Protection:**
- All data processing is performed locally within the extension
- No data is transmitted to external servers or third parties
- User data is never sold, shared, or monetized

**User Privacy:**
- Minimal data collection approach
- Clear disclosure of all data usage
- Easy opt-out and data deletion options
- Compliance with privacy regulations

### Compliance and Verification

**Google API Services User Data Policy Compliance:**
- ✅ Limited use of user data as specified in scopes
- ✅ Transparent disclosure of data collection and usage
- ✅ No sale or transfer of user data to third parties
- ✅ Secure handling and storage of user data
- ✅ User control over data access and deletion

**OAuth 2.0 Best Practices:**
- ✅ Proper scope limitation to required permissions only
- ✅ Secure token storage and management
- ✅ Clear user consent flow
- ✅ Graceful handling of authentication errors

### Support and Contact Information

**Developer Contact:** Available through Chrome Web Store extension page  
**Privacy Policy:** [Link to PRIVACY_POLICY.md in repository]  
**Terms of Service:** [Link to TERMS_OF_SERVICE.md in repository]  
**Source Code:** Available for review (open source project)

### Technical Verification

**Extension ID:** [To be assigned by Chrome Web Store]  
**OAuth Client ID:** 320934121909-3mo570972bcc19chatsu8pcp6bevj7fm.apps.googleusercontent.com  
**Manifest Version:** 3  
**Extension Version:** 2.0.0

---

*This documentation is provided for Google Cloud Console verification and API access approval. All information accurately reflects the current implementation and intended use of the Comfortable NU Chrome extension.*
