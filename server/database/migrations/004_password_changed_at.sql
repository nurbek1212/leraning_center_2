-- Parol o'zgartirilganda eski kirish tokenlarini yaroqsiz qilish uchun.
-- Ishlatish:  mysql -u root -p oquv_markaz < database/migrations/004_password_changed_at.sql
-- Faqat BIR MARTA bajaring.
USE oquv_markaz;

ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL AFTER phone;
