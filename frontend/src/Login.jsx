
import { useState } from "react";
import { Activity, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import api from "./api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState("login");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const response = await api.post("/auth/register", {
          fullName,
          email,
          password
        });
        setSuccess(response.data?.message || "Account created. Please sign in.");
        setMode("login");
        setFullName("");
        setPassword("");
      } else {
        const response = await api.post("/auth/login", { email, password });
        onLogin(response.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo"><Activity size={29} /></div>
          <div>
            <h1>MediCare</h1>
            <p>Hospital Management System</p>
          </div>
        </div>

        <div className="login-heading">
          <span className="login-eyebrow">{mode === "login" ? "Welcome back" : "Join MediCare"}</span>
          <h2>{mode === "login" ? "Sign in to your account" : "Create a patient account"}</h2>
          <p>{mode === "login" ? "Manage your hospital operations in one place." : "Register to manage your appointments and patient profile."}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <label htmlFor="fullName">Full name</label>
              <div className="login-input">
                <Activity size={18} />
                <input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </div>
            </>
          )}

          <label htmlFor="email">Email address</label>
          <div className="login-input">
            <Mail size={18} />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="login-input">
            <Lock size={18} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? (mode === "signup" ? "Creating account..." : "Signing in...") : (mode === "signup" ? "Create Patient Account" : "Sign In")}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="login-switch">
          {mode === "login" ? "New patient? " : "Already registered? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
              setSuccess("");
            }}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>

        <div className="login-security">
          <Lock size={14} />
          <span>Secure access to your hospital workspace</span>
        </div>
      </section>

      <footer className="login-footer">
        © 2026 MediCare Hospital Management System
      </footer>
    </main>
  );
}
