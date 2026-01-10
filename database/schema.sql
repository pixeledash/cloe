CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    year INT
);

CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    code VARCHAR(20) UNIQUE
);

CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    department VARCHAR(100)
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    roll_no VARCHAR(20) UNIQUE,
    name VARCHAR(100),
    class_id INT REFERENCES classes(id)
);

CREATE TABLE class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id INT REFERENCES classes(id),
    subject_id INT REFERENCES subjects(id),
    teacher_id INT REFERENCES teachers(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('ACTIVE','ENDED')) DEFAULT 'ACTIVE'
);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id INT REFERENCES students(id),
    status VARCHAR(10) CHECK (status IN ('PRESENT','ABSENT')),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, student_id)
);

CREATE TABLE generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_by UUID REFERENCES users(id),
    report_type VARCHAR(50),
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    recipient VARCHAR(255),
    subject TEXT,
    status VARCHAR(20),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE VIEW attendance_summary AS
SELECT
    s.id AS student_id,
    COUNT(ar.session_id) AS total_sessions,
    COUNT(ar.session_id) FILTER (WHERE ar.status='PRESENT') AS attended,
    ROUND(
        (COUNT(ar.session_id) FILTER (WHERE ar.status='PRESENT')::decimal /
         NULLIF(COUNT(ar.session_id),0)) * 100, 2
    ) AS attendance_percentage
FROM students s
LEFT JOIN attendance_records ar ON s.id = ar.student_id
GROUP BY s.id;


