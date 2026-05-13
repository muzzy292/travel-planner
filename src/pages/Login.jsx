export default function Login({ signIn, denied, authError }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Travel Planner</h1>
        {denied && (
          <p className="error">This Google account is not authorised. Please use your whitelisted address.</p>
        )}
        {authError && (
          <p className="error">Auth error: {authError}</p>
        )}
        <button onClick={signIn} className="btn-google">
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
