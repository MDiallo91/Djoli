import React from 'react';
import { UserCircle, Shield, Mail, Calendar, Key } from 'lucide-react';

export function Profile({ user }: { user: any }) {
    if (!user) return null;

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

            {/* Avatar + nom */}
            <div className="flex items-center gap-4 pb-5 border-b border-gray-200">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-900">{user.name || 'Administrateur'}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Shield size={11} /> {user.role === 'SUPER_ADMIN' ? 'Super Administrateur' : 'Utilisateur'}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2">Informations du Compte</h3>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                                    <Mail size={14} className="text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email de connexion</p>
                                    <p className="text-sm font-medium text-gray-900">{user.username}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                                    <Key size={14} className="text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identifiant unique</p>
                                    <p className="text-xs font-mono text-gray-700">{user.id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2">Licence & Abonnement</h3>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                                    <Calendar size={14} className="text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statut</p>
                                    <p className="text-sm font-medium text-gray-900">Actif</p>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                Cet appareil est synchronisé. Toutes les données sont sécurisées.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
