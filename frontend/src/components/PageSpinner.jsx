export const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-950">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-brand-900/30 rounded-full" />
      <div className="absolute inset-0 w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
         <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
      </div>
    </div>
  </div>
);
