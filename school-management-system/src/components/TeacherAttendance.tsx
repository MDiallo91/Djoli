import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export function TeacherAttendance() {
    const [staff, setStaff] = useState<any[]>([]);
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const loadData = async () => {
        try {
            const allStaff = await dbService.getStaff();
            setStaff(allStaff.filter((s: any) => s.role === 'Enseignant'));

            const month = selectedDate.slice(0, 7);
            const records = await dbService.getTeacherAttendance(month);
            setAttendanceList(records);
        } catch (error) {
            console.error('Failed to load attendance');
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const handleMarkAttendance = async (teacherId: string, status: 'Présent' | 'Absent', hours = 0) => {
        try {
            await dbService.addTeacherAttendance({
                teacher_id: teacherId,
                date: selectedDate,
                status: status,
                hours_worked: hours
            });
            loadData();
        } catch (error) {
            console.error('Failed to mark attendance', error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Pointage des Enseignants</h2>
                    <p className="text-sm text-gray-500">Gérez les présences et les heures de cours effectuées.</p>
                </div>
                <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-1">
                    <input
                        type="date"
                        className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map((teacher) => {
                    const record = attendanceList.find(a => a.teacher_id === teacher.id && a.date === selectedDate);

                    return (
                        <div key={teacher.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between h-48">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                                    {teacher.first_name[0]}{teacher.last_name[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{teacher.first_name} {teacher.last_name}</h3>
                                    <p className="text-xs text-gray-500 mt-1">Base: {teacher.salary_base} GNF</p>
                                </div>
                            </div>

                            <div className="mt-auto">
                                {record ? (
                                    <div className={`flex items-center justify-between p-3 rounded-xl ${record.status === 'Présent' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        <div className="flex items-center gap-2">
                                            {record.status === 'Présent' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                            <span className="font-bold text-sm">{record.status}</span>
                                        </div>
                                        {record.hours_worked > 0 && (
                                            <div className="flex items-center gap-1.5 text-sm font-semibold opacity-80">
                                                <Clock size={14} />
                                                {record.hours_worked}h
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:border-primary"
                                                defaultValue={4}
                                                id={`hours-${teacher.id}`}
                                            />
                                            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">heures de cours</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const h = (document.getElementById(`hours-${teacher.id}`) as HTMLInputElement)?.value;
                                                    handleMarkAttendance(teacher.id, 'Présent', parseInt(h) || 0);
                                                }}
                                                className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 py-2.5 rounded-xl font-bold text-sm transition-colors"
                                            >
                                                Marquer Présent
                                            </button>
                                            <button
                                                onClick={() => handleMarkAttendance(teacher.id, 'Absent', 0)}
                                                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl font-bold text-sm transition-colors"
                                            >
                                                Absent
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {staff.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                        <Clock className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                        <p>Aucun enseignant enregistré dans le système.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
