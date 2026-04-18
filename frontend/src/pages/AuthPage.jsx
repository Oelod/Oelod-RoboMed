import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.png';

export default function AuthPage({ mode = 'login' }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [form, setForm]     = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    phoneNumber: '',
    role: 'patient',
    age: '',
    gender: 'male',
    specialization: '',
    licenseNumber: ''
  });
  const [profilePreview, setProfilePreview] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const isLogin  = mode === 'login';
  const isForgot = mode === 'forgot';
  const isReset  = mode === 'reset';

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileFile(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else if (isForgot) {
        const res = await api.post('/auth/forgot-password', { email: form.email });
        alert(`Institutional Handshake: If an account exists, instructions were broadcast. [Recovery Token: ${res.data.data.token}]`);
        // Navigate for testing purposes if token is visible
      } else {
        // ... registration logic ...
        if (!form.fullName.trim()) { setError('Full name is required'); setLoading(false); return; }
        
        // Use FormData for registration if a file is present
        const formData = new FormData();
        formData.append('fullName', form.fullName);
        formData.append('email', form.email);
        formData.append('password', form.password);
        formData.append('phoneNumber', form.phoneNumber);
        formData.append('role', form.role);
        formData.append('age', form.age);
        formData.append('gender', form.gender);
        formData.append('specialization', form.specialization);
        formData.append('licenseNumber', form.licenseNumber);
        if (profileFile) {
          formData.append('profilePicture', profileFile);
        }

        await register(formData);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-brand-900/20 px-4 py-12">
      <div className={`card w-full ${isLogin ? 'max-w-md' : 'max-w-2xl text-left'}`}>
        {/* Logo / brand */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gray-900 border border-gray-800 flex items-center justify-center shadow-2xl p-4">
               <img src={logo} className="w-full h-full object-contain" alt="OELOD RoboMed" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-widest uppercase italic leading-none">OELOD</h1>
          <p className="text-brand-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">RoboMed System</p>
          <div className="w-12 h-0.5 bg-brand-500/30 mx-auto mt-6"></div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-6 opacity-40">
            {isLogin ? 'Secure Access Terminal' : isForgot ? 'Recovery Manifold' : 'Institutional Onboarding'}
          </p>
        </div>

        {/* Profile Picture Upload Section (only for Registration) */}
        {!isLogin && (
          <div className="flex flex-col items-center mb-8">
             <div 
               onClick={() => fileInputRef.current.click()}
               className="w-24 h-24 rounded-full bg-gray-950 border-2 border-dashed border-gray-800 flex items-center justify-center cursor-pointer overflow-hidden hover:border-brand-500/50 transition-all group relative"
             >
                {profilePreview ? (
                  <img src={profilePreview} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <div className="flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <span className="text-xl">📸</span>
                    <span className="text-[8px] font-black uppercase text-gray-500">Identity Bio-Img</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-brand-600/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                   <span className="text-xs font-black uppercase text-white shadow-lg">Change</span>
                </div>
             </div>
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
               accept="image/*" 
               className="hidden" 
             />
             <p className="text-[9px] font-black uppercase text-gray-600 mt-2 tracking-widest italic">Optional: Upload Professional Avatar</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
            🚨 {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800 mb-4">
              {['patient', 'doctor'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, role: r }))}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${form.role === r ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <div className={`grid ${isLogin ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6`}>
            {!isLogin && (
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Institutional Full Name</label>
                <input name="fullName" type="text" placeholder="Johnathan Doe"
                  className="input py-3" value={form.fullName} onChange={handleChange} required={!isLogin} />
              </div>
            )}
            
            <div className={isLogin ? '' : 'md:col-span-1'}>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
              <input name="email" type="email" placeholder="you@robomed.io"
                className="input py-3" value={form.email} onChange={handleChange} required />
            </div>

            <div className={isLogin ? '' : 'md:col-span-1'}>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Access Password</label>
              <input name="password" type="password" placeholder="••••••••"
                className="input py-3" value={form.password} onChange={handleChange} required />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                  <input name="phoneNumber" type="tel" placeholder="+1 (555) 000-0000"
                    className="input py-3" value={form.phoneNumber} onChange={handleChange} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Demographic Gender</label>
                  <select name="gender" className="input py-3" value={form.gender} onChange={handleChange}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Age</label>
                  <input name="age" type="number" placeholder="25"
                    className="input py-3" value={form.age} onChange={handleChange} />
                </div>

                {form.role === 'doctor' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Clinical Specialization</label>
                      <input name="specialization" type="text" placeholder="Cardiology"
                        className="input py-3" value={form.specialization} onChange={handleChange} required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Medical License Number</label>
                      <input name="licenseNumber" type="text" placeholder="MD-882299"
                        className="input py-3" value={form.licenseNumber} onChange={handleChange} required />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <button id="auth-submit" type="submit" className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-600/20" disabled={loading}>
            {loading ? 'Processing Node…' : isLogin ? 'Authenticate →' : 'Deploy Identity →'}
          </button>
        </form>

        <p className="text-center text-[10px] font-black uppercase tracking-widest text-gray-500 mt-8">
          {isLogin ? (
            <>
              New to the platform? <a href="/register" className="text-brand-400 hover:text-brand-300 transition-colors border-b border-brand-400/30 pb-0.5">Begin Induction</a>
              <br/><br/>
              <a href="/forgot-password" size="sm" className="text-gray-600 hover:text-gray-400 lowercase italic">Lost access manifold? Initialize Recovery →</a>
            </>
          ) : (
            <a href="/login" className="text-brand-400 hover:text-brand-300 transition-colors border-b border-brand-400/30 pb-0.5">
              {isForgot ? 'Return to Authentication Terminal' : 'Sign in to Terminal'}
            </a>
          )}
        </p>
      </div>
    </div>
  );
}
