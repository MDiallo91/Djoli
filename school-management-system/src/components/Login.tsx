import React, { useEffect, useState } from 'react'
import { GraduationCap, Lock, User, AlertCircle, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react'
import { dbService } from '../services/db'
import { toast } from './Toast'

interface LoginProps {
    onLogin: (user: any) => void
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'local' | 'cloud'>('local')
    const [schoolName, setSchoolName] = useState<string>('')
    const [schoolLogo, setSchoolLogo] = useState<string | null>(null)

    useEffect(() => {
        dbService.getSchoolInfo().then((info: any) => {
            if (!info) return
            if (info.name) setSchoolName(info.name)
            if (info.logo_url) setSchoolLogo(info.logo_url)
        }).catch(() => {})
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username.trim() || !password.trim()) {
            setError('Veuillez remplir tous les champs')
            return
        }
        setLoading(true)
        setError('')
        try {
            if (mode === 'local') {
                const user = await dbService.login({ username, password })
                localStorage.setItem('user', JSON.stringify(user))
                toast.success('Connexion réussie', `Bienvenue, ${user.name || user.username}`)
                onLogin(user)
            } else {
                const cloudUser = await dbService.cloudActivate({ username, password })
                localStorage.setItem('user', JSON.stringify(cloudUser))
                const statusMsg = cloudUser.licenseStatus === 'trial'
                    ? `Essai — ${cloudUser.daysLeft} jour${cloudUser.daysLeft !== 1 ? 's' : ''} restant${cloudUser.daysLeft !== 1 ? 's' : ''}`
                    : cloudUser.licenseStatus === 'warning'
                    ? `Abonnement expire dans ${cloudUser.daysLeft} jours`
                    : 'Abonnement actif'
                toast.success(`Connecté — ${cloudUser.name}`, statusMsg)
                onLogin(cloudUser)
            }
        } catch (err: any) {
            toast.error('Connexion échouée', err.message || 'Identifiants incorrects')
            setError(err.message || 'Identifiants incorrects')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left panel — brand */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex-col items-center justify-center p-16 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full" />
                </div>

                <div className="relative z-10 text-center text-white max-w-md">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-white/20 shadow-2xl overflow-hidden">
                        <img
                            src={schoolLogo || '/logo.png'}
                            alt="DJOLI"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png' }}
                        />
                    </div>
                    <h1 className="text-5xl font-black tracking-tight mb-2">DJOLI</h1>
                    <p className="text-base text-white/50 font-semibold uppercase tracking-widest mb-2">
                        Gestion Scolaire
                    </p>
                    {schoolName && (
                        <p className="text-lg text-white/90 font-bold mb-10 bg-white/10 rounded-xl px-4 py-2 inline-block">
                            {schoolName}
                        </p>
                    )}

                    <div className="grid grid-cols-3 gap-4 mt-8">
                        {[
                            { label: 'Élèves', icon: '👨‍🎓', desc: 'Inscriptions & Suivi' },
                            { label: 'Finance', icon: '💰', desc: 'Paiements & Caisse' },
                            { label: 'Notes', icon: '📊', desc: 'Bulletins & Classements' },
                        ].map(item => (
                            <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 text-left">
                                <span className="text-2xl">{item.icon}</span>
                                <p className="font-bold text-sm mt-2">{item.label}</p>
                                <p className="text-white/60 text-xs mt-0.5">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <p className="mt-12 text-white/40 text-xs font-medium tracking-widest uppercase">
                        Offline First • Sécurisé • Performant
                    </p>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
                <div className="w-full max-w-md">
                    {/* Logo mobile */}
                    <div className="lg:hidden flex flex-col items-center gap-3 mb-10">
                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center overflow-hidden">
                            <img
                                src={schoolLogo || '/logo.png'}
                                alt="DJOLI"
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png' }}
                            />
                        </div>
                        <span className="text-2xl font-black text-gray-900">DJOLI</span>
                        {schoolName && <span className="text-sm font-semibold text-indigo-600">{schoolName}</span>}
                    </div>

                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Bienvenue</h2>
                        {schoolName ? (
                            <p className="text-indigo-600 font-bold mt-1">{schoolName}</p>
                        ) : null}
                        <p className="text-gray-500 mt-1">Connectez-vous à votre espace de gestion</p>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex bg-gray-200/70 p-1 rounded-2xl mb-8">
                        <button
                            type="button"
                            onClick={() => setMode('local')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'local' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <WifiOff size={15} />
                            Connexion Locale
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('cloud')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'cloud' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Wifi size={15} />
                            Activation Cloud
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-start gap-3 text-sm font-medium animate-in slide-in-from-top-1">
                                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                Téléphone ou Email
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    required
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="ex: +224 600 000 000 ou admin@ecole.com"
                                    className="w-full pl-12 pr-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium text-gray-900 transition-all placeholder:text-gray-300"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
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
                                mode === 'local' ? 'Se connecter' : 'Activer via le Cloud'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-10 font-medium">
                        DJOLI © {new Date().getFullYear()} • Tous droits réservés
                    </p>
                </div>
            </div>
        </div>
    )
}
