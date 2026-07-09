import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setErrorMessage("");

      const usersQuery = query(
        collection(db, "printai_users"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(usersQuery);

      const userList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsers(userList);
    } catch (error) {
      console.error("Admin users load error:", error);
      setErrorMessage("Unable to load users. Please check Firebase setup/rules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function formatDate(value) {
    if (!value) return "Not Available";

    try {
      if (value?.toDate) {
        return value.toDate().toLocaleString();
      }

      return new Date(value).toLocaleString();
    } catch {
      return "Not Available";
    }
  }

  return (
    <div className="analysis-box" id="admin-users">
      <div className="admin-users-header">
        <div>
          <h2>Admin Users</h2>
          <p>All real signup users collected from Firebase Firestore.</p>
        </div>

        <button type="button" className="upload-btn" onClick={loadUsers}>
          Refresh Users
        </button>
      </div>

      {loading && <p>Loading users...</p>}

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {!loading && !errorMessage && users.length === 0 && (
        <p>No users found yet. Please create a fresh signup first.</p>
      )}

      {!loading && users.length > 0 && (
        <>
          <div className="admin-summary-box">
            <p>
              <b>Total Users:</b> {users.length}
            </p>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Plan</th>
                  <th>Signup Date</th>
                  <th>Last Login</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name || "Not Available"}</td>
                    <td>{user.email || "Not Available"}</td>
                    <td>{user.mobile || "Not Available"}</td>
                    <td>{user.plan || "Free"}</td>
                    <td>{formatDate(user.createdAt || user.signupDate)}</td>
                    <td>{formatDate(user.lastLogin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminUsers;