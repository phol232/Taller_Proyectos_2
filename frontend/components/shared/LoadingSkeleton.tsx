"use client";

type SkeletonVariant = "table" | "grid" | "form" | "card";

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
}

export default function LoadingSkeleton({
  variant = "card",
}: LoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-10 bg-gray-50 rounded-lg card-border" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-50/60 rounded" />
        ))}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="animate-pulse grid grid-cols-6 gap-1">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-50 rounded card-border" />
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-50 rounded card-border" />
          </div>
        ))}
      </div>
    );
  }

  // card (default)
  return (
    <div className="animate-pulse card-border rounded-lg p-6 space-y-3">
      <div className="h-5 w-1/3 bg-gray-100 rounded" />
      <div className="h-4 w-2/3 bg-gray-50 rounded" />
      <div className="h-4 w-1/2 bg-gray-50 rounded" />
    </div>
  );
}
