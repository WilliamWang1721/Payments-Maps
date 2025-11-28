export interface Habit {
  id: string;
  name: string;
  trainer: string;
  completedSessions: number;
  totalSessions: number;
  icon: string; // Emoji or icon name
  color: string;
}

export interface DailyStats {
  caloriesIntake: number;
  caloriesBurned: number;
  activityTimeHours: number;
  steps: number;
  stepsGoal: number;
  weight: number;
  weightGoal: number;
}

export interface CalendarDay {
  day: number;
  status: 'current' | 'done' | 'scheduled' | 'none';
  isToday?: boolean;
}
