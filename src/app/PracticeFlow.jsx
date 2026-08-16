import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import aptitudeData from '../data/aptitude.json';
import puzzlesData from '../data/puzzles.json';
import { useProgressStore } from '../store/useProgressStore';
import posthog from 'posthog-js';

export default function PracticeFlow() {
  const { section } = useParams();
  const [searchParams] = useSearchParams();
  const topic = searchParams.get('topic');
  const navigate = useNavigate();
  
  const isPuzzle = section === 'puzzles';
  const data = isPuzzle ? puzzlesData : aptitudeData;
  const questions = data.filter(q => q.subcategory === topic);
  const sectionLabel = isPuzzle ? 'Puzzles' : 'Aptitude';
  
  const { recordAttempt, completedQuestions, notificationDismissCount, notificationAccepted, dismissNotificationPrompt, acceptNotification } = useProgressStore();

  // Start at the first uncompleted question so half-done topics resume where the user left off
  const firstUncompletedIndex = questions.findIndex(q => !completedQuestions.includes(q.id));
  const startIndex = firstUncompletedIndex === -1 ? 0 : firstUncompletedIndex;

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [selectedOption, setSelectedOption] = useState(null);
  const [puzzleAnswer, setPuzzleAnswer] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [puzzleSelfAssessed, setPuzzleSelfAssessed] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [showRedBlink, setShowRedBlink] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Push notification prompt state
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const sessionCompletionsRef = useRef(0);

  const reportReasons = [
    { id: 'wrong_answer', label: 'Wrong Answer', icon: 'close' },
    { id: 'typo', label: 'Typo', icon: 'spellcheck' },
    { id: 'incorrect_explanation', label: 'Incorrect Explanation', icon: 'menu_book' },
    { id: 'duplicate', label: 'Duplicate', icon: 'content_copy' },
    { id: 'other', label: 'Other', icon: 'more_horiz' },
  ];

  const handleReport = (reason) => {
    posthog.capture('question_reported', {
      section,
      topic,
      question_id: currentQ.id,
      question_text: currentQ.question,
      reason: reason.id,
      reason_label: reason.label,
    });
    setShowReportModal(false);
    setReportSubmitted(true);
    setTimeout(() => setReportSubmitted(false), 2500);
  };

  // Timer state
  const [timeLeft, setTimeLeft] = useState(() => questions[startIndex]?.timeLimit || 60);
  const timerRef = useRef(null);
  const hasStartedRef = useRef(false);

  const currentQ = questions[currentIndex];
  const timeLimit = currentQ?.timeLimit || 60;

  // Track whether we're navigating back to a completed question
  const [navigatingBack, setNavigatingBack] = useState(false);

  // Reset everything when question changes
  useEffect(() => {
    if (currentQ) {
      const isAlreadyCompleted = completedQuestions.includes(currentQ.id);
      
      if (navigatingBack && isAlreadyCompleted) {
        // Going back to a completed question — show it in review mode
        setShowExplanation(true);
        setPuzzleSelfAssessed(true);
        setSelectedOption(currentQ.answer); // Show the correct answer highlighted
        setPuzzleAnswer('');
        hasStartedRef.current = false;
        setTimeLeft(0);
        clearInterval(timerRef.current);
        setNavigatingBack(false);
      } else {
        // Normal forward navigation — fresh question
        posthog.capture('question_started', { section, topic, question_id: currentQ.id });
        setStartTime(Date.now());
        setSelectedOption(null);
        setPuzzleAnswer('');
        setShowExplanation(false);
        setPuzzleSelfAssessed(false);
        setTimeExpired(false);
        setShowRedBlink(false);
        hasStartedRef.current = false;
        setTimeLeft(currentQ.timeLimit || 60);
        // Mark as started on next tick so the auto-submit guard works
        requestAnimationFrame(() => { hasStartedRef.current = true; });
      }
    }
    setReportSubmitted(false);
    setShowReportModal(false);
  }, [currentIndex, currentQ?.id, section, topic]);

  // Countdown timer
  useEffect(() => {
    if (showExplanation) {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-submit on time up
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, showExplanation]);

  // When timer reaches 0, trigger the time-expired state (red blink + reveal button)
  useEffect(() => {
    if (timeLeft === 0 && !showExplanation && !timeExpired && currentQ && hasStartedRef.current) {
      setTimeExpired(true);
      setShowRedBlink(true);
      posthog.capture('question_timeout', { section, topic, question_id: currentQ.id });
      // Remove blink animation after it plays
      setTimeout(() => setShowRedBlink(false), 1800);
    }
  }, [timeLeft]);

  // Check if we should show the notification prompt
  const checkNotificationPrompt = useCallback(() => {
    if (notificationAccepted) return;
    sessionCompletionsRef.current += 1;
    const count = sessionCompletionsRef.current;
    // First prompt at 4, re-prompt at 10 if dismissed once
    const shouldPrompt =
      (notificationDismissCount === 0 && count === 4) ||
      (notificationDismissCount === 1 && count === 10);
    if (shouldPrompt) {
      setShowNotificationModal(true);
    }
  }, [notificationAccepted, notificationDismissCount]);

  const handleRevealAnswer = useCallback(() => {
    const timeSpent = currentQ.timeLimit || 60;
    checkNotificationPrompt();
    if (!isPuzzle) {
      // Aptitude: record result on reveal
      recordAttempt(currentQ.id, selectedOption === currentQ.answer, timeSpent, section);
    }
    // Puzzles: defer to self-assessment buttons
    setShowExplanation(true);
  }, [currentQ, selectedOption, isPuzzle, section, recordAttempt, checkNotificationPrompt]);

  if (!currentQ) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <div className="text-center">
        <p className="text-on-surface-variant text-[16px] mb-4">No questions found for this topic.</p>
        <button onClick={() => navigate(-1)} className="bg-primary text-white px-6 py-3 rounded-xl font-semibold">Go Back</button>
      </div>
    </div>
  );

  // --- Handlers ---
  const handleOptionSelect = (index) => {
    if (showExplanation || timeExpired) return;
    setSelectedOption(index);
  };


  const handleNotificationAccept = async () => {
    acceptNotification();
    setShowNotificationModal(false);
    posthog.capture('notification_accepted');
    // Trigger OneSignal native browser prompt
    try {
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async (OneSignal) => {
          await OneSignal.Notifications.requestPermission();
        });
      }
    } catch (e) {
      console.warn('OneSignal prompt failed:', e);
    }
  };

  const handleNotificationDismiss = () => {
    dismissNotificationPrompt();
    setShowNotificationModal(false);
    posthog.capture('notification_dismissed', { dismissCount: notificationDismissCount + 1 });
  };

  const handleSubmitAptitude = () => {
    if (selectedOption === null) return;
    clearInterval(timerRef.current);
    const isCorrect = selectedOption === currentQ.answer;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    recordAttempt(currentQ.id, isCorrect, timeSpent, section);
    posthog.capture('question_completed', { section, topic, question_id: currentQ.id, isCorrect, timeSpent });
    setShowExplanation(true);
    checkNotificationPrompt();
  };

  const handleSubmitPuzzle = () => {
    if (!puzzleAnswer.trim()) return;
    clearInterval(timerRef.current);
    // Don't record attempt yet — wait for self-assessment
    posthog.capture('puzzle_answer_revealed', { section, topic, question_id: currentQ.id });
    setShowExplanation(true);
  };

  const handlePuzzleSelfAssess = (gotItRight) => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    recordAttempt(currentQ.id, gotItRight, timeSpent, section);
    posthog.capture('question_completed', { section, topic, question_id: currentQ.id, isCorrect: gotItRight, timeSpent });
    setPuzzleSelfAssessed(true);
    checkNotificationPrompt();
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setNavigatingBack(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      posthog.capture('topic_completed', { section, topic });
      navigate('/');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setNavigatingBack(true);
      setCurrentIndex(prev => prev - 1);
    }
  };

  // --- Timer helpers ---
  const timerPercent = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0;
  const timerColor = timerPercent > 50
    ? '#f59e0b'   // amber/orange
    : timerPercent > 20
      ? '#ef4444'  // red
      : '#dc2626'; // deep red

  const isCompleted = showExplanation;
  const canSubmit = isPuzzle ? puzzleAnswer.trim().length > 0 : selectedOption !== null;
  const isLocked = timeExpired || isCompleted;

  return (
    <div className="text-on-background min-h-screen flex flex-col items-center bg-background font-body-md text-[16px] leading-[24px] font-medium">
      <main className="w-full max-w-[600px] pb-28 sm:pb-32 h-full flex flex-col">
        {/* Header: ← Section / Topic */}
        <header className="flex items-center px-4 sm:px-margin-mobile h-14 sm:h-16 w-full sticky z-40 top-0 bg-background gap-3">
          <button onClick={() => navigate(-1)} className="text-on-surface-variant hover:opacity-80 active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <span className="font-headline-sm text-[16px] sm:text-[18px] font-semibold text-on-surface-variant">
            {sectionLabel} / {topic}
          </span>
        </header>

        {/* Question Card */}
        <div className="px-4 sm:px-margin-mobile pt-sm flex-1 flex flex-col">
          <div
            className={`bg-surface-container-lowest rounded-[24px] sm:rounded-[28px] p-5 sm:p-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-surface-variant/40 flex flex-col mb-lg relative overflow-hidden`}
            style={{
              animation: showRedBlink ? 'redBlink 1.8s ease-in-out' : 'none',
            }}
          >
            {/* Question meta row */}
            <div className="flex items-center gap-2 sm:gap-3 mb-sm flex-wrap">
              <span className="font-label-md text-[11px] sm:text-[12px] leading-[16px] tracking-[0.1em] font-bold text-on-surface-variant uppercase" style={{ fontFamily: 'monospace' }}>
                Question {currentIndex + 1} / {questions.length}
              </span>
              <span className={`font-label-md text-[10px] sm:text-[11px] leading-[14px] tracking-[0.05em] font-bold uppercase px-2 py-0.5 rounded-full ${
                currentQ.difficulty === 'easy' ? 'bg-[#e8f5e9] text-[#2e7d32]' :
                currentQ.difficulty === 'medium' ? 'bg-[#fff3e0] text-[#e65100]' :
                'bg-[#fce4ec] text-[#c62828]'
              }`}>
                {currentQ.difficulty}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                {!isCompleted && (
                  timeExpired ? (
                    <span className="flex items-center gap-1 text-[#dc2626] font-label-md text-[12px] sm:text-[13px] font-bold">
                      <span className="material-symbols-outlined text-[18px]">alarm</span>
                      Time's Up!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-on-surface-variant font-label-md text-[12px] sm:text-[13px] font-semibold">
                      <span className="material-symbols-outlined text-[18px]">timer</span>
                      {timeLeft}s
                    </span>
                  )
                )}
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded-full hover:bg-surface-variant/50 active:scale-90 transition-all text-on-surface-variant/60 hover:text-on-surface-variant"
                  title="Report this question"
                >
                  <span className="material-symbols-outlined text-[16px]">flag</span>
                  <span className="font-label-md text-[11px] sm:text-[12px] font-semibold">Report</span>
                </button>
              </div>
            </div>

            {/* Red overlay flash */}
            {showRedBlink && (
              <div
                className="absolute inset-0 rounded-[24px] sm:rounded-[28px] pointer-events-none z-10"
                style={{
                  backgroundColor: '#dc2626',
                  animation: 'redOverlayFlash 1.8s ease-in-out',
                }}
              />
            )}

            {/* Timer progress bar */}
            {!isCompleted && !timeExpired && (
              <div className="h-[5px] w-full bg-surface-variant/60 rounded-full overflow-hidden mb-lg">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${timerPercent}%`, backgroundColor: timerColor }}
                ></div>
              </div>
            )}

            {/* Question text */}
            <h2 className="font-body-lg text-[17px] sm:text-[19px] leading-[26px] sm:leading-[30px] text-on-surface font-semibold">
              {currentQ.question}
            </h2>
          </div>

          {/* --- Aptitude: Multiple Choice Options --- */}
          {!isPuzzle && (
            <div className="space-y-2.5 sm:space-y-sm mb-lg sm:mb-xl flex-1">
              {currentQ.options.map((opt, i) => {
                let btnClass = "w-full text-left p-3.5 sm:p-md rounded-[16px] sm:rounded-2xl border-2 transition-all font-body-md text-[14px] sm:text-[16px] ";
                
                if (!isCompleted && !timeExpired) {
                  if (selectedOption === i) {
                    btnClass += "border-primary bg-primary-fixed-dim/20 shadow-sm";
                  } else {
                    btnClass += "border-surface-variant bg-surface-container-lowest hover:border-outline-variant";
                  }
                } else if (timeExpired && !isCompleted) {
                  // Locked state — muted appearance
                  if (selectedOption === i) {
                    btnClass += "border-surface-variant bg-surface-container-low opacity-70";
                  } else {
                    btnClass += "border-surface-variant bg-surface-container-lowest opacity-50";
                  }
                } else {
                  if (i === currentQ.answer) {
                    btnClass += "border-[#006a3f] bg-[#f6fff5] text-[#002110]";
                  } else if (selectedOption === i) {
                    btnClass += "border-[#ba1a1a] bg-[#ffdad6] text-[#93000a]";
                  } else {
                    btnClass += "border-surface-variant bg-surface-container-lowest opacity-50";
                  }
                }

                return (
                  <button 
                    key={i} 
                    onClick={() => handleOptionSelect(i)}
                    className={btnClass}
                    disabled={isLocked}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="flex-1">{opt}</span>
                      {isCompleted && i === currentQ.answer && <span className="material-symbols-outlined text-[#006a3f] text-[20px] shrink-0">check_circle</span>}
                      {isCompleted && selectedOption === i && i !== currentQ.answer && <span className="material-symbols-outlined text-[#ba1a1a] text-[20px] shrink-0">cancel</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* --- Puzzles: Free-text Answer Box --- */}
          {isPuzzle && (
            <div className="mb-lg sm:mb-xl flex-1">
              {!isCompleted ? (
                <div>
                  <label className="font-label-md text-[12px] sm:text-[13px] tracking-[0.05em] font-bold text-on-surface-variant uppercase mb-sm block">Your Answer</label>
                  <textarea
                    value={puzzleAnswer}
                    onChange={(e) => !timeExpired && setPuzzleAnswer(e.target.value)}
                    placeholder="Type your answer or reasoning here..."
                    disabled={timeExpired}
                    className="w-full min-h-[140px] sm:min-h-[160px] p-4 rounded-[16px] sm:rounded-2xl border-2 border-surface-variant bg-surface-container-lowest text-on-surface font-body-md text-[14px] sm:text-[16px] leading-[22px] sm:leading-[24px] resize-none focus:border-primary focus:outline-none transition-colors placeholder:text-on-surface-variant/40"
                  />
                </div>
              ) : (
                <div className="space-y-sm">
                  {/* User's answer */}
                  <div className="bg-surface-container-low rounded-[16px] sm:rounded-2xl p-4 sm:p-md border border-surface-variant/40">
                    <h4 className="font-label-md text-[11px] sm:text-[12px] tracking-[0.05em] font-bold text-on-surface-variant uppercase mb-xs">Your Answer</h4>
                    <p className="font-body-md text-[14px] sm:text-[15px] text-on-surface whitespace-pre-wrap">{puzzleAnswer || '(no answer — time ran out)'}</p>
                  </div>
                  {/* Correct answer */}
                  <div className="bg-[#f6fff5] rounded-[16px] sm:rounded-2xl p-4 sm:p-md border-2 border-[#006a3f]/30">
                    <h4 className="font-label-md text-[11px] sm:text-[12px] tracking-[0.05em] font-bold text-[#006a3f] uppercase mb-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span> Correct Answer
                    </h4>
                    <p className="font-body-md text-[14px] sm:text-[15px] text-[#002110] font-semibold">{currentQ.options[currentQ.answer]}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Explanation (both modes) */}
          {isCompleted && (
            <div className="bg-surface-container-low rounded-[16px] sm:rounded-2xl p-4 sm:p-md mb-lg sm:mb-xl border border-surface-variant/40">
              <h3 className="font-headline-lg-mobile text-[16px] sm:text-lg mb-xs font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">lightbulb</span>
                Explanation
              </h3>
              <p className="font-body-sm text-[13px] sm:text-[14px] leading-[20px] text-on-surface-variant font-medium">
                {currentQ.explanation}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowReportModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          {/* Bottom sheet */}
          <div
            className="relative w-full max-w-[600px] bg-surface-container-lowest rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-10 h-1 rounded-full bg-surface-variant/60 mx-auto mb-5 sm:hidden" />

            <div className="flex items-center justify-between mb-5">
              <h3 className="font-headline-sm text-[18px] sm:text-[20px] font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-error">flag</span>
                Report Question
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-variant/40 active:scale-90 transition-all text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <p className="font-body-sm text-[13px] sm:text-[14px] text-on-surface-variant mb-4">What's wrong with this question?</p>

            <div className="space-y-2">
              {reportReasons.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => handleReport(reason)}
                  className="w-full flex items-center gap-3 p-3.5 sm:p-4 rounded-[16px] border-2 border-surface-variant bg-surface-container-lowest hover:border-primary/40 hover:bg-primary-fixed-dim/10 active:scale-[0.98] transition-all text-left"
                >
                  <span className="w-9 h-9 rounded-full bg-surface-variant/40 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{reason.icon}</span>
                  </span>
                  <span className="font-body-md text-[14px] sm:text-[15px] font-semibold text-on-surface">{reason.label}</span>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant/40 ml-auto">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report submitted toast */}
      {reportSubmitted && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-slide-down">
          <div className="bg-[#1b5e20] text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-label-md text-[14px] font-semibold">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            Thanks! Report submitted.
          </div>
        </div>
      )}

      {/* Notification Permission Modal */}
      {showNotificationModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={handleNotificationDismiss}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          {/* Bottom sheet */}
          <div
            className="relative w-full max-w-[600px] bg-surface-container-lowest rounded-t-[28px] sm:rounded-[28px] p-6 sm:p-8 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-10 h-1 rounded-full bg-surface-variant/60 mx-auto mb-6 sm:hidden" />

            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px] text-primary">notifications_active</span>
            </div>

            {/* Heading */}
            <h3 className="font-headline-sm text-[20px] sm:text-[22px] font-bold text-on-surface text-center mb-2">
              Stay on track! 🎯
            </h3>

            {/* Message */}
            <p className="font-body-md text-[14px] sm:text-[15px] text-on-surface-variant text-center mb-6 leading-relaxed">
              This is to ensure you do daily practice.<br />
              <span className="text-[13px] opacity-70">PS — I won't spam 😊</span>
            </p>

            {/* Accept button */}
            <button
              onClick={handleNotificationAccept}
              className="w-full py-3.5 sm:py-md rounded-[16px] sm:rounded-2xl font-label-md text-[16px] sm:text-lg font-semibold bg-primary text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-3"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              Allow Notifications
            </button>

            {/* Dismiss link */}
            <button
              onClick={handleNotificationDismiss}
              className="w-full py-2 font-body-sm text-[13px] sm:text-[14px] text-on-surface-variant/60 hover:text-on-surface-variant transition-colors text-center"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Bottom action button */}
      <div className="fixed bottom-0 left-0 w-full px-4 py-3 sm:p-margin-mobile bg-surface max-w-[600px] left-1/2 -translate-x-1/2 border-t border-surface-variant">
        {timeExpired && !isCompleted ? (
          /* Reveal Answer button — shown after time expires */
          <button
            onClick={handleRevealAnswer}
            className="w-full py-3.5 sm:py-md rounded-[16px] sm:rounded-2xl font-label-md text-[16px] sm:text-lg font-semibold bg-[#dc2626] text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">visibility</span>
            Reveal Answer
          </button>
        ) : !isCompleted ? (
          <button 
            onClick={isPuzzle ? handleSubmitPuzzle : handleSubmitAptitude}
            disabled={!canSubmit}
            className={`w-full py-3.5 sm:py-md rounded-[16px] sm:rounded-2xl font-label-md text-[16px] sm:text-lg font-semibold transition-all ${canSubmit ? 'bg-primary text-white shadow-md active:scale-[0.98]' : 'bg-surface-variant text-on-surface-variant opacity-50'}`}
          >
            {isPuzzle ? 'Submit Answer' : 'Check Answer'}
          </button>
        ) : isPuzzle && !puzzleSelfAssessed ? (
          /* Puzzle self-assessment buttons */
          <div className="flex gap-3">
            <button 
              onClick={() => handlePuzzleSelfAssess(false)}
              className="flex-1 py-3.5 sm:py-md rounded-[16px] sm:rounded-2xl font-label-md text-[14px] sm:text-[16px] font-semibold bg-[#fce4ec] text-[#c62828] border-2 border-[#c62828]/30 shadow-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
              I Got That Wrong
            </button>
            <button 
              onClick={() => handlePuzzleSelfAssess(true)}
              className="flex-1 py-3.5 sm:py-md rounded-[16px] sm:rounded-2xl font-label-md text-[14px] sm:text-[16px] font-semibold bg-[#e8f5e9] text-[#2e7d32] border-2 border-[#2e7d32]/30 shadow-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">check</span>
              I Got That Right
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            {currentIndex > 0 && (
              <button 
                onClick={handlePrevious}
                className="py-3.5 sm:py-md px-4 rounded-[16px] sm:rounded-2xl font-label-md text-[14px] sm:text-[16px] font-semibold bg-surface-container-lowest text-on-surface border-2 border-surface-variant shadow-sm active:scale-[0.97] transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                Previous
              </button>
            )}
            <button 
              onClick={handleNext}
              className="flex-1 py-3.5 sm:py-md rounded-[16px] sm:rounded-2xl font-label-md text-[16px] sm:text-lg font-semibold bg-primary text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Practice'}
              {currentIndex < questions.length - 1 && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
