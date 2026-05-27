import React from 'react'
import { ShieldX, RefreshCw, AlertTriangle, Clock } from 'lucide-react'

interface BlockedScreenProps {
    status:          'expired' | 'warning' | 'trial'
    daysLeft:        number
    schoolName?:     string
    onRenew:         () => void
    onDismiss?:      () => void // only for 'warning' and 'trial'
}

export const BlockedScreen: React.FC<BlockedScreenProps> = ({
    status, daysLeft, schoolName, onRenew, onDismiss
}) => {
    const isBlocked = status === 'expired'

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white p-6">
            <div className="w-full max-w-md text-center">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg
                    ${isBlocked ? 'bg-red-500 shadow-red-200' : 'bg-amber-500 shadow-amber-200'}`}>
                    {isBlocked
                        ? <ShieldX size={36} className="text-white" />
                        : <AlertTriangle size={36} className="text-white" />
                    }
                </div>

                <h1 className={`text-2xl font-black mb-2 ${isBlocked ? 'text-red-700' : 'text-amber-700'}`}>
                    {isBlocked ? 'Abonnement expiré' : 'Abonnement bientôt expiré'}
                </h1>

                {schoolName && (
                    <p className="text-gray-500 text-sm mb-4 font-medium">{schoolName}</p>
                )}

                <p className="text-gray-600 mb-8 leading-relaxed">
                    {isBlocked
                        ? "L'accès à SMS Pro a été suspendu. Renouvelez votre abonnement pour continuer à utiliser toutes les fonctionnalités."
                        : status === 'trial'
                            ? `Votre période d'essai gratuite se termine dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}. Souscrivez maintenant pour ne pas interrompre votre activité.`
                            : `Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}. Renouvelez avant l'expiration pour éviter toute interruption.`
                    }
                </p>

                {status === 'trial' && daysLeft > 0 && (
                    <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
                        <Clock size={18} className="text-amber-600" />
                        <span className="font-bold text-amber-700">
                            {daysLeft} jour{daysLeft > 1 ? 's' : ''} d'essai restant{daysLeft > 1 ? 's' : ''}
                        </span>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={onRenew}
                        className={`w-full py-4 rounded-2xl font-black text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2
                            ${isBlocked
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                            }`}
                    >
                        <RefreshCw size={18} />
                        {isBlocked ? 'Réactiver mon abonnement' : 'Souscrire maintenant'}
                    </button>

                    {!isBlocked && onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="w-full py-3 rounded-2xl font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all text-sm"
                        >
                            Me rappeler plus tard
                        </button>
                    )}
                </div>

                <p className="mt-8 text-xs text-gray-400">
                    Pour toute question : support@smspro.app
                </p>
            </div>
        </div>
    )
}
