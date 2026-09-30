import React from 'react';
import { PrintHeader } from './PrintHeader';

interface EvaluationResultPrintProps {
    className: string;
    evaluationName: string;
    term: string;
    students: { last_name: string; first_name: string; gender?: string; matricule?: string; moyenne?: number | null }[];
    schoolYear: string;
}

function getMentionLabel(avg: number | null): string {
    if (avg === null) return '—'
    if (avg >= 18) return 'Excellent'
    if (avg >= 16) return 'Très Bien'
    if (avg >= 14) return 'Bien'
    if (avg >= 12) return 'Assez Bien'
    if (avg >= 10) return 'Passable'
    return 'Insuffisant'
}

export const EvaluationResultPrint: React.FC<EvaluationResultPrintProps> = ({ className, evaluationName, term, students, schoolYear }) => {
    return (
        <div className="pt-2 px-4 pb-6 bg-white text-black min-h-screen">
            <style>{`@page { size: A4 portrait; margin: 5mm; }`}</style>
            <PrintHeader schoolYear={schoolYear} docTitle="Résultats de l'Évaluation" alwaysVisible />

            <div className="grid grid-cols-2 gap-8 mb-8 border-2 border-black p-4 rounded-xl">
                <div>
                    <p className="text-[10px] font-black uppercase text-gray-500">Classe</p>
                    <p className="font-black text-xl">{className}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-gray-500">Évaluation / Trimestre</p>
                    <p className="font-black text-xl">{evaluationName} - {term}</p>
                </div>
            </div>

            <table className="w-full border-collapse border-2 border-black">
                <thead>
                    <tr className="bg-gray-100 italic">
                        <th className="border-2 border-black px-4 py-3 text-xs font-black uppercase w-12 text-center">Rang</th>
                        <th className="border-2 border-black px-4 py-3 text-xs font-black uppercase text-left">Matricule</th>
                        <th className="border-2 border-black px-4 py-3 text-xs font-black uppercase text-left">Nom & Prénoms</th>
                        <th className="border-2 border-black px-4 py-3 text-xs font-black uppercase w-24 text-center">Sexe</th>
                        <th className="border-2 border-black px-4 py-3 text-xs font-black uppercase w-32 text-center">Moyenne</th>
                        <th className="border-2 border-black px-4 py-3 text-xs font-black uppercase text-center">Mention</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((s, index) => (
                        <tr key={index} className="h-12">
                            <td className="border-2 border-black px-4 py-2 text-center font-bold">{index + 1}</td>
                            <td className="border-2 border-black px-4 py-2 font-bold text-[10px]">{s.matricule || '---'}</td>
                            <td className="border-2 border-black px-4 py-2 font-black uppercase text-sm">
                                {s.first_name} {s.last_name}
                            </td>
                            <td className="border-2 border-black px-4 py-2 text-center font-bold">{s.gender || '—'}</td>
                            <td className="border-2 border-black px-4 py-2 text-center font-black text-base">
                                {s.moyenne !== null && s.moyenne !== undefined ? s.moyenne.toFixed(2) : '—'}
                            </td>
                            <td className="border-2 border-black px-4 py-2 text-center italic text-xs font-bold">
                                {getMentionLabel(s.moyenne ?? null)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-12 grid grid-cols-3 gap-8 px-4">
                <div className="border border-black p-4 rounded-xl bg-gray-50">
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Statistiques</p>
                    <p className="text-sm font-bold">Effectif: <span className="font-black float-right">{students.length}</span></p>
                    <p className="text-sm font-bold">Filles: <span className="font-black float-right">{students.filter(s => s.gender === 'F').length}</span></p>
                    <p className="text-sm font-bold">Garçons: <span className="font-black float-right">{students.filter(s => s.gender === 'M').length}</span></p>
                </div>
                <div className="text-center pt-4">
                    <p className="font-black underline uppercase text-xs">Le Conseil des Professeurs</p>
                </div>
                <div className="text-center pt-4">
                    <p className="font-black underline uppercase text-xs">Le Chef d'Établissement</p>
                </div>
            </div>

            <div className="fixed bottom-8 left-8 right-8 text-[10px] text-gray-400 font-bold italic text-center no-print">
                DJOLI © {new Date().getFullYear()} — Généré le {new Date().toLocaleDateString('fr-FR')}
            </div>
        </div>
    );
};
