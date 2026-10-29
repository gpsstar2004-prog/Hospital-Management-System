
import { useEffect, useState } from "react";
import api from "./api";
import { FileText, RefreshCw, Search } from "lucide-react";

function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRecords() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/medical-records");
      const data = response.data;

      setRecords(Array.isArray(data) ? data : data.records || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load medical records. Check the backend route and your permissions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = records.filter((record) =>
    [
      record.diagnosis,
      record.notes,
      record.recordId,
      record.appointmentId
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <section className="panel appointments-panel">
      <div className="panel-header">
        <div>
          <h2>Medical Records</h2>
          <p>Patient diagnoses and treatment notes</p>
        </div>

        <button className="primary-button" onClick={loadRecords}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="table-toolbar">
        <div className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search diagnosis, notes or record ID..."
          />
        </div>
      </div>

      {loading ? (
        <p style={{ padding: 20 }}>Loading medical records...</p>
      ) : error ? (
        <div style={{ padding: 20 }}>
          <p style={{ color: "crimson" }}>{error}</p>
          <p>
            Your backend may expose individual record retrieval rather than
            a list endpoint. We can adjust this component to match your route.
          </p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="empty-section">
          <FileText size={30} />
          <h3>No medical records found</h3>
          <p>No records match your search or are available to this account.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Appointment ID</th>
                <th>Diagnosis</th>
                <th>Notes</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.recordId}>
                  <td>{record.recordId}</td>
                  <td>{record.appointmentId ?? "—"}</td>
                  <td>{record.diagnosis || "—"}</td>
                  <td>{record.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ padding: "0 20px 20px" }}>
        Total records: <strong>{filteredRecords.length}</strong>
      </p>
    </section>
  );
}

export default MedicalRecords;
