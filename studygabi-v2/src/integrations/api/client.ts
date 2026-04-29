/**
 * StudyGabi API Client — conecta ao backend Python (FastAPI).
 * Configura a URL base via VITE_API_URL (padrão: http://localhost:8000)
 */

const BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

// ── Token storage ─────────────────────────────────────────────────────────────
const TOKEN_KEY = "studygabi_token";
const USER_KEY = "studygabi_user";

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}
function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
export function getStoredUser(): ApiUser | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
}
function setStoredUser(u: ApiUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function req<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const tok = getToken();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Erro desconhecido");
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ApiUser { id: string; email: string; display_name: string }
export interface AuthResponse { access_token: string; token_type: string; user: ApiUser }

export interface ProductivityRecord {
  id: string; user_id: string; session_name: string; subject: string | null;
  duration_seconds: number; status: string; focus: string | null;
  started_at: string; ended_at: string; subjects_json: Array<{ subject: string; elapsed: number }> | null;
  created_at: string;
}
export interface ErrorEntry {
  id: string; subject: string; question_type: string; enunciation: string;
  alt_a: string | null; alt_b: string | null; alt_c: string | null; alt_d: string | null; alt_e: string | null;
  correct_answer: string | null; answer_mirror: string | null; error_tags: string[];
  comments: string | null; last_reviewed_at: string | null; created_at: string;
}
export interface EditorialTopic {
  id: string; subject: string; topic: string; subtopic: string | null;
  freshness: string; status_label: string | null; notes: string | null;
  materials: string | null; last_reviewed_at: string | null; created_at: string;
}
export interface Argument {
  id: string; subject: string; thesis: string; reasoning: string | null;
  example: string | null; source: string | null; tags: string[];
  contributions: string | null; created_at: string;
}
export interface ExamQuestion {
  id: string; subject: string; exam_name: string | null; year: number | null;
  enunciation: string; alternatives: string[]; correct_answer: string | null;
  explanation: string | null; difficulty: string;
  times_answered: number; times_correct: number; last_answered_at: string | null; created_at: string;
}
export interface BrainDump { id: string; content: string; created_at: string }
export interface SmartReviewQuestion { id: string; subject: string; question: string; answer: string; last_reviewed_at: string | null }
export interface DiscursivaTheme { id: string; theme: string; subject: string; context: string | null; difficulty: string; created_at: string }
export interface DiscursivaEssay { id: string; theme_id: string | null; theme_text: string | null; content: string; ai_score: number | null; ai_feedback: string | null; created_at: string }

export interface Flashcard { front: string; back: string }
export interface MindMapNode { label: string; children: MindMapNode[] }
export interface StudyMaterial {
  id: string; user_id: string; subject: string; title: string;
  source_name: string | null; page_count: number | null;
  text_preview: string | null; flashcards: Flashcard[];
  summary: string | null; mind_map: MindMapNode | null;
  created_at: string; updated_at: string;
}

export interface DashboardKPIs {
  total_hours: number; total_answered: number; total_wrong: number;
  subjects: Array<{ subject: string; hours: number; questions_answered: number; questions_wrong: number }>;
  calendar: Array<{ day: string; duration_seconds: number }>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: async (email: string, password: string, display_name?: string): Promise<AuthResponse> => {
      const res = await req<AuthResponse>("POST", "/auth/register", { email, password, display_name }, false);
      setToken(res.access_token); setStoredUser(res.user);
      return res;
    },
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const form = new URLSearchParams({ username: email, password });
      const res = await fetch(`${BASE}/auth/login`, { method: "POST", body: form });
      if (!res.ok) { const e = await res.json().catch(() => ({ detail: "Erro" })); throw new Error(e.detail); }
      const data: AuthResponse = await res.json();
      setToken(data.access_token); setStoredUser(data.user);
      return data;
    },
    me: () => req<ApiUser>("GET", "/auth/me"),
    logout: () => { clearToken(); },
  },

  productivity: {
    list: () => req<ProductivityRecord[]>("GET", "/productivity-records"),
    create: (data: Partial<ProductivityRecord>) => req<ProductivityRecord>("POST", "/productivity-records", data),
  },

  errors: {
    list: () => req<ErrorEntry[]>("GET", "/error-entries"),
    create: (data: Partial<ErrorEntry>) => req<ErrorEntry>("POST", "/error-entries", data),
    delete: (id: string) => req<void>("DELETE", `/error-entries/${id}`),
  },

  editorial: {
    list: () => req<EditorialTopic[]>("GET", "/editorial-topics"),
    create: (data: Partial<EditorialTopic>) => req<EditorialTopic>("POST", "/editorial-topics", data),
    update: (id: string, data: Partial<EditorialTopic>) => req<EditorialTopic>("PATCH", `/editorial-topics/${id}`, data),
    delete: (id: string) => req<void>("DELETE", `/editorial-topics/${id}`),
  },

  arguments: {
    list: () => req<Argument[]>("GET", "/arguments"),
    create: (data: Partial<Argument>) => req<Argument>("POST", "/arguments", data),
    update: (id: string, data: Partial<Argument>) => req<Argument>("PATCH", `/arguments/${id}`, data),
    delete: (id: string) => req<void>("DELETE", `/arguments/${id}`),
  },

  questions: {
    list: () => req<ExamQuestion[]>("GET", "/exam-questions"),
    create: (data: Partial<ExamQuestion>) => req<ExamQuestion>("POST", "/exam-questions", data),
    answer: (id: string, is_correct: boolean) => req<ExamQuestion>("PATCH", `/exam-questions/${id}/answer`, { is_correct }),
    delete: (id: string) => req<void>("DELETE", `/exam-questions/${id}`),
  },

  brainDumps: {
    list: () => req<BrainDump[]>("GET", "/brain-dumps"),
    create: (content: string) => req<BrainDump>("POST", "/brain-dumps", { content }),
    delete: (id: string) => req<void>("DELETE", `/brain-dumps/${id}`),
  },

  smartReview: {
    list: () => req<SmartReviewQuestion[]>("GET", "/smart-review"),
    create: (data: { subject: string; question: string; answer: string }) => req<SmartReviewQuestion>("POST", "/smart-review", data),
    markReviewed: (id: string) => req<void>("PATCH", `/smart-review/${id}/reviewed`),
  },

  discursivas: {
    listThemes: () => req<DiscursivaTheme[]>("GET", "/discursiva-themes"),
    createTheme: (data: Partial<DiscursivaTheme>) => req<DiscursivaTheme>("POST", "/discursiva-themes", data),
    listEssays: () => req<DiscursivaEssay[]>("GET", "/discursiva-essays"),
    createEssay: (data: Partial<DiscursivaEssay>) => req<DiscursivaEssay>("POST", "/discursiva-essays", data),
  },

  dashboard: {
    kpis: () => req<DashboardKPIs>("GET", "/dashboard/kpis"),
  },

  export: {
    all: () => req<Record<string, unknown>>("GET", "/export/all"),
  },

  materials: {
    list: (subject?: string) => req<StudyMaterial[]>("GET", subject ? `/study-materials?subject=${encodeURIComponent(subject)}` : "/study-materials"),
    get: (id: string) => req<StudyMaterial>("GET", `/study-materials/${id}`),
    delete: (id: string) => req<void>("DELETE", `/study-materials/${id}`),
    listSubjects: () => req<string[]>("GET", "/study-materials/subjects/list"),
    upload: async (file: File, subject: string, title: string): Promise<StudyMaterial> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subject", subject);
      formData.append("title", title);
      const tok = getToken();
      const res = await fetch(`${BASE}/study-materials/upload`, {
        method: "POST",
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Erro no upload");
      }
      return res.json();
    },
  },
};
