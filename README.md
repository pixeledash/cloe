# Cloe Classroom Management System

A web application for managing classroom attendance, sessions, and student analytics. Built for teachers and administrators to track student participation and monitor class performance.

## What It Does

Cloe helps educational institutions manage their day-to-day classroom operations. Teachers can start sessions, mark attendance in real-time, and track student performance. Administrators oversee the entire system, manage users, and generate reports.

## Main Features

**Class Management**
- Create and organize classes by subject, semester, and academic year
- Assign teachers and enroll students
- Set class schedules and capacity limits

**Session & Attendance Tracking**
- Start and end class sessions
- Mark students as present, absent, or late
- View live attendance statistics during sessions
- Track attendance history across all sessions

**Analytics & Insights**
- Monitor overall attendance rates per class
- Identify at-risk students with poor attendance patterns
- View individual student performance across classes
- Track attendance trends over time

**Student & Subject Administration**
- Manage student records and enrollments
- Organize subjects with codes and descriptions
- Assign students to multiple classes
- View complete class rosters

**Reports & Notifications**
- Generate attendance reports for classes and students
- Export reports in CSV format
- Automated notifications for low attendance
- Session summaries and statistics

**User Roles & Security**
- Role-based access control (Admin, Teacher, Student)
- JWT authentication with token refresh
- Multi-factor authentication support
- Secure API with permission-based endpoints

## Tech Stack

**Backend:** Django REST Framework, PostgreSQL, Celery, Redis  
**Frontend:** React, React Router, Axios  
**Deployment:** Docker, Docker Compose

## Usage

The application runs using Docker. Make sure Docker and Docker Compose are installed.

```bash
# Clone the repository
git clone <repository-url>
cd cloe

# Start the application
docker-compose up -d

# Access the frontend
# http://localhost:5173

# Access the API
# http://localhost:8000
```



## License

This project is for educational purposes.
