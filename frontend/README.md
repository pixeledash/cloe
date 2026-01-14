# Cloe Classroom - Frontend

A modern, responsive React-based frontend for the Cloe Classroom Management System.

## 🚀 Quick Start

### Using Docker (Recommended)
```bash
# From project root
cd ..
docker-compose up -d
```

### Local Development
```bash
npm install
npm run dev
```

Access at: http://localhost:5173

## 🔐 Test Credentials

```
Email: teacher@test.com
Password: password123
```

## ✨ Features

### Module 1: Authentication ✅ COMPLETE
- JWT-based authentication
- Auto token refresh
- Protected routes
- Role-based access control
- MFA support
- Responsive design

### Coming Soon
- Module 2: Academic Data (Classes, Students, Subjects)
- Module 3: Session Management
- Module 4: Live Attendance
- Module 5: Analytics
- Module 6: Reports
- Module 7: Notifications

## 🛠️ Tech Stack

- React 19.2 - UI library
- React Router 6 - Routing
- Axios - HTTP client
- Vite 7 - Build tool

## 📚 Documentation

See project root for:
- `MODULE1_FRONTEND_COMPLETE.md`
- `MODULE1_TESTING_GUIDE.md`
- `MODULE1_DEVELOPER_GUIDE.md`
- `QUICK_START.md`

## 🔧 Environment Variables

Create `.env`:
```env
VITE_API_URL=http://localhost:8000/api

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
