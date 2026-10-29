
import { useState } from "react";
import api from "./api";

export default function AppointmentForm({ onClose, onBooked, role }) {
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("10:00");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const isStaff = ["ADMIN", "RECEPTIONIST"].includes(role);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (isStaff && !patientId) {
      setMessage("Enter the patient ID.");
      setIsError(true);
      return;
    }

    if (!doctorId || !apptDate || !apptTime) {
      setMessage("Please complete the doctor, date and time fields.");
      setIsError(true);
      return;
    }

    if (apptDate < new Date().toISOString().slice(0, 10)) {
      setMessage("Choose today or a future date.");
      setIsError(true);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        doctorId: Number(doctorId),
        apptDate,
        apptTime,
        reason: reason.trim()
      };

      let response;

      if (isStaff) {
        response = await api.post("/appointments/staff-book", {
          ...payload,
          patientId: Number(patientId)
        });
      } else {
        response = await api.post("/appointments", payload);
      }

      setMessage(response.data.message || "Appointment booked successfully.");

      if (onBooked) {
        await onBooked();
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error.response?.data?.message ||
        "Unable to book the appointment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel appointment-form-panel">
      <div className="panel-header">
        <div>
          <h2>New Appointment</h2>
          <p>Enter the appointment details below.</p>
        </div>
        <button type="button" className="text-button" onClick={onClose}>
          Close
        </button>
      </div>

      <form className="appointment-form" onSubmit={handleSubmit}>
        {isStaff && (
          <label>
            Patient ID
            <input
              type="number"
              min="1"
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              placeholder="Enter patient ID"
              required
            />
          </label>
        )}

        <label>
          Doctor ID
          <input
            type="number"
            min="1"
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
            placeholder="Enter doctor ID"
            required
          />
        </label>

        <label>
          Appointment date
          <input
            type="date"
            value={apptDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setApptDate(event.target.value)}
            required
          />
        </label>

        <label>
          Appointment time
          <input
            type="time"
            value={apptTime}
            onChange={(event) => setApptTime(event.target.value)}
            required
          />
        </label>

        <label>
          Reason for visit
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for appointment"
            rows="3"
          />
        </label>

        {message && (
          <p role="status" className={isError ? "form-error" : "form-success"}>
            {message}
          </p>
        )}

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Booking..." : "Book Appointment"}
        </button>
      </form>
    </section>
  );
}
