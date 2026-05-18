export type UserRole = "ADMIN" | "PROJECT_MANAGER" | "TEAM_LEAD" | "EMPLOYEE";

export type UtilizationStatus = "UNDERUTILIZED" | "OPTIMAL" | "OVERUTILIZED";

export type ProductivityIndicator = "RED" | "GREEN" | "ORANGE";

export type EmployeeDailyProductivity = {
  employeeId: string;
  employeeName: string;
  employeeEmail: string | null;
  projectCount: number;
  tasksCreatedToday: number;
  tasksUpdatedToday: number;
  tasksClosedToday: number;
  estimatedHours: number;
  actualHoursLogged: number;
  remainingHours: number;
  efficiencyPercent: number | null;
  varianceHours: number;
  utilizationStatus: UtilizationStatus;
  indicator: ProductivityIndicator;
};

export type DashboardSummary = {
  organizationName: string;
  lastSyncAt: string | null;
  totalEmployeesActiveToday: number;
  totalTasksClosedToday: number;
  totalEstimatedHours: number;
  totalActualHoursLogged: number;
  productivityPercent: number | null;
  employeesBelow8Hours: number;
  employeesAt8Hours: number;
  employeesAbove8Hours: number;
  averageEfficiencyPercent: number | null;
};

