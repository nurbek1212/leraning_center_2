-- Mavzular va materiallar (maruza, taqdimot) uchun jadvallar.
-- Ishlatish:  mysql -u root -p oquv_markaz < database/migrations/003_topics_materials.sql
-- Faqat BIR MARTA bajaring (001 va 002 dan keyin).
USE oquv_markaz;

CREATE TABLE topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_topic_title (subject_id, title),
  INDEX idx_topics_order (subject_id, sort_order),
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  kind ENUM('lecture', 'presentation', 'other') NOT NULL,
  title VARCHAR(200) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INT UNSIGNED NOT NULL,
  uploaded_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_materials_topic (topic_id),
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE material_files (
  material_id INT PRIMARY KEY,
  data LONGBLOB NOT NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);
