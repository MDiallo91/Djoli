import { useRef, useState } from 'react';
import apiClient from '../../lib/apiClient';

interface Props {
  value?: string;
  onChange: (url: string) => void;
  folder: 'djoli/logos' | 'djoli/students' | 'djoli/staff';
  shape?: 'circle' | 'square';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  placeholder?: string;
}

const SIZES = { sm: 'w-14 h-14', md: 'w-20 h-20', lg: 'w-28 h-28' };
const TEXT_SIZES = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

export default function ImageUpload({ value, onChange, folder, shape = 'circle', size = 'md', label, placeholder }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Fichier image requis'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image trop lourde (max 5 Mo)'); return; }
    setError('');
    setUploading(true);
    try {
      const { data } = await apiClient.get('/upload/signature', { params: { folder } });
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', data.apiKey);
      form.append('timestamp', String(data.timestamp));
      form.append('signature', data.signature);
      form.append('folder', data.folder);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${data.cloudName}/image/upload`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload Cloudinary échoué');
      const json = await res.json();
      onChange(json.secure_url);
    } catch (e: any) {
      setError(e?.message || 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <p className="text-xs font-bold text-gray-600 self-start">{label}</p>}
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className={`relative ${SIZES[size]} ${rounded} border-2 border-dashed border-gray-200 hover:border-blue-400 transition-all overflow-hidden bg-gray-50 hover:bg-blue-50/40 group flex-shrink-0`}>
        {value ? (
          <img src={value} alt="Photo" className={`w-full h-full object-cover ${rounded}`} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-300 group-hover:text-blue-400 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            {placeholder && <span className={`${TEXT_SIZES[size]} text-center leading-tight px-1`}>{placeholder}</span>}
          </div>
        )}
        {uploading && (
          <div className={`absolute inset-0 bg-white/80 flex items-center justify-center ${rounded}`}>
            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
        {value && !uploading && (
          <div className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity ${rounded} flex items-center justify-center`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
          </div>
        )}
      </button>
      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </div>
  );
}
