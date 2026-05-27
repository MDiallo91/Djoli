import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { CheckCircle, XCircle, Clock, Users } from 'lucide-react';

export function StudentAttendance() {
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string | ''>('');
    const [students, setStudents] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadClasses = async () => {
            const data = await dbService.getClasses();
            setClasses(data);
            if (data.length > 0) setSelectedClass(data[0].id);
        };
        loadClasses();
    }, []);

    const loadStudents = async () => {
        if (!selectedClass) return;
        setLoading(true);
        try {
            const data = await dbService.getStudentAttendance(selectedClass as string, selectedDate);
            setStudents(data);
        } catch (error) {
            console.error('Failed to load students', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStudents();
    }, [selectedClass, selectedDate]);

    const handleMarkAttendance = async (studentId: string, status: 'Présent' | 'Absent' | 'En retard') => {
        try {
            await dbService.addStudentAttendance([{
                student_id: studentId,
                date: selectedDate,
                status: status
            }]);
            loadStudents();
        } catch (error) {
            console.error('Failed to mark attendance', error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Appel Journalier</h2>
                    <p className="text-sm text-gray-500">Marquez les présences des élèves par classe.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="flex bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 items-center gap-2">
                        <Users size={16} className="text-gray-400" />
                        <select
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            <option value="">Sélectionner une classe</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                        <input
                            type="date"
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                            <th className="px-8 py-4">Élève</th>
                            <th className="px-8 py-4 text-center">Statut Actuel</th>
                            <th className="px-8 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={3} className="px-8 py-12 text-center text-gray-400">Chargement...</td></tr>
                        ) : students.length === 0 ? (
                            <tr><td colSpan={3} className="px-8 py-12 text-center text-gray-400 italic">Aucun élève trouvé pour cette classe.</td></tr>
                        ) : students.map((s) => (
                            <tr key={s.student_id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400 text-sm">
                                            {s.first_name[0]}{s.last_name[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{s.first_name} {s.last_name}</p>
                                            <p className="text-xs text-gray-500">ID: #{s.student_id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-4 text-center">
                                    {s.status ? (
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-black ring-1 ring-inset ${s.status === 'Présent' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                s.status === 'Absent' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                    'bg-orange-50 text-orange-700 ring-orange-600/20'
                                            }`}>
                                            {s.status}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-300 italic">Non marqué</span>
                                    )}
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleMarkAttendance(s.student_id, 'Présent')}
                                            className={`p-2 rounded-lg transition-all ${s.status === 'Présent' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                            title="Présent"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleMarkAttendance(s.student_id, 'En retard')}
                                            className={`p-2 rounded-lg transition-all ${s.status === 'En retard' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
                                            title="En retard"
                                        >
                                            <Clock size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleMarkAttendance(s.student_id, 'Absent')}
                                            className={`p-2 rounded-lg transition-all ${s.status === 'Absent' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                            title="Absent"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
