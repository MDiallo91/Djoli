import React, { useState } from 'react'
import { GraduationCap, Plus, ChevronRight, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface Account {
    school_id:           string
    school_name:         string
    email:               string
    country:             string | null
    level:               string | null
    last_login_at:       string | null
    subscription_status: string
}

interface AccountSelectorProps {
    accounts:       Account[]
    onSelect:       (schoolId: string) => void
    onAddAccount:   () => void
    loading:        boolean
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
        trial:     { label: 'Essai',     icon: <Clock size={12} />,         className: 'bg-amber-100 text-amber-700' },
        active:    { label: 'Actif',     icon: <CheckCircle size={12} />,   className: 'bg-emerald-100 text-emerald-700' },
        expired:   { label: 'Expiré',    icon: <XCircle size={12} />,       className: 'bg-red-100 text-red-700' },
        suspended: { label: 'Suspendu',  icon: <AlertTriangle size={12} />, className: 'bg-gray-100 text-gray-600' },
    }
    const cfg = map[status] ?? map['expired']
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.className}`}>
            {cfg.icon} {cfg.label}
        </span>
    )
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({ accounts, onSelect, onAddAccount, loading }) => {
    const [selecting, setSelecting] = useState<string | null>(null)

    const handleSelect = async (schoolId: string) => {
        setSelecting(schoolId)
        onSelect(schoolId)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
                        <GraduationCap size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">DJOLI</h1>
                    <p className="text-gray-500 mt-1 text-sm">Choisissez votre établissement</p>
                </div>

                <div className="space-y-3 mb-6">
                    {accounts.map(account => {
                        const isExpired = account.subscription_status === 'expired' || account.subscription_status === 'suspended'
                        const isLoading = selecting === account.school_id && loading

                        return (
                            <button
                                key={account.school_id}
                                onClick={() => handleSelect(account.school_id)}
                                disabled={loading}
                                className={`w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 transition-all text-left group
                                    ${isExpired
                                        ? 'border-red-100 hover:border-red-200 opacity-80'
                                        : 'border-gray-100 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50'
                                    } disabled:cursor-wait`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg
                                    ${isExpired ? 'bg-red-50 text-red-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {account.school_name.charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 truncate">{account.school_name}</p>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">{account.email}</p>
                                    {account.level && (
                                        <p className="text-xs text-gray-400 mt-0.5">{account.level} {account.country ? `• ${account.country}` : ''}</p>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <StatusBadge status={account.subscription_status} />
                                    {isLoading
                                        ? <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                        : <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                                    }
                                </div>
                            </button>
                        )
                    })}
                </div>

                <button
                    onClick={onAddAccount}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all font-semibold text-sm disabled:opacity-50"
                >
                    <Plus size={18} />
                    Ajouter un établissement
                </button>
            </div>
        </div>
    )
}
