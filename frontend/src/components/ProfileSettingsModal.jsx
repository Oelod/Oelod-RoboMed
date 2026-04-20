import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';

export default function ProfileSettingsModal({ isOpen, onClose }) {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phoneNumber: user?.phoneNumber || '',
  });
  const [loading, setLoading] = useState(false);
  const [profilePreview, setProfilePreview] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setProfilePreview(previewUrl);

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      await api.patch('/auth/profile-picture', formData);
      toast.success('Profile Picture Updated');
      await refreshUser();
    } catch (err) {
      toast.error('Avatar Update Failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/auth/profile', form);
      toast.success('Profile Details Updated');
      await refreshUser();
      onClose();
    } catch (err) {
      toast.error('Synchronization Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4">
       <div className="card w-full max-w-lg bg-gray-900 border border-gray-800 rounded-[2.5rem] shadow-2xl p-10 relative animate-in fade-in zoom-in duration-300">
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"
          >✕</button>

          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8">Profile Settings</h2>

          <div className="flex flex-col items-center mb-10">
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="w-24 h-24 rounded-full bg-gray-950 border-2 border-brand-500/20 flex items-center justify-center cursor-pointer overflow-hidden hover:border-brand-500 transition-all group relative"
             >
                {profilePreview || user?.profilePicture ? (
                  <img src={profilePreview || user.profilePicture} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <span className="text-3xl font-black text-brand-400 uppercase italic">{user?.fullName?.charAt(0)}</span>
                )}
                <div className="absolute inset-0 bg-brand-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                   <span className="text-[10px] font-black text-white uppercase">Change</span>
                </div>
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
             <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-3 italic">User ID: {user?._id?.slice(-8)}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
             <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  name="fullName" 
                  className="input py-3" 
                  value={form.fullName} 
                  onChange={handleChange} 
                  placeholder="Update name..."
                />
             </div>
             <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Phone Number</label>
                <input 
                  name="phoneNumber" 
                  className="input py-3" 
                  value={form.phoneNumber} 
                  onChange={handleChange} 
                  placeholder="+X XXX XXX XXXX"
                />
             </div>

             <div className="pt-4 flex gap-4">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 py-4 text-[10px] font-black uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-4 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-600/20">
                   {loading ? 'Saving...' : 'Apply Changes'}
                </button>
             </div>
          </form>
       </div>
    </div>
  );
}
