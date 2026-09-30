export default function Login() {
  return (
    <div className="login-page">
      <div className="login-card">

        <h2>Login Page</h2>
        <p>Login to your Account</p>

        <div className="input-group">
          <label>Email: </label>
          <input type="text" />
        </div>

        <div className="input-group">
          <label>Password: </label>
          <input type="password" />
        </div>
          
        <button>Log In</button>

      </div>
    </div>
  );
}