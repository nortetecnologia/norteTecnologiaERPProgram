export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 w-48 bg-brand-gray-mid rounded mb-6" />
      <div className="flex gap-2 mb-5">
        {[...Array(5)].map((_, i) => <div key={i} className="h-7 w-20 bg-brand-gray-dark border border-brand-gray-mid rounded-full" />)}
      </div>
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl px-5 py-4 flex gap-4">
            <div className="h-4 w-20 bg-brand-gray-mid rounded" />
            <div className="h-4 flex-1 bg-brand-gray-mid rounded" />
            <div className="h-6 w-24 bg-brand-gray-mid rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
