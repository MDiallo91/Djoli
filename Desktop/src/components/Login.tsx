import React, { useEffect, useState } from 'react'
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { dbService } from '../services/db'
import { toast } from './Toast'
import { isCloudUnreachable } from '../../shared/authErrors'

interface LoginProps {
    onLogin: (user: any) => void
}


// Electron préfixe toute erreur IPC par "Error invoking remote method 'x': Error: ..." —
// on ne garde que le message métier utile à l'utilisateur.
const cleanErrorMessage = (err: any): string => {
    const raw = err?.message || ''
    const cleaned = raw
        .replace(/^Error invoking remote method '[^']+':\s*/i, '')
        .replace(/^Error:\s*/i, '')
        .trim()
    return cleaned || 'Identifiants incorrects'
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [schoolName, setSchoolName] = useState<string>('')
    const [schoolLogo, setSchoolLogo] = useState<string | null>(null)

    useEffect(() => {
        dbService.getSchoolInfo().then((info: any) => {
            if (!info) return
            if (info.name) setSchoolName(info.name)
            if (info.logo_url) setSchoolLogo(info.logo_url)
        }).catch(() => {})
    }, [])

    // Connexion unique, le serveur fait foi dès qu'il est joignable :
    //  1. en ligne → vérification par le cloud (et la copie locale du mot de passe est mise
    //     à jour) ; ainsi un mot de passe changé sur le web invalide l'ancien sur ce poste ;
    //  2. cloud injoignable (hors ligne, panne) → connexion locale, comme avant ;
    //  3. cloud qui refuse → seuls les comptes utilisateurs locaux (inconnus du cloud)
    //     restent possibles ; le compte principal de l'école est refusé.
    // L'utilisateur n'a jamais à choisir un « mode », 1ère connexion ou non.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username.trim() || !password.trim()) {
            setError('Veuillez remplir tous les champs')
            return
        }
        setLoading(true)
        setError('')
        try {
            let user: any
            try {
                user = await dbService.cloudActivate({ username, password })
                const statusMsg = user.licenseStatus === 'trial'
                    ? `Essai — ${user.daysLeft} jour${user.daysLeft !== 1 ? 's' : ''} restant${user.daysLeft !== 1 ? 's' : ''}`
                    : user.licenseStatus === 'warning'
                    ? `Abonnement expire dans ${user.daysLeft} jours`
                    : 'Abonnement actif'
                toast.success(`Connecté — ${user.name}`, statusMsg)
            } catch (cloudErr: any) {
                if (isCloudUnreachable(cloudErr)) {
                    // Hors ligne : la copie locale fait foi jusqu'au retour d'Internet
                    user = await dbService.login({ username, password })
                    toast.success('Connexion hors ligne', `Bienvenue, ${user.name || user.username}`)
                } else {
                    // Refus du cloud : uniquement un compte utilisateur local, sinon on affiche le refus du serveur
                    try {
                        user = await dbService.login({ username, password, subUsersOnly: true })
                    } catch {
                        throw cloudErr
                    }
                    toast.success('Connexion réussie', `Bienvenue, ${user.name || user.username}`)
                }
            }
            localStorage.setItem('user', JSON.stringify(user))
            onLogin(user)
        } catch (err: any) {
            const message = cleanErrorMessage(err)
            toast.error('Connexion échouée', message)
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6 relative"
            style={{ backgroundImage: "url('/logo-bg-pattern.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
        >
            {/* Voile pour détacher la carte de la photo de fond */}
            <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-[2px]" />

            {/* Carte de connexion — verre dépoli, centrée */}
            <div className="relative z-10 w-full max-w-md bg-white/85 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-2xl p-8 sm:p-10">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-20 h-20 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30 overflow-hidden">
                        <img
                            src={schoolLogo || '/logo.png'}
                            alt="DJOLI"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png' }}
                        />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Connexion</h2>
                    {schoolName && (
                        <p className="text-indigo-600 font-bold mt-1">{schoolName}</p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-start gap-3 text-sm font-medium animate-in slide-in-from-top-1">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">
                            Téléphone ou Email
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                required
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="620000000"
                                className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium text-gray-900 transition-all placeholder:text-xs placeholder:text-gray-300"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">
                            Mot de passe
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                required
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-12 pr-14 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium text-gray-900 transition-all placeholder:text-gray-300"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm tracking-wide transition-all hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-3 mt-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Connexion en cours...</span>
                            </>
                        ) : (
                            'Se connecter'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
