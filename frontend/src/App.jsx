
import { useEffect, useRef, useState } from "react";
import Billing from "./Billing";

import api from "./api";


import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  FileText,
  Pill,
  Receipt,
  Settings,
  Search,
  RefreshCw,
  Bell,
  Menu,
  Activity,
  Clock,
  CheckCircle2,
  LogOut,
  Plus,
  Package,
  AlertTriangle
} from "lucide-react";
import "./App.css";
import Login from "./Login";
import Doctors from "./Doctors";

import AppointmentForm from "./AppointmentForm";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Patients", icon: Users },
  { label: "Appointments", icon: CalendarDays },
  { label: "Doctors", icon: Stethoscope },
  { label: "Medical Records", icon: FileText },
  { label: "Medicines", icon: Pill },
  { label: "Billing", icon: Receipt },
  { label: "Settings", icon: Settings }
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const pageHistory = useRef(["Dashboard"]);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) return null;

    try {
      return { token, user: JSON.parse(user) };
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }
  });

  const [patients, setPatients] = useState([]);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientSaving, setPatientSaving] = useState(false);
  const [patientMessage, setPatientMessage] = useState("");
  const [patientError, setPatientError] = useState("");
  const [patientForm, setPatientForm] = useState({
    name: "",
    dob: "",
    gender: "",
    phone: "",
    bloodGroup: "",
    address: ""
  });
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [doctorsData, setDoctorsData] = useState([]);
  const [billsData, setBillsData] = useState([]);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  const user = session?.user;
  const role = user?.role || "";

  function navigateToPage(page) {
    if (!page || page === activePage) {
      setSidebarOpen(false);
      return;
    }
    pageHistory.current.push(page);
    window.history.pushState({ hmsPage: page }, "", window.location.href);
    setActivePage(page);
    setShowAppointmentForm(false);
    setSidebarOpen(false);
  }

  useEffect(() => {
    if (!session) return undefined;
    window.history.pushState({ hmsPage: activePage || "Dashboard" }, "", window.location.href);
    const handleBrowserBack = () => {
      if (pageHistory.current.length > 1) {
        pageHistory.current.pop();
        const previousPage = pageHistory.current[pageHistory.current.length - 1] || "Dashboard";
        setActivePage(previousPage);
        setShowAppointmentForm(false);
        setSidebarOpen(false);
      }
      window.history.pushState({ hmsPage: pageHistory.current[pageHistory.current.length - 1] || "Dashboard" }, "", window.location.href);
    };
    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, [session]);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function loadDashboardData() {
      setDataLoading(true);
      setDataError("");

      try {
        if (role === "ADMIN" || role === "RECEPTIONIST" || role === "DOCTOR") {
          const [patientsResult, appointmentsResult, doctorsResult, billsResult] = await Promise.allSettled([
            api.get("/patients"),
            api.get("/appointments?limit=100"),
            api.get("/doctors"),
            api.get("/bills")
          ]);

          if (cancelled) return;

          if (patientsResult.status === "fulfilled") {
            setPatients(patientsResult.value.data);
          }

          if (appointmentsResult.status === "fulfilled") {
            const appointmentResponse = appointmentsResult.value.data;
            setAppointmentsData(Array.isArray(appointmentResponse) ? appointmentResponse : appointmentResponse.data || []);
          }

          if (doctorsResult.status === "fulfilled") {
            const doctorsResponse = doctorsResult.value.data;
            setDoctorsData(Array.isArray(doctorsResponse) ? doctorsResponse : doctorsResponse.data || doctorsResponse.doctors || []);
          }

          if (billsResult.status === "fulfilled") {
            const billsResponse = billsResult.value.data;
            setBillsData(Array.isArray(billsResponse) ? billsResponse : billsResponse.data || billsResponse.bills || []);
          }

          const errors = [];

          if (patientsResult.status === "rejected") {
            errors.push(
              patientsResult.reason.response?.data?.message ||
              "Unable to load patients"
            );
          }

          if (appointmentsResult.status === "rejected") {
            errors.push(
              appointmentsResult.reason.response?.data?.message ||
              "Unable to load appointments"
            );
          }

          if (errors.length) setDataError(errors.join(". "));
        } else if (role === "PATIENT") {
          const result = await api.get("/appointments/me");

          if (cancelled) return;

          setAppointmentsData(result.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setDataError(
            error.response?.data?.message ||
            "Unable to load hospital data. Please refresh the page."
          );
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [session, role]);

  function handleLogin(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setSession(data);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setSession(null);
    setPatients([]);
    setAppointmentsData([]);
    setDoctorsData([]);
    setBillsData([]);
    pageHistory.current = ["Dashboard"];
    setActivePage("Dashboard");
    setSearch("");
  }

  async function handleAddPatient(event) {
    event.preventDefault();
    setPatientError("");
    setPatientMessage("");

    if (!patientForm.name.trim()) {
      setPatientError("Patient name is required.");
      return;
    }

    setPatientSaving(true);
    try {
      await api.post("/patients/staff-create", {
        ...patientForm,
        name: patientForm.name.trim(),
        dob: patientForm.dob || null,
        gender: patientForm.gender || null,
        phone: patientForm.phone.trim() || null,
        bloodGroup: patientForm.bloodGroup || null,
        address: patientForm.address.trim() || null
      });

      const response = await api.get("/patients");
      const data = Array.isArray(response.data) ? response.data : response.data?.patients || response.data?.data || [];
      setPatients(data);
      setPatientForm({ name: "", dob: "", gender: "", phone: "", bloodGroup: "", address: "" });
      setShowPatientForm(false);
      setPatientMessage("Patient added successfully.");
      setDataError("");
    } catch (error) {
      setPatientError(error.response?.data?.message || "Unable to add patient. Check your permissions and backend.");
    } finally {
      setPatientSaving(false);
    }
  }

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  const isStaff = ["ADMIN", "RECEPTIONIST", "DOCTOR"].includes(role);

  const filteredAppointments = appointmentsData.filter((appointment) => {
    const patientName =
      appointment.patient?.user?.fullName ||
      appointment.patient?.name ||
      user?.fullName ||
      "";

    const doctorName =
      appointment.doctor?.user?.fullName || "Not assigned";

    const reason = appointment.reason || "";

    return `${patientName} ${doctorName} ${reason}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const today = new Date().toISOString().slice(0, 10);

  const todayAppointments = appointmentsData.filter((appointment) => {
    const date = appointment.apptDate
      ? new Date(appointment.apptDate).toISOString().slice(0, 10)
      : "";

    return date === today;
  });

  const completedToday = todayAppointments.filter(
    (appointment) => appointment.status === "COMPLETED"
  ).length;

  const pendingToday = todayAppointments.filter(
    (appointment) => appointment.status === "SCHEDULED"
  ).length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthlyRevenue = billsData.reduce((total, bill) => {
    if (String(bill.paymentStatus || "").toUpperCase() !== "PAID" || !bill.paidOn) return total;
    const paidDate = new Date(bill.paidOn);
    if (Number.isNaN(paidDate.getTime()) || paidDate < monthStart || paidDate >= nextMonthStart) return total;
    return total + Number(bill.totalAmt ?? bill.totalAmount ?? 0);
  }, 0);

  const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);

  const displayName = user?.fullName || "User";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Activity size={19} />
          </div>
          <h2>MediCare</h2>
        </div>

        <nav className={`main-nav ${sidebarOpen ? "open" : ""}`} aria-label="Main navigation">
          {menuItems
            .filter(({ label }) => {
              if (label === "Settings") return role === "ADMIN";

              if (role === "PATIENT") {
                return ["Dashboard", "Appointments", "Medical Records"].includes(label);
              }

              return true;
            })
            .map(({ label }) => (
              <button
                key={label}
                className={`nav-item ${activePage === label ? "active" : ""}`}
                onClick={() => navigateToPage(label)}
              >
                <i className="nav-dot" />
                <span>{label}</span>
              </button>
            ))}
        </nav>

        <div className="topbar-right">
          <button
            className="notification icon-button"
            aria-label="Notifications"
            title="View appointments"
            onClick={() => navigateToPage("Appointments")}
          >
            <Bell size={19} />
            <i />
          </button>
          <button
            type="button"
            className="avatar admin-avatar"
            aria-label="Open account settings"
            title="Account settings"
            onClick={() => navigateToPage("Settings")}
          >
            {initials || "U"}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Log out"
            title="Log out"
            onClick={handleLogout}
          >
            <LogOut size={18} />
          </button>
          <button
            className="icon-button menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
            aria-expanded={sidebarOpen}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <main className="main-area">

        <section className="content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>

              <h1>
                {activePage === "Dashboard"
                  ? `${greeting}, ${displayName}`
                  : activePage}
              </h1>

              <p className="subtitle">
                {activePage === "Dashboard"
                  ? "Here's what's happening at your hospital today."
                  : `Manage your hospital's ${activePage.toLowerCase()} in one place.`}
              </p>
            </div>

            {activePage === "Appointments" && ['ADMIN', 'RECEPTIONIST'].includes(role) && (
              <button
                className="primary-button"
                onClick={() => setShowAppointmentForm(true)}
              >
                + New Appointment
              </button>
            )}
          </div>

          {showAppointmentForm && activePage === "Appointments" && ['ADMIN', 'RECEPTIONIST'].includes(role) && (
            <AppointmentForm
              role={role}
              onClose={() => setShowAppointmentForm(false)}
              onBooked={async () => {
                const response = await api.get("/appointments?limit=100");
                setAppointmentsData(response.data.data || []);
                setShowAppointmentForm(false);
                setDataError("");
              }}
            />
          )}

          {dataError && (
            <div className="dashboard-error" role="alert">
              {dataError}
            </div>
          )}

          {activePage === "Dashboard" && (
            <>
              <div className="stats-grid">
                <StatCard
                  icon={Users}
                  label="Total Patients"
                  value={
                    dataLoading
                      ? "..."
                      : isStaff
                      ? patients.length.toLocaleString("en-IN")
                      : "—"
                  }
                  change="Database records"
                  color="blue"
                />

                <StatCard
                  icon={CalendarDays}
                  label="Appointments Today"
                  value={dataLoading ? "..." : todayAppointments.length}
                  change="Today's records"
                  color="purple"
                />

                <StatCard
                  icon={Stethoscope}
                  label="Total Doctors"
                  value={dataLoading ? "..." : doctorsData.length.toLocaleString("en-IN")}
                  change="Registered doctors"
                  color="green"
                />

                <StatCard
                  icon={Receipt}
                  label="Revenue This Month"
                  value={dataLoading ? "..." : formatCurrency(monthlyRevenue)}
                  change="Paid bills this month"
                  color="orange"
                />
              </div>

              <div className="section-grid">
                <section className="panel appointments-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Recent Appointments</h2>
                      <p>Appointments from your hospital database</p>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => navigateToPage("Appointments")}
                    >
                      View all →
                    </button>
                  </div>

                  <div className="table-toolbar">
                    <div className="search-box">
                      <Search size={17} />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search patient or doctor..."
                      />
                    </div>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Doctor</th>
                          <th>Date / Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {dataLoading && (
                          <tr>
                            <td colSpan="4">Loading appointments...</td>
                          </tr>
                        )}

                        {!dataLoading && filteredAppointments.map((appointment) => {
                          const patientName =
                            appointment.patient?.user?.fullName ||
                            appointment.patient?.name ||
                            (role === "PATIENT" ? displayName : "Patient");

                          const doctorName =
                            appointment.doctor?.user?.fullName || "Not assigned";

                          const date = appointment.apptDate
                            ? new Date(appointment.apptDate).toLocaleDateString("en-IN")
                            : "—";

                          const time = appointment.apptTime
                            ? new Date(appointment.apptTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "UTC"
                              })
                            : "";

                          return (
                            <tr key={appointment.appointmentId}>
                              <td>
                                <strong>{patientName}</strong>
                                <span className="cell-subtitle">
                                  {appointment.reason || "Consultation"}
                                </span>
                              </td>
                              <td>{doctorName}</td>
                              <td>{date} {time}</td>
                              <td>
                                <span
                                  className={`status ${String(appointment.status || "").toLowerCase()}`}
                                >
                                  {appointment.status || "Unknown"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        {!dataLoading && !dataError && filteredAppointments.length === 0 && (
                          <tr>
                            <td colSpan="4">No appointments found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="panel overview-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Today's Overview</h2>
                      <p>Hospital activity summary</p>
                    </div>
                  </div>

                  <div className="overview-item">
                    <div className="overview-icon blue-bg">
                      <Users size={19} />
                    </div>
                    <div className="overview-copy">
                      <strong>Total Patients</strong>
                      <span>Database records</span>
                    </div>
                    <b>{dataLoading || !isStaff ? "—" : patients.length}</b>
                  </div>

                  <div className="overview-item">
                    <div className="overview-icon purple-bg">
                      <Clock size={19} />
                    </div>
                    <div className="overview-copy">
                      <strong>Pending Appointments</strong>
                      <span>Scheduled today</span>
                    </div>
                    <b>{dataLoading ? "—" : pendingToday}</b>
                  </div>

                  <div className="overview-item">
                    <div className="overview-icon green-bg">
                      <CheckCircle2 size={19} />
                    </div>
                    <div className="overview-copy">
                      <strong>Completed Visits</strong>
                      <span>Completed today</span>
                    </div>
                    <b>{dataLoading ? "—" : completedToday}</b>
                  </div>

                  <div className="overview-footer">
                    <Activity size={17} />
                    <span>Live database summary</span>
                  </div>
                </section>
              </div>
            </>
          )}

          {activePage !== "Dashboard" &&
            activePage !== "Doctors" &&
            activePage !== "Medical Records" &&
            activePage !== "Billing" &&
            activePage !== "Medicines" &&
            activePage !== "Settings" && (
            <section className="panel appointments-panel">
              <div className="panel-header">
                <div>
                  <h2>{activePage}</h2>
                  <p>
                    {activePage === "Patients"
  ? "Patient records from the hospital database"
  : activePage === "Appointments"
  ? "Appointment records from the hospital database"
  : activePage === "Billing"
  ? "Invoices and payments from your hospital database"
  : "This section will be connected next"}
                  </p>
                </div>
              </div>

              {activePage === "Patients" && isStaff && (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "0 20px 20px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={dataLoading}
                      onClick={async () => {
                        setDataError("");
                        try {
                          const response = await api.get("/patients");
                          const data = Array.isArray(response.data) ? response.data : response.data?.patients || response.data?.data || [];
                          setPatients(data);
                        } catch (error) {
                          setDataError(error.response?.data?.message || "Unable to refresh patients.");
                        }
                      }}
                    >
                      <RefreshCw size={16} /> Refresh
                    </button>
                    {["ADMIN", "RECEPTIONIST"].includes(role) && (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => {
                          setShowPatientForm((visible) => !visible);
                          setPatientError("");
                          setPatientMessage("");
                        }}
                      >
                        <Plus size={16} /> {showPatientForm ? "Close Form" : "Add Patient"}
                      </button>
                    )}
                  </div>

                  {patientError && <div className="dashboard-error" role="alert" style={{ margin: "0 20px 16px" }}>{patientError}</div>}
                  {patientMessage && <p role="status" style={{ margin: "0 20px 16px", color: "#059669" }}>{patientMessage}</p>}

                  {showPatientForm && ["ADMIN", "RECEPTIONIST"].includes(role) && (
                    <form
                      onSubmit={handleAddPatient}
                      style={{
                        padding: 20,
                        margin: "0 20px 24px",
                        border: "1px solid var(--border-color, #333)",
                        borderRadius: 12,
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 16
                      }}
                    >
                      <label style={{ display: "grid", gap: 6 }}>
                        Full name *
                        <input value={patientForm.name} onChange={(event) => setPatientForm({ ...patientForm, name: event.target.value })} maxLength={100} required placeholder="Patient full name" />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        Date of birth
                        <input type="date" value={patientForm.dob} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setPatientForm({ ...patientForm, dob: event.target.value })} />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        Gender
                        <select value={patientForm.gender} onChange={(event) => setPatientForm({ ...patientForm, gender: event.target.value })}>
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        Phone
                        <input type="tel" value={patientForm.phone} onChange={(event) => setPatientForm({ ...patientForm, phone: event.target.value })} maxLength={20} placeholder="Phone number" />
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        Blood group
                        <select value={patientForm.bloodGroup} onChange={(event) => setPatientForm({ ...patientForm, bloodGroup: event.target.value })}>
                          <option value="">Select blood group</option>
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => <option key={group} value={group}>{group}</option>)}
                        </select>
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        Address
                        <input value={patientForm.address} onChange={(event) => setPatientForm({ ...patientForm, address: event.target.value })} maxLength={255} placeholder="Address (optional)" />
                      </label>
                      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="primary-button" type="submit" disabled={patientSaving}>
                          {patientSaving ? "Saving..." : "Save Patient"}
                        </button>
                        <button className="secondary-button" type="button" onClick={() => setShowPatientForm(false)} disabled={patientSaving}>Cancel</button>
                      </div>
                    </form>
                  )}

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Patient</th>
                          <th>Gender</th>
                          <th>Phone</th>
                          <th>Blood Group</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataLoading && <tr><td colSpan="5">Loading patients...</td></tr>}
                        {!dataLoading && patients.map((patient) => (
                          <tr key={patient.patientId}>
                            <td>{patient.patientId}</td>
                            <td><strong>{patient.name}</strong></td>
                            <td>{patient.gender || "—"}</td>
                            <td>{patient.phone || "—"}</td>
                            <td>{patient.bloodGroup || "—"}</td>
                          </tr>
                        ))}
                        {!dataLoading && !dataError && patients.length === 0 && <tr><td colSpan="5">No patient records found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {activePage === "Appointments" && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataLoading && (
                        <tr><td colSpan="6">Loading appointments...</td></tr>
                      )}

                      {!dataLoading && filteredAppointments.map((appointment) => (
                        <tr key={appointment.appointmentId}>
                          <td>{appointment.appointmentId}</td>
                          <td>
                            {appointment.patient?.user?.fullName ||
                              appointment.patient?.name ||
                              displayName}
                          </td>
                          <td>{appointment.doctor?.user?.fullName || "Not assigned"}</td>
                          <td>
                            {appointment.apptDate
                              ? new Date(appointment.apptDate).toLocaleDateString("en-IN")
                              : "—"}
                          </td>
                          <td>
                            {appointment.apptTime
                              ? new Date(appointment.apptTime).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "UTC"
                                })
                              : "—"}
                          </td>
                          <td>
                            <span className={`status ${String(appointment.status || "").toLowerCase()}`}>
                              {appointment.status || "Unknown"}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {!dataLoading && !dataError && filteredAppointments.length === 0 && (
                        <tr><td colSpan="6">No appointments found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}


            </section>
          )}

          {activePage === "Doctors" && <Doctors />}
          {activePage === "Medical Records" && <MedicalRecords role={role} />}
          {activePage === "Billing" && <Billing />}
          {activePage === "Medicines" && <Medicines role={role} />}
          {activePage === "Settings" && role === "ADMIN" && (
            <section className="panel appointments-panel">
              <div className="panel-header">
                <div>
                  <h2>Settings</h2>
                  <p>Your signed-in account details and session controls.</p>
                </div>
              </div>
              <div className="settings-content">
                <div className="settings-profile">
                  <div className="settings-avatar">{initials || "U"}</div>
                  <div>
                    <h3>{displayName}</h3>
                    <p>{user?.email || "Not available"}</p>
                    <span className="settings-role">{role}</span>
                  </div>
                </div>
                <div className="settings-details">
                  <div className="settings-detail">
                    <span>Full name</span>
                    <strong>{displayName}</strong>
                  </div>
                  <div className="settings-detail">
                    <span>Email address</span>
                    <strong>{user?.email || "Not available"}</strong>
                  </div>
                  <div className="settings-detail">
                    <span>Account role</span>
                    <strong>{role}</strong>
                  </div>
                  <div className="settings-detail">
                    <span>Session status</span>
                    <strong className="session-active"><i /> Signed in</strong>
                  </div>
                </div>
                <div className="settings-actions">
                  <div>
                    <strong>Sign out of MediCare</strong>
                    <p>End your current administrator session on this device.</p>
                  </div>
                  <button className="secondary-button settings-logout" onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </div>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}


function Medicines({ role }) {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ medicineName: "", unitPrice: "", stockQty: "" });

  async function loadMedicines() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/medicines");
      const data = Array.isArray(response.data) ? response.data : response.data?.medicines || response.data?.data || [];
      setMedicines(data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load medicines. Check your login permissions and backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMedicines(); }, []);

  const filtered = medicines.filter((medicine) =>
    String(medicine.medicineName || "").toLowerCase().includes(search.toLowerCase())
  );
  const lowStock = medicines.filter((medicine) => Number(medicine.stockQty) <= 10).length;
  const inventoryValue = medicines.reduce((sum, medicine) => sum + Number(medicine.unitPrice || 0) * Number(medicine.stockQty || 0), 0);
  const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));

  async function addMedicine(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!form.medicineName.trim() || form.unitPrice === "" || form.stockQty === "") {
      setError("Fill in the medicine name, unit price, and stock quantity.");
      return;
    }
    if (!Number.isFinite(Number(form.unitPrice)) || Number(form.unitPrice) < 0 || !Number.isInteger(Number(form.stockQty)) || Number(form.stockQty) < 0) {
      setError("Price must be a non-negative number and stock must be a non-negative whole number.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/medicines", {
        medicineName: form.medicineName.trim(),
        unitPrice: Number(form.unitPrice),
        stockQty: Number(form.stockQty)
      });
      setForm({ medicineName: "", unitPrice: "", stockQty: "" });
      setShowForm(false);
      setMessage("Medicine added successfully.");
      await loadMedicines();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add medicine. Only administrators can add medicines.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel appointments-panel medicines-panel">
      <div className="panel-header medicine-panel-header">
        <div><h2>Medicine Inventory</h2><p>Inventory records from your hospital database</p></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="secondary-button" onClick={loadMedicines} disabled={loading}><RefreshCw size={16} /> Refresh</button>
          {role === "ADMIN" && <button type="button" className="primary-button" onClick={() => { setShowForm(!showForm); setMessage(""); }}><Plus size={16} /> Add Medicine</button>}
        </div>
      </div>
      {error && <div className="dashboard-error" role="alert" style={{ margin: 16 }}>{error}</div>}
      {message && <p role="status" style={{ margin: "12px 20px", color: "#059669" }}>{message}</p>}
      {showForm && role === "ADMIN" && (
        <form className="medicine-form" onSubmit={addMedicine}>
          <label style={{ display: "grid", gap: 6 }}>Medicine name<input value={form.medicineName} onChange={(e) => setForm({ ...form, medicineName: e.target.value })} maxLength={150} required placeholder="e.g. Paracetamol" /></label>
          <label style={{ display: "grid", gap: 6 }}>Unit price (₹)<input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required placeholder="0.00" /></label>
          <label style={{ display: "grid", gap: 6 }}>Stock quantity<input type="number" min="0" step="1" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} required placeholder="0" /></label>
          <div style={{ display: "flex", gap: 8, alignItems: "end" }}><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Medicine"}</button><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        </form>
      )}
      <div className="medicine-stats">
        <div className="overview-item medicine-stat"><Package size={20} /><div className="overview-copy"><strong>Total medicines</strong><span>Inventory items</span></div><b>{medicines.length}</b></div>
        <div className="overview-item medicine-stat"><AlertTriangle size={20} /><div className="overview-copy"><strong>Low stock</strong><span>10 units or fewer</span></div><b>{lowStock}</b></div>
        <div className="overview-item medicine-stat"><Receipt size={20} /><div className="overview-copy"><strong>Stock value</strong><span>Price × quantity</span></div><b>{money(inventoryValue)}</b></div>
      </div>
      <div className="table-toolbar medicine-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicine name..." /></div></div>
      <div className="table-wrapper"><table><thead><tr><th>ID</th><th>Medicine</th><th>Unit price</th><th>Stock quantity</th><th>Stock status</th></tr></thead><tbody>
        {loading && <tr><td colSpan="5">Loading medicines...</td></tr>}
        {!loading && filtered.map((medicine) => <tr key={medicine.medicineId}><td>{medicine.medicineId}</td><td><strong>{medicine.medicineName}</strong></td><td>{money(medicine.unitPrice)}</td><td>{medicine.stockQty}</td><td><span className={`status ${Number(medicine.stockQty) <= 10 ? "cancelled" : "completed"}`}>{Number(medicine.stockQty) <= 0 ? "OUT OF STOCK" : Number(medicine.stockQty) <= 10 ? "LOW STOCK" : "IN STOCK"}</span></td></tr>)}
        {!loading && !error && filtered.length === 0 && <tr><td colSpan="5">{search ? "No medicines match your search." : "No medicines found in the database."}</td></tr>}
      </tbody></table></div>
    </section>
  );
}


function MedicalRecords({ role }) {
  const [recordId, setRecordId] = useState("");
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function findRecord(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setRecord(null);

    const id = Number(recordId);
    if (!Number.isInteger(id) || id <= 0) {
      setError("Enter a valid medical record ID.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/medical-records/${id}`);
      const result = response.data?.record || response.data;
      setRecord(result);
      setMessage("Medical record loaded successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to fetch this medical record. Check the ID and your permissions."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel appointments-panel">
      <div className="panel-header">
        <div>
          <h2>Medical Records</h2>
          <p>Search for a medical record using its record ID.</p>
        </div>
      </div>

      <form onSubmit={findRecord} style={{ padding: "20px" }}>
        <label htmlFor="medical-record-id" style={{ display: "block", marginBottom: 8 }}>
          Medical Record ID
        </label>
        <div className="search-box" style={{ maxWidth: 420 }}>
          <Search size={17} />
          <input
            id="medical-record-id"
            type="number"
            min="1"
            value={recordId}
            onChange={(event) => setRecordId(event.target.value)}
            placeholder="Enter record ID, e.g. 1"
            required
          />
        </div>
        <button className="primary-button" type="submit" disabled={loading} style={{ marginTop: 14 }}>
          <RefreshCw size={16} /> {loading ? "Searching..." : "Find Record"}
        </button>
      </form>

      {error && <div className="dashboard-error" role="alert">{error}</div>}
      {message && <p style={{ padding: "0 20px", color: "#16805d" }}>{message}</p>}

      {record && (
        <div className="table-wrapper" style={{ padding: "0 20px 20px" }}>
          <table>
            <tbody>
              <tr><th>Record ID</th><td>{record.recordId ?? record.id ?? "—"}</td></tr>
              <tr><th>Appointment ID</th><td>{record.appointmentId ?? "—"}</td></tr>
              <tr><th>Diagnosis</th><td>{record.diagnosis || "—"}</td></tr>
              <tr><th>Notes</th><td>{record.notes || "—"}</td></tr>
              <tr><th>Created At</th><td>{record.createdAt ? new Date(record.createdAt).toLocaleString("en-IN") : "—"}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {!record && !loading && !error && (
        <div className="empty-section">
          <FileText size={30} />
          <h3>Find a medical record</h3>
          <p>Enter an existing record ID above to view its diagnosis and notes.</p>
        </div>
      )}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, change, color }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon size={21} />
      </div>
      <p>{label}</p>
      <div className="stat-bottom">
        <h2>{value}</h2>
        <span className={`change ${color}`}>{change}</span>
      </div>
    </article>
  );
}

export default App;
