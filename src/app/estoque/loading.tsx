export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-8 w-32 bg-brand-gray-mid rounded mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => <div key={i} className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 h-24" />)}
      </div>
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl h-64" />
    </div>
  );
}
