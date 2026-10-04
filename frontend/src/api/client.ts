import {
  User,
  Doctor,
  Appointment,
  MedicalRecord,
  Feedback,
  Settings,
  LoginResponse,
  PatientProfile,
} from '../types';

export const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const STORAGE_KEY_API_URL = 'healthpulse_api_base_url';
const STORAGE_KEY_TOKEN = 'healthpulse_auth_token';

let inMemoryToken: string | null = null;

export function getApiBaseUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_API_URL);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // ignore localStorage access error
  }
  return DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    localStorage.setItem(STORAGE_KEY_API_URL, cleanUrl);
  } catch {
    // ignore
  }
}

export function resetApiBaseUrl(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_API_URL);
  } catch {
    // ignore
  }
}

export function getStoredToken(): string | null {
  if (inMemoryToken) {
    return inMemoryToken;
  }
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    inMemoryToken = token;
    return token;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  inMemoryToken = token;
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const authToken = token || getStoredToken();
  if (authToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    let responseData: any = null;

    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      if (responseData && typeof responseData === 'object') {
        errorMessage =
          responseData.message ||
          responseData.error ||
          JSON.stringify(responseData);
      } else if (typeof responseData === 'string' && responseData.trim()) {
        errorMessage = responseData;
      }

      if (response.status === 401) {
        errorMessage = 'Unauthorized: invalid or expired session token.';
      } else if (response.status === 403) {
        errorMessage = 'Forbidden: you do not have permission for this resource.';
      } else if (response.status === 404) {
        errorMessage = `Resource not found (404) at ${url}`;
      }

      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message =
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError') ||
      err?.message?.includes('ECONNREFUSED')
        ? `Unable to connect to API backend at ${baseUrl}. Ensure backend server is running.`
        : err?.message || 'An unexpected network error occurred.';
    throw new ApiError(message);
  }
}

/* =========================================================================
   API Endpoints
   ========================================================================= */

// POST /api/auth/login { email, password } → { token, role, userId, name }
export async function apiLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// GET /api/users (admin, header: Authorization: Bearer <token>) → [{ id, name, email, role }]
export async function apiGetUsers(token?: string | null): Promise<User[]> {
  return request<User[]>(
    '/users',
    {
      method: 'GET',
    },
    token
  );
}

