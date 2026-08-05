import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import aptitudeData from '../data/aptitude.json';
import puzzlesData from '../data/puzzles.json';
import { useProgressStore } from '../store/useProgressStore';

export default function Home() {
  const {
    completedQuestions,
    getTodayPracticeMinutes,
    getWeeklyProgressPercent,
    getCompletedBySection,
  } = useProgressStore();

  const todayPractice = getTodayPracticeMinutes();
  const todayMins = todayPractice.minutes;
  const todayHasActivity = todayPractice.totalSeconds > 0;
  const weeklyPercent = getWeeklyProgressPercent();
  const aptitudeCompleted = getCompletedBySection('q');
  const puzzlesCompleted = getCompletedBySection('p');
  const totalAptitude = aptitudeData.length;
  const totalPuzzles = puzzlesData.length;
  const aptitudePercent = totalAptitude > 0 ? Math.round((aptitudeCompleted / totalAptitude) * 100) : 0;
  const puzzlesPercent = totalPuzzles > 0 ? Math.round((puzzlesCompleted / totalPuzzles) * 100) : 0;

  useEffect(() => {
    // Progress bar animation on mount
    const timeout = setTimeout(() => {
      const bars = document.querySelectorAll('.progress-bar-fill');
      bars.forEach(bar => {
        const target = bar.dataset.width || '0%';
        bar.style.width = '0%';
        setTimeout(() => {
          bar.style.width = target;
        }, 100);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [aptitudePercent, puzzlesPercent]);

  return (
    <div className="text-on-background min-h-screen flex flex-col items-center font-body-md text-[16px] leading-[24px] font-medium">
      {/* Mobile Container */}
      <main className="w-full max-w-[600px] pb-12">
        {/* TopAppBar */}
        <header className="bg-background flex items-center justify-center px-4 sm:px-margin-mobile py-base w-full sticky z-40 top-0">
          <div className="font-headline-lg text-[28px] sm:text-[32px] leading-[40px] tracking-[-0.01em] font-bold text-primary">Apti</div>
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

          {/* Main Focus Cards */}
          <section className="space-y-lg">
            {/* Card 1: OA Aptitude */}
            <Link
              to="/aptitude"
              className="block spring-card bg-primary-container text-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-md shadow-[0_12px_32px_rgba(253,110,32,0.2)] relative overflow-hidden cursor-pointer group"
            >
              <div className="absolute top-0 right-0 p-md opacity-20 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined" style={{ fontSize: '100px' }}>calculate</span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-lg sm:mb-xl">
                  <div>
                    <span className="bg-white/20 text-white font-body-sm text-[12px] sm:text-[14px] leading-[16px] sm:leading-[20px] font-medium px-sm py-xs rounded-full inline-block mb-sm backdrop-blur-sm">Quantitative</span>
                    <h2 className="font-headline-lg-mobile text-[24px] sm:text-[28px] leading-[32px] sm:leading-[36px] font-bold">OA Aptitude</h2>
                  </div>
                  <span className="material-symbols-outlined text-white/80"></span>
                </div>
                <div className="mb-lg">
                  <div className="flex justify-between font-body-sm text-[12px] sm:text-[14px] leading-[16px] sm:leading-[20px] font-medium mb-xs text-white/90">
                    <span>Progress</span>
                    <span className="font-label-md text-[12px] leading-[16px] tracking-[0.05em] font-semibold">{aptitudeCompleted} / {totalAptitude}</span>
                  </div>
                  <div className="h-2.5 sm:h-3 w-full bg-black/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full progress-bar-fill shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]"
                      data-width={`${aptitudePercent}%`}
                      style={{ width: `${aptitudePercent}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-full bg-white text-primary-container font-label-md text-[12px] leading-[16px] tracking-[0.05em] font-semibold py-2.5 sm:py-sm rounded-xl shadow-md border-b-[3px] border-surface-variant active:border-b-0 active:translate-y-[3px] transition-all flex items-center justify-center gap-2">
                  Continue <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </div>
              </div>
            </Link>

            {/* Card 2: Interview Puzzles */}
            <Link
              to="/puzzles"
              className="block spring-card bg-secondary text-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-md shadow-[0_12px_32px_rgba(96,87,140,0.3)] relative overflow-hidden cursor-pointer group"
            >
              <div className="absolute top-0 right-0 p-md opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined" style={{ fontSize: '100px' }}>extension</span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-lg sm:mb-xl">
                  <div>
                    <span className="bg-black/10 text-white font-body-sm text-[12px] sm:text-[14px] leading-[16px] sm:leading-[20px] font-medium px-sm py-xs rounded-full inline-block mb-sm backdrop-blur-sm">Logic</span>
                    <h2 className="font-headline-lg-mobile text-[24px] sm:text-[28px] leading-[32px] sm:leading-[36px] font-bold">Interview Puzzles</h2>
                  </div>
                  <span className="material-symbols-outlined text-white/80"></span>
                </div>
                <div className="mb-lg">
                  <div className="flex justify-between font-body-sm text-[12px] sm:text-[14px] leading-[16px] sm:leading-[20px] font-medium mb-xs text-white/90">
                    <span>Progress</span>
                    <span className="font-label-md text-[12px] leading-[16px] tracking-[0.05em] font-semibold">{puzzlesCompleted} / {totalPuzzles}</span>
                  </div>
                  <div className="h-2.5 sm:h-3 w-full bg-black/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full progress-bar-fill shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]"
                      data-width={`${puzzlesPercent}%`}
                      style={{ width: `${puzzlesPercent}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-full bg-white text-secondary font-label-md text-[12px] leading-[16px] tracking-[0.05em] font-semibold py-2.5 sm:py-sm rounded-xl shadow-md border-b-[3px] border-surface-variant active:border-b-0 active:translate-y-[3px] transition-all flex items-center justify-center gap-2">
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
