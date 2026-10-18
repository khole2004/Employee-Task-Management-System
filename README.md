# Employee and Task Management System (MERN Stack)

A full-stack MERN application for managing employees and tasks, built according to the **Roots Internship Assignment** requirements.

---

## 🚀 Features Overview

### 1. 📊 Dashboard
- **8 Dynamic Summary Cards**:
  - Total Employees
  - Active Employees
  - Total Tasks
  - Todo Tasks
  - In Progress Tasks
  - Completed Tasks
  - Cancelled Tasks
  - Overdue Tasks (tasks with due date earlier than today and not in Completed or Cancelled status)
- **Employee Workload Distribution**:
  - Real-time MongoDB `$lookup` aggregation listing employees and their active task counts (`Todo` or `In Progress`).
  - Workload badges (Active / Free).
- **On-demand Refresh**: Immediate backend re-querying.

### 2. 👥 Employee Management
- **List, Add, Edit, View, and Delete**:
  - Unique validation for **Employee ID** and **Email** (returns `409 Conflict` on duplicates).
  - Normalization of email to lowercase and trim before saving.
  - Regex format validation on both frontend and backend for email and phone numbers.
  - Department, Role, Joining Date, and Status (`Active`, `Inactive`, `On Leave`).
  - Leave period validation: `leaveStartDate` and `leaveEndDate` required when status is `On Leave`, with end date $\ge$ start date.
  - **Deletion Protection**: Employees with active tasks (`Todo` or `In Progress`) cannot be deleted.
  - Historical Snapshot: Task documents retain snapshot employee details (`employeeName`, `employeeId`, `department`) so old records remain meaningful even if an employee is deleted.
  - **Employee Detail Modal**: Full employee profile view without needing to open the edit form.

### 3. 📋 Task Management
- **List, Add, Edit, View, Update Status, and Delete**:
  - Auto-generated unique `taskId` (e.g. `TASK-1792...`).
  - **Max 3 Active Tasks Limit**: An employee cannot have more than 3 active tasks (`Todo` or `In Progress`).
  - **Leave Conflict Prevention**: Employees on leave cannot be assigned tasks with a start date during their leave period.
  - **Inactive Employee Restriction**: Inactive employees cannot be assigned tasks.
  - **Date Validation**: Due date cannot be earlier than start date.
  - **Strict Status Transitions**:
    - `Todo` $\rightarrow$ `In Progress` or `Cancelled`
    - `In Progress` $\rightarrow$ `Completed` or `Cancelled`
    - `Completed` and `Cancelled` are immutable final states.
  - **Automated `completedDate`**: Set automatically by the backend upon moving to `Completed`.
  - **Dedicated Status Endpoint**: `PUT /api/tasks/:id/status` prevents bypassing transition logic during normal task editing.
  - **Task Detail Modal**: Full task details view (description, priority, dates, overdue status, assigned employee).

### 4. 🔍 Listing, Filtering, Sorting & Pagination
- **Backend-Driven Querying**: All search, filters, sorting, and pagination execute on MongoDB via Mongoose.
- **Search**: Case-insensitive search by task title or assigned employee name.
- **Combined Filters**: Status, Priority, Department, and specific Due Date.
- **Sorting Options**:
  - Created Date (Newest / Oldest)
  - Due Date (Earliest / Latest)
  - Priority by Importance (`Critical` $>$ `High` $>$ `Medium` $>$ `Low`)
  - Title (A–Z / Z–A)
- **Pagination**: Configurable page limit, current page, and total pages.
- **URL Synchronization**: Search query, filters, sorting, and page number remain synchronized with browser URL query parameters and persist across refreshes.

### 5. 📥 Export to CSV
- **Backend Endpoint**: `GET /api/tasks/export/csv`.
- **Full Filter Match**: Exports all matching tasks across all pages (not restricted to the current paginated page).
- **RFC 4180 Escaping**: Safely handles commas, double quotes, and line breaks.
- **Dynamic Filename**: `tasks_export_YYYY-MM-DD.csv` via `Content-Disposition`.
- **12 Included Columns**: Task ID, Task Title, Description, Employee Name, Employee ID, Department, Priority, Status, Start Date, Due Date, Completed Date, Overdue Status.
- **Error & Empty State Handling**: Returns user-friendly alerts when no matching records exist.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Vanilla CSS3
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas with Mongoose ODM
- **Formatting & Escaping**: RFC 4180 CSV generation

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas cluster URI (or local MongoDB)

### 1. Clone the repository
```bash
git clone <repository-url>
cd EmployeeTaskManagement
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend/` directory based on `.env.example`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
```
Start the backend server:
```bash
npm start
# or
node server.js
```
The backend server runs on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
The frontend application will start on `http://localhost:5173`.

---

## 📡 API Endpoints Reference

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Fetch summary statistics and employee workload distribution |

### Employees
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/employees` | Create a new employee |
| `GET` | `/api/employees` | Get employees with search, department, and status filters |
| `GET` | `/api/employees/:id` | Get employee details by ID |
| `PUT` | `/api/employees/:id` | Update employee details |
| `DELETE` | `/api/employees/:id` | Delete employee (rejected if active tasks exist) |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tasks` | Create a new task (validates employee limits, status, leave) |
| `GET` | `/api/tasks` | Paginated tasks with search, filters, and sorting |
| `GET` | `/api/tasks/export/csv` | Export all matching tasks as CSV across all pages |
| `GET` | `/api/tasks/:id` | Get task details by ID |
| `PUT` | `/api/tasks/:id` | Update task details (cannot change status) |
| `PUT` | `/api/tasks/:id/status` | Transition task status (enforces state transition rules) |
| `DELETE` | `/api/tasks/:id` | Delete a task |

---

## 🧪 Testing

To run the automated audit test suite:
```bash
node scratch/audit_suite.js
```
All 30 automated integration assertions verify employee rules, task limits, status transitions, dashboard aggregations, and CSV exports.

---

## 📄 License
MIT License
