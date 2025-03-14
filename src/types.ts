export interface GolfCourse {
  id: string;
  name: string;
  location: string;
  department: string;
  created_at: string;
}

export interface FavoriteCourse {
  id: string;
  user_id: string;
  course_id: string;
  created_at: string;
}

export interface Round {
  id: string;
  user_id: string;
  course_id: string;
  date: string;
  created_at: string;
  status: 'in_progress' | 'completed';
  notes?: string;
  weather_data?: {
    temperature?: number;
    wind_speed?: number;
    conditions?: string;
    icon_url?: string;
  };
  course?: GolfCourse;
  holes?: HoleScore[];
}

export interface HoleScore {
  id: string;
  round_id: string;
  hole_number: number;
  par: number;
  fairway_hit: boolean;
  green_in_regulation: boolean;
  putts: number;
  score: number;
}

export interface UserProfile {
  id: string;
  user_id: string;
  handicap?: number;
  preferred_tee?: string;
  club_membership?: string;
  created_at: string;
  updated_at: string;
}

export interface WeatherData {
  temperature: number;
  wind_speed: number;
  conditions: string;
  icon_url: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user_email?: string;
  user_profile?: UserProfile;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_by: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  group?: Group;
  inviter_email?: string;
}

export interface GroupPerformance {
  user_id: string;
  user_email?: string;
  user_profile?: UserProfile;
  avg_score?: number;
  avg_over_par?: number;
  fairway_percentage?: number;
  gir_percentage?: number;
  avg_putts?: number;
  rounds_count?: number;
}