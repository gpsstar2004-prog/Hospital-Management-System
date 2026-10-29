
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReceiptText,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Wallet,
  FileText,
  Coins,
  CalendarDays,
  ChevronDown,
  IndianRupee
} from "lucide-react";
import api from "./api";
import "./Billing.css";

function Billing() {
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getToken = () => localStorage.getItem("token");

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/bills", {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = response.data;
      setBills(
        Array.isArray(data)
          ? data
          : Array.isArray(data.bills)
            ? data.bills
            : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load billing records. Please check your login and backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const markAsPaid = async (billId) => {
    setError("");
    setMessage("");
    setPayingId(billId);

    try {
      await api.patch(
        `/bills/${billId}/payment`,
        { paymentStatus: "PAID" },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      setBills((currentBills) =>
        currentBills.map((bill) =>
          bill.billId === billId
            ? {
                ...bill,
                paymentStatus: "PAID",
                paidOn: new Date().toISOString()
              }
            : bill
        )
      );

      setMessage(`Bill #${billId} marked as paid successfully.`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update payment status."
      );
    } finally {
      setPayingId(null);
    }
  };

  const formatAmount = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount ?? 0));

  const getTotal = (bill) =>
    Number(bill.totalAmt ?? bill.totalAmount ?? 0);

  const getPatientName = (bill) => {
    const patient = bill.appointment?.patient;

    return (
      patient?.user?.fullName ||
      patient?.name ||
      patient?.fullName ||
      "Patient"
    );
  };

  const getAppointmentDate = (bill) => {
    const date = bill.appointment?.apptDate;

    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const paidCount = bills.filter(
    (bill) => bill.paymentStatus === "PAID"
  ).length;

  const pendingCount = bills.filter(
    (bill) => bill.paymentStatus === "PENDING"
  ).length;

  const totalRevenue = bills
    .filter((bill) => bill.paymentStatus === "PAID")
    .reduce((sum, bill) => sum + getTotal(bill), 0);

  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bills.filter((bill) => {
      const patientName = getPatientName(bill);
      const status = String(bill.paymentStatus || "").toUpperCase();

      const matchesSearch = [
        bill.billId,
        bill.appointmentId,
        patientName,
        status
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  return (
    <div className="module-page billing-page">
      <section className="billing-hero">
        <div className="billing-hero-icon">
          <ReceiptText size={30} />
        </div>

        <div className="billing-hero-copy">
          <span className="billing-eyebrow">FINANCE WORKSPACE</span>
          <h1>Billing</h1>
          <p>
            Manage invoices, payments and billing records for your hospital.
          </p>
        </div>

        <div className="billing-hero-art">
          <FileText size={88} strokeWidth={1.1} />
          <span className="billing-rupee-icon">
            <IndianRupee size={25} />
          </span>
        </div>
      </section>

      {error && (
        <div className="billing-alert billing-alert-error">
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="billing-alert billing-alert-success">
          <CheckCircle2 size={19} />
          <span>{message}</span>
        </div>
      )}

      <section className="billing-stats">
        <article className="billing-stat-card">
          <div className="billing-stat-icon stat-blue">
            <FileText size={23} />
          </div>
          <div className="billing-stat-content">
            <span>Total Bills</span>
            <strong>{bills.length}</strong>
            <small>All generated invoices</small>
          </div>
        </article>

        <article className="billing-stat-card">
          <div className="billing-stat-icon stat-green">
            <CheckCircle2 size={23} />
          </div>
          <div className="billing-stat-content">
            <span>Paid Bills</span>
            <strong>{paidCount}</strong>
            <small>Successfully paid</small>
          </div>
        </article>

        <article className="billing-stat-card">
          <div className="billing-stat-icon stat-orange">
            <Clock3 size={23} />
          </div>
          <div className="billing-stat-content">
            <span>Pending Bills</span>
            <strong>{pendingCount}</strong>
            <small>Awaiting payment</small>
          </div>
        </article>

        <article className="billing-stat-card">
          <div className="billing-stat-icon stat-purple">
            <Coins size={23} />
          </div>
          <div className="billing-stat-content">
            <span>Collected Revenue</span>
            <strong className="revenue-amount">
              {formatAmount(totalRevenue)}
            </strong>
            <small>From paid invoices</small>
          </div>
        </article>
      </section>

      <section className="billing-records-panel">
        <div className="billing-toolbar">
          <div className="billing-search">
            <Search size={19} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bill ID, appointment, patient..."
              aria-label="Search billing records"
            />
          </div>

          <label className="billing-status-filter">
            <ChevronDown size={17} />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by payment status"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>

          <button
            className="billing-refresh-button"
            onClick={fetchBills}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "billing-spinning" : ""}
            />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="billing-section-heading">
          <div className="billing-section-title">
            <ReceiptText size={21} />
            <h2>Billing Records</h2>
            <span className="billing-record-count">
              {filteredBills.length}
            </span>
          </div>
          <span className="billing-section-caption">
            Invoices and payment status
          </span>
        </div>

        <div className="billing-table-scroll">
          <table className="billing-table">
            <thead>
              <tr>
                <th>Bill ID</th>
                <th>Appointment</th>
                <th>Patient</th>
                <th>Consultation</th>
                <th>Medicine Charges</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredBills.map((bill) => {
                const isPaid = bill.paymentStatus === "PAID";

                return (
                  <tr key={bill.billId}>
                    <td>
                      <strong className="billing-id">
                        #{bill.billId}
                      </strong>
                    </td>

                    <td>
                      <div className="billing-appointment">
                        <strong>#{bill.appointmentId}</strong>
                        <span>
                          <CalendarDays size={13} />
                          {getAppointmentDate(bill)}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="billing-patient">
                        <span className="billing-patient-avatar">
                          {getPatientName(bill).charAt(0).toUpperCase()}
                        </span>
                        <span>{getPatientName(bill)}</span>
                      </div>
                    </td>

                    <td>{formatAmount(bill.consultationAmt)}</td>

                    <td>{formatAmount(bill.medicineAmt)}</td>

                    <td>
                      <strong className="billing-total">
                        {formatAmount(getTotal(bill))}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`billing-status-badge ${
                          isPaid ? "badge-paid" : "badge-pending"
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Clock3 size={14} />
                        )}
                        {bill.paymentStatus}
                      </span>
                    </td>

                    <td>
                      {isPaid ? (
                        <span className="billing-paid-action">
                          <CheckCircle2 size={16} />
                          Paid
                        </span>
                      ) : (
                        <button
                          className="billing-pay-button"
                          onClick={() => markAsPaid(bill.billId)}
                          disabled={payingId === bill.billId}
                        >
                          <CheckCircle2 size={15} />
                          {payingId === bill.billId
                            ? "Updating..."
                            : "Mark paid"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredBills.length === 0 && (
                <tr>
                  <td colSpan="8">
                    <div className="billing-empty-state">
                      <div className="billing-empty-icon">
                        <Wallet size={28} />
                      </div>
                      <strong>No billing records found</strong>
                      <span>
                        {search || statusFilter !== "ALL"
                          ? "Try changing your search or status filter."
                          : "Create a bill to see it listed here."}
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {loading && bills.length === 0 && (
                <tr>
                  <td colSpan="8" className="billing-loading">
                    Loading billing records...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="billing-table-footer">
          <span>
            Showing {filteredBills.length} of {bills.length} billing records
          </span>
          <span className="billing-footer-total">
            <IndianRupee size={15} />
            Revenue reflects paid bills only
          </span>
        </div>
      </section>

      <div className="billing-disclaimer">
        <div className="billing-info-icon">i</div>
        <span>
          Collected revenue includes bills marked as PAID only. Verify financial
          records before using these figures for official reporting.
        </span>
      </div>
    </div>
  );
}

export default Billing;
