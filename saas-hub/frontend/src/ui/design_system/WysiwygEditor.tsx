/**
 * ui/design_system/WysiwygEditor.tsx
 * Éditeur de texte riche (contenteditable) avec barre d'outils.
 * Extrait de : AdminDashboard.tsx:49
 * Consommé par : LegalSection (CGU, confidentialité, mentions légales)
 */

import { useRef, useEffect } from 'react';

interface WysiwygEditorProps {
  value:     string;
  onChange:  (v: string) => void;
  minHeight?: number;
  placeholder?: string;
}

const TOOLS = [
  { label: 'G',  title: 'Gras',           cmd: 'bold',                 style: { fontWeight: 700 } as React.CSSProperties },
  { label: 'I',  title: 'Italique',        cmd: 'italic',               style: { fontStyle: 'italic' } as React.CSSProperties },
  { label: 'S',  title: 'Souligné',        cmd: 'underline',            style: { textDecoration: 'underline' } as React.CSSProperties },
  { label: 'H1', title: 'Titre 1',         cmd: 'formatBlock', arg: 'h1' },
  { label: 'H2', title: 'Titre 2',         cmd: 'formatBlock', arg: 'h2' },
  { label: 'H3', title: 'Titre 3',         cmd: 'formatBlock', arg: 'h3' },
  { label: 'P',  title: 'Paragraphe',      cmd: 'formatBlock', arg: 'p' },
  { label: '•',  title: 'Liste à puces',   cmd: 'insertUnorderedList' },
  { label: '1.', title: 'Liste numérotée', cmd: 'insertOrderedList' },
  { label: '─',  title: 'Séparateur',      cmd: 'insertHorizontalRule' },
  { label: '⌫',  title: 'Effacer format',  cmd: 'removeFormat' },
];

export function WysiwygEditor({ value, onChange, minHeight = 320, placeholder }: WysiwygEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Initialisation du contenu au montage uniquement
  // (key prop gère les changements d'onglet côté parent)
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML || '');
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-400 transition-all">
      {/* Barre d'outils */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50 flex-wrap">
        {TOOLS.map((t, i) => (
          <button
            key={i}
            type="button"
            title={t.title}
            onMouseDown={e => { e.preventDefault(); exec(t.cmd, t.arg); }}
            style={t.style}
            className="px-2.5 py-1 text-xs text-slate-600 hover:bg-white hover:shadow-sm rounded-md transition-all border border-transparent hover:border-slate-200 min-w-[28px]"
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-400 pr-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          Éditeur visuel
        </span>
      </div>

      {/* Zone éditable */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => onChange(ref.current?.innerHTML || '')}
        className="px-5 py-4 text-sm text-slate-700 outline-none bg-white leading-relaxed"
        style={{ minHeight, fontFamily: 'Inter, system-ui, sans-serif' }}
      />

      <style>{`
        [contenteditable] h1 { font-size:1.5rem;font-weight:800;margin:.8rem 0;color:#1e293b }
        [contenteditable] h2 { font-size:1.2rem;font-weight:700;margin:.7rem 0;color:#1e293b }
        [contenteditable] h3 { font-size:1rem;font-weight:700;margin:.6rem 0;color:#1e293b }
        [contenteditable] ul { list-style:disc;padding-left:1.5rem;margin:.4rem 0 }
        [contenteditable] ol { list-style:decimal;padding-left:1.5rem;margin:.4rem 0 }
        [contenteditable] li { margin:.2rem 0 }
        [contenteditable] hr { border:none;border-top:1px solid #e2e8f0;margin:1rem 0 }
        [contenteditable] p  { margin:.4rem 0 }
        [contenteditable]:empty:before { content:attr(data-placeholder);color:#94a3b8;pointer-events:none }
      `}</style>
    </div>
  );
}
