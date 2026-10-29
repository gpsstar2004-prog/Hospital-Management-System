
import { useEffect, useState } from "react";
import api from "./api";
import { Search, Stethoscope, RefreshCw } from "lucide-react";

function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDoctors = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response = await api.get("/doctors", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setDoctors(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load doctors. Please sign in again if your session expired."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const filteredDoctors = doctors.filter((doctor) => {
    const text = [
      doctor.user?.fullName,
      doctor.user?.email,
      doctor.specialization,
      doctor.licenseNo,
      doctor.department?.deptName
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <section className="panel" style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "24px"
        }}
      >
        <div>
          <h2>Doctors</h2>
          <p>Doctor records from your hospital database</p>
        </div>

        <button className="primary-button" onClick={fetchDoctors}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="search-box" style={{ marginBottom: "20px" }}>
        <Search size={18} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search doctor, specialization or department..."
        />
      </div>

      {loading ? (
        <p>Loading doctors...</p>
      ) : error ? (
        <div>
          <p style={{ color: "crimson" }}>{error}</p>
          <button className="primary-button" onClick={fetchDoctors}>
            Try again
          </button>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 10px" }}>
          <Stethoscope size={32} />
          <h3>No doctors found</h3>
          <p>
            {doctors.length === 0
              ? "No doctor records are available in the database."
              : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Doctor</th>
                <th>Specialization</th>
                <th>Department</th>
                <th>License</th>
                <th>Consultation Fee</th>
              </tr>
            </thead>

            <tbody>
              {filteredDoctors.map((doctor) => (
                <tr key={doctor.doctorId}>
                  <td>{doctor.doctorId}</td>
                  <td>
                    <strong>
                      {doctor.user?.fullName || "Unnamed doctor"}
                    </strong>
                    <span className="cell-subtitle">
                      {doctor.user?.email || "No email"}
                    </span>
                  </td>
                  <td>{doctor.specialization || "—"}</td>
                  <td>{doctor.department?.deptName || "—"}</td>
                  <td>{doctor.licenseNo || "—"}</td>
                  <td>
                    {doctor.consultationFee != null
                      ? `₹${doctor.consultationFee}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "16px" }}>
        Total doctors: <strong>{filteredDoctors.length}</strong>
      </p>
    </section>
  );
}

export default Doctors;
