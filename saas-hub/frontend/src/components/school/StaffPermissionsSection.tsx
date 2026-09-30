import { useState, useEffect } from 'react';
import { ShieldCheck, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import { Card, Button, Select, Modal, EmptyState, Checkbox, SwitchToggle } from '../../ui/design_system';
import { PERMISSION_MODULES, PERMISSION_PRESETS, ALL_PERMISSIONS } from '../../constants/permissions';

const ROLES = ['staff', 'admin'];
const ROLE_LABEL: Record<string, string> = { staff: 'Personnel', admin: 'Administrateur' };

interface SchoolUser {
  id: string; name: string; email: string; username: string; phone: string;
  role: string; permissions: string[]; scope_levels: string[]; is_active: boolean;
}

function PermissionGrid({ selected, onChange }: { selected: string[]; onChange: (p: string[]) => void }) {
  const toggleAll = (keys: string[], checked: boolean) =>
    onChange(checked ? [...new Set([...selected, ...keys])] : selected.filter(k => !keys.includes(k)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-bold text-gray-400 self-center">Profils rapides :</span>
        {Object.entries(PERMISSION_PRESETS).map(([name, cfg]) => (
          <button key={name} type="button" onClick={() => onChange(cfg.perms)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:scale-105 ${cfg.color}`}>
            {cfg.label}
          </button>
        ))}
        <button type="button" onClick={() => onChange(ALL_PERMISSIONS)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 transition-all">
          Tout sélectionner
        </button>
        <button type="button" onClick={() => onChange([])}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-white text-gray-400 border-gray-200 hover:bg-gray-50 transition-all">
          Réinitialiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PERMISSION_MODULES.map(mod => {
          const keys = mod.perms.map(p => p.key);
          const allChecked = keys.every(k => selected.includes(k));
          return (
            <div key={mod.id} className={`rounded-2xl border p-4 space-y-2 ${mod.border} ${mod.bg}`}>
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${mod.text}`}>
                  <mod.Icon size={13} />
                  {mod.label}
                </span>
                <button type="button" onClick={() => toggleAll(keys, !allChecked)}
                  className={`text-[10px] font-bold ${mod.text} opacity-60 hover:opacity-100 transition-opacity`}>
                  {allChecked ? 'Tout décocher' : 'Tout cocher'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {mod.perms.map(perm => (
                  <Checkbox
                    key={perm.key}
                    checked={selected.includes(perm.key)}
                    onChange={c => onChange(c ? [...selected, perm.key] : selected.filter(k => k !== perm.key))}
                    label={<span className="text-xs font-semibold text-gray-700">{perm.label}</span>}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StaffPermissionsSection() {
  const [users, setUsers]     = useState<SchoolUser[]>([]);
  const [editing, setEditing] = useState<SchoolUser | null>(null);
  const [role, setRole]       = useState('staff');
  const [perms, setPerms]     = useState<string[]>([]);
  const [active, setActive]   = useState(true);
  const [saving, setSaving]   = useState(false);

  const fetchData = async () => {
    try { setUsers(await api.getSchoolUsers() || []); }
    catch { toast.error('Erreur de chargement'); }
  };

  useEffect(() => { fetchData(); }, []);

  const openEdit = (u: SchoolUser) => {
    setEditing(u); setRole(u.role); setPerms(u.permissions); setActive(u.is_active);
  };
  const closeEdit = () => setEditing(null);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.updateSchoolUserPermissions(editing.id, { role, permissions: perms, is_active: active });
      toast.success('Permissions mises à jour');
      closeEdit();
      fetchData();
    } catch { toast.error('Erreur lors de l\'enregistrement'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        Comptes créés depuis l'application desktop de l'école — la création de nouveaux comptes se fait uniquement depuis le poste de l'école.
      </p>

      {users.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={24} />} message="Aucun compte synchronisé" hint="Les comptes créés sur le desktop apparaîtront ici après leur première synchronisation." />
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <Card key={u.id} padding="sm" className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 text-sm truncate">{u.name}</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                  {!u.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600">Inactif</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{u.email} · @{u.username}</p>
                <p className="text-[10px] text-gray-300 mt-0.5">{u.permissions.length} permission{u.permissions.length !== 1 ? 's' : ''}</p>
              </div>
              <Button variant="outline" leftIcon={<Pencil size={14} />} onClick={() => openEdit(u)}>
                Permissions
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={closeEdit} title={editing ? `Permissions — ${editing.name}` : ''}>
        <div className="space-y-5">
          <Select
            label="Rôle"
            value={role}
            onChange={e => setRole(e.target.value)}
            options={ROLES.map(r => ({ value: r, label: ROLE_LABEL[r] }))}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Compte actif</span>
            <SwitchToggle checked={active} onChange={setActive} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Permissions</p>
            <PermissionGrid selected={perms} onChange={setPerms} />
          </div>
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={closeEdit}>Annuler</Button>
            <Button type="button" variant="primary" fullWidth disabled={saving} onClick={handleSave}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
