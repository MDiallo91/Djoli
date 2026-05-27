import React from 'react'
import { PrintHeader } from './PrintHeader'
import { getMention, getMentionColors, getDecision, LevelConfig, DEFAULT_CONFIGS } from '../utils/gradingUtils'

interface ClassRankingPrintProps {
    className:   string
    term:        string
    schoolYear:  string
    rankings:    any[]
    levelConfig?: LevelConfig
}

export const ClassRankingPrint: React.FC<ClassRankingPrintProps> = ({
    className, term, schoolYear, rankings, levelConfig,
}) => {
    const cfg     = levelConfig ?? DEFAULT_CONFIGS['Collège']
    const { scale, config: mentions } = cfg

    return (
        <div className="pt-2 px-4 pb-6 bg-white text-black min-h-screen font-serif text-[12px]">
            <style>{`@page { size: A4 portrait; margin: 5mm; }`}</style>
            <PrintHeader schoolYear={schoolYear} alwaysVisible />

            <div className="text-center my-6">
                <h2 className="text-xl font-black uppercase underline decoration-2 underline-offset-4">
                    RÉSULTATS DU TRIMESTRE : {term}
                </h2>
                <p className="font-bold text-gray-700 mt-2">CLASSE : {className} | ANNÉE SCOLAIRE : {schoolYear}</p>
                <p className="font-bold text-gray-700 text-sm mt-1">CLASSEMENT PAR ORDRE DE MÉRITE — Barème /{scale}</p>
            </div>

            <table className="w-full border-collapse border border-black mt-6">
                <thead>
                    <tr className="bg-gray-100 italic">
                        <th className="border border-black px-2 py-2 w-14 text-center">Rang</th>
                        <th className="border border-black px-4 py-2 text-left">Prénom et Nom</th>
                        <th className="border border-black px-2 py-2 w-10 text-center">Sexe</th>
                        <th className="border border-black px-4 py-2 w-24 text-center">Moyenne /{scale}</th>
                        <th className="border border-black px-4 py-2 w-36 text-center">Appréciation</th>
                        <th className="border border-black px-4 py-2 w-32 text-center">Décision</th>
                    </tr>
                </thead>
                <tbody>
                    {rankings.map((student, index) => {
                        const avg     = student.average !== null && student.average !== undefined ? Number(student.average) : null
                        const mention = avg !== null ? getMention(avg, mentions) : null
                        const mc      = mention ? getMentionColors(mention.color) : null
                        const decision = avg !== null ? getDecision(avg, scale) : null

                        return (
                            <tr key={student.student_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="border border-black px-2 py-1.5 text-center font-black">{index + 1}</td>
                                <td className="border border-black px-4 py-1.5 font-bold uppercase text-black">
                                    {student.last_name} {student.first_name}
                                </td>
                                <td className="border border-black px-2 py-1.5 text-center font-medium">{student.gender ?? '—'}</td>
                                <td className="border border-black px-4 py-1.5 text-center font-black">
                                    {avg !== null ? avg.toFixed(2) : '---'}
                                </td>
                                <td className={`border border-black px-4 py-1.5 text-center text-[10px] font-bold ${mc?.text ?? ''}`}>
                                    {mention?.label ?? '---'}
                                </td>
                                <td className={`border border-black px-4 py-1.5 text-center text-[10px] font-black ${
                                    decision === 'ADMIS(E)' ? 'text-green-700' : decision ? 'text-red-700' : ''
                                }`}>
                                    {decision ?? '---'}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-100">
                        <td colSpan={6} className="border border-black px-4 py-2 text-right font-bold text-[10px] text-gray-600">
                            Total élèves classés : <span className="font-black text-black">{rankings.length}</span>
                            &nbsp;&nbsp;|&nbsp;&nbsp;
                            Admis : <span className="font-black text-green-700">
                                {rankings.filter(s => s.average !== null && getDecision(Number(s.average), scale) === 'ADMIS(E)').length}
                            </span>
                        </td>
                    </tr>
                </tfoot>
            </table>

            <div className="mt-16 pr-10 text-right">
                <p className="font-bold underline">LA DIRECTION</p>
            </div>

            <div className="mt-4 text-center border-t border-gray-200 pt-2">
                <p className="text-[8px] italic text-gray-400">
                    Édité le {new Date().toLocaleDateString('fr-FR')} — SMS Pro
                </p>
            </div>
        </div>
    )
}
