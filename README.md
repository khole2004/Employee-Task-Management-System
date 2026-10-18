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

## 🧠 Architectural & Design Decisions (Mandatory Assignment Questions)

### 1. Where do you validate status transitions and why?
**Where:** Status transitions are validated strictly on the **backend** inside the dedicated `PUT /api/tasks/:id/status` controller (`backend/controllers/taskController.js`), with complementary UX validation on the frontend (`frontend/src/App.jsx`).

**Why:** 
- **Security & Integrity:** Client-side validations can be easily bypassed by sending direct HTTP requests, cURL commands, or browser DevTools tampering. Centralizing the state transition graph on the backend guarantees that illegal transitions (e.g., `Todo` directly to `Completed`, or modifying a `Completed`/`Cancelled` task) are strictly rejected with HTTP `400 Bad Request` regardless of where the request originates.
- **Single Source of Truth:** Business rules evolve; keeping the canonical finite state machine (FSM) rules on the backend prevents drift between various frontends, mobile clients, or automated background workers.

### 2. Why does `completedDate` come from the backend?
**Why:**
- **Tampering Prevention:** If `completedDate` were supplied by the client, users could forge or backdate completion timestamps, invalidating audit trails and SLA compliance metrics.
- **Clock Drift & Timezones:** Client devices may have incorrect system times, misconfigured clocks, or different local time zones. Generating `new Date()` atomically on the server ensures all timestamps are synchronized to UTC on the authoritative server clock when the status transitions to `Completed`.
- **Automated Lifecycle Enforcement:** The server handles state transitions atomically; clearing `completedDate` if a task leaves completion and stamping it upon transition to `Completed` ensures data consistency without relying on the client to remember to supply it.

### 3. How do you block assigning tasks to inactive or on-leave employees?
**How:**
- In `backend/controllers/taskController.js` (`createTask` and `updateTask`):
  1. We query the assigned employee from the database by `assignedEmployee` ID.
  2. If `employee.status === "Inactive"`, the request is immediately rejected with HTTP `400 Bad Request` (`"Cannot assign tasks to an Inactive employee."`).
  3. If `employee.status === "On Leave"`, we parse the task's `startDate` and compare it against the employee's `leaveStartDate` and `leaveEndDate`. If the task starts during the leave window, the request is rejected with HTTP `400 Bad Request` (`"Cannot assign tasks to an employee on leave during their leave period."`).
  4. On the frontend, employee status is displayed, and the form warns the user immediately.

### 4. Why are filtering, sorting, and pagination done on the backend?
**Why:**
- **Performance & Scalability:** In an enterprise application with thousands or millions of tasks, fetching all records into the React client would cause massive network bandwidth consumption, high memory usage, and severe UI lag.
- **Database Optimization:** MongoDB handles indexing, filtering (`$match`), sorting (`$sort`), and pagination (`$skip`, `$limit`) using compiled binary B-tree indexes, executing queries in single-digit milliseconds without loading unneeded documents into memory.
- **Export Parity:** The same backend query engine powers both UI pagination and full-dataset CSV exports (`GET /api/tasks/export/csv`), ensuring exact filter parity across millions of records.

### 5. Why do filters live in the URL?
**Why:**
- **Shareability & Collaboration:** When filters (e.g., `?status=In+Progress&priority=Critical&page=2`) are synchronized with URL search params, team members can copy and share exact links to specific filtered views.
- **Persistence Across Page Refreshes:** If a user reloads the browser tab or navigates back/forward using browser history, the active search terms, pagination state, and filters remain intact instead of resetting to default.
- **Deep Linking & Bookmarking:** Managers can bookmark frequently monitored views (such as overdue or high-priority tasks) directly in their browser.

### 6. What can go wrong if two requests assign a 4th active task at the same time (Race Condition / TOCTOU)?
**What can go wrong:**
- **Time-Of-Check to Time-Of-Use (TOCTOU) Flaw:** 
  Suppose Employee `EMP001` currently has 2 active tasks.
  1. Request A arrives to assign a new active task. It checks: `count = 2 < 3` (Allowed).
  2. Concurrently, Request B arrives before Request A has finished saving. It also checks: `count = 2 < 3` (Allowed).
  3. Request A inserts the new task. Active task count becomes 3.
  4. Request B inserts the second new task. Active task count becomes **4**, violating the invariant that no employee can have more than 3 active tasks!
- **How to prevent it in production:**
  1. **MongoDB ACID Multi-Document Transactions:** Execute the count check and task creation inside a `session.withTransaction()` with `readConcern: "snapshot"` and `writeConcern: "majority"`.
  2. **Atomic Counter with Schema Invariant:** Maintain an `activeTaskCount` field on the `Employee` document, and use an atomic conditional update:
     ```javascript
     const emp = await Employee.findOneAndUpdate(
       { _id: employeeId, status: "Active", activeTaskCount: { $lt: 3 } },
       { $inc: { activeTaskCount: 1 } },
       { new: true, session }
     );
     if (!emp) throw new Error("Employee capacity exceeded or employee inactive.");
     ```
  3. **Distributed Locks (Redis/Redlock):** Acquire a mutual exclusion lock on `lock:employee:${employeeId}` during task assignment.

---

## 🗄️ Database Relationships & Historical Data Retention

- **Employee Entity (`Employee.js`)**:
  - Fields: `employeeId` (unique), `fullName`, `email` (unique, lowercase), `phone`, `department`, `role`, `joiningDate`, `status` (`Active`, `Inactive`, `On Leave`), `leaveStartDate`, `leaveEndDate`.
- **Task Entity (`Task.js`)**:
  - Fields: `taskId` (unique), `title`, `description`, `assignedEmployee` (Mongoose `ObjectId` referencing `Employee`), `department`, `priority` (`Low`, `Medium`, `High`, `Critical`), `status` (`Todo`, `In Progress`, `Completed`, `Cancelled`), `startDate`, `dueDate`, `completedDate`, snapshot fields (`employeeName`, `employeeId`).
- **Deletion Protection Rule**:
  - `DELETE /api/employees/:id` checks for any existing tasks assigned to this employee with status `Todo` or `In Progress`.
  - If any active tasks exist, deletion is blocked with HTTP `400 Bad Request`.
- **Historical Data Retention**:
  - If an employee with only completed/cancelled tasks is deleted, task documents retain immutable snapshots of `employeeName` and `employeeId`. Historical records, audit trails, and CSV reports remain fully readable and meaningful.

---

## 🧪 Testing & Verification

To run the automated audit test suite:
```bash
node scratch/audit_suite.js
```
All **30 automated integration assertions** pass, verifying:
- Employee uniqueness, email normalization, format validations, and deletion protection.
- Task max 3 capacity, inactive and on-leave assignment blocks, and date ordering.
- Strict status transitions (`Todo` -> `In Progress` -> `Completed`, cancellation, final state immutability, automated `completedDate`, and update bypass prevention).
- Dashboard summary (10 metrics: Total, Active, Inactive, On Leave, Total Tasks, Todo, In Progress, Completed, Cancelled, Overdue) and workload aggregation.
- CSV export across all matching tasks with RFC 4180 escaping and Content-Disposition header.

---

## 📄 License
MIT License

