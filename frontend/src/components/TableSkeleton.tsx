'use client';

import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  title?: string;
}

export function TableSkeleton({ rows = 5, cols = 5, title }: TableSkeletonProps) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-pulse">
      {title && (
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      )}

      <div className="space-y-4">
        {/* Table Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={`head-${i}`}
              className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md flex-1"
            />
          ))}
        </div>

        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rIndex) => (
          <div
            key={`row-${rIndex}`}
            className="flex items-center gap-4 py-3 border-b border-slate-50 dark:border-slate-800/50"
          >
            {Array.from({ length: cols }).map((_, cIndex) => (
              <div
                key={`cell-${rIndex}-${cIndex}`}
                className={`h-4 bg-slate-100 dark:bg-slate-800/70 rounded-md flex-1 ${
                  cIndex === 0 ? 'w-1/3' : 'w-full'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-pulse flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
        <div className="h-6 w-16 bg-slate-300 dark:bg-slate-700 rounded-lg"></div>
      </div>
    </div>
  );
}
