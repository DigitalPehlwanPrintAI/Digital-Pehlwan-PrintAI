import { useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import "./App.css";

const API_BASE = "https://digital-pehlwan-printai.onrender.com";
const USERS_KEY = "printai_users";
const CURRENT_USER_KEY = "printai_current_user";

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const [enteredSignupOtp, setEnteredSignupOtp] = useState("");
  const [signupEmailVerified, setSignupEmailVerified] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [enteredResetOtp, setEnteredResetOtp] = useState("");
  const [resetOtpVerified, setResetOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [loading, setLoading] = useState(false);

  function showMessage(text, type = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizePassword(value) {
    return String(value || "").trim();
  }

  function getUsers() {
    try {
      const savedUsers = localStorage.getItem(USERS_KEY);
      const parsedUsers = savedUsers ? JSON.parse(savedUsers) : [];
      return Array.isArray(parsedUsers) ? parsedUsers : [];
    } catch (error) {
      console.error("Local users read error:", error);
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
  }

  function isValidMobile(value) {
    return /^[6-9]\d{9}$/.test(String(value || "").trim());
  }

  function userDocId(emailValue) {
    return normalizeEmail(emailValue).replace(/\//g, "_");
  }

  async function sendBackendOtp(toEmail, purpose) {
    const response = await fetch(`${API_BASE}/auth/send-email-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: toEmail, purpose }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.detail || "OTP send failed");
    }

    return data;
  }

  async function verifyBackendOtp(toEmail, otp, purpose) {
    const response = await fetch(`${API_BASE}/auth/verify-email-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: toEmail, otp, purpose }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.detail || "OTP verification failed");
    }

    return data;
  }

  async function saveUserToFirebase(user) {
    const cleanEmail = normalizeEmail(user.email);
    const ref = doc(db, "printai_users", userDocId(cleanEmail));
    const existing = await getDoc(ref);

    const commonData = {
      name: user.name || "User",
      email: cleanEmail,
      mobile: user.mobile || "",
      plan: user.plan || "Free",
      emailVerified: true,
      source: "Digital Pehlwan PrintAI",
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (existing.exists()) {
      await setDoc(ref, commonData, { merge: true });
    } else {
      await setDoc(ref, {
        ...commonData,
        createdAt: serverTimestamp(),
        signupDate: serverTimestamp(),
      });
    }
  }

  function resetScreen(nextMode) {
    setMode(nextMode);

    setName("");
    setEmail("");
    setMobile("");
    setPassword("");

    setSignupOtpSent(false);
    setEnteredSignupOtp("");
    setSignupEmailVerified(false);

    setResetEmail("");
    setResetOtpSent(false);
    setEnteredResetOtp("");
    setResetOtpVerified(false);
    setNewPassword("");
    setConfirmPassword("");

    setMessage("");
    setMessageType("info");
    setLoading(false);
  }

  async function openDashboard(user) {
    const finalUser = {
      id: user.id || Date.now(),
      name: user.name || "User",
      email: normalizeEmail(user.email),
      mobile: user.mobile || "",
      password: normalizePassword(user.password),
      emailVerified: true,
      plan: user.plan || "Free",
      createdAt: user.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    const users = getUsers();

    const updatedUsers = users.some(
      (item) => normalizeEmail(item.email) === finalUser.email
    )
      ? users.map((item) =>
          normalizeEmail(item.email) === finalUser.email ? finalUser : item
        )
      : [...users, finalUser];

    saveUsers(updatedUsers);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(finalUser));

    try {
      await saveUserToFirebase(finalUser);
    } catch (error) {
      console.error("Firebase last login save error:", error);
    }

    showMessage("Login successful. Opening dashboard...", "success");

    if (typeof onLogin === "function") {
      onLogin(finalUser);
    }

    setTimeout(() => {
      window.location.reload();
    }, 400);
  }

  async function handleSendSignupOtp() {
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail) {
      showMessage("Please enter email first.", "error");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    const users = getUsers();
    const emailExists = users.find(
      (user) => normalizeEmail(user.email) === cleanEmail
    );

    if (emailExists) {
      showMessage("This email is already registered. Please sign in.", "error");
      return;
    }

    try {
      setLoading(true);

      await sendBackendOtp(cleanEmail, "Signup Email Verification");

      setSignupOtpSent(true);
      setEnteredSignupOtp("");
      setSignupEmailVerified(false);

      showMessage(
        "OTP sent to your email. Please check inbox or spam folder.",
        "success"
      );
    } catch (error) {
      console.error("Signup OTP error:", error);
      showMessage(error.message || "Email OTP send failed. Please check backend email setup.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySignupOtp() {
    const cleanEmail = normalizeEmail(email);
    const otp = String(enteredSignupOtp || "").trim();

    if (!signupOtpSent) {
      showMessage("Please send Email OTP first.", "error");
      return;
    }

    if (!otp) {
      showMessage("Please enter OTP.", "error");
      return;
    }

    try {
      setLoading(true);
      await verifyBackendOtp(cleanEmail, otp, "Signup Email Verification");
      setSignupEmailVerified(true);
      showMessage("Email verified successfully.", "success");
    } catch (error) {
      console.error("Signup OTP verify error:", error);
      setSignupEmailVerified(false);
      showMessage(error.message || "Invalid OTP. Please enter the correct OTP from email.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupClick() {
    const cleanName = String(name || "").trim();
    const cleanEmail = normalizeEmail(email);
    const cleanMobile = String(mobile || "").trim();
    const cleanPassword = normalizePassword(password);

    if (!cleanName || !cleanEmail || !cleanMobile || !cleanPassword) {
      showMessage("Please fill name, email, mobile number and password.", "error");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    if (!isValidMobile(cleanMobile)) {
      showMessage("Please enter valid 10 digit Indian mobile number.", "error");
      return;
    }

    if (!signupEmailVerified) {
      showMessage("Please verify email OTP before creating account.", "error");
      return;
    }

    if (cleanPassword.length < 6) {
      showMessage("Password must be of six characters.", "error");
      return;
    }

    const users = getUsers();
    const emailExists = users.find(
      (user) => normalizeEmail(user.email) === cleanEmail
    );

    if (emailExists) {
      showMessage("This email is already registered. Please sign in.", "error");
      setMode("login");
      setEmail(cleanEmail);
      setPassword("");
      return;
    }

    const mobileExists = users.find(
      (user) => String(user.mobile || "").trim() === cleanMobile
    );

    if (mobileExists) {
      showMessage("This mobile number is already registered. Please sign in.", "error");
      return;
    }

    const newUser = {
      id: Date.now(),
      name: cleanName,
      email: cleanEmail,
      mobile: cleanMobile,
      password: cleanPassword,
      emailVerified: true,
      plan: "Free",
      createdAt: new Date().toISOString(),
      lastLogin: "",
    };

    try {
      await saveUserToFirebase(newUser);
    } catch (error) {
      console.error("Firebase signup save error:", error);
      showMessage("Signup data save failed. Please check Firebase rules/setup.", "error");
      return;
    }

    saveUsers([...users, newUser]);

    setMode("login");
    setEmail(cleanEmail);
    setPassword("");
    setName("");
    setMobile("");
    setSignupOtpSent(false);
    setEnteredSignupOtp("");
    setSignupEmailVerified(false);

    showMessage("Signup successful. Please sign in with your password.", "success");
  }

  async function handleLoginClick() {
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = normalizePassword(password);

    if (!cleanEmail || !cleanPassword) {
      showMessage("Please enter email and password.", "error");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    const users = getUsers();

    if (!users.length) {
      showMessage("No account found. Please sign up first.", "error");
      return;
    }

    const foundUser = users.find(
      (user) => normalizeEmail(user.email) === cleanEmail
    );

    if (!foundUser) {
      showMessage("This email is not registered. Please sign up first.", "error");
      return;
    }

    const savedPassword = normalizePassword(foundUser.password);

    if (savedPassword !== cleanPassword) {
      showMessage(
        "Password is incorrect. Please enter the correct password or use Forgot Password.",
        "error"
      );
      return;
    }

    await openDashboard(foundUser);
  }

  async function handleSendResetOtp() {
    const cleanEmail = normalizeEmail(resetEmail);

    if (!cleanEmail) {
      showMessage("Please enter registered email.", "error");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      showMessage("Please enter a valid email address.", "error");
      return;
    }

    const users = getUsers();
    const foundUser = users.find(
      (user) => normalizeEmail(user.email) === cleanEmail
    );

    if (!foundUser) {
      showMessage("This email is not registered. Please sign up first.", "error");
      return;
    }

    try {
      setLoading(true);

      await sendBackendOtp(cleanEmail, "Password Reset");

      setResetOtpSent(true);
      setEnteredResetOtp("");
      setResetOtpVerified(false);

      showMessage(
        "Reset OTP sent to your email. Please check inbox or spam folder.",
        "success"
      );
    } catch (error) {
      console.error("Reset OTP error:", error);
      showMessage(error.message || "Reset OTP send failed. Please check backend email setup.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyResetOtp() {
    const cleanEmail = normalizeEmail(resetEmail);
    const otp = String(enteredResetOtp || "").trim();

    if (!resetOtpSent) {
      showMessage("Please send reset OTP first.", "error");
      return;
    }

    if (!otp) {
      showMessage("Please enter reset OTP.", "error");
      return;
    }

    try {
      setLoading(true);
      await verifyBackendOtp(cleanEmail, otp, "Password Reset");
      setResetOtpVerified(true);
      showMessage("OTP verified. Now create new password.", "success");
    } catch (error) {
      console.error("Reset OTP verify error:", error);
      setResetOtpVerified(false);
      showMessage(error.message || "Invalid reset OTP. Please enter the correct OTP from email.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleResetPasswordClick() {
    const cleanEmail = normalizeEmail(resetEmail);
    const pass1 = normalizePassword(newPassword);
    const pass2 = normalizePassword(confirmPassword);

    if (!resetOtpVerified) {
      showMessage("Please verify reset OTP first.", "error");
      return;
    }

    if (!pass1 || !pass2) {
      showMessage("Please enter new password and confirm password.", "error");
      return;
    }

    if (pass1.length < 6) {
      showMessage("Password must be of six characters.", "error");
      return;
    }

    if (pass1 !== pass2) {
      showMessage("New password and confirm password do not match.", "error");
      return;
    }

    const users = getUsers();

    let userFound = false;

    const updatedUsers = users.map((user) => {
      if (normalizeEmail(user.email) === cleanEmail) {
        userFound = true;
        return {
          ...user,
          password: pass1,
          passwordUpdatedAt: new Date().toISOString(),
        };
      }

      return user;
    });

    if (!userFound) {
      showMessage("This email is not registered. Please sign up first.", "error");
      return;
    }

    saveUsers(updatedUsers);

    setMode("login");
    setEmail(cleanEmail);
    setPassword("");
    setResetEmail("");
    setResetOtpSent(false);
    setEnteredResetOtp("");
    setResetOtpVerified(false);
    setNewPassword("");
    setConfirmPassword("");

    showMessage("Password reset successful. Please sign in with new password.", "success");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Digital Pehlwan PrintAI</h1>

        {mode !== "forgot" && (
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active-auth-tab" : ""}
              onClick={() => resetScreen("login")}
            >
              Sign In
            </button>

            <button
              type="button"
              className={mode === "signup" ? "active-auth-tab" : ""}
              onClick={() => resetScreen("signup")}
            >
              Sign Up
            </button>
          </div>
        )}

        {message && (
          <div
            className={
              messageType === "success"
                ? "auth-message reset-success-box"
                : "auth-message"
            }
          >
            {message}
          </div>
        )}

        {mode === "login" && (
          <div className="auth-form">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter registered email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleLoginClick();
                }
              }}
            />

            <button
              type="button"
              className="forgot-link-btn"
              onClick={() => resetScreen("forgot")}
            >
              Forgot Password?
            </button>

            <button
              type="button"
              className="upload-btn"
              onClick={handleLoginClick}
            >
              Login
            </button>
          </div>
        )}

        {mode === "signup" && (
          <div className="auth-form">
            <label>Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSignupOtpSent(false);
                setEnteredSignupOtp("");
                setSignupEmailVerified(false);
              }}
            />

            <button
              type="button"
              className="small-auth-btn"
              onClick={handleSendSignupOtp}
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send Email OTP"}
            </button>

            {signupOtpSent && (
              <>
                <label>Email OTP</label>
                <input
                  type="text"
                  placeholder="Enter OTP received on email"
                  value={enteredSignupOtp}
                  onChange={(event) => setEnteredSignupOtp(event.target.value)}
                />

                <button
                  type="button"
                  className="small-auth-btn"
                  onClick={handleVerifySignupOtp}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify Email OTP"}
                </button>
              </>
            )}

            {signupEmailVerified && (
              <p className="verified-text">Email verified successfully</p>
            )}

            <label>Mobile Number</label>
            <input
              type="tel"
              placeholder="Enter 10 digit mobile number"
              maxLength="10"
              value={mobile}
              onChange={(event) =>
                setMobile(event.target.value.replace(/\D/g, ""))
              }
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Create password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <p className="password-hint">Password must be of six characters.</p>

            <button
              type="button"
              className="upload-btn"
              onClick={handleSignupClick}
            >
              Create Account
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <div className="auth-form">
            <h2 className="auth-small-title">Forgot Password</h2>

            <label>Registered Email</label>
            <input
              type="email"
              placeholder="Enter registered email"
              value={resetEmail}
              onChange={(event) => {
                setResetEmail(event.target.value);
                setResetOtpSent(false);
                setEnteredResetOtp("");
                setResetOtpVerified(false);
              }}
            />

            <button
              type="button"
              className="small-auth-btn"
              onClick={handleSendResetOtp}
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send Reset OTP"}
            </button>

            {resetOtpSent && (
              <>
                <label>Reset OTP</label>
                <input
                  type="text"
                  placeholder="Enter reset OTP"
                  value={enteredResetOtp}
                  onChange={(event) => setEnteredResetOtp(event.target.value)}
                />

                <button
                  type="button"
                  className="small-auth-btn"
                  onClick={handleVerifyResetOtp}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify Reset OTP"}
                </button>
              </>
            )}

            {resetOtpVerified && (
              <>
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />

                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />

                <p className="password-hint">
                  Password must be of six characters.
                </p>

                <button
                  type="button"
                  className="upload-btn"
                  onClick={handleResetPasswordClick}
                >
                  Reset Password
                </button>
              </>
            )}

            <button
              type="button"
              className="auth-back-btn"
              onClick={() => resetScreen("login")}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Auth;
