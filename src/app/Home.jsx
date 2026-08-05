import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import aptitudeData from '../data/aptitude.json';
import puzzlesData from '../data/puzzles.json';
import { useProgressStore } from '../store/useProgressStore';
import posthog from 'posthog-js';

export default function Home() {
  const {
    completedQuestions,
    getTodayPracticeMinutes,
    getWeeklyProgressPercent,
    streaks,
    lastActive,
  } = useProgressStore();

  const todayPractice = getTodayPracticeMinutes();
  const todayMins = todayPractice.minutes;
  const todayHasActivity = todayPractice.totalSeconds > 0;
  const weeklyPercent = getWeeklyProgressPercent();

  const totalAptitude = aptitudeData.length;
  const totalPuzzles = puzzlesData.length;

  // Sync only completed question IDs that exist in the active JSON datasets
  const aptitudeCompleted = completedQuestions.filter(id => aptitudeData.some(q => q.id === id)).length;
  const puzzlesCompleted = completedQuestions.filter(id => puzzlesData.some(q => q.id === id)).length;

  const aptitudePercent = totalAptitude > 0 ? Math.round((aptitudeCompleted / totalAptitude) * 100) : 0;
  const puzzlesPercent = totalPuzzles > 0 ? Math.round((puzzlesCompleted / totalPuzzles) * 100) : 0;

  // React-controlled state for progress bar transition
  const [aptitudeWidth, setAptitudeWidth] = React.useState(0);
  const [puzzlesWidth, setPuzzlesWidth] = React.useState(0);

  useEffect(() => {
    // Send user profile stats to PostHog for PM segmentation and cohort analysis
    posthog.people.set({
      streak_count: streaks,
      last_active_time: lastActive,
      aptitude_completed: aptitudeCompleted,
      puzzles_completed: puzzlesCompleted,
      total_completed: aptitudeCompleted + puzzlesCompleted,
      aptitude_progress_percent: aptitudePercent,
      puzzles_progress_percent: puzzlesPercent,
    });
    posthog.capture('home_viewed');
  }, [streaks, lastActive, aptitudeCompleted, puzzlesCompleted, aptitudePercent, puzzlesPercent]);

  useEffect(() => {
    // Delay slightly to trigger transition from 0% to target percent
    const timeout = setTimeout(() => {
      setAptitudeWidth(aptitudePercent);
      setPuzzlesWidth(puzzlesPercent);
    }, 200);
    return () => clearTimeout(timeout);
  }, [aptitudePercent, puzzlesPercent]);

  return (
    <div className="text-on-background min-h-screen flex flex-col items-center font-body-md text-[16px] leading-[24px] font-medium">
      {/* Mobile Container */}
      <main className="w-full max-w-[600px] pb-12">
        {/* TopAppBar */}
        <header className="bg-background sticky top-0 z-40 flex items-center justify-start px-4 sm:px-6 py-4">
          <img
            src="/logo.png"
            alt="Apti"
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </header>
        <div className="px-4 sm:px-margin-mobile pt-sm pb-xl">
          {/* Greeting Section */}
          <section className="mb-lg mt-sm">
            <p className="font-label-md text-[13px] sm:text-[16px] leading-[20px] tracking-[0.15em] font-bold text-primary-container/80 uppercase" style={{ fontFamily: 'monospace' }}>NO LOGIN &nbsp;·&nbsp; NO SETUP &nbsp;·&nbsp; START SOLVING</p>
            <p className="font-body-md text-[11px] sm:text-[13px] font-medium [word-spacing:6px] opacity-80">
  YOUR PROGRESS IS SAVED LOCALLY
</p>
          </section>

          {/* Recent Activity / Stats — ABOVE the cards */}
          <section className="mb-xl">
            <div className="flex justify-between items-center mb-md">
              <h3 className="font-headline-lg-mobile text-[24px] sm:text-[28px] leading-[32px] sm:leading-[36px] font-bold text-on-surface">Recent Activity</h3>
              {/* <button className="font-label-md text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-primary-container hover:opacity-80 transition-opacity">See All</button> */}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-gutter">
              {/* Stat Widget 1 — Today's Practice */}
              <div className="bg-surface-container-lowest rounded-[20px] sm:rounded-[24px] p-4 sm:p-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-surface-variant/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-fixed flex items-center justify-center mb-sm">
                  <span className="material-symbols-outlined text-on-primary-fixed text-[20px] sm:text-[24px]">local_fire_department</span>
                </div>
                <p className="font-body-sm text-[12px] sm:text-[14px] leading-[16px] sm:leading-[20px] font-medium text-on-surface-variant mb-xs">Today's Practice</p>
                <p className="font-headline-lg-mobile text-[24px] sm:text-[28px] leading-[32px] sm:leading-[36px] font-bold text-on-surface">
                  {todayMins > 0 ? todayMins : (todayHasActivity ? '< 1' : '0')} <span className="text-xs sm:text-sm font-normal text-on-surface-variant">mins</span>
                </p>
              </div>
              {/* Stat Widget 2 — Weekly Progress */}
              <div className="bg-surface-container-lowest rounded-[20px] sm:rounded-[24px] p-4 sm:p-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-surface-variant/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary-fixed flex items-center justify-center mb-sm">
                  <span className="material-symbols-outlined text-on-secondary-fixed text-[20px] sm:text-[24px]">trending_up</span>
                </div>
                <p className="font-body-sm text-[12px] sm:text-[14px] leading-[16px] sm:leading-[20px] font-medium text-on-surface-variant mb-xs">Weekly Progress</p>
                <p className="font-headline-lg-mobile text-[24px] sm:text-[28px] leading-[32px] sm:leading-[36px] font-bold text-on-surface">
                  {weeklyPercent >= 0 ? '+' : ''}{weeklyPercent}% <span className="text-xs sm:text-sm font-normal text-on-surface-variant">vs last</span>
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-10 mt-2">
            {/* Card 1: OA Aptitude */}
            <Link
              to="/aptitude"
              onClick={() => posthog.capture('section_selected', { section: 'aptitude' })}
              className="block spring-card rounded-[20px] sm:rounded-[28px] p-5 sm:p-6 relative overflow-hidden cursor-pointer group"
              style={{ background: 'linear-gradient(145deg, #ff8c42, #FD6E20, #e85d04)' }}
            >
              {/* Background icon */}
              <div className="absolute top-4 right-4 opacity-[0.12] pointer-events-none group-hover:opacity-[0.18] transition-opacity duration-500">
                <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>calculate</span>
              </div>

              <div className="relative z-10">
                {/* Category badge */}
                <div className="inline-block bg-white/20 text-white font-label-md text-[11px] sm:text-[13px] font-semibold px-3 py-1.5 rounded-xl mb-3 backdrop-blur-sm max-w-[85%] leading-snug">
                  OA questions with exact pattern as companies ask  
                </div>

                {/* Title */}
                <h2 className="font-headline-lg-mobile text-white text-[24px] sm:text-[30px] leading-[1.15] font-bold mb-5">
                  OA Aptitude
                </h2>

                {/* Progress */}
                <div className="mb-5">
                  <div className="flex justify-between text-[14px] sm:text-[16px] font-bold mb-1.5 text-white/90 italic">
                    <span>Progress</span>
                    <span className="not-italic font-bold">{aptitudeCompleted} / {totalAptitude}</span>
                  </div>
                  <div className="h-2.5 sm:h-3 w-full bg-black/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full progress-bar-fill"
                      style={{ width: `${aptitudeWidth}%`, boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.08)' }}
                    ></div>
                  </div>
                </div>

                {/* Continue button */}
                <div className="w-full bg-white text-[#FD6E20] font-label-md text-[15px] sm:text-[17px] font-semibold py-2.5 sm:py-3 rounded-xl shadow-md border-b-[3px] border-black/5 active:border-b-0 active:translate-y-[3px] transition-all flex items-center justify-center gap-2">
                  Continue <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </div>
              </div>
            </Link>

            {/* Card 2: Interview Puzzles */}
            <Link
              to="/puzzles"
              onClick={() => posthog.capture('section_selected', { section: 'puzzles' })}
              className="block spring-card rounded-[20px] sm:rounded-[28px] p-5 sm:p-6 relative overflow-hidden cursor-pointer group"
              style={{ background: 'linear-gradient(145deg, #7a6faa, #60578C, #504878)' }}
            >
              {/* Background icon */}
              <div className="absolute top-4 right-4 opacity-[0.10] pointer-events-none group-hover:opacity-[0.16] transition-opacity duration-500">
                <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>extension</span>
              </div>

              <div className="relative z-10">
                {/* Category badge */}
                <div className="inline-block bg-white/15 text-white font-label-md text-[11px] sm:text-[13px] font-semibold px-3 py-1.5 rounded-xl mb-3 backdrop-blur-sm max-w-[85%] leading-snug">
                  Most repeated puzzles FANG+ interviews
                </div>

                {/* Title */}
                <h2 className="font-headline-lg-mobile text-white text-[24px] sm:text-[30px] leading-[1.15] font-bold mb-5">
                  Interview Puzzles
                </h2>

                {/* Progress */}
                <div className="mb-5">
                  <div className="flex justify-between text-[14px] sm:text-[16px] font-bold mb-1.5 text-white/90 italic">
                    <span>Progress</span>
                    <span className="not-italic font-bold">{puzzlesCompleted} / {totalPuzzles}</span>
                  </div>
                  <div className="h-2.5 sm:h-3 w-full bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full progress-bar-fill"
                      style={{ width: `${puzzlesWidth}%`, boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.08)' }}
                    ></div>
                  </div>
                </div>

                {/* Continue button */}
                <div className="w-full bg-white text-[#60578C] font-label-md text-[15px] sm:text-[17px] font-semibold py-2.5 sm:py-3 rounded-xl shadow-md border-b-[3px] border-black/5 active:border-b-0 active:translate-y-[3px] transition-all flex items-center justify-center gap-2">
                  Continue <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </div>
              </div>
            </Link>

          </section>
        </div>
      </main>

    </div>
  );
}
