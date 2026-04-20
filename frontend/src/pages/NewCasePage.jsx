import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCase } from '../api/cases';

export default function NewCasePage() {
  const navigate = useNavigate();
  const [symptomsText, setSymptomsText] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symptomsText.trim()) {
      setError('Please enter your symptoms');
      return;
    }

    const symptoms = symptomsText.split(',').map(s => s.trim()).filter(Boolean);
    
    setLoading(true);
    setError('');
    
    try {
      const res = await createCase({ symptoms, description });
      // The backend wraps data inside nested "data" with "case" object
      navigate(`/cases/${res.data.case._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-16 px-4">
      <div className="card !p-6 sm:!p-10 border-brand-500/20 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-bl-[4rem] group-hover:bg-brand-500/10 transition-all"></div>
        
        <h1 className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter uppercase mb-3">Start New Consultation</h1>
        <p className="text-gray-500 text-sm italic font-medium mb-10 leading-relaxed">
          Provide clinical details below. Our Triage AI will analyze your symptoms to provide real-time assessment and specialist recommendations.
        </p>

        {error && (
          <div className="mb-8 p-5 rounded-2xl bg-red-950/50 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-900/10 animate-in fade-in slide-in-from-top-2">
            🚨 System Alert: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 relative z-10">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Symptoms (Comma-Separated) <span className="text-brand-500">*</span></label>
            <input
              type="text"
              className="input w-full !py-4"
              placeholder="e.g. Chronic Fatigue, Neural Spasms, Migraine"
              value={symptomsText}
              onChange={(e) => setSymptomsText(e.target.value)}
              required
            />
            <p className="text-[9px] text-gray-600 font-bold uppercase mt-2 tracking-tighter">List your symptoms clearly to help our AI provide a more accurate assessment.</p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Additional Details (Optional)</label>
            <textarea
              className="input w-full min-h-[160px] py-4 resize-none italic font-medium"
              placeholder="Provide details such as when your symptoms started, your medical history, or any patterns you've noticed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="pt-6 flex flex-col sm:flex-row-reverse gap-4">
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto px-10 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-600/30 active:scale-95 transition-all"
              disabled={loading || !symptomsText.trim()}
            >
              {loading ? 'Analyzing Symptoms...' : 'Submit Consultation →'}
            </button>
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-4 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white hover:bg-gray-800 transition-all border border-transparent hover:border-gray-700"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
