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

  function handleSession(session) {
    if (session) {
      const email = session.user?.email?.toLowerCase()
      if (WHITELISTED.length > 0 && !WHITELISTED.includes(email)) {
        supabase.auth.signOut()
        setDenied(true)
        setSession(null)
      } else {
        setSession(session)
        setDenied(false)
      }
    } else {
      setSession(null)
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
