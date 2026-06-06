export interface Stats {
    studentCount: number
    staffCount: number
    classCount: number
}

export interface Student {
    id: string
    matricule?: string
    first_name: string
    last_name: string
    class_name: string
    class_id?: string
    gender: 'M' | 'F'
    birth_date: string
    pere?: string
    mere?: string
    phone?: string
}

export const dbService = {
    getStats: async (yearId?: string): Promise<Stats> => {
        return await window.ipcRenderer.invoke('get-stats', yearId)
    },

    getStudents: async (schoolYearId?: string): Promise<Student[]> => {
        return await window.ipcRenderer.invoke('get-students', schoolYearId)
    },

    addCashTransaction: async (type: 'IN' | 'OUT', amount: number, reason: string, yearId?: string) => {
        return await window.ipcRenderer.invoke('add-cash-transaction', { type, amount, reason, yearId })
    },

    addStudent: async (student: any): Promise<any> => {
        return await window.ipcRenderer.invoke('add-student', student)
    },
    deleteStudent: async (id: string): Promise<any> => {
        return await window.ipcRenderer.invoke('delete-student', id)
    },

    getSubjects: async (): Promise<any[]> => {
        return await window.ipcRenderer.invoke('get-subjects')
    },

    addGrade: async (grade: any): Promise<any> => {
        return await window.ipcRenderer.invoke('add-grade', grade)
    },

    getStudentGrades: async (studentId: string, yearId?: string) => {
        return await (window as any).ipcRenderer.invoke('get-student-grades', yearId ? { studentId, yearId } : studentId)
    },
    getStaff: async () => {
        return await (window as any).ipcRenderer.invoke('get-staff')
    },
    addStaff: async (staffData: any) => {
        return await (window as any).ipcRenderer.invoke('add-staff', staffData)
    },
    updateStaff: async (staffData: any) => {
        return await (window as any).ipcRenderer.invoke('update-staff', staffData)
    },
    deleteStaff: async (id: string) => {
        return await (window as any).ipcRenderer.invoke('delete-staff', id)
    },
    getTeacherAttendance: async (month: string) => {
        return await (window as any).ipcRenderer.invoke('get-teacher-attendance', month)
    },
    addTeacherAttendance: async (data: any) => {
        return await (window as any).ipcRenderer.invoke('add-teacher-attendance', data)
    },
    getSalaries: async (month: string) => {
        return await (window as any).ipcRenderer.invoke('get-salaries', month)
    },
    paySalary: async (data: any) => {
        return await (window as any).ipcRenderer.invoke('pay-salary', data)
    },
    getClassRankings: async (classId: string, term: string) => {
        return await (window as any).ipcRenderer.invoke('get-class-rankings', classId, term)
    },
    getStudentAttendance: async (classId: string, date: string) => {
        return await (window as any).ipcRenderer.invoke('get-student-attendance', classId, date)
    },
    addStudentAttendance: async (records: any[]) => {
        return await (window as any).ipcRenderer.invoke('add-student-attendance', records)
    },
    getClasses: async () => {
        return await (window as any).ipcRenderer.invoke('get-classes')
    },
    getTimetable: async (classId: string) => {
        return await (window as any).ipcRenderer.invoke('get-timetable', classId)
    },
    addTimetableEntry: async (entry: any) => {
        return await (window as any).ipcRenderer.invoke('add-timetable-entry', entry)
    },
    deleteTimetableEntry: async (id: string) => {
        return await (window as any).ipcRenderer.invoke('delete-timetable-entry', id)
    },
    getCompositionSchedules: async () => {
        return await (window as any).ipcRenderer.invoke('get-composition-schedules')
    },
    addCompositionSchedule: async (data: any) => {
        return await (window as any).ipcRenderer.invoke('add-composition-schedule', data)
    },
    deleteCompositionSchedule: async (id: string) => {
        return await (window as any).ipcRenderer.invoke('delete-composition-schedule', id)
    },
    getCompositionScheduleEntries: async (scheduleId: string) => {
        return await (window as any).ipcRenderer.invoke('get-composition-schedule-entries', scheduleId)
    },
    addCompositionScheduleEntry: async (data: any) => {
        return await (window as any).ipcRenderer.invoke('add-composition-schedule-entry', data)
    },
    deleteCompositionScheduleEntry: async (id: string) => {
        return await (window as any).ipcRenderer.invoke('delete-composition-schedule-entry', id)
    },
    getSchoolYears: async () => {
        return await (window as any).ipcRenderer.invoke('get-school-years')
    },
    addSchoolYear: async (year: any) => {
        return await (window as any).ipcRenderer.invoke('add-school-year', year)
    },
    updateSchoolYear: async (year: any) => {
        return await (window as any).ipcRenderer.invoke('update-school-year', year)
    },
    deleteSchoolYear: async (id: string) => {
        return await (window as any).ipcRenderer.invoke('delete-school-year', id)
    },
    getParentByPhone: async (phone: string) => {
        return await (window as any).ipcRenderer.invoke('get-parent-by-phone', phone)
    },
    updateSchoolInfo: async (info: any) => {
        return await (window as any).ipcRenderer.invoke('update-school-info', info)
    },
    getSchoolInfo: async () => {
        return await (window as any).ipcRenderer.invoke('get-school-info')
    },
    exportSchoolDb: async () => {
        return await (window as any).ipcRenderer.invoke('export-school-db')
    },
    importSchoolDb: async () => {
        return await (window as any).ipcRenderer.invoke('import-school-db')
    },
    resetDatabase: async () => {
        return await (window as any).ipcRenderer.invoke('reset-database')
    },
    searchStudents: async (searchTerm: string) => {
        return await (window as any).ipcRenderer.invoke('search-students', searchTerm)
    },
    // Academic Enhancements
    getClassSubjects: async (classId: string) => {
        return await (window as any).ipcRenderer.invoke('get-class-subjects', classId)
    },
    addClassSubject: async (classId: string, subjectId: string, coefficient: number) => {
        return await (window as any).ipcRenderer.invoke('add-class-subject', { classId, subjectId, coefficient })
    },
    removeClassSubject: async (id: string) => {
        return await (window as any).ipcRenderer.invoke('remove-class-subject', id)
    },
    updateClassTuition: async (classId: string, tuitionFee: number) => {
        return await (window as any).ipcRenderer.invoke('update-class-tuition', { classId, tuitionFee })
    },
    // Finance Enhancements
    addPayment: async (payment: { studentId: string, amount: number, yearId: string, method: string, description: string, months?: string[] }) => {
        return await (window as any).ipcRenderer.invoke('add-payment', payment)
    },
    getStudentPayments: async (studentId: string, yearId: string) => {
        return await (window as any).ipcRenderer.invoke('get-student-payments', { studentId, yearId })
    },
    getStudentBalance: async (studentId: string, yearId: string) => {
        return await (window as any).ipcRenderer.invoke('get-student-balance', { studentId, yearId })
    },
    getClassPaymentStatus: async (classId: string, month: string, yearId: string) => {
        return await (window as any).ipcRenderer.invoke('get-class-payment-status', { classId, month, yearId })
    },
    getTransactions: async (yearId?: string) => {
        return await (window as any).ipcRenderer.invoke('get-transactions', yearId)
    },
    deleteTransaction: async (id: string) => {
        return await (window as any).ipcRenderer.invoke('delete-transaction', id)
    },
    updateTransaction: async (id: string, data: { reason: string; amount: number }) => {
        return await (window as any).ipcRenderer.invoke('update-transaction', { id, ...data })
    },
    addClass: async (data: any) => {
        return await (window as any).ipcRenderer.invoke('add-class', data)
    },
    deleteClass: async (id: string) => {
        return await (window as any).ipcRenderer.invoke('delete-class', id)
    },
    addSubject: async (data: any) => {
        return await (window as any).ipcRenderer.invoke('add-subject', data)
    },
    deleteSubject: async (id: string) => {
        return await (window as any).ipcRenderer.invoke('delete-subject', id)
    },
    getStudentGenderStats: async (yearId?: string) => {
        return await (window as any).ipcRenderer.invoke('get-student-gender-stats', yearId)
    },
    getEnrollmentStats: async () => {
        return await (window as any).ipcRenderer.invoke('get-enrollment-stats')
    },
    getEnrollmentStatsByClass: async () => {
        return await (window as any).ipcRenderer.invoke('get-class-enrollment-stats')
    },
    exportClassExcel: async (students: any[], className: string) => {
        const buffer = await (window as any).ipcRenderer.invoke('export-class-excel', { students, className })
        return buffer
    },
    importClassExcel: async (buffer: ArrayBuffer, classId: string, schoolYearId: string) => {
        const uint8 = new Uint8Array(buffer)
        return await (window as any).ipcRenderer.invoke('import-class-excel', { buffer: uint8, classId, schoolYearId })
    },
    getClassGrades: async (classId: string, subjectId: string, term: string, yearId?: string) => {
        return await (window as any).ipcRenderer.invoke('get-class-grades', { classId, subjectId, term, yearId })
    },
    saveClassGradesBulk: async (grades: any[], subjectId: string, term: string, yearId?: string) => {
        return await (window as any).ipcRenderer.invoke('save-class-grades-bulk', { grades, subjectId, term, yearId })
    },
    // SaaS / Auth
    login: async (credentials: { username: string, password: string }) => {
        return await (window as any).ipcRenderer.invoke('login', credentials)
    },
    getSubscription: async (): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('get-subscription')
    },
    cloudActivate: async (credentials: { username: string, password: string }) => {
        return await (window as any).ipcRenderer.invoke('cloud-activate', credentials)
    },
    initSchoolSession: async (userId: string) => {
        return await (window as any).ipcRenderer.invoke('init-school-session', userId)
    },

    // Licence & comptes multi-école
    getLicense: async (schoolId: string): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('get-license', schoolId)
    },
    checkLicense: async (schoolId: string): Promise<{ status: string; daysLeft: number; cacheExpired?: boolean }> => {
        return await (window as any).ipcRenderer.invoke('check-license', schoolId)
    },
    getAccounts: async (): Promise<any[]> => {
        return await (window as any).ipcRenderer.invoke('get-accounts')
    },
    selectAccount: async (schoolId: string): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('select-account', schoolId)
    },
    cloudVerifyLicense: async (schoolId: string): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('cloud-verify-license', schoolId)
    },
    openPaymentPage: async (): Promise<void> => {
        return await (window as any).ipcRenderer.invoke('open-payment-page')
    },

    // Gestion des utilisateurs école
    getSchoolUsers: async (): Promise<any[]> => {
        return await (window as any).ipcRenderer.invoke('get-school-users')
    },
    createSchoolUser: async (data: { name: string; email: string; username: string; password: string; role: string; permissions: string[]; scope_levels?: string[]; photo_url?: string }): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('create-school-user', data)
    },
    updateSchoolUser: async (data: { id: string; name: string; role: string; permissions: string[]; scope_levels?: string[]; photo_url?: string; is_active?: number }): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('update-school-user', data)
    },
    deleteSchoolUser: async (id: string): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('delete-school-user', id)
    },
    resetUserPassword: async (data: { id: string; newPassword: string }): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('reset-user-password', data)
    },
    changePassword: async (data: { userId: string; newPassword: string }): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('change-password', data)
    },

    // Journal d'audit
    getAuditLogs: async (filters?: { search?: string; action?: string; userId?: string; from?: string; to?: string; limit?: number }): Promise<any[]> => {
        return await (window as any).ipcRenderer.invoke('get-audit-logs', filters ?? {})
    },
    getAuditActionTypes: async (): Promise<string[]> => {
        return await (window as any).ipcRenderer.invoke('get-audit-action-types')
    },
    exportAuditCsv: async (): Promise<string> => {
        return await (window as any).ipcRenderer.invoke('export-audit-csv')
    },

    // Barème & Mentions
    getGradingConfigs: async (): Promise<Record<string, { scale: number; config: any[] }>> => {
        return await (window as any).ipcRenderer.invoke('get-grading-configs')
    },
    saveGradingConfig: async (data: { level: string; scale: number; config: any[] }): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('save-grading-config', data)
    },
    resetGradingConfig: async (level: string): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('reset-grading-config', level)
    },

    // Sync
    syncNow: async (): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('sync-now')
    },
    getSyncStatus: async (): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('get-sync-status')
    },
    resolveConflict: async (data: { conflict_id: string; choice: 'local' | 'remote'; entity_type?: string; entity_id?: string; remote_data?: any }): Promise<any> => {
        return await (window as any).ipcRenderer.invoke('resolve-conflict', data)
    },
    forceFullSync: async (): Promise<{ queued: number }> => {
        return await (window as any).ipcRenderer.invoke('force-full-sync')
    },
}
