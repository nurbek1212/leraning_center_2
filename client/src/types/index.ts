export type Role = 'admin' | 'teacher' | 'student';
export type AttendanceStatus = 'present' | 'absent';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'payme' | 'click';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';
export type SchemeStatus = 'draft' | 'published';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  phone: string | null;
}

export interface ProfileGroup {
  id: number;
  name: string;
  schedule: string | null;
  subject_name: string;
  teacher_name?: string;
}

export interface Profile extends User {
  created_at: string;
  groups: ProfileGroup[];
  subjects: { id: number; name: string }[];
}

export interface Subject {
  id: number;
  name: string;
  description: string | null;
}

export interface Teacher {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  subjects: { id: number; name: string }[];
}

export interface Student {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  groups: { id: number; name: string }[];
}

export interface Group {
  id: number;
  name: string;
  subject_id: number;
  teacher_id: number;
  schedule: string | null;
  price: number;
  created_at: string;
  subject_name: string;
  teacher_name: string;
  student_count: number;
}

// ---------- Baholash mezoni ----------

export interface SchemeSummary {
  subject_id: number;
  subject_name: string;
  scheme_id: number | null;
  status: SchemeStatus | null;
  published_at: string | null;
  component_count: number;
  total: number;
  grade_count: number;
  group_count: number;
}

export interface SchemeComponent {
  id: number;
  name: string;
  max_score: number;
  is_exam: boolean;
  grade_count: number;
  max_used: number;
}

export interface SchemeDetail {
  subject: { id: number; name: string };
  scheme: { id: number; description: string | null; status: SchemeStatus; published_at: string | null } | null;
  components: SchemeComponent[];
  total: number;
}

export interface ComponentResult {
  id: number;
  name: string;
  max_score: number;
  is_exam: boolean;
  earned: number | null;
  count: number;
}

export interface GroupBreakdown {
  group_id: number;
  group_name: string;
  subject_id: number;
  subject_name: string;
  scheme_status: SchemeStatus | null;
  scheme_description: string | null;
  components: ComponentResult[];
  total: number;
  max_total: number;
  grades_count: number;
}

// ---------- Baholar ----------

export interface Grade {
  id: number;
  student_id: number;
  group_id: number;
  teacher_id: number;
  component_id: number;
  score: number;
  comment: string | null;
  date: string;
  student_name: string;
  group_name: string;
  subject_name: string;
  component_name: string;
  max_score: number;
  is_exam: number | boolean;
}

export interface GroupStudent {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  total: number | null;
  grades_count: number;
  attendance_percent: number | null;
}

export interface GroupDetail {
  group: {
    id: number;
    name: string;
    subject_name: string;
    schedule: string | null;
    scheme: { status: SchemeStatus; max_total: number } | null;
  };
  students: GroupStudent[];
}

export interface StudentGradeRow {
  id: number;
  component_id: number;
  score: number;
  comment: string | null;
  date: string;
  component_name: string;
  max_score: number;
  is_exam: number | boolean;
}

export interface AttendanceRecord {
  id: number;
  group_id: number;
  student_id: number;
  student_name: string;
  date: string;
  status: AttendanceStatus;
}

export interface StudentDetail {
  group: { id: number; name: string; subject_name: string; schedule: string | null };
  student: { id: number; full_name: string; email: string; phone: string | null; created_at: string };
  breakdown: GroupBreakdown | null;
  grades: StudentGradeRow[];
  attendance: {
    records: { id: number; date: string; status: AttendanceStatus }[];
    summary: { total: number; present: number; absent: number; percent: number };
  };
}

export interface MyGrade {
  id: number;
  score: number;
  comment: string | null;
  date: string;
  group_id: number;
  group_name: string;
  subject_id: number;
  subject_name: string;
  component_name: string;
  max_score: number;
  is_exam: number | boolean;
  teacher_name: string;
}

export interface MyGrades {
  groups: GroupBreakdown[];
  grades: MyGrade[];
  overall: number | null;
}

export interface MyAttendanceRecord {
  id: number;
  date: string;
  status: AttendanceStatus;
  group_id: number;
  group_name: string;
  subject_name: string;
}

export interface MyAttendance {
  records: MyAttendanceRecord[];
  summary: { total: number; present: number; absent: number; percent: number };
}

// ---------- To'lovlar ----------

export interface Payment {
  id: number;
  student_id: number;
  group_id: number;
  period: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  note: string | null;
  created_at: string;
  paid_at: string | null;
  student_name: string;
  group_name: string;
  recorded_by_name: string | null;
}

export interface DebtRow {
  student_id: number;
  student_name: string;
  phone: string | null;
  group_id: number;
  group_name: string;
  price: number;
  paid: number;
  debt: number;
}

