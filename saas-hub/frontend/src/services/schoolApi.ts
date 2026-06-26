import apiClient from '../lib/apiClient';

const S = '/school';

// Années scolaires
export const getSchoolYears  = ()            => apiClient.get(`${S}/school-years`).then(r => r.data);
export const createSchoolYear = (d: any)     => apiClient.post(`${S}/school-years`, d).then(r => r.data);
export const updateSchoolYear = (id: string, d: any) => apiClient.put(`${S}/school-years/${id}`, d).then(r => r.data);
export const deleteSchoolYear = (id: string) => apiClient.delete(`${S}/school-years/${id}`).then(r => r.data);

// Classes
export const getClasses   = ()           => apiClient.get(`${S}/classes`).then(r => r.data);
export const createClass  = (d: any)     => apiClient.post(`${S}/classes`, d).then(r => r.data);
export const updateClass  = (id: string, d: any) => apiClient.put(`${S}/classes/${id}`, d).then(r => r.data);
export const deleteClass  = (id: string) => apiClient.delete(`${S}/classes/${id}`).then(r => r.data);

// Matières
export const getSubjects   = ()           => apiClient.get(`${S}/subjects`).then(r => r.data);
export const createSubject = (d: any)     => apiClient.post(`${S}/subjects`, d).then(r => r.data);
export const deleteSubject = (id: string) => apiClient.delete(`${S}/subjects/${id}`).then(r => r.data);

// Associations classe-matière
export const getClassSubjects   = (classId: string)  => apiClient.get(`${S}/class-subjects/${classId}`).then(r => r.data);
export const createClassSubject = (d: any)            => apiClient.post(`${S}/class-subjects`, d).then(r => r.data);
export const deleteClassSubject = (id: string)        => apiClient.delete(`${S}/class-subjects/${id}`).then(r => r.data);

// Personnel
export const getStaff    = ()                     => apiClient.get(`${S}/staff`).then(r => r.data);
export const createStaff = (d: any)               => apiClient.post(`${S}/staff`, d).then(r => r.data);
export const updateStaff = (id: string, d: any)   => apiClient.put(`${S}/staff/${id}`, d).then(r => r.data);
export const deleteStaff = (id: string)            => apiClient.delete(`${S}/staff/${id}`).then(r => r.data);

// Élèves
export const getStudents    = (yearId?: string) => apiClient.get(`${S}/students${yearId ? `?yearId=${yearId}` : ''}`).then(r => r.data);
export const createStudent  = (d: any)          => apiClient.post(`${S}/students`, d).then(r => r.data);
export const updateStudent  = (id: string, d: any) => apiClient.put(`${S}/students/${id}`, d).then(r => r.data);
export const deleteStudent  = (id: string)       => apiClient.delete(`${S}/students/${id}`).then(r => r.data);

// Inscriptions
export const getEnrollments   = (params?: { classId?: string; yearId?: string }) => apiClient.get(`${S}/enrollments`, { params }).then(r => r.data);
export const createEnrollment = (d: any)     => apiClient.post(`${S}/enrollments`, d).then(r => r.data);
export const deleteEnrollment = (id: string) => apiClient.delete(`${S}/enrollments/${id}`).then(r => r.data);

// Notes
export const getGrades      = (params: { classId?: string; subjectId?: string; term?: string; yearId?: string; studentId?: string }) =>
    apiClient.get(`${S}/grades`, { params }).then(r => r.data);
export const saveGradesBulk = (grades: any[]) => apiClient.post(`${S}/grades/bulk`, { grades }).then(r => r.data);
export const deleteGrade    = (id: string)    => apiClient.delete(`${S}/grades/${id}`).then(r => r.data);

// Paiements
export const getPayments   = (params?: { studentId?: string; yearId?: string }) => apiClient.get(`${S}/payments`, { params }).then(r => r.data);
export const createPayment = (d: any)     => apiClient.post(`${S}/payments`, d).then(r => r.data);
export const deletePayment = (id: string) => apiClient.delete(`${S}/payments/${id}`).then(r => r.data);

// Transactions caisse
export const getTransactions   = (yearId?: string) => apiClient.get(`${S}/transactions${yearId ? `?yearId=${yearId}` : ''}`).then(r => r.data);
export const createTransaction = (d: any)           => apiClient.post(`${S}/transactions`, d).then(r => r.data);
export const deleteTransaction = (id: string)       => apiClient.delete(`${S}/transactions/${id}`).then(r => r.data);

// Élèves détaillés
export const getStudentsDetailed = (yearId?: string) => apiClient.get(`${S}/students/detailed${yearId ? `?yearId=${yearId}` : ''}`).then(r => r.data);

// Bulletin
export const getStudentBulletin = (studentId: string, yearId?: string) =>
    apiClient.get(`${S}/bulletin/${studentId}${yearId ? `?yearId=${yearId}` : ''}`).then(r => r.data);
