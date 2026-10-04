export type UserRole = 'admin' | 'doctor' | 'patient';

export interface User {
  id: string | number;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
}

export interface Doctor {
  id: string | number;
  name: string;
  specialty?: string;
}

export interface Appointment {
  id: string | number;
  doctorId: string | number;
  doctorName?: string;
  patientId: string | number;
  patientName?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | string;
  notes?: string;
}

export interface MedicalRecord {
  id: string | number;
  date: string;
  diagnosis: string;
  prescription: string;
  doctorName?: string;
  patientId?: string | number;
}

export interface Feedback {
  id: string | number;
  patientName?: string;
  rating: number;
  comment: string;
  doctorId?: string | number;
  date?: string;
}

export interface Settings {
  [key: string]: any;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  userId: string | number;
  name: string;
}

export interface AuthUser {
  token: string;
  role: UserRole;
  userId: string | number;
  name: string;
  email?: string;
}

export interface PatientProfile {
  userId?: number | string;
  name?: string;
  email?: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
  contact: string | null;
  address: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}