export interface DebtsResponse {
  period: string;
  items: DebtRow[];
}

export interface MyPaymentGroup {
  group_id: number;
  group_name: string;
  subject_name: string;
  price: number;
  paid: number;
  debt: number;
}

export interface MyPaymentHistory {
  id: number;
  group_id: number;
  group_name: string;
  period: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  created_at: string;
  paid_at: string | null;
}

export interface MyPayments {
  period: string;
  providers: { payme: boolean; click: boolean };
  groups: MyPaymentGroup[];
  history: MyPaymentHistory[];
}

export interface CheckoutResult {
  paymentId: number;
  provider: 'payme' | 'click';
  amount: number;
  url: string;
}

export interface DashboardStats {
  counts: { students: number; teachers: number; groups: number; subjects: number };
  studentsBySubject: { id: number; name: string; students: number }[];
  averageByGroup: { id: number; name: string; average: number }[];
  latestGrades: {
    id: number;
    score: number;
    date: string;
    component_name: string;
    max_score: number;
    student_name: string;
    group_name: string;
    teacher_name: string;
  }[];
  payments: { period: string; paid: number; expected: number; debt: number };
}

// ---------- Mavzular va materiallar ----------

export type MaterialKind = 'lecture' | 'presentation' | 'other';

export interface Material {
  id: number;
  topic_id: number;
  kind: MaterialKind;
  title: string;
  file_name: string;
  size: number;
  created_at: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
}

export interface Topic {
  id: number;
  subject_id: number;
  title: string;
  description: string | null;
  sort_order: number;
  materials: Material[];
}

export interface SubjectTopics {
  subject: { id: number; name: string };
  can_manage: boolean;
  topics: Topic[];
}

export interface MySubjectTopics {
  subject_id: number;
  subject_name: string;
  can_manage: boolean;
  topics: Topic[];
}

// ---------- Nazoratlar ----------
export type AssessmentStage = 'current' | 'midterm' | 'final';
export type AssessmentFormat = 'test' | 'written' | 'oral';
export type AssessmentStatus = 'draft' | 'open' | 'closed';

export interface Assessment {
  id: number;
  group_id: number;
  title: string;
  description: string | null;
  stage: AssessmentStage;
  format: AssessmentFormat;
  component_id: number | null;
  component_name: string | null;
  max_score: number;
  held_at: string;
  duration_minutes: number | null;
  status: AssessmentStatus;
  group_name: string;
  subject_name: string;
  question_count: number;
}

export interface StaffAssessment extends Assessment {
  submitted_count: number;
  scored_count: number;
  student_count: number;
}

export interface QuestionOption {
  id?: number;
  text: string;
  is_correct?: boolean;
}
export interface AssessmentQuestion {
  id?: number;
  text: string;
  options: QuestionOption[];
}
export interface AssessmentDetail extends Assessment {
  questions: AssessmentQuestion[];
  has_attempts: boolean;
}

export interface AssessmentResultRow {
  student_id: number;
  full_name: string;
  started_at: string | null;
  submitted_at: string | null;
  correct_count: number | null;
  total_questions: number | null;
  score: number | null;
  comment: string | null;
  posted: boolean;
}

export interface MyAssessment extends Assessment {
  started_at: string | null;
  submitted_at: string | null;
  correct_count: number | null;
  total_questions: number | null;
  score: number | null;
  comment: string | null;
  seconds_left: number | null;
}
export interface MyAssessmentDetail extends MyAssessment {
  review:
    | { question_id: number; text: string; options: { id: number; text: string; is_correct: boolean }[]; chosen_option_id: number | null }[]
    | null;
}
export interface TakeQuestion {
  id: number;
  text: string;
  options: { id: number; text: string }[];
}

// ---------- Uy vazifalari va dars jadvali ----------
export interface HomeworkItem {
  id: number;
  group_id: number;
  title: string;
  description: string | null;
  due_date: string;
  group_name: string;
  subject_name: string;
}
export interface StaffHomework extends HomeworkItem {
  submitted_count: number;
  reviewed_count: number;
  student_count: number;
}
export interface HomeworkSubmissionRow {
  student_id: number;
  full_name: string;
  content: string | null;
  submitted_at: string | null;
  feedback: string | null;
  score: number | null;
  reviewed_at: string | null;
  late: boolean;
}
export interface HomeworkDetail extends HomeworkItem {
  submissions: HomeworkSubmissionRow[];
}
export interface MyHomework extends HomeworkItem {
  content: string | null;
  submitted_at: string | null;
  feedback: string | null;
  score: number | null;
  reviewed_at: string | null;
}
export interface ScheduleGroup {
  id: number;
  name: string;
  schedule: string;
  subject_name: string;
  teacher_name: string;
}
