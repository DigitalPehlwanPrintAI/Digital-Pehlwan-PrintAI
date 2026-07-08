import { useState } from "react";
import "./App.css";

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [enteredEmailOtp, setEnteredEmailOtp] = useState("");
  const [enteredMobileOtp, setEnteredMobileOtp] = useState("");

  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);

  const [message, setMessage] = useState("");

  function getUsers() {
    const savedUsers = localStorage.getItem("printai_users");
    return savedUsers ? JSON.parse(savedUsers) : [];
  }

  function saveUsers(users) {
    localStorage.setItem("printai_users", JSON.stringify(users));
  }

  function isValidEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(value.trim());
  }

  function isValidMobile(value) {
    const cleanMobile = value.replace(/\D/g, "");
    return /^[6-9]\d{9}$/.test(cleanMobile);
  }

  function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function resetVerification() {
    setEmailOtp("");
    setMobileOtp("");
    setEnteredEmailOtp("");
    setEnteredMobileOtp("");
    setEmailVerified(false);
    setMobileVerified(false);
    setMessage("");
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setName("");
    setEmail("");
    setMobile("");
    setPassword("");
    resetVerification();
  }

  function handleSendEmailOtp() {
    if (!email.trim()) {
      setMessage("Please enter email first.");
      return;
    }

    if (!isValidEmail(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    const users = getUsers();
    const alreadyExists = users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    if (alreadyExists && mode === "signup") {
      setMessage("This email is already registered. Please login.");
      return;
    }

    const otp = generateOtp();
    setEmailOtp(otp);
    setEmailVerified(false);
    setEnteredEmailOtp("");

    setMessage(`Demo Email OTP sent. Your Email OTP is: ${otp}`);
  }

  function handleVerifyEmailOtp() {
    if (!emailOtp) {
      setMessage("Please send Email OTP first.");
      return;
    }

    if (enteredEmailOtp.trim() !== emailOtp) {
      setMessage("Invalid Email OTP. Please try again.");
      setEmailVerified(false);
      return;
    }

    setEmailVerified(true);
    setMessage("Email verified successfully.");
  }

  function handleSendMobileOtp() {
    if (!mobile.trim()) {
      setMessage("Please enter mobile number first.");
      return;
    }

    if (!isValidMobile(mobile)) {
      setMessage("Please enter a valid 10 digit Indian mobile number starting with 6, 7, 8 or 9.");
      return;
    }

    const users = getUsers();
    const alreadyExists = users.find((user) => user.mobile === mobile.trim());

    if (alreadyExists && mode === "signup") {
      setMessage("This mobile number is already registered. Please login.");
      return;
    }

    const otp = generateOtp();
    setMobileOtp(otp);
    setMobileVerified(false);
    setEnteredMobileOtp("");

    setMessage(`Demo Mobile OTP sent. Your Mobile OTP is: ${otp}`);
  }

  function handleVerifyMobileOtp() {
    if (!mobileOtp) {
      setMessage("Please send Mobile OTP first.");
      return;
    }

    if (enteredMobileOtp.trim() !== mobileOtp) {
      setMessage("Invalid Mobile OTP. Please try again.");
      setMobileVerified(false);
      return;
    }

    setMobileVerified(true);
    setMessage("Mobile number verified successfully.");
  }

  function handleSignup(e) {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !mobile.trim() || !password.trim()) {
      setMessage("Please fill all details.");
      return;
    }

    if (!isValidEmail(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!isValidMobile(mobile)) {
      setMessage("Please enter a valid 10 digit Indian mobile number starting with 6, 7, 8 or 9.");
      return;
    }

    if (!emailVerified) {
      setMessage("Please verify your email with OTP before signup.");
      return;
    }

    if (!mobileVerified) {
      setMessage("Please verify your mobile number with OTP before signup.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be minimum 6 characters.");
      return;
    }

    const users = getUsers();

    const emailExists = users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      setMessage("This email is already registered. Please login.");
      setMode("login");
      return;
    }

    const mobileExists = users.find((user) => user.mobile === mobile.trim());

    if (mobileExists) {
      setMessage("This mobile number is already registered. Please login.");
      setMode("login");
      return;
    }

    const newUser = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      password: password.trim(),
      emailVerified: true,
      mobileVerified: true,
      plan: "Free",
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    localStorage.setItem("printai_current_user", JSON.stringify(newUser));

    setMessage("Signup successful.");
    onLogin(newUser);
  }

  function handleLogin(e) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage("Please enter email and password.");
      return;
    }

    if (!isValidEmail(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    const users = getUsers();

    const foundUser = users.find(
      (user) =>
        user.email.toLowerCase() === email.toLowerCase() &&
        user.password === password
    );

    if (!foundUser) {
      setMessage("Invalid email or password.");
      return;
    }

    localStorage.setItem("printai_current_user", JSON.stringify(foundUser));

    setMessage("Login successful.");
    onLogin(foundUser);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Digital Pehlwan PrintAI</h1>
        <p>Login karke Smart PrintAI tools use karein</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active-auth-tab" : ""}
            onClick={() => handleModeChange("login")}
          >
            Sign In
          </button>

          <button
            type="button"
            className={mode === "signup" ? "active-auth-tab" : ""}
            onClick={() => handleModeChange("signup")}
          >
            Sign Up
          </button>
        </div>

        {message && <div className="auth-message">{message}</div>}

        {mode === "signup" && (
          <form onSubmit={handleSignup} className="auth-form">
            <label>Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailVerified(false);
                setEmailOtp("");
                setEnteredEmailOtp("");
              }}
            />

            <button
              type="button"
              className="small-auth-btn"
              onClick={handleSendEmailOtp}
            >
              Send Email OTP
            </button>

            {emailOtp && (
              <>
                <label>Email OTP</label>
                <input
                  type="text"
                  placeholder="Enter Email OTP"
                  value={enteredEmailOtp}
                  onChange={(e) => setEnteredEmailOtp(e.target.value)}
                />

                <button
                  type="button"
                  className="small-auth-btn"
                  onClick={handleVerifyEmailOtp}
                >
                  Verify Email OTP
                </button>
              </>
            )}

            {emailVerified && <p className="verified-text">Email verified</p>}

            <label>Mobile</label>
            <input
              type="tel"
              placeholder="Enter 10 digit mobile number"
              value={mobile}
              maxLength="10"
              onChange={(e) => {
                const onlyNumbers = e.target.value.replace(/\D/g, "");
                setMobile(onlyNumbers);
                setMobileVerified(false);
                setMobileOtp("");
                setEnteredMobileOtp("");
              }}
            />

            <button
              type="button"
              className="small-auth-btn"
              onClick={handleSendMobileOtp}
            >
              Send Mobile OTP
            </button>

            {mobileOtp && (
              <>
                <label>Mobile OTP</label>
                <input
                  type="text"
                  placeholder="Enter Mobile OTP"
                  value={enteredMobileOtp}
                  onChange={(e) => setEnteredMobileOtp(e.target.value)}
                />

                <button
                  type="button"
                  className="small-auth-btn"
                  onClick={handleVerifyMobileOtp}
                >
                  Verify Mobile OTP
                </button>
              </>
            )}

            {mobileVerified && <p className="verified-text">Mobile verified</p>}

            <label>Password</label>
            <input
              type="password"
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" className="upload-btn">
              Create Account
            </button>
          </form>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="auth-form">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" className="upload-btn">
              Login
            </button>
          </form>
        )}

        <p className="auth-note">
          Demo OTP अभी screen पर show होगा. Production में Email/SMS API connect करेंगे.
        </p>
      </div>
    </div>
  );
}

export default Auth;
