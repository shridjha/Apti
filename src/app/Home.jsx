import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import aptitudeData from '../data/aptitude.json';
import puzzlesData from '../data/puzzles.json';
import { useProgressStore } from '../store/useProgressStore';
import posthog from 'posthog-js';
import { isPushSupported, getPushUnsupportedMessage } from '../utils/device';

// ── Animated count-up hook ──────────────────────────────────────────
function useCountUp(target, duration = 2000, startOnMount = false) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(startOnMount);
  const rafRef = useRef(null);

  const start = useCallback(() => setStarted(true), []);

  useEffect(() => {
    if (!started || target <= 0) return;
    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [started, target, duration]);

  return { count, start };
}

// ── Community stats (hardcoded — edit these whenever you want) ──────
const COMMUNITY_STATS = {
  students: 1764 ,   // ← change this number
  questions: 3006,  // ← change this number
};

export default function Home() {
  const {
    completedQuestions,
    getTodayPracticeMinutes,
    getWeeklyStats,
    streaks,
    lastActive,
    notificationAccepted,
    acceptNotification,
  } = useProgressStore();

  // Skeleton loading state on first mount
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const [notifLoading, setNotifLoading] = useState(false);

  const todayPractice = getTodayPracticeMinutes();
  const todayMins = todayPractice.minutes;
  const todayHasActivity = todayPractice.totalSeconds > 0;
  const weeklyStats = getWeeklyStats();

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

  // Community counter stats
  const studentsCounter = useCountUp(COMMUNITY_STATS.students, 2200);
  const questionsCounter = useCountUp(COMMUNITY_STATS.questions, 2400);
  const counterRef = useRef(null);
  const counterTriggered = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    const node = counterRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counterTriggered.current) {
          counterTriggered.current = true;
          studentsCounter.start();
          questionsCounter.start();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isLoading]);

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



  if (isLoading) {
    return (
      <div className="text-on-background min-h-screen flex flex-col items-center font-body-md text-[16px] leading-[24px] font-medium">
        <main className="w-full max-w-[600px] pb-12">
          {/* Skeleton Header */}
          <header className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="skeleton h-10 w-28" />
            <div className="skeleton h-9 w-32 rounded-full" />
          </header>

          <div className="px-4 sm:px-margin-mobile pt-sm pb-xl">
            {/* Skeleton Greeting */}
            <section className="mb-lg mt-sm space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </section>

            {/* Skeleton Counter Banner */}
            <section className="mb-xl">
              <div className="skeleton h-[120px] w-full rounded-[20px]" />
            </section>

            {/* Skeleton Recent Activity */}
            <section className="mb-xl">
              <div className="skeleton h-7 w-40 mb-md" />
              <div className="grid grid-cols-2 gap-4">
                <div className="skeleton h-[120px] rounded-[20px]" />
                <div className="skeleton h-[120px] rounded-[20px]" />
              </div>
            </section>

            {/* Skeleton Practice Cards */}
            <section className="space-y-10 mt-2">
              <div className="skeleton h-[220px] w-full rounded-[20px]" />
              <div className="skeleton h-[220px] w-full rounded-[20px]" />
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="text-on-background min-h-screen flex flex-col items-center font-body-md text-[16px] leading-[24px] font-medium">
      {/* Mobile Container */}
      <main className="w-full max-w-[600px] pb-12">
        {/* TopAppBar */}
        <header className="bg-background sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-4">
          <img
            src="/logo.png"
            alt="Apti"
            className="h-10 sm:h-12 w-auto object-contain"
          />
          {notificationAccepted ? (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#f6fff5] border-2 border-[#006a3f]/30 text-[#006a3f]"
              title="Daily reminders are on"
            >
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
              <span className="font-label-md text-[12px] sm:text-[13px] font-semibold">Reminder ON 🔥</span>
            </div>
          ) : (
            <button
              onClick={async () => {
                setNotifLoading(true);
                posthog.capture('notification_home_clicked');
                
                if (!isPushSupported() || !window.OneSignal) {
                  alert(getPushUnsupportedMessage());
                  setNotifLoading(false);
                  return;
                }
                  
                  const currentPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
                  if (currentPermission === 'granted') {
                    acceptNotification();
                    try {
                      window.OneSignalDeferred.push(async (OneSignal) => {
                        await OneSignal.Notifications.requestPermission();
                      });
                    } catch (e) { /* ignore */ }
                  } else if (currentPermission === 'default') {
                    try {
                      window.OneSignalDeferred.push(async (OneSignal) => {
                        await OneSignal.Notifications.requestPermission();
                        if (Notification.permission === 'granted') {
                          acceptNotification();
                        }
                      });
                    } catch (e) { /* ignore */ }
                  }
                  setNotifLoading(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary-fixed/60 hover:bg-primary-fixed active:scale-95 transition-all text-on-primary-fixed"
                title="Enable daily reminders"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="font-label-md text-[12px] sm:text-[13px] font-semibold">Remind me</span>
            </button>
          )}
        </header>
        <div className="px-4 sm:px-margin-mobile pt-sm pb-xl">
          {/* Greeting Section */}
          <section className="mb-lg mt-sm">
            <p className="font-label-md text-[13px] sm:text-[16px] leading-[20px] tracking-[0.15em] font-bold text-primary-container/80 uppercase" style={{ fontFamily: 'monospace' }}>NO LOGIN &nbsp;·&nbsp; NO SETUP &nbsp;·&nbsp; START SOLVING</p>
            <p className="font-body-md text-[11px] sm:text-[13px] font-medium [word-spacing:6px] opacity-80">
  YOUR PROGRESS IS SAVED LOCALLY
</p>
          </section>

          {/* Community Counter Banner */}
          <section
            ref={counterRef}
            className="mb-xl"
          >
            <div
              className="relative rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1a1410 0%, #2e1a0a 50%, #1c1208 100%)',
              }}
            >
              {/* Subtle animated glow orbs */}
              <div
                className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, #fd6e20, transparent 70%)',
                  animation: 'counterGlow 4s ease-in-out infinite alternate',
                }}
              />
              <div
                className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-15 blur-3xl pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, #e85d04, transparent 70%)',
                  animation: 'counterGlow 4s ease-in-out 2s infinite alternate',
                }}
              />

              <div className="relative z-10">
                {/* Section Label */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ color: '#ffb596' }}
                  >community</span>
                  <span
                    className="font-label-md text-[11px] sm:text-[12px] tracking-[0.15em] font-bold uppercase"
                    style={{ color: 'rgba(255,181,150,0.8)' }}
                  > Impact</span>
                </div>

                {/* Counter Grid */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  {/* Students Counter */}
                  <div className="text-center">
                    <div
                      className="font-headline-xl text-[32px] sm:text-[40px] leading-none font-extrabold mb-1.5 tabular-nums"
                      style={{
                        background: 'linear-gradient(135deg, #ffb596, #fd6e20)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {studentsCounter.count.toLocaleString()}+
                    </div>
                    <p
                      className="font-body-sm text-[11px] sm:text-[13px] font-semibold leading-tight"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      Students Practised
                    </p>
                  </div>

                  {/* Questions Counter */}
                  <div className="text-center">
                    <div
                      className="font-headline-xl text-[32px] sm:text-[40px] leading-none font-extrabold mb-1.5 tabular-nums"
                      style={{
                        color: '#ffe0c2',
                      }}
                    >
                      {questionsCounter.count.toLocaleString()}+
                    </div>
                    <p
                      className="font-body-sm text-[11px] sm:text-[13px] font-semibold leading-tight"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      Questions Solved
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
              {/* Stat Widget 2 — This Week */}
              <div className="bg-surface-container-lowest rounded-[20px] sm:rounded-[24px] p-4 sm:p-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-surface-variant/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-shadow">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary-fixed flex items-center justify-center mb-sm">
                  <span className="material-symbols-outlined text-on-secondary-fixed text-[20px] sm:text-[24px]">insert_chart</span>
                </div>
                <p className="font-body-sm text-[12px] sm:text-[14px] leading-[16px] sm:leading-[20px] font-semibold text-on-surface mb-2.5">This Week</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-body-sm text-[12px] sm:text-[13px] font-medium text-on-surface-variant">Questions Solved</span>
                    <span className="font-label-md text-[14px] sm:text-[16px] font-bold text-on-surface">{weeklyStats.solved}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-body-sm text-[12px] sm:text-[13px] font-medium text-on-surface-variant">Accuracy</span>
                    <span className="font-label-md text-[14px] sm:text-[16px] font-bold text-on-surface">{weeklyStats.accuracy}%</span>
                  </div>
                </div>
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
