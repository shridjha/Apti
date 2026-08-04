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
  
  const { recordAttempt, completedQuestions } = useProgressStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [puzzleAnswer, setPuzzleAnswer] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  const currentQ = questions[currentIndex];
  const timeLimit = currentQ?.timeLimit || 60;

  // Reset everything when question changes
  useEffect(() => {
    if (currentQ) {
      posthog.capture('question_started', { section, topic, question_id: currentQ.id });
      setStartTime(Date.now());
      setSelectedOption(null);
      setPuzzleAnswer('');
      setShowExplanation(false);
      setTimeLeft(currentQ.timeLimit || 60);
    }
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

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && !showExplanation && currentQ) {
      handleTimeUp();
    }
  }, [timeLeft]);

  const handleTimeUp = useCallback(() => {
    const timeSpent = currentQ.timeLimit || 60;
    if (isPuzzle) {
      recordAttempt(currentQ.id, false, timeSpent, section);
    } else {
      recordAttempt(currentQ.id, selectedOption === currentQ.answer, timeSpent, section);
    }
    posthog.capture('question_timeout', { section, topic, question_id: currentQ.id });
    setShowExplanation(true);
  }, [currentQ, selectedOption, isPuzzle, section, topic, recordAttempt]);

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
    if (showExplanation) return;
    setSelectedOption(index);
  };

  const handleSubmitAptitude = () => {
    if (selectedOption === null) return;
    clearInterval(timerRef.current);
    const isCorrect = selectedOption === currentQ.answer;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    recordAttempt(currentQ.id, isCorrect, timeSpent, section);
    posthog.capture('question_completed', { section, topic, question_id: currentQ.id, isCorrect, timeSpent });
    setShowExplanation(true);
  };

  const handleSubmitPuzzle = () => {
    if (!puzzleAnswer.trim()) return;
    clearInterval(timerRef.current);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    // For puzzles we record as completed (self-assessed)
    recordAttempt(currentQ.id, true, timeSpent, section);
    posthog.capture('question_completed', { section, topic, question_id: currentQ.id, timeSpent });
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      posthog.capture('topic_completed', { section, topic });
      navigate('/');
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
          <div className="bg-surface-container-lowest rounded-[24px] sm:rounded-[28px] p-5 sm:p-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-surface-variant/40 flex flex-col mb-lg">
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
              {!isCompleted && (
                <span className="flex items-center gap-1 text-on-surface-variant font-label-md text-[12px] sm:text-[13px] font-semibold ml-auto">
                  <span className="material-symbols-outlined text-[18px]">timer</span>
                  {timeLeft}s
                </span>
              )}
            </div>

            {/* Timer progress bar */}
            {!isCompleted && (
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
                
                if (!isCompleted) {
                  if (selectedOption === i) {
                    btnClass += "border-primary bg-primary-fixed-dim/20 shadow-sm";
                  } else {
                    btnClass += "border-surface-variant bg-surface-container-lowest hover:border-outline-variant";
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
                    disabled={isCompleted}
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
                    onChange={(e) => setPuzzleAnswer(e.target.value)}
                    placeholder="Type your answer or reasoning here..."
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

      {/* Bottom action button */}
      <div className="fixed bottom-0 left-0 w-full px-4 py-3 sm:p-margin-mobile bg-surface max-w-[600px] left-1/2 -translate-x-1/2 border-t border-surface-variant">
        {!isCompleted ? (
          <button 
            onClick={isPuzzle ? handleSubmitPuzzle : handleSubmitAptitude}
            disabled={!canSubmit}
            className={`w-full py-3.5 sm:py-md rounded-[16px] sm:rounded-2xl font-label-md text-[16px] sm:text-lg font-semibold transition-all ${canSubmit ? 'bg-primary text-white shadow-md active:scale-[0.98]' : 'bg-surface-variant text-on-surface-variant opacity-50'}`}
          >
            {isPuzzle ? 'Submit Answer' : 'Check Answer'}
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="w-full py-3.5 sm:py-md rounded-[16px] sm:rounded-2xl font-label-md text-[16px] sm:text-lg font-semibold bg-primary text-white shadow-md active:scale-[0.98] transition-all"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Practice'}
          </button>
        )}
      </div>
    </div>
  );
}
