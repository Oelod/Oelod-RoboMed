export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-6xl font-bold text-brand-500">404</h1>
      <p className="text-gray-400 text-lg">Page not found</p>
      <a href="/dashboard" className="btn-primary">Back to Dashboard</a>
    </div>
  );
}
