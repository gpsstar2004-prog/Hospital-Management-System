import { useEffect, useState } from "react";
import api from "./api";
import { Search, Stethoscope, RefreshCw, Plus, X } from "lucide-react";

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  deptId: "",
  specialization: "",
  licenseNo: "",
  consultationFee: ""
};

function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  const fetchDoctors = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/doctors");
      setDoctors(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load doctors. Please sign in again if your session expired.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/doctors/departments");
      setDepartments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to load departments.");
    }
  };

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      setIsAdmin(user?.role === "ADMIN");
    } catch {
      setIsAdmin(false);
    }
    fetchDoctors();
    fetchDepartments();
  }, []);

  const filteredDoctors = doctors.filter((doctor) => {
    const text = [doctor.user?.fullName, doctor.user?.email, doctor.specialization, doctor.licenseNo, doctor.department?.deptName]
      .filter(Boolean).join(" ").toLowerCase();
    return text.includes(search.toLowerCase());
  });

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleAddDoctor(event) {
    event.preventDefault();
    setFormError("");
    setMessage("");
    if (form.password.length < 8) {
      setFormError("The temporary password must contain at least 8 characters.");
      return;
    }
    if (!departments.length) {
      setFormError("There are no departments in the database. Add a department before adding a doctor.");
      return;
    }

    setSaving(true);
    try {
      const response = await api.post("/doctors", {
        ...form,
        deptId: Number(form.deptId),
        consultationFee: Number(form.consultationFee)
      });
      setMessage(response.data?.message || "Doctor added successfully.");
      setForm(emptyForm);
      setShowForm(false);
      await fetchDoctors();
    } catch (err) {
      setFormError(err.response?.data?.message || "Unable to add doctor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel" style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        <div>
          <h2>Doctors</h2>
          <p>Doctor records from your hospital database</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button type="button" className="secondary-button" onClick={fetchDoctors} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
          {isAdmin && (
            <button type="button" className="primary-button" onClick={() => { setShowForm((value) => !value); setFormError(""); setMessage(""); }}>
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? "Cancel" : "Add Doctor"}
            </button>
          )}
        </div>
      </div>

      {message && <p className="form-success" style={{ marginBottom: "18px" }}>{message}</p>}

      {showForm && isAdmin && (
        <div className="appointment-form-panel doctor-create-panel">
          <div className="panel-header">
            <div>
              <h2>Add a doctor</h2>
              <p>This creates a doctor login and links it to a department.</p>
            </div>
          </div>
          <form className="appointment-form" onSubmit={handleAddDoctor}>
            <label>Full name<input name="fullName" value={form.fullName} onChange={updateForm} autoComplete="name" maxLength={100} required /></label>
            <label>Email address<input name="email" type="email" value={form.email} onChange={updateForm} autoComplete="email" required /></label>
            <label>Temporary password<input name="password" type="password" value={form.password} onChange={updateForm} minLength={8} autoComplete="new-password" required /></label>
            <label>Department<select name="deptId" value={form.deptId} onChange={updateForm} required>
              <option value="">Select department</option>
              {departments.map((department) => <option key={department.deptId} value={department.deptId}>{department.deptName}</option>)}
            </select></label>
            <label>Specialization<input name="specialization" value={form.specialization} onChange={updateForm} maxLength={100} placeholder="e.g. Cardiology" required /></label>
            <label>Medical license number<input name="licenseNo" value={form.licenseNo} onChange={updateForm} maxLength={100} required /></label>
            <label>Consultation fee (₹)<input name="consultationFee" type="number" min="0" step="0.01" value={form.consultationFee} onChange={updateForm} required /></label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            {!departments.length && !formError && <p className="form-error">No departments are configured yet. Please add departments in the database first.</p>}
            <button className="primary-button" type="submit" disabled={saving || !departments.length}>
              {saving ? "Adding doctor..." : "Save Doctor"}
            </button>
          </form>
        </div>
      )}

      <div className="search-box" style={{ marginBottom: "20px" }}>
        <Search size={18} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search doctor, specialization or department..." />
      </div>

      {loading ? <p>Loading doctors...</p> : error ? (
        <div><p style={{ color: "crimson" }}>{error}</p><button className="primary-button" onClick={fetchDoctors}>Try again</button></div>
      ) : filteredDoctors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 10px" }}>
          <Stethoscope size={32} />
          <h3>No doctors found</h3>
          <p>{doctors.length === 0 ? "No doctor records are available in the database." : "Try a different search."}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>ID</th><th>Doctor</th><th>Specialization</th><th>Department</th><th>License</th><th>Consultation Fee</th></tr></thead>
            <tbody>{filteredDoctors.map((doctor) => (
              <tr key={doctor.doctorId}>
                <td>{doctor.doctorId}</td>
                <td><strong>{doctor.user?.fullName || "Unnamed doctor"}</strong><span className="cell-subtitle">{doctor.user?.email || "No email"}</span></td>
                <td>{doctor.specialization || "—"}</td>
                <td>{doctor.department?.deptName || "—"}</td>
                <td>{doctor.licenseNo || "—"}</td>
                <td>{doctor.consultationFee != null ? `₹${doctor.consultationFee}` : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p style={{ marginTop: "16px" }}>Total doctors: <strong>{filteredDoctors.length}</strong></p>
    </section>
  );
}

export default Doctors;
