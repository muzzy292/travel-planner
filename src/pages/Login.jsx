export default function Login({ signIn, denied }) {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Travel Planner</h1>
        {denied && (
          <p className="error">This Google account is not authorised. Please use your whitelisted address.</p>
        )}
        <button onClick={signIn} className="btn-google">
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
