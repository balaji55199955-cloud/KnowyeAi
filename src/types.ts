export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' | 'Exercise';

export interface Micronutrients {
  sodium?: number;     // mg
  potassium?: number;  // mg
  calcium?: number;    // mg
  iron?: number;       // mg
  vitaminC?: number;   // mg
}

export interface LoggedItem {
  id: string;
  name: string;
  calories: number; // positive for food, negative or separate for exercise
  protein: number;  // grams
  carbs: number;    // grams
  fat: number;      // grams
  amount: string;   // e.g. "1 serve", "200g", "30 mins"
  category: MealCategory;
  timestamp: number; // ms since epoch
  isExercise: boolean;
  caloriesBurned?: number;
  micros?: Micronutrients;
}

export interface DailyGoal {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
  micros?: Micronutrients; // Optional target micros
}

export interface UserProfile {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  goal: 'lose' | 'gain' | 'maintain';
}

export interface WeightLog {
  id: string;
  weight: number; // in kg or lb
  timestamp: number;
}


export interface WaterLog {
  id: string;
  amount: number; // in ml
  timestamp: number;
}

export interface ParseResult {
  items: Omit<LoggedItem, 'id' | 'timestamp'>[];
  summary: string;
}
