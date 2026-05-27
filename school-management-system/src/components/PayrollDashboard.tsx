import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Wallet, CheckCircle, Clock, FileText, X } from 'lucide-react';
import { PrintPreview } from './PrintPreview';
import { PaySlipPrint } from './PaySlipPrint';

export function PayrollDashboard() {
    const [staff, setStaff] = useState<any[]>([]);
    const [salaries, setSalaries] = useState<any[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedPaySlip, setSelectedPaySlip] = useState<{ person: any, salary: any } | null>(null);
    const [payingStaff, setPayingStaff] = useState<any | null>(null);
    const [bonusValue, setBonusValue] = useState("0");

    const loadData = async () => {
        try {
            const [allStaff, paidSalaries, attendance] = await Promise.all([
                dbService.getStaff(),
                dbService.getSalaries(currentMonth),
                dbService.getTeacherAttendance(currentMonth)
            ]);

            const staffWithHours = allStaff.filter((s: any) => s.role !== 'Parent').map((s: any) => {
                const hours = attendance
                    .filter((a: any) => a.staff_id === s.id && a.status === 'Présent')
                    .reduce((acc: number, a: any) => acc + (a.hours_worked || 0), 0);
                return { ...s, monthly_hours: hours };
            });

            setStaff(staffWithHours);
            setSalaries(paidSalaries);
        } catch (error) {
            console.error('Failed to load payroll data');
        }
    };

    useEffect(() => {
        loadData();
    }, [currentMonth]);

    const handleConfirmPayment = async () => {
        if (!payingStaff) return;

        const bonusVal = parseFloat(bonusValue) || 0;
        const netSalary = (payingStaff.salary_base || 0) + bonusVal;

        const [year, monthNum] = currentMonth.split('-');
        const payData = {
            staff_id: payingStaff.id,
            month: monthNum,
            year: year,
            base_salary: payingStaff.salary_base || 0,
            net_salary: netSalary,
            bonus: bonusVal
        };

        try {
            await dbService.paySalary(payData);
            setPayingStaff(null);
            setBonusValue("0");
            loadData();
        } catch (error: any) {
            console.error('Payment failed', error);
            alert(`Erreur: ${error.message}`);
        }
    };

    const handlePaySalary = (staffMember: any) => {
        setPayingStaff(staffMember);
        setBonusValue("0");
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' }).format(amount);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Gestion de la Paie</h2>
                    <p className="text-sm text-gray-500">Calculez et effectuez les virements mensuels.</p>
                </div>
                <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-1">
                    <input
                        type="month"
                        className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700"
                        value={currentMonth}
                        onChange={(e) => setCurrentMonth(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                            <th className="p-4 pl-6">Employé</th>
                            <th className="p-4">Rôle</th>
                            <th className="p-4 text-center">Heures (Mois)</th>
                            <th className="p-4 text-right">Salaire de Base</th>
                            <th className="p-4 text-center">Statut</th>
                            <th className="p-4 pr-6 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {staff.map((person) => {
                            const isPaid = salaries.find(s => s.staff_id === person.id);

                            return (
                                <tr key={person.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 pl-6 font-bold text-gray-900">
                                        {person.first_name} {person.last_name}
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">
                                            {person.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center font-bold text-gray-700">
                                        {person.monthly_hours > 0 ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <Clock size={14} className="text-primary" />
                                                {person.monthly_hours}h
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 font-mono text-right text-gray-900">
                                        {formatCurrency(person.salary_base)}
                                    </td>
                                    <td className="p-4 text-center">
                                        {isPaid ? (
                                            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
                                                <CheckCircle size={14} /> Payé
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold">
                                                <Clock size={14} /> En attente
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 pr-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            {isPaid && (
                                                <button
                                                    onClick={() => setSelectedPaySlip({ person, salary: isPaid })}
                                                    className="flex items-center gap-2 bg-gray-50 text-gray-700 px-3 py-2 rounded-xl border border-gray-200 font-bold text-xs hover:bg-gray-100 transition-all"
                                                >
                                                    <FileText size={14} />
                                                    Bulletin
                                                </button>
                                            )}
                                            {!isPaid && (
                                                <button
                                                    onClick={() => handlePaySalary(person)}
                                                    className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                                                >
                                                    Payer
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {staff.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        <Wallet className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                        <p>Aucun employé configuré avec un salaire.</p>
                    </div>
                )}
            </div>
            {/* Payment Confirmation Modal */}
            {payingStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-primary/10 p-4 rounded-2xl">
                                    <Wallet className="text-primary w-8 h-8" />
                                </div>
                                <button
                                    onClick={() => setPayingStaff(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <h3 className="text-2xl font-black text-gray-900 mb-2">Confirmer le Paiement</h3>
                            <p className="text-gray-500 font-medium mb-8">
                                Vous êtes sur le point de valider le salaire de <span className="text-gray-900 font-bold">{payingStaff.first_name} {payingStaff.last_name}</span> pour le mois de {currentMonth}.
                            </p>

                            <div className="space-y-6 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 mb-8">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Salaire de Base</span>
                                    <span className="text-lg font-mono font-black text-gray-900">{formatCurrency(payingStaff.salary_base)}</span>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest block">
                                        Prime / Bonus (Optionnel)
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            value={bonusValue}
                                            onChange={(e) => setBonusValue(e.target.value)}
                                            className="w-full bg-white border-2 border-transparent focus:border-primary/20 px-4 py-3 rounded-xl font-mono font-bold text-gray-900 shadow-inner outline-none transition-all"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300 group-focus-within:text-primary transition-colors">GNF</span>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-200" />

                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-gray-900">NET À VERSER</span>
                                    <span className="text-2xl font-black text-primary">
                                        {formatCurrency((payingStaff.salary_base || 0) + (parseFloat(bonusValue) || 0))}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmPayment}
                                className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <CheckCircle size={20} />
                                Valider le Paiement
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Pay Slip Preview */}
            {selectedPaySlip && (
                <PrintPreview
                    title={`Bulletin de Paie — ${selectedPaySlip.person.first_name} ${selectedPaySlip.person.last_name} — ${currentMonth}`}
                    onClose={() => setSelectedPaySlip(null)}
                >
                    <PaySlipPrint
                        person={selectedPaySlip.person}
                        salary={selectedPaySlip.salary}
                        month={currentMonth}
                    />
                </PrintPreview>
            )}
        </div>
    );
}
