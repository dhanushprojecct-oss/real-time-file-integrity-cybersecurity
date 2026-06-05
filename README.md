# 🔒 Real-Time File Integrity Monitoring System

A professional cybersecurity web application for monitoring file integrity using SHA-256 hashing, detecting unauthorized changes in real time, and generating comprehensive security reports.

> **B.E. Cybersecurity / AIML Final Year Project**

---

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Chart.js |
| Backend | Python Flask + Flask-SocketIO + SQLAlchemy |
| Database | SQLite (upgradeable to MySQL) |
| Real-Time | Watchdog + Socket.IO |
| Hashing | SHA-256 (Python hashlib) |
| Auth | Flask-Login + bcrypt |
| Reports | ReportLab (PDF) + openpyxl (Excel) + CSV |

---

## 🚀 Quick Start

### 1. Install Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs at: **http://localhost:5000**

### 2. Install Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🔑 Default Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `analyst` | `analyst123` | Security Analyst |

> **Change these immediately in a production deployment!**

---

## 📦 Modules

| Module | Description |
|--------|-------------|
| 🔐 **Login** | Secure session auth with bcrypt, 5-attempt lockout |
| 📊 **Dashboard** | Live stats, charts, security score, recent activity |
| 📁 **Upload** | Drag-and-drop multi-file upload with SHA-256 hash display |
| 👁️ **Monitoring** | Real-time Watchdog engine monitoring all uploaded files |
| 🚨 **Alerts** | Auto-generated alerts: LOW/MEDIUM/HIGH/CRITICAL severity |
| 📜 **Audit** | Complete audit trail with search, filter, CSV/Excel export |
| 📄 **Reports** | PDF/Excel/CSV reports: Daily, Weekly, Monthly, Custom |
| ⚙️ **Settings** | Profile, password change, user management (admin only) |

---

## 🗃️ Project Structure

```
├── backend/
│   ├── app.py          # Flask app + SocketIO
│   ├── models.py       # SQLAlchemy ORM
│   ├── auth.py         # Authentication routes
│   ├── files.py        # File upload + SHA-256
│   ├── monitoring.py   # Watchdog engine
│   ├── alerts.py       # Alert management
│   ├── audit.py        # Audit log routes
│   ├── reports.py      # PDF/Excel/CSV generation
│   ├── dashboard.py    # Dashboard stats API
│   ├── utils.py        # SHA-256, helpers
│   └── config.py       # Configuration
│
└── frontend/
    └── src/
        ├── pages/      # All 8 application pages
        ├── components/ # Layout, common components
        ├── context/    # Auth + Socket contexts
        └── api/        # Axios client
```

---

## 🔒 Security Features

- **SHA-256 hashing** of every uploaded file
- **Hash comparison** on every modification event
- **bcrypt** password hashing (never stored plain text)
- **Session-based authentication** with Flask-Login
- **Account lockout** after 5 failed login attempts (30-minute lock)
- **Role-based access control** (Admin vs Analyst)
- **Real-time Watchdog** detects Added / Modified / Deleted events
- **CRITICAL alert** on burst modifications (3+ in 60 seconds)
- **Complete audit trail** with IP address tracking

---

## 📊 Alert Severity Levels

| Severity | Trigger |
|----------|---------|
| 🟢 LOW | File Added |
| 🟡 MEDIUM | File Deleted |
| 🟠 HIGH | File Modified (hash mismatch) |
| 🔴 CRITICAL | Multiple rapid modifications |

---

## 📄 Report Types

| Type | Format | Contents |
|------|--------|----------|
| Daily | PDF / Excel / CSV | Last 24h stats |
| Weekly | PDF / Excel / CSV | 7-day summary |
| Monthly | PDF / Excel / CSV | 30-day overview |
| Custom | PDF / Excel / CSV | Any date range |

---

## ⚙️ Configuration

Edit `backend/config.py` or set environment variables:

```env
SECRET_KEY=your-super-secret-key
DATABASE_URL=sqlite:///fim_database.db
# For MySQL: DATABASE_URL=mysql://user:pass@host/dbname
```

---

## 🏗️ API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| POST | `/api/files/upload` | Upload files |
| GET | `/api/files/` | List files |
| POST | `/api/files/{id}/verify` | Verify integrity |
| GET | `/api/alerts/` | List alerts |
| PUT | `/api/alerts/{id}/resolve` | Resolve alert |
| GET | `/api/audit/` | Audit logs |
| GET | `/api/audit/export` | Export logs |
| GET | `/api/dashboard/stats` | Dashboard stats |
| POST | `/api/reports/generate` | Generate report |
| GET | `/api/monitoring/status` | Monitor status |

---

## 👨‍💻 Author

**B.E. Cybersecurity / AIML — Final Year Project 2024**
