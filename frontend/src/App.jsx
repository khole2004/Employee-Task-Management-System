import { useEffect, useState } from "react";
import "./App.css";

const getInitialTaskUrlParams = () => {
  if (typeof window === "undefined") {
    return {
      tab: "Dashboard",
      search: "",
      status: "",
      priority: "",
      department: "",
      dueDate: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  const pageParam = parseInt(params.get("page") || "1", 10);

  const hasTaskQuery =
    params.has("search") ||
    params.has("status") ||
    params.has("priority") ||
    params.has("department") ||
    params.has("dueDate") ||
    params.has("sortBy");

  return {
    tab: tabParam || (hasTaskQuery ? "Tasks" : "Dashboard"),
    search: params.get("search") || "",
    status: params.get("status") || "",
    priority: params.get("priority") || "",
    department: params.get("department") || "",
    dueDate: params.get("dueDate") || "",
    sortBy: params.get("sortBy") || "createdAt",
    sortOrder: params.get("sortOrder") || "desc",
    page: Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam,
  };
};

const VALID_STATUS_TRANSITIONS = {
  Todo: ["In Progress", "Cancelled"],
  "In Progress": ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL)
    ? import.meta.env.VITE_API_URL.replace(/\/+$/, "")
    : "http://localhost:5000";

function App() {
  const initialUrlParams = getInitialTaskUrlParams();

  const [page, setPage] = useState(initialUrlParams.tab);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [success, setSuccess] = useState("");

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Task management state
  const [tasks, setTasks] = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [taskSuccess, setTaskSuccess] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [statusUpdatingTaskId, setStatusUpdatingTaskId] = useState(null);
  const [editingStatusTaskId, setEditingStatusTaskId] = useState(null);

  // Task Search, Filter, Sort, & Pagination state
  const [taskSearch, setTaskSearch] = useState(initialUrlParams.search);
  const [taskStatusFilter, setTaskStatusFilter] = useState(initialUrlParams.status);
  const [taskPriorityFilter, setTaskPriorityFilter] = useState(initialUrlParams.priority);
  const [taskDepartmentFilter, setTaskDepartmentFilter] = useState(initialUrlParams.department);
  const [taskDueDateFilter, setTaskDueDateFilter] = useState(initialUrlParams.dueDate);
  const [taskSortBy, setTaskSortBy] = useState(initialUrlParams.sortBy);
  const [taskSortOrder, setTaskSortOrder] = useState(initialUrlParams.sortOrder);
  const [taskPage, setTaskPage] = useState(initialUrlParams.page);
  const [taskTotalPages, setTaskTotalPages] = useState(1);
  const [taskTotal, setTaskTotal] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);

  // Dashboard state
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const initialTaskFormState = {
    title: "",
    description: "",
    assignedEmployee: "",
    priority: "Medium",
    status: "Todo",
    startDate: "",
    dueDate: "",
  };

  const [taskFormData, setTaskFormData] = useState(initialTaskFormState);
  const initialFormState = {
    employeeId: "",
    fullName: "",
    email: "",
    phone: "",
    department: "Development",
    role: "",
    joiningDate: "",
    status: "Active",
    skills: "",
    leaveStartDate: "",
    leaveEndDate: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchEmployeesData = async (filterParams) => {
    const params = new URLSearchParams();
    params.append("limit", "100");

    if (filterParams?.search && filterParams.search.trim()) {
      params.append("search", filterParams.search.trim());
    }
    if (filterParams?.department) {
      params.append("department", filterParams.department);
    }
    if (filterParams?.status) {
      params.append("status", filterParams.status);
    }

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const url = `${API_BASE_URL}/api/employees${queryString}`;
    const fallbackUrl = `/api/employees${queryString}`;

    let response;
    try {
      response = await fetch(url);
    } catch {
      response = await fetch(fallbackUrl);
    }

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: Failed to load employees`
      );
    }

    const result = await response.json();
    return Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.employees)
      ? result.employees
      : [];
  };

  const fetchDashboardData = async () => {
    const url = `${API_BASE_URL}/api/dashboard`;
    const fallbackUrl = "/api/dashboard";

    let response;
    try {
      response = await fetch(url);
    } catch {
      response = await fetch(fallbackUrl);
    }

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: Failed to load dashboard data`
      );
    }

    return await response.json();
  };

  const loadDashboardData = async () => {
    setDashboardLoading(true);
    setDashboardError("");

    try {
      const result = await fetchDashboardData();
      setDashboardData(result.data);
      setDashboardError("");
    } catch (err) {
      console.error("Error loading dashboard:", err);
      setDashboardError(
        "Unable to load dashboard data. Please make sure the backend server is running on port 5000."
      );
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadEmployees = async (overrideFilters) => {
    setLoading(true);
    setError("");

    try {
      const filters = {
        search:
          overrideFilters?.search !== undefined ? overrideFilters.search : search,
        department:
          overrideFilters?.department !== undefined
            ? overrideFilters.department
            : departmentFilter,
        status:
          overrideFilters?.status !== undefined
            ? overrideFilters.status
            : statusFilter,
      };

      const list = await fetchEmployeesData(filters);
      setEmployees(list);
      setError("");
    } catch (err) {
      console.error("Error loading employees:", err);
      setError(
        "Unable to load employees. Please make sure the backend server is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  // Synchronize Tasks state with browser URL query parameters
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    params.set("tab", page);

    if (page === "Tasks") {
      if (taskSearch.trim()) params.set("search", taskSearch.trim());
      if (taskStatusFilter) params.set("status", taskStatusFilter);
      if (taskPriorityFilter) params.set("priority", taskPriorityFilter);
      if (taskDepartmentFilter) params.set("department", taskDepartmentFilter);
      if (taskDueDateFilter) params.set("dueDate", taskDueDateFilter);
      if (taskSortBy && taskSortBy !== "createdAt") params.set("sortBy", taskSortBy);
      if (taskSortOrder && taskSortOrder !== "desc") params.set("sortOrder", taskSortOrder);
      if (taskPage > 1) params.set("page", String(taskPage));
    }

    const newQuery = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, "", newQuery);
  }, [
    page,
    taskSearch,
    taskStatusFilter,
    taskPriorityFilter,
    taskDepartmentFilter,
    taskDueDateFilter,
    taskSortBy,
    taskSortOrder,
    taskPage,
  ]);

  const fetchTasksData = async (options) => {
    const params = new URLSearchParams();
    params.append("page", String(options?.page || 1));
    params.append("limit", String(options?.limit || 5));

    if (options?.search && options.search.trim()) {
      params.append("search", options.search.trim());
    }
    if (options?.status) {
      params.append("status", options.status);
    }
    if (options?.priority) {
      params.append("priority", options.priority);
    }
    if (options?.department) {
      params.append("department", options.department);
    }
    if (options?.dueDate) {
      params.append("dueDate", options.dueDate);
    }
    if (options?.sortBy) {
      params.append("sortBy", options.sortBy);
    }
    if (options?.sortOrder) {
      params.append("sortOrder", options.sortOrder);
    }

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const url = `${API_BASE_URL}/api/tasks${queryString}`;
    const fallbackUrl = `/api/tasks${queryString}`;

    let response;
    try {
      response = await fetch(url);
    } catch {
      // Fallback to relative path using Vite proxy
      response = await fetch(fallbackUrl);
    }

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}: Failed to load tasks`
      );
    }

    return await response.json();
  };

  const loadTasks = async (overrideParams) => {
    setTaskLoading(true);
    setTaskError("");

    try {
      const queryParams = {
        page:
          overrideParams?.page !== undefined ? overrideParams.page : taskPage,
        limit: 5,
        search:
          overrideParams?.search !== undefined
            ? overrideParams.search
            : taskSearch,
        status:
          overrideParams?.status !== undefined
            ? overrideParams.status
            : taskStatusFilter,
        priority:
          overrideParams?.priority !== undefined
            ? overrideParams.priority
            : taskPriorityFilter,
        department:
          overrideParams?.department !== undefined
            ? overrideParams.department
            : taskDepartmentFilter,
        dueDate:
          overrideParams?.dueDate !== undefined
            ? overrideParams.dueDate
            : taskDueDateFilter,
        sortBy:
          overrideParams?.sortBy !== undefined
            ? overrideParams.sortBy
            : taskSortBy,
        sortOrder:
          overrideParams?.sortOrder !== undefined
            ? overrideParams.sortOrder
            : taskSortOrder,
      };

      const result = await fetchTasksData(queryParams);
      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.tasks)
        ? result.tasks
        : [];

      setTasks(list);
      setTaskTotal(result?.total !== undefined ? result.total : list.length);
      setTaskTotalPages(
        result?.totalPages !== undefined ? result.totalPages : 1
      );
      setTaskError("");
    } catch (err) {
      console.error("Error loading tasks:", err);
      setTaskError(
        "Unable to load tasks. Please make sure the backend server is running on port 5000."
      );
    } finally {
      setTaskLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    if (page === "Dashboard") {
      fetchDashboardData()
        .then((result) => {
          if (!ignore) {
            setDashboardData(result.data);
            setDashboardError("");
          }
        })
        .catch((err) => {
          if (!ignore) {
            console.error("Error loading dashboard:", err);
            setDashboardError(
              "Unable to load dashboard data. Please make sure the backend server is running on port 5000."
            );
          }
        });
    }

    if (page === "Employees") {
      const filterOptions = {
        search,
        department: departmentFilter,
        status: statusFilter,
      };

      fetchEmployeesData(filterOptions)
        .then((list) => {
          if (!ignore) {
            setEmployees(list);
            setError("");
          }
        })
        .catch((err) => {
          if (!ignore) {
            console.error("Error loading employees:", err);
            setError(
              "Unable to load employees. Please make sure the backend server is running on port 5000."
            );
          }
        });
    }

    if (page === "Tasks") {
      const queryParams = {
        page: taskPage,
        limit: 5,
        search: taskSearch,
        status: taskStatusFilter,
        priority: taskPriorityFilter,
        department: taskDepartmentFilter,
        dueDate: taskDueDateFilter,
        sortBy: taskSortBy,
        sortOrder: taskSortOrder,
      };

      fetchTasksData(queryParams)
        .then((result) => {
          if (!ignore) {
            const list = Array.isArray(result)
              ? result
              : Array.isArray(result?.data)
              ? result.data
              : Array.isArray(result?.tasks)
              ? result.tasks
              : [];
            setTasks(list);
            setTaskTotal(
              result?.total !== undefined ? result.total : list.length
            );
            setTaskTotalPages(
              result?.totalPages !== undefined ? result.totalPages : 1
            );
            setTaskError("");
          }
        })
        .catch((err) => {
          if (!ignore) {
            console.error("Error loading tasks:", err);
            setTaskError(
              "Unable to load tasks. Please make sure the backend server is running on port 5000."
            );
          }
        });

      if (employees.length === 0) {
        fetchEmployeesData({})
          .then((empList) => {
            if (!ignore) {
              setEmployees(empList);
            }
          })
          .catch((err) => {
            console.error("Error fetching employees for task dropdown:", err);
          });
      }
    }

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleApplyFilters = (event) => {
    if (event) event.preventDefault();
    loadEmployees();
  };

  const handleResetFilters = () => {
    setSearch("");
    setDepartmentFilter("");
    setStatusFilter("");
    loadEmployees({ search: "", department: "", status: "" });
  };

  const handleTaskFilterChange = (filterName, value) => {
    const newPage = 1;
    setTaskPage(newPage);

    const updated = {
      page: newPage,
      search: filterName === "search" ? value : taskSearch,
      status: filterName === "status" ? value : taskStatusFilter,
      priority: filterName === "priority" ? value : taskPriorityFilter,
      department: filterName === "department" ? value : taskDepartmentFilter,
      dueDate: filterName === "dueDate" ? value : taskDueDateFilter,
      sortBy: filterName === "sortBy" ? value : taskSortBy,
      sortOrder: filterName === "sortOrder" ? value : taskSortOrder,
    };

    if (filterName === "search") setTaskSearch(value);
    if (filterName === "status") setTaskStatusFilter(value);
    if (filterName === "priority") setTaskPriorityFilter(value);
    if (filterName === "department") setTaskDepartmentFilter(value);
    if (filterName === "dueDate") setTaskDueDateFilter(value);
    if (filterName === "sortBy") setTaskSortBy(value);
    if (filterName === "sortOrder") setTaskSortOrder(value);

    loadTasks(updated);
  };

  const handleTaskSortChange = (combinedValue) => {
    const [sortBy, sortOrder] = combinedValue.split(":");
    setTaskSortBy(sortBy);
    setTaskSortOrder(sortOrder);
    setTaskPage(1);

    loadTasks({
      sortBy,
      sortOrder,
      page: 1,
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > taskTotalPages || newPage === taskPage) return;
    setTaskPage(newPage);
    loadTasks({ page: newPage });
  };

  const handleClearTaskFilters = () => {
    setTaskSearch("");
    setTaskStatusFilter("");
    setTaskPriorityFilter("");
    setTaskDepartmentFilter("");
    setTaskDueDateFilter("");
    setTaskSortBy("createdAt");
    setTaskSortOrder("desc");
    setTaskPage(1);

    loadTasks({
      search: "",
      status: "",
      priority: "",
      department: "",
      dueDate: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
    });
  };

  const handleExportCSV = async () => {
    setTaskError("");
    setTaskSuccess("");
    setExportLoading(true);

    try {
      const params = new URLSearchParams();
      if (taskSearch && taskSearch.trim()) {
        params.append("search", taskSearch.trim());
      }
      if (taskStatusFilter) {
        params.append("status", taskStatusFilter);
      }
      if (taskPriorityFilter) {
        params.append("priority", taskPriorityFilter);
      }
      if (taskDepartmentFilter) {
        params.append("department", taskDepartmentFilter);
      }
      if (taskDueDateFilter) {
        params.append("dueDate", taskDueDateFilter);
      }
      if (taskSortBy) {
        params.append("sortBy", taskSortBy);
      }
      if (taskSortOrder) {
        params.append("sortOrder", taskSortOrder);
      }

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const url = `${API_BASE_URL}/api/tasks/export/csv${queryString}`;
      const fallbackUrl = `/api/tasks/export/csv${queryString}`;

      let response;
      try {
        response = await fetch(url);
      } catch {
        response = await fetch(fallbackUrl);
      }

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok || contentType.includes("application/json")) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to export tasks (status: ${response.status})`
        );
      }

      const blob = await response.blob();
      let filename = `tasks_export_${new Date().toISOString().split("T")[0]}.csv`;
      const disposition = response.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, "").trim();
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setTaskSuccess("Tasks exported successfully as CSV!");
    } catch (err) {
      setTaskError(err.message || "Failed to export tasks as CSV.");
    } finally {
      setExportLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingEmployeeId(null);
    setShowForm(false);
  };

  const resetTaskForm = () => {
    setTaskFormData(initialTaskFormState);
    setEditingTaskId(null);
    setShowTaskForm(false);
  };

  const handleTaskChange = (event) => {
    const { name, value } = event.target;
    setTaskFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleEditTask = (task) => {
    setTaskError("");
    setTaskSuccess("");

    if (["Completed", "Cancelled"].includes(task.status)) {
      setTaskError("Completed or cancelled tasks cannot be edited.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setEditingTaskId(task._id);

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      try {
        return new Date(dateStr).toISOString().split("T")[0];
      } catch {
        return "";
      }
    };

    const empId =
      typeof task.assignedEmployee === "object" && task.assignedEmployee?._id
        ? task.assignedEmployee._id
        : task.assignedEmployee || "";

    setTaskFormData({
      title: task.title || "",
      description: task.description || "",
      assignedEmployee: empId,
      priority: task.priority || "Medium",
      status: task.status || "Todo",
      startDate: formatDate(task.startDate),
      dueDate: formatDate(task.dueDate),
    });

    setShowTaskForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteTask = async (task) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete task "${task.title}" (${task.taskId || ""})?`
    );
    if (!confirmed) return;

    setTaskError("");
    setTaskSuccess("");

    const url = `${API_BASE_URL}/api/tasks/${task._id}`;
    const fallbackUrl = `/api/tasks/${task._id}`;

    try {
      let response;
      try {
        response = await fetch(url, { method: "DELETE" });
      } catch {
        response = await fetch(fallbackUrl, { method: "DELETE" });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete task.");
      }

      setTaskSuccess(result.message || "Task deleted successfully!");

      if (editingTaskId === task._id) {
        resetTaskForm();
      }

      loadTasks();
    } catch (err) {
      setTaskError(err.message || "Unable to delete task.");
    }
  };

  const handleStatusUpdate = async (task, newStatus) => {
    if (!newStatus || newStatus === task.status) return;

    const allowedTransitions = VALID_STATUS_TRANSITIONS[task.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      setTaskError(
        `Cannot change task status from "${task.status}" to "${newStatus}".`
      );
      return;
    }

    setTaskError("");
    setTaskSuccess("");
    setStatusUpdatingTaskId(task._id);

    const url = `${API_BASE_URL}/api/tasks/${task._id}/status`;
    const fallbackUrl = `/api/tasks/${task._id}/status`;

    try {
      let response;
      try {
        response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch {
        response = await fetch(fallbackUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update task status.");
      }

      setTaskSuccess(
        result.message || `Task status updated to "${newStatus}" successfully!`
      );
      loadTasks();
    } catch (err) {
      setTaskError(err.message || "Unable to update task status.");
    } finally {
      setStatusUpdatingTaskId(null);
    }
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();
    setTaskError("");
    setTaskSuccess("");

    if (!taskFormData.title.trim()) {
      setTaskError("Please enter a task title.");
      return;
    }
    if (!taskFormData.description.trim()) {
      setTaskError("Please enter a task description.");
      return;
    }
    if (!taskFormData.assignedEmployee) {
      setTaskError("Please select an employee to assign this task.");
      return;
    }
    if (!taskFormData.startDate) {
      setTaskError("Please select a task start date.");
      return;
    }
    if (!taskFormData.dueDate) {
      setTaskError("Please select a task due date.");
      return;
    }
    if (taskFormData.dueDate < taskFormData.startDate) {
      setTaskError("Due date cannot be before start date.");
      return;
    }

    const payload = {
      title: taskFormData.title.trim(),
      description: taskFormData.description.trim(),
      assignedEmployee: taskFormData.assignedEmployee,
      priority: taskFormData.priority || "Medium",
      startDate: taskFormData.startDate,
      dueDate: taskFormData.dueDate,
    };

    const isEditing = Boolean(editingTaskId);
    const url = isEditing
      ? `${API_BASE_URL}/api/tasks/${editingTaskId}`
      : `${API_BASE_URL}/api/tasks`;
    const fallbackUrl = isEditing
      ? `/api/tasks/${editingTaskId}`
      : "/api/tasks";
    const method = isEditing ? "PUT" : "POST";

    try {
      let response;
      try {
        response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } catch {
        response = await fetch(fallbackUrl, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            (isEditing ? "Failed to update task." : "Failed to create task.")
        );
      }

      setTaskSuccess(
        result.message ||
          (isEditing ? "Task updated successfully!" : "Task created successfully!")
      );
      resetTaskForm();
      loadTasks();
    } catch (err) {
      setTaskError(
        err.message ||
          (isEditing
            ? "Something went wrong updating the task."
            : "Something went wrong creating the task.")
      );
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleEdit = (employee) => {
    setError("");
    setSuccess("");
    setEditingEmployeeId(employee._id);

    // Format ISO date strings to YYYY-MM-DD for HTML5 date input
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      try {
        return new Date(dateStr).toISOString().split("T")[0];
      } catch {
        return "";
      }
    };

    setFormData({
      employeeId: employee.employeeId || "",
      fullName: employee.fullName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "Development",
      role: employee.role || "",
      joiningDate: formatDate(employee.joiningDate),
      status: employee.status || "Active",
      skills: Array.isArray(employee.skills)
        ? employee.skills.join(", ")
        : (employee.skills || ""),
      leaveStartDate: formatDate(employee.leaveStartDate),
      leaveEndDate: formatDate(employee.leaveEndDate),
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (employee) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete employee "${employee.fullName}" (${employee.employeeId})?`
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");

    const url = `${API_BASE_URL}/api/employees/${employee._id}`;
    const fallbackUrl = `/api/employees/${employee._id}`;

    try {
      let response;
      try {
        response = await fetch(url, { method: "DELETE" });
      } catch {
        response = await fetch(fallbackUrl, { method: "DELETE" });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete employee.");
      }

      setSuccess(result.message || "Employee deleted successfully!");

      if (editingEmployeeId === employee._id) {
        resetForm();
      }

      loadEmployees();
    } catch (err) {
      setError(err.message || "Unable to delete employee.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      formData.status === "On Leave" &&
      (!formData.leaveStartDate || !formData.leaveEndDate)
    ) {
      setError("Please enter both leave dates for an employee on leave.");
      return;
    }

    if (
      formData.status === "On Leave" &&
      formData.leaveEndDate < formData.leaveStartDate
    ) {
      setError("Leave end date must be on or after leave start date.");
      return;
    }

    const employeeData = {
      ...formData,
      email: formData.email.trim().toLowerCase(),
      skills:
        typeof formData.skills === "string"
          ? formData.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean)
          : (formData.skills || []),
    };

    if (formData.status === "On Leave") {
      employeeData.leaveStartDate = formData.leaveStartDate;
      employeeData.leaveEndDate = formData.leaveEndDate;
    } else {
      delete employeeData.leaveStartDate;
      delete employeeData.leaveEndDate;
    }

    const isEditing = Boolean(editingEmployeeId);
    const url = isEditing
      ? `${API_BASE_URL}/api/employees/${editingEmployeeId}`
      : `${API_BASE_URL}/api/employees`;
    const fallbackUrl = isEditing
      ? `/api/employees/${editingEmployeeId}`
      : "/api/employees";
    const method = isEditing ? "PUT" : "POST";

    try {
      let response;
      try {
        response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(employeeData),
        });
      } catch {
        response = await fetch(fallbackUrl, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(employeeData),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            (isEditing ? "Unable to update employee." : "Unable to add employee.")
        );
      }

      setSuccess(
        isEditing
          ? "Employee updated successfully!"
          : "Employee added successfully!"
      );

      resetForm();
      loadEmployees();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  };

  const hasActiveFilters = Boolean(search || departmentFilter || statusFilter);
  const hasActiveTaskFilters = Boolean(
    taskSearch.trim() ||
      taskStatusFilter ||
      taskPriorityFilter ||
      taskDepartmentFilter ||
      taskDueDateFilter
  );

  return (
    <div className="app">
      <header className="app-topbar">
        <nav className="topbar-nav">
          <button
            className={`topbar-tab ${page === "Dashboard" ? "active" : ""}`}
            onClick={() => {
              setPage("Dashboard");
              setSuccess("");
              loadDashboardData();
            }}
          >
            Dashboard
          </button>

          <button
            className={`topbar-tab ${page === "Employees" ? "active" : ""}`}
            onClick={() => {
              setPage("Employees");
              setSuccess("");
            }}
          >
            Employees
          </button>

          <button
            className={`topbar-tab ${page === "Tasks" ? "active" : ""}`}
            onClick={() => {
              setPage("Tasks");
              setSuccess("");
            }}
          >
            Tasks
          </button>
        </nav>

        <div className="topbar-title">
          <span>MERN stack developer practical task</span>
        </div>
      </header>

      {page === "Dashboard" && (
        <div className="container">
          <div className="section-header">
            <div>
              <h2>Dashboard</h2>
              <p style={{ marginTop: "4px", color: "#6b7280" }}>
                Overview of system metrics, task distribution, and employee workload.
              </p>
            </div>

            <button
              className="add-button"
              style={{ background: "#4b5563" }}
              onClick={() => loadDashboardData()}
              disabled={dashboardLoading}
            >
              {dashboardLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {dashboardLoading && !dashboardData && (
            <p>Loading dashboard metrics...</p>
          )}

          {dashboardError && (
            <div className="error-message">
              <p>{dashboardError}</p>
              <button
                className="add-button"
                style={{ marginTop: "10px" }}
                onClick={() => loadDashboardData()}
              >
                Retry
              </button>
            </div>
          )}

          {dashboardData && (
            <>
              {/* Summary Cards */}
              {/* Summary Cards */}
              <div className="dashboard-metrics-container">
                <div className="dashboard-row-header">
                  <h4>Employee Overview</h4>
                </div>
                <div className="stats-grid stats-grid-employees">
                  <div className="stat-card card-total-employees">
                    <span className="stat-label">Total Employees</span>
                    <div className="stat-value">
                      {dashboardData.summary.totalEmployees}
                    </div>
                    <span className="stat-desc">Registered in organization</span>
                  </div>

                  <div className="stat-card card-active-employees">
                    <span className="stat-label">Active</span>
                    <div className="stat-value">
                      {dashboardData.summary.activeEmployees}
                    </div>
                    <span className="stat-desc">Currently working</span>
                  </div>

                  <div className="stat-card card-todo-tasks">
                    <span className="stat-label">Inactive</span>
                    <div className="stat-value">
                      {dashboardData.summary.inactiveEmployees ?? 0}
                    </div>
                    <span className="stat-desc">Inactive status</span>
                  </div>

                  <div className="stat-card card-cancelled-tasks">
                    <span className="stat-label">On Leave</span>
                    <div className="stat-value">
                      {dashboardData.summary.onLeaveEmployees ?? 0}
                    </div>
                    <span className="stat-desc">Currently on leave</span>
                  </div>
                </div>

                <div className="dashboard-row-header" style={{ marginTop: "24px" }}>
                  <h4>Task Overview</h4>
                </div>
                <div className="stats-grid stats-grid-tasks">
                  <div className="stat-card card-total-tasks">
                    <span className="stat-label">Total Tasks</span>
                    <div className="stat-value">
                      {dashboardData.summary.totalTasks}
                    </div>
                    <span className="stat-desc">All created tasks</span>
                  </div>

                  <div className="stat-card card-todo-tasks">
                    <span className="stat-label">Todo</span>
                    <div className="stat-value">
                      {dashboardData.summary.todoTasks}
                    </div>
                    <span className="stat-desc">Pending action</span>
                  </div>

                  <div className="stat-card card-inprogress-tasks">
                    <span className="stat-label">In Progress</span>
                    <div className="stat-value">
                      {dashboardData.summary.inProgressTasks}
                    </div>
                    <span className="stat-desc">In development</span>
                  </div>

                  <div className="stat-card card-completed-tasks">
                    <span className="stat-label">Completed</span>
                    <div className="stat-value">
                      {dashboardData.summary.completedTasks}
                    </div>
                    <span className="stat-desc">Successfully finished</span>
                  </div>

                  <div className="stat-card card-cancelled-tasks">
                    <span className="stat-label">Cancelled</span>
                    <div className="stat-value">
                      {dashboardData.summary.cancelledTasks}
                    </div>
                    <span className="stat-desc">Terminated tasks</span>
                  </div>

                  <div className="stat-card card-overdue-tasks">
                    <span className="stat-label">Overdue</span>
                    <div className="stat-value">
                      {dashboardData.summary.overdueTasks}
                    </div>
                    <span className="stat-desc">Past due & not finished</span>
                  </div>
                </div>
              </div>

              {/* Employee Workload Section */}
              <div className="workload-section">
                <div className="workload-header">
                  <h3>Employee Workload</h3>
                  <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "4px" }}>
                    Active task count (Todo or In Progress) assigned to each employee.
                  </p>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Full Name</th>
                        <th>Department</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Active Tasks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.employeeWorkload &&
                      dashboardData.employeeWorkload.length > 0 ? (
                        dashboardData.employeeWorkload.map((emp) => (
                          <tr key={emp._id}>
                            <td>{emp.employeeId}</td>
                            <td>
                              <strong>{emp.fullName}</strong>
                            </td>
                            <td>{emp.department}</td>
                            <td>{emp.role}</td>
                            <td>
                              <span
                                className={`badge status-${(emp.status || "active")
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")}`}
                              >
                                {emp.status}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`workload-badge ${
                                  emp.activeTaskCount > 0
                                    ? "workload-busy"
                                    : "workload-free"
                                }`}
                              >
                                {emp.activeTaskCount}{" "}
                                {emp.activeTaskCount === 1 ? "task" : "tasks"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="6"
                            style={{
                              textAlign: "center",
                              padding: "24px",
                              color: "#6b7280",
                            }}
                          >
                            No employee workload data available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {page === "Employees" && (
        <div className="container">
          <div className="section-header">
            <h2>Employee List</h2>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="add-button"
                style={{ background: "#4b5563" }}
                onClick={() => loadEmployees()}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                className="add-button"
                onClick={() => {
                  if (showForm) {
                    resetForm();
                  } else {
                    resetForm();
                    setShowForm(true);
                  }
                  setError("");
                  setSuccess("");
                }}
              >
                {showForm ? "Cancel" : "+ Add Employee"}
              </button>
            </div>
          </div>

          {loading && <p>Loading employees...</p>}
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button
                className="add-button"
                style={{ marginTop: "10px" }}
                onClick={() => loadEmployees()}
              >
                Retry
              </button>
            </div>
          )}
          {success && <p className="success-message">{success}</p>}

          {showForm && (
            <form className="employee-form" onSubmit={handleSubmit}>
              <h3>{editingEmployeeId ? "Edit Employee" : "Add New Employee"}</h3>

              <div className="form-grid">
                <label>
                  Employee ID *
                  <input
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    placeholder="e.g. EMP002"
                    required
                  />
                </label>

                <label>
                  Full Name *
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                  />
                </label>

                <label>
                  Email *
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    required
                  />
                </label>

                <label>
                  Phone *
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    required
                  />
                </label>

                <label>
                  Department *
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                  >
                    <option value="Development">Development</option>
                    <option value="Design">Design</option>
                    <option value="QA">QA</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                  </select>
                </label>

                <label>
                  Role *
                  <input
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    placeholder="e.g. Software Developer"
                    required
                  />
                </label>

                <label>
                  Joining Date *
                  <input
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Status *
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </label>

                <label>
                  Skills
                  <input
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder="Java, React, MongoDB"
                  />
                </label>

                {formData.status === "On Leave" && (
                  <>
                    <label>
                      Leave Start Date *
                      <input
                        type="date"
                        name="leaveStartDate"
                        value={formData.leaveStartDate}
                        onChange={handleChange}
                        required
                      />
                    </label>

                    <label>
                      Leave End Date *
                      <input
                        type="date"
                        name="leaveEndDate"
                        value={formData.leaveEndDate}
                        onChange={handleChange}
                        required
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="form-actions">
                <button className="submit-button" type="submit">
                  {editingEmployeeId ? "Update Employee" : "Save Employee"}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Search and Filters Section */}
          <form className="filter-section" onSubmit={handleApplyFilters}>
            <div className="filter-grid">
              <div className="filter-group">
                <label htmlFor="search-input">Search Employee</label>
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search by ID, name, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="department-filter">Department</label>
                <select
                  id="department-filter"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <option value="">All Departments</option>
                  <option value="Development">Development</option>
                  <option value="Design">Design</option>
                  <option value="QA">QA</option>
                  <option value="HR">HR</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="status-filter">Status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div className="filter-actions">
                <button type="submit" className="search-btn">
                  Apply Filters
                </button>
                <button
                  type="button"
                  className="reset-btn"
                  onClick={handleResetFilters}
                >
                  Reset
                </button>
              </div>
            </div>
          </form>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee._id}>
                    <td>{employee.employeeId}</td>
                    <td>{employee.fullName}</td>
                    <td>{employee.email}</td>
                    <td>{employee.department}</td>
                    <td>{employee.role}</td>
                    <td>{employee.status}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="view-btn"
                          onClick={() => setViewingEmployee(employee)}
                          title="View employee details"
                        >
                          View
                        </button>
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(employee)}
                          title="Edit employee"
                        >
                          Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(employee)}
                          title="Delete employee"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {employees.length === 0 && !loading && !error && (
                  <tr>
                    <td
                      colSpan="7"
                      style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}
                    >
                      {hasActiveFilters
                        ? "No employees match your search or filter criteria."
                        : "No employees found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {page === "Tasks" && (
        <div className="container">
          <div className="section-header">
            <h2>Task Management</h2>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="add-button export-btn"
                disabled={exportLoading}
                onClick={handleExportCSV}
                title="Export all tasks matching current filters as a CSV file"
              >
                {exportLoading ? "Exporting CSV..." : "Export CSV"}
              </button>
              <button
                className="add-button"
                style={{ background: "#4b5563" }}
                onClick={() => loadTasks()}
              >
                {taskLoading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                className="add-button"
                onClick={() => {
                  if (showTaskForm) {
                    resetTaskForm();
                  } else {
                    resetTaskForm();
                    setShowTaskForm(true);
                  }
                  setTaskError("");
                  setTaskSuccess("");
                }}
              >
                {showTaskForm ? "Cancel" : "+ Add Task"}
              </button>
            </div>
          </div>

          <p>Manage and track assigned tasks here.</p>

          {taskLoading && <p>Loading tasks...</p>}

          {taskError && (
            <div className="error-message">
              <p>{taskError}</p>
              <button
                className="add-button"
                style={{ marginTop: "10px" }}
                onClick={() => loadTasks()}
              >
                Retry
              </button>
            </div>
          )}

          {taskSuccess && <p className="success-message">{taskSuccess}</p>}

          {showTaskForm && (
            <form className="employee-form" onSubmit={handleTaskSubmit}>
              <h3>{editingTaskId ? "Edit Task" : "Add New Task"}</h3>

              <div className="form-grid">
                <label>
                  Title *
                  <input
                    name="title"
                    value={taskFormData.title}
                    onChange={handleTaskChange}
                    placeholder="e.g. Develop Employee Dashboard"
                    required
                  />
                </label>

                <label>
                  Assigned Employee *
                  <select
                    name="assignedEmployee"
                    value={taskFormData.assignedEmployee}
                    onChange={handleTaskChange}
                    required
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Priority *
                  <select
                    name="priority"
                    value={taskFormData.priority}
                    onChange={handleTaskChange}
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </label>

                <label>
                  Start Date *
                  <input
                    type="date"
                    name="startDate"
                    value={taskFormData.startDate}
                    onChange={handleTaskChange}
                    required
                  />
                </label>

                <label>
                  Due Date *
                  <input
                    type="date"
                    name="dueDate"
                    value={taskFormData.dueDate}
                    onChange={handleTaskChange}
                    required
                  />
                </label>

                <label style={{ gridColumn: "span 2" }}>
                  Description *
                  <textarea
                    name="description"
                    value={taskFormData.description}
                    onChange={handleTaskChange}
                    placeholder="Enter task description and objectives..."
                    rows="3"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontFamily: "inherit",
                      fontSize: "14px",
                    }}
                    required
                  />
                </label>
              </div>

              <div className="form-actions">
                <button className="submit-button" type="submit">
                  {editingTaskId ? "Update Task" : "Save Task"}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetTaskForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Task Filters Section */}
          <div className="filter-section">
            <div className="filter-grid task-filters-grid">
              <div className="filter-group task-search-group">
                <label htmlFor="task-search-input">Search Task</label>
                <input
                  id="task-search-input"
                  type="text"
                  placeholder="Search by title or employee..."
                  value={taskSearch}
                  onChange={(e) =>
                    handleTaskFilterChange("search", e.target.value)
                  }
                />
              </div>

              <div className="filter-group">
                <label htmlFor="task-status-filter">Status</label>
                <select
                  id="task-status-filter"
                  value={taskStatusFilter}
                  onChange={(e) =>
                    handleTaskFilterChange("status", e.target.value)
                  }
                >
                  <option value="">All Statuses</option>
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="task-priority-filter">Priority</label>
                <select
                  id="task-priority-filter"
                  value={taskPriorityFilter}
                  onChange={(e) =>
                    handleTaskFilterChange("priority", e.target.value)
                  }
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="task-department-filter">Department</label>
                <select
                  id="task-department-filter"
                  value={taskDepartmentFilter}
                  onChange={(e) =>
                    handleTaskFilterChange("department", e.target.value)
                  }
                >
                  <option value="">All Departments</option>
                  <option value="Development">Development</option>
                  <option value="Design">Design</option>
                  <option value="QA">QA</option>
                  <option value="HR">HR</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="task-due-date-filter">Due Date</label>
                <input
                  id="task-due-date-filter"
                  type="date"
                  value={taskDueDateFilter}
                  onChange={(e) =>
                    handleTaskFilterChange("dueDate", e.target.value)
                  }
                />
              </div>

              <div className="filter-group">
                <label htmlFor="task-sort-by">Sort By</label>
                <select
                  id="task-sort-by"
                  value={`${taskSortBy}:${taskSortOrder}`}
                  onChange={(e) => handleTaskSortChange(e.target.value)}
                >
                  <option value="createdAt:desc">Created Date (Newest)</option>
                  <option value="createdAt:asc">Created Date (Oldest)</option>
                  <option value="dueDate:asc">Due Date (Earliest)</option>
                  <option value="dueDate:desc">Due Date (Latest)</option>
                  <option value="priority:desc">Priority (Critical to Low)</option>
                  <option value="priority:asc">Priority (Low to Critical)</option>
                  <option value="title:asc">Title (A to Z)</option>
                  <option value="title:desc">Title (Z to A)</option>
                </select>
              </div>

              <div className="filter-actions">
                <button
                  type="button"
                  className="reset-btn"
                  onClick={handleClearTaskFilters}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Title</th>
                  <th>Assigned Employee</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id}>
                    <td>{task.taskId || "—"}</td>
                    <td>{task.title}</td>
                    <td>
                      {task.employeeName
                        ? `${task.employeeName} (${task.employeeId || ""})`
                        : task.assignedEmployee?.fullName || "Unassigned"}
                    </td>
                    <td>{task.department}</td>
                    <td>
                      <span
                        className={`badge priority-${(task.priority || "medium").toLowerCase()}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="status-cell">
                      {editingStatusTaskId === task._id &&
                      (VALID_STATUS_TRANSITIONS[task.status] || []).length > 0 ? (
                        <div className="status-dropdown-wrapper">
                          <select
                            className={`status-select status-${(task.status || "todo")
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleStatusUpdate(task, e.target.value);
                                setEditingStatusTaskId(null);
                              }
                            }}
                            onBlur={() => setEditingStatusTaskId(null)}
                            disabled={statusUpdatingTaskId === task._id}
                            autoFocus
                            title="Select new status"
                          >
                            <option value="" disabled>
                              Select new status...
                            </option>
                            {(VALID_STATUS_TRANSITIONS[task.status] || []).map(
                              (nextStatus) => (
                                <option key={nextStatus} value={nextStatus}>
                                  &rarr; {nextStatus}
                                </option>
                              )
                            )}
                          </select>
                          <button
                            type="button"
                            className="status-cancel-btn"
                            onClick={() => setEditingStatusTaskId(null)}
                            title="Cancel"
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <div className="status-badge-container">
                          <span
                            className={`badge status-${(task.status || "todo")
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                            onClick={() => {
                              if (
                                (VALID_STATUS_TRANSITIONS[task.status] || [])
                                  .length > 0
                              ) {
                                setEditingStatusTaskId(task._id);
                              }
                            }}
                            style={{
                              cursor:
                                (VALID_STATUS_TRANSITIONS[task.status] || [])
                                  .length > 0
                                  ? "pointer"
                                  : "default",
                            }}
                            title={
                              (VALID_STATUS_TRANSITIONS[task.status] || [])
                                .length > 0
                                ? "Click to change status"
                                : "Final status cannot be changed"
                            }
                          >
                            {task.status}
                          </span>
                          {(VALID_STATUS_TRANSITIONS[task.status] || []).length >
                            0 && (
                            <button
                              type="button"
                              className="status-change-icon"
                              onClick={() => setEditingStatusTaskId(task._id)}
                              disabled={statusUpdatingTaskId === task._id}
                              title={`Change status from ${task.status}`}
                            >
                              &#9662;
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {task.startDate
                        ? new Date(task.startDate).toISOString().split("T")[0]
                        : "—"}
                    </td>
                    <td>
                      {task.dueDate ? (
                        <span
                          style={
                            task.isOverdue
                              ? { color: "#dc2626", fontWeight: 600 }
                              : {}
                          }
                        >
                          {new Date(task.dueDate).toISOString().split("T")[0]}
                          {task.isOverdue && (
                            <span
                              style={{
                                marginLeft: "6px",
                                color: "#dc2626",
                                fontSize: "12px",
                                fontWeight: 700,
                              }}
                            >
                              (Overdue)
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="view-btn"
                          onClick={() => setViewingTask(task)}
                          title="View task details"
                        >
                          View
                        </button>
                        <button
                          className="edit-btn"
                          onClick={() => handleEditTask(task)}
                          disabled={["Completed", "Cancelled"].includes(task.status)}
                          style={
                            ["Completed", "Cancelled"].includes(task.status)
                              ? { opacity: 0.5, cursor: "not-allowed" }
                              : {}
                          }
                          title={
                            ["Completed", "Cancelled"].includes(task.status)
                              ? "Completed or cancelled tasks cannot be edited"
                              : "Edit task"
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteTask(task)}
                          title="Delete task"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {tasks.length === 0 && !taskLoading && !taskError && (
                  <tr>
                    <td
                      colSpan="9"
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "#6b7280",
                      }}
                    >
                      {hasActiveTaskFilters
                        ? "No tasks match the selected filters."
                        : "No tasks found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Backend-Powered Pagination Bar */}
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing <strong>{tasks.length}</strong> of{" "}
              <strong>{taskTotal}</strong> tasks (Page{" "}
              <strong>{taskPage}</strong> of{" "}
              <strong>{taskTotalPages || 1}</strong>)
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => handlePageChange(taskPage - 1)}
                disabled={taskPage <= 1 || taskLoading}
                title="Previous page"
              >
                &larr; Previous
              </button>
              <span className="pagination-current-page">{taskPage}</span>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => handlePageChange(taskPage + 1)}
                disabled={
                  taskPage >= taskTotalPages ||
                  taskLoading ||
                  taskTotalPages === 0
                }
                title="Next page"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail View Modal */}
      {viewingEmployee && (
        <div
          className="modal-overlay"
          onClick={() => setViewingEmployee(null)}
          role="presentation"
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>Employee Details</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setViewingEmployee(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Employee ID</span>
                  <span className="detail-value">{viewingEmployee.employeeId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-value">{viewingEmployee.fullName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{viewingEmployee.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{viewingEmployee.phone || "—"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Department</span>
                  <span className="detail-value">{viewingEmployee.department}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Role</span>
                  <span className="detail-value">{viewingEmployee.role}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Joining Date</span>
                  <span className="detail-value">
                    {viewingEmployee.joiningDate
                      ? new Date(viewingEmployee.joiningDate)
                          .toISOString()
                          .split("T")[0]
                      : "—"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">{viewingEmployee.status}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Skills</span>
                  <span className="detail-value">
                    {Array.isArray(viewingEmployee.skills) &&
                    viewingEmployee.skills.length > 0
                      ? viewingEmployee.skills.join(", ")
                      : viewingEmployee.skills || "None listed"}
                  </span>
                </div>
                {viewingEmployee.status === "On Leave" && (
                  <>
                    <div className="detail-item">
                      <span className="detail-label">Leave Start</span>
                      <span className="detail-value">
                        {viewingEmployee.leaveStartDate
                          ? new Date(viewingEmployee.leaveStartDate)
                              .toISOString()
                              .split("T")[0]
                          : "—"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Leave End</span>
                      <span className="detail-value">
                        {viewingEmployee.leaveEndDate
                          ? new Date(viewingEmployee.leaveEndDate)
                              .toISOString()
                              .split("T")[0]
                          : "—"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setViewingEmployee(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail View Modal */}
      {viewingTask && (
        <div
          className="modal-overlay"
          onClick={() => setViewingTask(null)}
          role="presentation"
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3>Task Details</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setViewingTask(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Task ID</span>
                  <span className="detail-value">{viewingTask.taskId || viewingTask._id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Title</span>
                  <span className="detail-value">{viewingTask.title}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="detail-label">Description</span>
                  <span className="detail-value" style={{ whiteSpace: "pre-wrap" }}>
                    {viewingTask.description}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Assigned Employee</span>
                  <span className="detail-value">
                    {viewingTask.employeeName || "Unassigned"}
                    {viewingTask.employeeId ? ` (${viewingTask.employeeId})` : ""}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Department</span>
                  <span className="detail-value">{viewingTask.department}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Priority</span>
                  <span className="detail-value">
                    <span className={`badge priority-${(viewingTask.priority || "medium").toLowerCase()}`}>
                      {viewingTask.priority}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <span
                      className={`badge status-${(viewingTask.status || "todo")
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {viewingTask.status}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Start Date</span>
                  <span className="detail-value">
                    {viewingTask.startDate
                      ? new Date(viewingTask.startDate).toISOString().split("T")[0]
                      : "—"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Due Date</span>
                  <span className="detail-value">
                    {viewingTask.dueDate
                      ? new Date(viewingTask.dueDate).toISOString().split("T")[0]
                      : "—"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Completed Date</span>
                  <span className="detail-value">
                    {viewingTask.completedDate
                      ? new Date(viewingTask.completedDate).toISOString().split("T")[0]
                      : "Not completed"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Overdue Status</span>
                  <span className="detail-value">
                    {viewingTask.isOverdue ? (
                      <span className="badge" style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}>
                        Overdue
                      </span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: "#f3f4f6", color: "#374151" }}>
                        On Schedule
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setViewingTask(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;