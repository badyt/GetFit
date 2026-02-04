import { create } from 'zustand';

type MealDayFood = {
  id?: string;
  foodId: string;
  foodName: string;
  quantity: number;
  mealTime: string;
  description: string;
};

type MealDay = {
  dayOfWeek: number;
  meals: MealDayFood[];
};

type WorkoutExercise = {
  id?: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  restTime: number;
};

type WorkoutDay = {
  dayOfWeek: number;
  description: string;
  exercises: WorkoutExercise[];
};

type PlanStore = {
  // Meal Plan
  mealPlanName: string;
  mealDays: MealDay[];
  setMealPlanName: (name: string) => void;
  setMealDays: (days: MealDay[]) => void;
  addMealToDay: (dayIndex: number, meal: MealDayFood) => void;
  removeMealFromDay: (dayIndex: number, mealIndex: number) => void;
  clearMealPlan: () => void;

  // Workout Plan
  workoutPlanName: string;
  workoutDays: WorkoutDay[];
  setWorkoutPlanName: (name: string) => void;
  setWorkoutDays: (days: WorkoutDay[]) => void;
  addExerciseToDay: (dayIndex: number, exercise: WorkoutExercise) => void;
  removeExerciseFromDay: (dayIndex: number, exerciseIndex: number) => void;
  clearWorkoutPlan: () => void;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const usePlanStore = create<PlanStore>((set) => ({
  // Meal Plan State
  mealPlanName: '',
  mealDays: DAYS.map((_, index) => ({ dayOfWeek: index, meals: [] })),
  
  setMealPlanName: (name) => set({ mealPlanName: name }),
  
  setMealDays: (days) => set({ mealDays: days }),
  
  addMealToDay: (dayIndex, meal) => set((state) => {
    const newDays = state.mealDays.map((day, index) => 
      index === dayIndex 
        ? { ...day, meals: [...day.meals, meal] }
        : day
    );
    return { mealDays: newDays };
  }),
  
  removeMealFromDay: (dayIndex, mealIndex) => set((state) => {
    const newDays = state.mealDays.map((day, index) => 
      index === dayIndex 
        ? { ...day, meals: day.meals.filter((_, i) => i !== mealIndex) }
        : day
    );
    return { mealDays: newDays };
  }),
  
  clearMealPlan: () => set({
    mealPlanName: '',
    mealDays: DAYS.map((_, index) => ({ dayOfWeek: index, meals: [] })),
  }),

  // Workout Plan State
  workoutPlanName: '',
  workoutDays: DAYS.map((_, index) => ({ dayOfWeek: index, description: '', exercises: [] })),
  
  setWorkoutPlanName: (name) => set({ workoutPlanName: name }),
  
  setWorkoutDays: (days) => set({ workoutDays: days }),
  
  addExerciseToDay: (dayIndex, exercise) => set((state) => {
    const newDays = state.workoutDays.map((day, index) => 
      index === dayIndex 
        ? { ...day, exercises: [...day.exercises, exercise] }
        : day
    );
    return { workoutDays: newDays };
  }),
  
  removeExerciseFromDay: (dayIndex, exerciseIndex) => set((state) => {
    const newDays = state.workoutDays.map((day, index) => 
      index === dayIndex 
        ? { ...day, exercises: day.exercises.filter((_, i) => i !== exerciseIndex) }
        : day
    );
    return { workoutDays: newDays };
  }),
  
  clearWorkoutPlan: () => set({
    workoutPlanName: '',
    workoutDays: DAYS.map((_, index) => ({ dayOfWeek: index, description: '', exercises: [] })),
  }),
}));

export default usePlanStore;
