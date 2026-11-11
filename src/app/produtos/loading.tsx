export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 w-48 bg-brand-gray-mid rounded mb-6" />
      <div className="h-10 w-80 bg-brand-gray-dark border border-brand-gray-mid rounded-xl mb-5" />
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="border-b border-brand-gray-mid px-5 py-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gray-mid rounded-lg shrink-0" />
            <div className="h-4 flex-1 bg-brand-gray-mid rounded" />
            <div className="h-4 w-20 bg-brand-gray-mid rounded hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
