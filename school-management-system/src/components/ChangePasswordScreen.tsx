import React, { useState } from 'react'
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react'
import { dbService } from '../services/db'
import { useAppStore } from '../stores/useAppStore'

export const ChangePasswordScreen: React.FC = () => {
    const { user, setPhase, setUser } = useAppStore()
    const [pwd, setPwd]         = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const [error, setError]     = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (pwd.length < 6)    { setError('Minimum 6 caractères'); return }
        if (pwd !== confirm)   { setError('Les mots de passe ne correspondent pas'); return }

        setLoading(true)
        setError('')
        try {
            await dbService.changePassword({ userId: user!.id, newPassword: pwd })
            const updated = { ...user!, mustChangePwd: false }
            localStorage.setItem('user', JSON.stringify(updated))
            setUser(updated)
            setPhase('app')
        } catch (err: any) {
            setError(err.message || 'Erreur lors du changement')
        } finally {
            setLoading(false)
        }
    }

    const inputCls = 'w-full pl-12 pr-12 py-4 bg-white border-2 border-gray-200 rounded-2xl font-medium text-gray-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-300'

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white p-6">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-200 mb-4">
                        <ShieldCheck size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">Bienvenue, {user?.name}</h1>
                    <p className="text-gray-500 text-sm text-center mt-2 leading-relaxed">
                        Pour des raisons de sécurité, vous devez définir<br />votre propre mot de passe avant de continuer.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-semibold">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="relative">
                        <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type={showPwd ? 'text' : 'password'}
                            placeholder="Nouveau mot de passe"
                            value={pwd}
                            onChange={e => setPwd(e.target.value)}
                            required
                            className={inputCls}
                        />
                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="relative">
                        <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type={showPwd ? 'text' : 'password'}
                            placeholder="Confirmer le mot de passe"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            required
                            className={inputCls}
                        />
                    </div>

                    {/* Strength indicator */}
                    {pwd.length > 0 && (
                        <div className="flex gap-1.5 px-1">
                            {[2, 4, 6, 8].map((threshold, i) => (
                                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                                    pwd.length >= threshold ? 'bg-indigo-500' : 'bg-gray-200'
                                }`} />
                            ))}
                            <span className="text-xs text-gray-400 ml-1">
                                {pwd.length < 6 ? 'Faible' : pwd.length < 8 ? 'Moyen' : 'Fort'}
                            </span>
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 disabled:opacity-50 mt-2">
                        {loading ? 'Enregistrement…' : 'Définir mon mot de passe'}
                    </button>
                </form>
            </div>
        </div>
    )
}
