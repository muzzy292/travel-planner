import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const WHITELISTED = (import.meta.env.VITE_WHITELISTED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error }) => {
          if (error) {
            console.error('setSession error:', error)
            setAuthError(error.message)
            setLoading(false)
          } else {
            handleSession(data.session)
            window.history.replaceState(null, '', window.location.pathname)
          }
        })
    } else {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        handleSession(session)
      })
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleSession(session)
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  async function handleSession(session) {
    if (!session) {
      setSession(null)
      setLoading(false)
      return
    }

    const email = session.user?.email?.toLowerCase()

    // Fast path: env-var whitelist or no whitelist configured
    if (WHITELISTED.length === 0 || WHITELISTED.includes(email)) {
      setSession(session)
      setDenied(false)
      setLoading(false)
      // Claim pending invites in the background — safe to fail if migration not yet run
      supabase.rpc('claim_pending_invites').then(() => {}).catch(() => {})
      return
    }

    // Slow path: not in env whitelist — check DB allowed_users (populated by invite_to_trip)
    try {
      const { data } = await supabase
        .from('allowed_users')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (data) {
        setSession(session)
        setDenied(false)
        supabase.rpc('claim_pending_invites').then(() => {}).catch(() => {})
      } else {
        await supabase.auth.signOut()
        setDenied(true)
        setSession(null)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      // Fail open — RLS enforces real data security
      setSession(session)
      setDenied(false)
    }
    setLoading(false)
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, loading, denied, authError, signIn, signOut }
}
