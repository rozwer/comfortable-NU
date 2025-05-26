// Type definitions for Google Calendar sync functionality

export interface GoogleAccount {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface SyncResult {
  assignments: SyncItem[];
  quizzes: SyncItem[];
  errors: SyncError[];
}

export interface SyncItem {
  title: string;
  success: boolean;
  eventId?: string;
}

export interface SyncError {
  type: 'assignment' | 'quiz';
  title: string;
  error: string;
}

export interface CalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  reminders: {
    useDefault: boolean;
    overrides: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

export interface ChromeMessage {
  action: string;
  data?: any;
  token?: string;
}

export interface ChromeResponse {
  success: boolean;
  token?: string;
  accounts?: GoogleAccount[];
  result?: SyncResult;
  error?: string;
}

// Chrome Identity API types
declare global {
  namespace chrome {
    namespace identity {
      function getAuthToken(details: {
        interactive: boolean;
        scopes?: string[];
      }): Promise<string>;
      
      function removeCachedAuthToken(details: {
        token: string;
      }, callback: () => void): void;
    }
  }
}
