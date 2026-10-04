USE healthpulse_web;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'DOCTOR', 'PATIENT') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    specialty VARCHAR(100),
    bio TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date_of_birth DATE,
    contact VARCHAR(50),
    gender VARCHAR(20),
    blood_group VARCHAR(5),
    height_cm DECIMAL(5,1),
    weight_kg DECIMAL(5,1),
    address VARCHAR(255),
    allergies TEXT,
    chronic_conditions TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT,
    diagnosis TEXT NOT NULL,
    prescription TEXT,
    record_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(255)
);

-- Seed data for testing
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@healthpulse.com', 'admin123', 'ADMIN'),
('Dr. Sarah Lee', 'sarah.lee@healthpulse.com', 'doctor123', 'DOCTOR'),
('Dr. James Patel', 'james.patel@healthpulse.com', 'doctor123', 'DOCTOR'),
('John Smith', 'john.smith@healthpulse.com', 'patient123', 'PATIENT'),
('Emma Davis', 'emma.davis@healthpulse.com', 'patient123', 'PATIENT');

INSERT INTO doctors (user_id, specialty, bio) VALUES
(2, 'Cardiology', 'Experienced cardiologist with 10+ years practice.'),
(3, 'Dermatology', 'Skin care specialist focused on preventive treatment.');

INSERT INTO patients (user_id, date_of_birth, contact) VALUES
(4, '1990-05-14', '555-0101'),
(5, '1985-11-02', '555-0102');

INSERT INTO settings (setting_key, setting_value) VALUES
('clinic_hours', '9:00 AM - 6:00 PM'),
('appointment_duration_minutes', '30');