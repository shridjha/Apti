import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProgressStore = create(
  persist(
    (set, get) => ({
      completedQuestions: [],
      // { qId: { correct: boolean, timeSpent: number, timestamp: string, section: string } }
      attempts: {},
      streaks: 0,
      lastActive: null,
      
      recordAttempt: (qId, correct, timeSpent, section) => set((state) => {
        const attempts = {
          ...state.attempts,
          [qId]: { correct, timeSpent, timestamp: new Date().toISOString(), section }
        };
        const completedQuestions = [...new Set([...state.completedQuestions, qId])];
        return { attempts, completedQuestions, lastActive: new Date().toISOString() };
      }),
      
      // Get total practice minutes for today
      getTodayPracticeMinutes: () => {
        const state = get();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let totalSeconds = 0;
        Object.values(state.attempts).forEach(a => {
          if (a.timestamp) {
            const attemptDate = new Date(a.timestamp);
            if (attemptDate >= today) {
              totalSeconds += a.timeSpent || 0;
            }
          }
        });
        return { minutes: Math.round(totalSeconds / 60), totalSeconds };
      },

      // Get weekly progress percentage change vs prior week
      getWeeklyProgressPercent: () => {
        const state = get();
        const now = new Date();
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(now.getDate() - now.getDay());
        thisWeekStart.setHours(0, 0, 0, 0);
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        let thisWeek = 0;
        let lastWeek = 0;
        Object.values(state.attempts).forEach(a => {
          if (a.timestamp) {
            const d = new Date(a.timestamp);
            if (d >= thisWeekStart) thisWeek++;
            else if (d >= lastWeekStart && d < thisWeekStart) lastWeek++;
          }
        });
        if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
        return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
      },

      // Get weekly stats: questions solved and accuracy
      getWeeklyStats: () => {
        const state = get();
        const now = new Date();
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(now.getDate() - now.getDay());
        thisWeekStart.setHours(0, 0, 0, 0);

        let solved = 0;
        let correct = 0;
        Object.values(state.attempts).forEach(a => {
          if (a.timestamp) {
            const d = new Date(a.timestamp);
            if (d >= thisWeekStart) {
              solved++;
              if (a.correct) correct++;
            }
          }
        });
        const accuracy = solved > 0 ? Math.round((correct / solved) * 100) : 0;
        return { solved, accuracy };
      },

      // Count completed questions by section prefix
      getCompletedBySection: (prefix) => {
        const state = get();
        return state.completedQuestions.filter(id => id.startsWith(prefix)).length;
      },

      resetProgress: () => set({ completedQuestions: [], attempts: {}, streaks: 0, lastActive: null })
    }),
    {
      name: 'apti-progress',
    }
  )
);
