-- Uy vazifalari jadvallari. Faqat BIR MARTA bajaring (001-005 dan keyin).
USE oquv_markaz;

-- ===== UY VAZIFALARI =====
CREATE TABLE homework (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  teacher_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_homework_group (group_id, due_date),
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- Talabaning topshirgan javobi (matn). Ustoz izoh va (ixtiyoriy) ball qo'yadi; bu ball baholarga qo'shilmaydi.
CREATE TABLE homework_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  homework_id INT NOT NULL,
  student_id INT NOT NULL,
  content TEXT NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  feedback VARCHAR(500) NULL,
  score INT NULL CHECK (score BETWEEN 0 AND 100),
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_homework_student (homework_id, student_id),
  FOREIGN KEY (homework_id) REFERENCES homework(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