// POST /api/users { name, email, password, role } → { id, message }
export async function apiCreateUser(
  data: Omit<User, 'id'>,
  token?: string | null
): Promise<{ id: string | number; message?: string }> {
  return request<{ id: string | number; message?: string }>(
    '/users',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
}

// PUT /api/users/{id} { name, email, role } → { message }
export async function apiUpdateUser(
  id: string | number,
  data: Partial<Pick<User, 'name' | 'email' | 'role'>>,
  token?: string | null
): Promise<{ message?: string }> {
  return request<{ message?: string }>(
    `/users/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  );
}

// DELETE /api/users/{id} → { message }
export async function apiDeleteUser(
  id: string | number,
  token?: string | null
): Promise<{ message?: string }> {
  return request<{ message?: string }>(
    `/users/${id}`,
    {
      method: 'DELETE',
    },
    token
  );
}

// GET /api/doctors → [{ id, name, specialty }]
export async function apiGetDoctors(token?: string | null): Promise<Doctor[]> {
  return request<Doctor[]>(
    '/doctors',
    {
      method: 'GET',
    },
    token
  );
}

// GET /api/appointments?doctorId=&patientId= → [{ id, doctorId, doctorName, patientId, patientName, date, time, status, notes }]
export async function apiGetAppointments(
  params?: {
    doctorId?: string | number;
    patientId?: string | number;
  },
  token?: string | null
): Promise<Appointment[]> {
  const query = new URLSearchParams();
  if (params?.doctorId !== undefined && params.doctorId !== '') {
    query.set('doctorId', String(params.doctorId));
  }
  if (params?.patientId !== undefined && params.patientId !== '') {
    query.set('patientId', String(params.patientId));
  }
  const queryString = query.toString() ? `?${query.toString()}` : '';
  return request<Appointment[]>(
    `/appointments${queryString}`,
    {
      method: 'GET',
    },
    token
  );
}

// POST /api/appointments { doctorId, patientId, date, time } → { id, message }
export async function apiCreateAppointment(
  data: {
    doctorId: string | number;
    patientId: string | number;
    date: string;
    time: string;
  },
  token?: string | null
): Promise<{ id: string | number; message?: string }> {
  return request<{ id: string | number; message?: string }>(
    '/appointments',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
}

// PUT /api/appointments/{id} { date, time, status, notes } → { message }
export async function apiUpdateAppointment(
  id: string | number,
  data: Partial<Pick<Appointment, 'date' | 'time' | 'status' | 'notes'>>,
  token?: string | null
): Promise<{ message?: string }> {
  return request<{ message?: string }>(
    `/appointments/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  );
}

// DELETE /api/appointments/{id} → { message }
export async function apiDeleteAppointment(
  id: string | number,
  token?: string | null
): Promise<{ message?: string }> {
  return request<{ message?: string }>(
    `/appointments/${id}`,
    {
      method: 'DELETE',
    },
    token
  );
}

// GET /api/patients/{id}/medical-records → [{ id, date, diagnosis, prescription, doctorName }]
export async function apiGetMedicalRecords(
  patientId: string | number,
  token?: string | null
): Promise<MedicalRecord[]> {
  return request<MedicalRecord[]>(
    `/patients/${patientId}/medical-records`,
    {
      method: 'GET',
    },
    token
  );
}

// POST /api/medical-records { patientId, diagnosis, prescription } → { id, message }
export async function apiCreateMedicalRecord(
  data: {
    patientId: string | number;
    diagnosis: string;
    prescription: string;
  },
  token?: string | null
): Promise<{ id: string | number; message?: string }> {
  return request<{ id: string | number; message?: string }>(
    '/medical-records',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
}

// GET /api/feedback?doctorId= → [{ id, patientName, rating, comment }]
export async function apiGetFeedback(
  doctorId?: string | number,
  token?: string | null
): Promise<Feedback[]> {
  const queryString =
    doctorId !== undefined && doctorId !== ''
      ? `?doctorId=${encodeURIComponent(String(doctorId))}`
      : '';
  return request<Feedback[]>(
    `/feedback${queryString}`,
    {
      method: 'GET',
    },
    token
  );
}

// POST /api/feedback { doctorId, rating, comment } → { id, message }
export async function apiCreateFeedback(
  data: {
    doctorId: string | number;
    rating: number;
    comment: string;
  },
  token?: string | null
): Promise<{ id: string | number; message?: string }> {
  return request<{ id: string | number; message?: string }>(
    '/feedback',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token
  );
}

// GET /api/settings → { key: value }
export async function apiGetSettings(token?: string | null): Promise<Settings> {
  return request<Settings>(
    '/settings',
    {
      method: 'GET',
    },
    token
  );
}

// PUT /api/settings { key: value } → { message }
export async function apiUpdateSettings(
  settings: Settings,
  token?: string | null
): Promise<{ message?: string }> {
  return request<{ message?: string }>(
    '/settings',
    {
      method: 'PUT',
      body: JSON.stringify(settings),
    },
    token
  );
}

// GET /api/patient-profile/{userId}
export async function apiGetPatientProfile(
  userId: string | number,
  token?: string | null
): Promise<PatientProfile> {
  return request<PatientProfile>(
    `/patient-profile/${userId}`,
    {
      method: 'GET',
    },
    token
  );
}

// PUT /api/patient-profile/{userId}
export async function apiUpdatePatientProfile(
  userId: string | number,
  data: Omit<PatientProfile, 'age' | 'userId' | 'name' | 'email'>,
  token?: string | null
): Promise<{ message?: string }> {
  return request<{ message?: string }>(
    `/patient-profile/${userId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    token
  );
}
