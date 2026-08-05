import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import aptitudeData from '../data/aptitude.json';
import puzzlesData from '../data/puzzles.json';
import { useProgressStore } from '../store/useProgressStore';
import posthog from 'posthog-js';

export default function TopicView() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { completedQuestions, attempts } = useProgressStore();
  
  const data = section === 'aptitude' ? aptitudeData : puzzlesData;
  const title = section === 'aptitude' ? 'OA Aptitude' : 'Interview Puzzles';
  const colorClass = section === 'aptitude' ? 'text-primary' : 'text-secondary';
  const barColor = section === 'aptitude' ? 'bg-primary-container' : 'bg-secondary';

  useEffect(() => {
    posthog.capture('topic_selection_viewed', { section });
  }, [section]);

  if (!data) return <div>Invalid section</div>;

  // Group by subcategory
  const subcategories = [...new Set(data.map(q => q.subcategory))];

  return (
    <div className="text-on-background min-h-screen flex flex-col items-center font-body-md text-[16px] leading-[24px] font-medium bg-background">
      <main className="w-full max-w-[600px] pb-12">
        {/* Header */}
        <header className="bg-background flex items-center px-4 sm:px-margin-mobile h-14 sm:h-16 w-full sticky z-40 top-0 gap-3">
          <button onClick={() => navigate(-1)} className={`${colorClass} hover:opacity-80 active:scale-95 transition-transform`}>
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className={`font-headline-md text-[18px] sm:text-[22px] leading-[28px] font-semibold ${colorClass}`}>{title}</div>
        </header>

        <div className="px-4 sm:px-margin-mobile pt-sm pb-xl">
          {/* Title */}
          <section className="mb-lg mt-sm">
            <h1 className="font-headline-xl text-[26px] sm:text-[36px] leading-[34px] sm:leading-[44px] tracking-[-0.02em] font-bold text-on-surface mb-xs">Select a Topic</h1>
            <p className="font-body-md text-[13px] sm:text-[16px] leading-[18px] sm:leading-[24px] font-medium text-on-surface-variant opacity-80">Choose what you want to practice today</p>
          </section>

          {/* Topic Cards — Grid Layout */}
          <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-xl">
            {subcategories.map(sub => {
              const qs = data.filter(q => q.subcategory === sub);
              const total = qs.length;
              const completed = qs.filter(q => completedQuestions.includes(q.id)).length;
              const correct = qs.filter(q => attempts[q.id]?.correct).length;
              const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
              const accuracyPercent = completed > 0 ? Math.round((correct / completed) * 100) : 0;

              return (
                <Link
                  to={`/${section}/practice?topic=${encodeURIComponent(sub)}`}
                  key={sub}
                  onClick={() => posthog.capture('topic_selected', { section, topic: sub, completionPercent })}
                  className="block spring-card bg-surface-container-lowest rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-surface-variant/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] cursor-pointer"
                >
                  {/* Topic name + question count */}
                  <div className="flex justify-between items-start mb-3 gap-1">
                    <h3 className="font-headline-lg-mobile text-[16px] sm:text-[18px] leading-[1.2] font-bold text-on-surface">{sub}</h3>
                    <span className="font-label-md text-[10px] sm:text-[11px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">{total} Qs</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-[5px] sm:h-[6px] w-full bg-surface-variant/60 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                      style={{ width: `${completionPercent}%` }}
                    ></div>
                  </div>

                  {/* Completion + Accuracy */}
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-0">
                    <span className="font-label-md text-[10px] sm:text-[11px] leading-[16px] tracking-[0.02em] font-bold text-on-surface-variant">
                      {completionPercent}% complete
                    </span>
                    {completed > 0 && (
                      <span className="font-label-md text-[10px] sm:text-[11px] leading-[16px] tracking-[0.02em] font-bold text-on-surface-variant">
                        {accuracyPercent}% accuracy
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
}
