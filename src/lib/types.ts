export type AppRole = 'super_admin' | 'club_poc';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  club_id: string | null;
  created_at: string;
}

export interface Club {
  id: string;
  club_name: string;
  description: string | null;
  created_at: string;
}

export interface Venue {
  id: string;
  venue_name: string;
  capacity: number | null;
  location: string | null;
  available: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  event_name: string;
  description: string | null;
  club_id: string;
  venue_id: string;
  start_time: string;
  end_time: string;
  registration_start: string;
  registration_end: string;
  is_open: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  clubs?: Club;
  venues?: Venue;
}

export interface Notification {
  id: string;
  email: string;
  event_id: string;
  notified_at: string | null;
  status: 'pending' | 'sent';
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface ClashSuggestion {
  venue: Venue;
  availableSlots: { start: Date; end: Date }[];
}
