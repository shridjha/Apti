import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import aptitudeData from '../data/aptitude.json';
import puzzlesData from '../data/puzzles.json';
import { useProgressStore } from '../store/useProgressStore';

export default function TopicView() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { completedQuestions, attempts } = useProgressStore();
  
  const data = section === 'aptitude' ? aptitudeData : puzzlesData;
  const title = section === 'aptitude' ? 'OA Aptitude' : 'Interview Puzzles';
  const colorClass = section === 'aptitude' ? 'text-primary' : 'text-secondary';
  const barColor = section === 'aptitude' ? 'bg-primary-container' : 'bg-secondary';

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

          {/* Topic Cards */}
          <section className="space-y-3 sm:space-y-sm mb-xl">
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
                  className="block spring-card bg-surface-container-lowest rounded-[16px] sm:rounded-[20px] p-3.5 sm:p-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-surface-variant/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] cursor-pointer"
                >
                  {/* Row 1: Topic name + question count */}
                  <div className="flex justify-between items-center mb-2 sm:mb-sm">
                    <h3 className="font-headline-lg-mobile text-[16px] sm:text-[20px] leading-[22px] sm:leading-[28px] font-bold text-on-surface">{sub}</h3>
                    <span className="font-label-md text-[11px] sm:text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant">{total} Qs</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-[6px] sm:h-2 w-full bg-surface-variant/60 rounded-full overflow-hidden mb-1.5 sm:mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                      style={{ width: `${completionPercent}%` }}
                    ></div>
                  </div>

                  {/* Row 2: Completion % + Accuracy % */}
                  <div className="flex items-center gap-1">
                    <span className="font-label-md text-[10px] sm:text-[11px] leading-[14px] tracking-[0.02em] font-bold text-on-surface-variant">
                      {completionPercent}% complete
                    </span>
                    {completed > 0 && (
                      <>
                        <span className="text-on-surface-variant/40 text-[10px] sm:text-[11px]">·</span>
                        <span className="font-label-md text-[10px] sm:text-[11px] leading-[14px] tracking-[0.02em] font-bold text-on-surface-variant">
                          {accuracyPercent}% accuracy
                        </span>
                      </>
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
