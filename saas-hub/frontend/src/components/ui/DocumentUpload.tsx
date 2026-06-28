import { useRef, useState } from 'react';
import { FileText, Upload, X, ExternalLink } from 'lucide-react';
import apiClient from '../../lib/apiClient';

interface Props {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  optional?: boolean;
}

export default function DocumentUpload({ value, onChange, label, hint, optional }: Props) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName]   = useState('');
  const [error, setError]         = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) { setError('Fichier PDF ou image requis'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Fichier trop lourd (max 10 Mo)'); return; }
    setError('');
    setUploading(true);
    try {
      const { data } = await apiClient.get('/upload/signature', { params: { folder: 'djoli/documents' } });
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', data.apiKey);
      form.append('timestamp', String(data.timestamp));
      form.append('signature', data.signature);
      form.append('folder', data.folder);
      const endpoint = `https://api.cloudinary.com/v1_1/${data.cloudName}/${data.resourceType}/upload`;
      const res = await fetch(endpoint, { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Upload échoué');
      }
      const json = await res.json();
      setFileName(file.name);
      onChange(json.secure_url);
    } catch (e: any) {
      setError(e?.message || 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
          {label} {optional && <span className="text-slate-400 font-normal normal-case">(optionnel)</span>}
        </label>
      )}

      {value ? (
        <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800 truncate">{fileName || 'Document uploadé'}</p>
            <p className="text-xs text-emerald-600">Stocké sur Cloudinary</p>
          </div>
          <a href={value} target="_blank" rel="noopener noreferrer"
            className="p-1.5 text-emerald-500 hover:text-emerald-700 transition-colors" title="Voir le document">
            <ExternalLink size={15} />
          </a>
          <button type="button" onClick={() => { onChange(''); setFileName(''); }}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
            <X size={15} />
          </button>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all group ${
            uploading ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50'
          }`}
          onClick={e => { e.preventDefault(); inputRef.current?.click(); }}
        >
          {uploading ? (
            <>
              <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mb-2" />
              <p className="text-sm font-medium text-indigo-600">Upload en cours…</p>
            </>
          ) : (
            <>
              <Upload size={20} className="text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
              <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
                Cliquez pour uploader
              </p>
              {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
            </>
          )}
        </label>
      )}

      {error && <p className="text-[11px] text-red-500 font-medium mt-1">{error}</p>}

      <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </div>
  );
}
