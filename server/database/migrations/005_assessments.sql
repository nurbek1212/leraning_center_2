-- Nazoratlar (test / yozma / og'zaki; joriy, oraliq, yakuniy) uchun jadvallar.
-- Ishlatish:  mysql -u root -p oquv_markaz < database/migrations/005_assessments.sql
-- Faqat BIR MARTA bajaring (001-004 dan keyin).
USE oquv_markaz;

-- ===== NAZORATLAR (joriy / oraliq / yakuniy; test, yozma, og'zaki) =====
-- Ustoz nazorat yaratadi va ballni o'zi belgilaydi. Test savollari avtomatik tekshiriladi,
-- lekin yakuniy ballni (baholarga o'tadigan) ustoz tasdiqlaydi.
CREATE TABLE assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  teacher_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  stage ENUM('current', 'midterm', 'final') NOT NULL,
  format ENUM('test', 'written', 'oral') NOT NULL,
  component_id INT NULL,                       -- baholash mezonining qaysi qismiga bog'langan (bo'lmasligi ham mumkin)
  max_score INT NOT NULL CHECK (max_score BETWEEN 1 AND 100),
  held_at DATE NOT NULL,
  duration_minutes INT NULL CHECK (duration_minutes BETWEEN 1 AND 300),
  status ENUM('draft', 'open', 'closed') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_assessments_group (group_id, held_at),
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  FOREIGN KEY (component_id) REFERENCES grading_components(id) ON DELETE SET NULL
);

CREATE TABLE assessment_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  position INT NOT NULL,
  text TEXT NOT NULL,
  INDEX idx_aq_assessment (assessment_id, position),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

CREATE TABLE assessment_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  position INT NOT NULL,
  text VARCHAR(500) NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_ao_question (question_id, position),
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
);

-- Talabaning natijasi. Holat ustunlardan aniqlanadi:
-- score bor -> baholangan; submitted_at bor -> topshirgan; started_at bor -> ishlayapti.
CREATE TABLE assessment_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  student_id INT NOT NULL,
  started_at TIMESTAMP NULL DEFAULT NULL,
  submitted_at TIMESTAMP NULL DEFAULT NULL,
  correct_count INT NULL,
  total_questions INT NULL,
  score INT NULL,                              -- ustoz belgilagan yakuniy ball
  comment VARCHAR(255) NULL,
  scored_by INT NULL,
  scored_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_result (assessment_id, student_id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scored_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE assessment_answers (
  result_id INT NOT NULL,
  question_id INT NOT NULL,
  option_id INT NULL,
  PRIMARY KEY (result_id, question_id),
  FOREIGN KEY (result_id) REFERENCES assessment_results(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES assessment_options(id) ON DELETE SET NULL
);

ALTER TABLE grades
  ADD COLUMN assessment_id INT NULL AFTER date,
  ADD UNIQUE KEY uq_grade_assessment (assessment_id, student_id),
  ADD CONSTRAINT fk_grades_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL;
