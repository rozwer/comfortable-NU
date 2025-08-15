# Google Cloud Console Application Description
## For OAuth Consent Screen Configuration

### Application Name
Comfortable NU

### Application Type
Chrome Extension

### Application Summary
Comfortable NU is a Chrome browser extension that enhances the Sakai Learning Management System (LMS) experience by providing streamlined assignment and quiz management with Google Calendar integration. The extension helps students and educators stay organized by automatically synchronizing academic deadlines to their Google Calendar.

### Application Description (Detailed)
Comfortable NU is designed to improve academic productivity by bridging the gap between Sakai LMS and Google Calendar. The extension automatically detects assignments and quizzes from Sakai LMS and creates corresponding calendar events to help users manage their academic schedule effectively.

**Key Features:**
- Automatic detection and organization of assignments and quizzes from Sakai LMS
- Real-time synchronization with Google Calendar
- Customizable notification system for upcoming deadlines
- Background synchronization for up-to-date information
- User-friendly interface with dark mode support
- Privacy-focused design with local data processing

**Target Users:**
- Students using Sakai LMS for coursework
- Educators managing course assignments and deadlines
- Academic institutions implementing integrated workflow solutions

### Why This App Needs Access to Google APIs

**Calendar API (`https://www.googleapis.com/auth/calendar`):**
- **Purpose:** Create and manage calendar events for academic assignments and quizzes
- **Usage:** The extension creates calendar events with assignment details, due dates, and course information to help users track their academic deadlines
- **Benefit:** Provides centralized deadline management and reduces the risk of missing important submissions

**User Info Email API (`https://www.googleapis.com/auth/userinfo.email`):**
- **Purpose:** User identification and authentication verification
- **Usage:** Ensures calendar events are created in the correct user account and provides user context for the interface
- **Benefit:** Enables secure, personalized experience and proper account management

**User Info Profile API (`https://www.googleapis.com/auth/userinfo.profile`):**
- **Purpose:** Enhanced user experience and interface personalization
- **Usage:** Displays user name and profile information for better user identification and personalized interface
- **Benefit:** Improves usability and provides clear indication of which account is currently authenticated

### Data Usage and Privacy
- **Local Processing:** All data processing occurs within the browser extension
- **No External Servers:** No user data is transmitted to external servers or third parties
- **Minimal Collection:** Only collects data necessary for core functionality
- **User Control:** Users can disable features, revoke permissions, and delete data at any time
- **Secure Storage:** Uses Chrome's secure storage APIs for any cached data

### Compliance
This application complies with Google API Services User Data Policy, including the Limited Use requirements. The extension uses user data solely for providing the described functionality and does not sell, transfer, or use data for advertising purposes.

### Developer Information
**Contact:** Available through Chrome Web Store extension page
**Privacy Policy:** Included in extension package and repository
**Terms of Service:** Included in extension package and repository

---

### OAuth Consent Screen Configuration

**Application Name:** Comfortable NU
**User Support Email:** rozwerng@gmail.com

**Authorized Domains:**
- chrome-extension://adajbdapblogpigfidemhaddanpodbij

**Scopes:**
- https://www.googleapis.com/auth/calendar
- https://www.googleapis.com/auth/userinfo.email
- https://www.googleapis.com/auth/userinfo.profile


