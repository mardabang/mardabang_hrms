import api from "../api/axios";

let employees = [];

const mapEmployee = (employee = {}) => ({
  ...employee,
  employeeDbId: employee.id,
  id: employee.employeeCode || employee.id,
  employeeCode: employee.employeeCode || employee.id,
  status: employee.status || (employee.active === false ? "Inactive" : "Active"),
  active: employee.active ?? employee.status !== "Inactive",
});

export const hydrateEmployees = async (firmCode) => {
  try {
    const response = await api.get("/employees", {
      params: firmCode ? { firmCode } : {},
    });
    employees = Array.isArray(response.data) ? response.data.map(mapEmployee) : [];
    return employees;
  } catch (error) {
    console.error("Failed to load employees from backend", error);
    employees = [];
    return [];
  }
};

export const getEmployees = () => employees;

export const getEmployeeById = (id) =>
  employees.find((employee) => employee.id === id || employee.employeeCode === id);

export const toEmployeePayload = (employee, target = {}) => ({
    employeeCode: employee.employeeCode || employee.id || target.employeeCode || target.id,
    name: employee.name ?? target.name,
    firstName: employee.firstName ?? target.firstName ?? "",
    lastName: employee.lastName ?? target.lastName ?? "",
    gender: employee.gender ?? target.gender ?? "",
    dateOfBirth: employee.dateOfBirth ?? target.dateOfBirth ?? null,
    employmentType: employee.employmentType ?? target.employmentType ?? "",
    address: employee.address ?? target.address ?? "",
    firmId: employee.firmId ?? target.firmId,
    departmentId: employee.departmentId ?? target.departmentId ?? null,
    department: employee.department ?? target.department ?? "",
    designation: employee.designation ?? target.designation ?? "",
    contact: employee.contact ?? target.contact ?? "",
    email: employee.email ?? target.email ?? "",
    joiningDate: employee.joiningDate ?? target.joiningDate ?? null,
    wageType: employee.wageType ?? target.wageType ?? "Monthly",
    monthlySalary: employee.monthlySalary ?? target.monthlySalary ?? 0,
    paymentMode: employee.paymentMode ?? target.paymentMode ?? "Bank",
    shiftLength: employee.shiftLength ?? target.shiftLength ?? 8,
    otStartsAfter: employee.otStartsAfter ?? target.otStartsAfter ?? 8,
    otRate: employee.otRate ?? target.otRate ?? 0,
    accountNumber: employee.accountNumber ?? target.accountNumber ?? "",
    ifscCode: employee.ifscCode ?? target.ifscCode ?? "",
    bankName: employee.bankName ?? target.bankName ?? "",
    pfAccountNumber: employee.pfAccountNumber ?? target.pfAccountNumber ?? "",
    esiAccountNumber: employee.esiAccountNumber ?? target.esiAccountNumber ?? "",
    aadharNumber: employee.aadharNumber ?? target.aadharNumber ?? "",
    panNumber: employee.panNumber ?? target.panNumber ?? "",
    statutorySchemes: employee.statutorySchemes ?? target.statutorySchemes ?? "",
    active: employee.active ?? target.active ?? employee.status !== "Inactive",
    status: employee.status ?? target.status ?? (employee.active === false ? "Inactive" : "Active"),
});

const toDocumentFormData = (payload, documents = {}) => {
  const formData = new FormData();
  formData.append("employee", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  if (documents.aadharDocument) formData.append("aadharDocument", documents.aadharDocument);
  if (documents.panDocument) formData.append("panDocument", documents.panDocument);
  return formData;
};

export const addEmployee = async (employee, documents) => {
  const payload = toEmployeePayload(employee);
  const response = await api.post("/employees/with-documents", toDocumentFormData(payload, documents));
  await hydrateEmployees();
  return response.data;
};

export const updateEmployee = async (id, updates, documents) => {
  const target = getEmployeeById(id);
  if (!target) {
    throw new Error("Employee not found. Refresh the page and try again.");
  }

  const payload = toEmployeePayload(updates, target);
  await api.put(`/employees/code/${encodeURIComponent(target.employeeCode || id)}/with-documents`, toDocumentFormData(payload, documents));
  await hydrateEmployees();
};

export const updateEmployeeStatus = async (id, active) => {
  const target = getEmployeeById(id);

  if (!target) {
    throw new Error("Employee not found");
  }

  const response = await api.put(
    `/employees/code/${encodeURIComponent(
      target.employeeCode || id
    )}/status`,
    null,
    {
      params: {
        active,
      },
    }
  );

  await hydrateEmployees();

  return response.data;
};

export const downloadEmployeeDocument = async (employeeCode, documentType, fileName) => {
  const response = await api.get(`/employees/code/${encodeURIComponent(employeeCode)}/documents/${documentType}`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || `${documentType}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
