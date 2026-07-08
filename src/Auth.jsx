import { useState } from "react";
import "./App.css";

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  function getUsers() {
    const savedUsers = localStorage.getItem("printai_users");
    return savedUsers ? JSON.parse(savedUsers) : [];
  }

  function saveUsers(users) {
    localStorage.setItem("printai_users", JSON.stringify(users));
  }

  function handleSignup(e) {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !mobile.trim() || !password.trim()) {
      alert("Please fill all details");
      return;
    }

    if (password.length < 6) {
      alert("Password minimum 6 characters ka hona chahiye");
      return;
    }

    const users = getUsers();
    const alreadyExists = users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    if (alreadyExists) {
      alert("Ye email already registered hai. Please login karein.");
      setMode("login");
      return;
    }

    const newUser = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      password: password.trim(),
      plan: "Free",
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    localStorage.setItem("printai_current_user", JSON.stringify(newUser));

    alert("Signup successful");
    onLogin(newUser);
  }

  function handleLogin(e) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert("Please enter email and password");
      return;
    }

    const users = getUsers();

    const foundUser = users.find(
      (user) =>
        user.email.toLowerCase() === email.toLowerCase() &&
        user.password === password
    );

    if (!foundUser) {
      alert("Invalid email or password");
      return;
    }

    localStorage.setItem("printai_current_user", JSON.stringify(foundUser));

    alert("Login successful");
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
            onClick={() => setMode("login")}
          >
            Sign In
          </button>

          <button
            type="button"
            className={mode === "signup" ? "active-auth-tab" : ""}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

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
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Mobile</label>
            <input
              type="tel"
              placeholder="Enter mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />

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
          Free plan se start karein. Paid plans soon available honge.
        </p>
      </div>
    </div>
  );
}

export default Auth;
