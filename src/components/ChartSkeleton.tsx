export const ChartSkeleton = () => {
  return (
    <div className="bg-white/60 border border-stone-200 rounded-lg shadow-lg p-4 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-stone-200/70 rounded w-32"></div>
        <div className="flex gap-2">
          <div className="h-8 bg-stone-200/70 rounded w-16"></div>
          <div className="h-8 bg-stone-200/70 rounded w-16"></div>
          <div className="h-8 bg-stone-200/70 rounded w-16"></div>
        </div>
      </div>

      <div className="h-96 bg-stone-100/50 rounded mb-4"></div>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-8 bg-stone-200/70 rounded flex-1"></div>
        ))}
      </div>
    </div>
  );
};

export const MetricsSkeleton = () => {
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white/50 border border-stone-300/40 rounded-lg shadow-lg p-3 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-stone-200/70 rounded w-24"></div>
          <div className="h-4 w-4 bg-stone-200/70 rounded"></div>
        </div>

        <div className="space-y-2">
          <div className="bg-stone-100/50 rounded-lg p-3 border border-stone-200/50">
            <div className="h-3 bg-stone-200/70 rounded w-16 mb-2"></div>
            <div className="h-8 bg-stone-200/70 rounded w-32 mb-2"></div>
            <div className="space-y-1 pt-2 border-t border-stone-200/50">
              <div className="h-4 bg-stone-200/70 rounded"></div>
              <div className="h-4 bg-stone-200/70 rounded"></div>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-2">
            <div className="h-3 bg-stone-200/70 rounded w-24 mb-2"></div>
            <div className="h-16 bg-stone-100/50 rounded"></div>
          </div>
        </div>
      </div>

      <div className="bg-white/50 border border-stone-300/40 rounded-lg shadow-lg p-3 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-stone-200/70 rounded w-32"></div>
          <div className="h-4 w-4 bg-stone-200/70 rounded"></div>
        </div>

        <div className="space-y-2">
          <div className="bg-stone-100/50 rounded-lg p-2 border border-stone-200/50">
            <div className="h-3 bg-stone-200/70 rounded w-20 mb-2"></div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-stone-200 rounded-full h-3"></div>
              <div className="h-4 bg-stone-200/70 rounded w-12"></div>
            </div>
          </div>

          <div className="bg-stone-100/50 rounded-lg p-2 border border-stone-200/50">
            <div className="h-3 bg-stone-200/70 rounded w-20 mb-2"></div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-stone-200 rounded-full h-3"></div>
              <div className="h-4 bg-stone-200/70 rounded w-12"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
