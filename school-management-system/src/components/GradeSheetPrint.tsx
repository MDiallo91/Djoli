import React from 'react';
import { PrintHeader } from './PrintHeader';

interface GradeSheetPrintProps {
    className: string;
    subjectName: string;
    term: string;
    students: any[];
    schoolYear: string;
}

export const GradeSheetPrint: React.FC<GradeSheetPrintProps> = ({ className, subjectName, term, students, schoolYear }) => {
    return (
        <div className="pt-1 px-4 pb-4 bg-white text-black text-xs min-h-screen">
            <style>{`@page { size: A4 portrait; margin: 5mm; }`}</style>

            <PrintHeader schoolYear={schoolYear} docTitle="Fiche de Notes" alwaysVisible />

            {/* INFOS */}
            <div className="border border-black p-2 mb-3 grid grid-cols-3 text-[11px]">
                <div>
                    <span className="font-bold">Classe :</span> {className}
                </div>
                <div className="text-center">
                    <span className="font-bold">Matière :</span> {subjectName}
                </div>
                <div className="text-right">
                    <span className="font-bold">Période :</span> {term}
                </div>
            </div>

            {/* TABLE */}
            <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border px-1 py-1 w-8">N°</th>
                        <th className="border px-1 py-1 w-20">Matricule</th>
                        <th className="border px-2 py-1 text-left">Nom & Prénoms</th>
                        <th className="border px-1 py-1 w-14">N1</th>
                        <th className="border px-1 py-1 w-14">N2</th>
                        <th className="border px-1 py-1 w-14">N3</th>
                        <th className="border px-1 py-1 w-16">Moy</th>
                    </tr>
                </thead>

                <tbody>
                    {students.map((s, index) => (
                        <tr key={s.id}>
                            <td className="border px-1 py-1 text-center font-bold">
                                {index + 1}
                            </td>

                            <td className="border px-1 py-1 text-center text-[10px]">
                                {s.matricule || '---'}
                            </td>

                            <td className="border px-2 py-1 gap-1 leading-tight flex">
                                <div className=" text-md">
                                    {s.last_name}  
                                </div>
                                <div className="text-md">
                                    {s.first_name}
                                </div>
                            </td>

                            <td className="border text-center"></td>
                            <td className="border text-center"></td>
                            <td className="border text-center"></td>
                            <td className="border text-center font-bold"></td>
                        </tr>
                    ))}

                    {/* lignes vides */}
                    {[...Array(Math.max(0, 20 - students.length))].map((_, i) => (
                        <tr key={i}>
                            <td className="border h-6"></td>
                            <td className="border"></td>
                            <td className="border"></td>
                            <td className="border"></td>
                            <td className="border"></td>
                            <td className="border"></td>
                            <td className="border"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* FOOTER */}
            <div className="mt-6 flex justify-between text-[11px]">
                <div className="text-center">
                    <p className="font-bold">Le Professeur</p>
                    <div className="h-16 border-b border-black w-40 mt-2"></div>
                </div>

                <div className="text-center">
                    <p className="font-bold">La Direction</p>
                    <div className="h-16 border-b border-black w-40 mt-2"></div>
                </div>
            </div>

            {/* DATE */}
            <div className="text-right mt-4 text-[10px]">
                Imprimé le : {new Date().toLocaleDateString()}
            </div>

        </div>
    );
};