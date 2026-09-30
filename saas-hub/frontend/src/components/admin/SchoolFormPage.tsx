/**
 * components/admin/SchoolFormPage.tsx
 * Formulaire de création / modification d'un établissement.
 * Extrait de : AdminDashboard.tsx:217–321
 * Consommé par : SchoolsTab, PendingTab (via sub-view)
 */

import { useState } from 'react';
import { Building2, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { School } from '../../types/admin';
import { API_ADMIN }  from '../../constants/api';
import { PageShell }  from '../../ui/component/PageShell';
import { Input }      from '../../ui/design_system/Input';
import { Select }     from '../../ui/design_system/Select';
import { Button }     from '../../ui/design_system/Button';
import { FileUpload } from '../../ui/design_system/FileUpload';

interface Props {
  school:  School | null;
  onBack:  () => void;
  onSave:  () => void;
}

const LEVELS = ['Maternelle', 'Primaire', 'Collège', 'Lycée', 'Mixte'];

export function SchoolFormPage({ school, onBack, onSave }: Props) {
  const [form, setForm] = useState<Record<string, string>>((school ?? {
    schoolName: '', email: '', password: '', country: '', city: '',
    level: '', directorName: '', prefecture: '', sousPrefecture: '', rccm: '', logoUrl: '',
  }) as unknown as Record<string, string>);
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url    = school ? `${API_ADMIN}/schools/${school.id}` : `${API_ADMIN}/schools`;
      const method = school ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || 'Erreur');
        return;
      }
      toast.success(school ? 'Établissement modifié' : 'Établissement créé');
      onSave();
      onBack();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const sectionHeader = (icon: React.ReactNode, title: string) => (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <p className="text-sm font-semibold text-slate-900">{title}</p>
    </div>
  );

  return (
    <PageShell
      title={school ? `Modifier — ${school.schoolName}` : 'Ajouter un établissement'}
      onBack={onBack}
    >
      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
        {/* Identité */}
        <div>
          {sectionHeader(
            <div className="w-6 h-6 rounded-lg bg-primary-600 flex items-center justify-center"><Building2 size={13} className="text-white" /></div>,
            "Identité de l'école"
          )}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <Input
              label="Nom de l'établissement *"
              required
              value={form.schoolName || ''}
              onChange={e => set('schoolName', e.target.value)}
              placeholder="École Excellence 224"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email *" type="email" required value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="contact@ecole.com" />
              <Select
                label="Cycle scolaire"
                value={form.level || ''}
                onChange={e => set('level', e.target.value)}
                options={[{ value: '', label: '—' }, ...LEVELS.map(l => ({ value: l, label: l }))]}
              />
              <Input label="Directeur / Responsable" value={form.directorName || ''} onChange={e => set('directorName', e.target.value)} placeholder="M. Diallo" />
              <Input label="RCCM (numéro)" value={form.rccm || ''} onChange={e => set('rccm', e.target.value)} placeholder="RC/KA/2026/..." />
            </div>
            {!school && (
              <Input label="Mot de passe initial" value={form.password || ''} onChange={e => set('password', e.target.value)} placeholder="Vide = 'changeme123'" />
            )}
          </div>
        </div>

        {/* Localisation */}
        <div>
          {sectionHeader(
            <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center"><MapPin size={13} className="text-white" /></div>,
            'Localisation'
          )}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4">
              {([['Pays', 'country', 'Guinée'], ['Ville', 'city', 'Conakry'], ['Préfecture', 'prefecture', 'RATOMA'], ['Sous-préfecture (opt.)', 'sousPrefecture', 'YATTAYA']] as [string,string,string][]).map(([l, k, p]) => (
                <Input key={k} label={l} value={form[k] || ''} onChange={e => set(k, e.target.value)} placeholder={p} />
              ))}
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          {sectionHeader(
            <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center"><FileText size={13} className="text-white" /></div>,
            'Logo'
          )}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <FileUpload
              label="Logo de l'école"
              value={form.logoUrl || ''}
              onChange={v => set('logoUrl', v)}
              hint="PNG, JPG ou WEBP — redimensionné automatiquement"
              previewHeight={120}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onBack}>Annuler</Button>
          <Button variant="primary" type="submit" loading={saving}>
            {school ? 'Sauvegarder les modifications' : "Créer l'établissement"}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
