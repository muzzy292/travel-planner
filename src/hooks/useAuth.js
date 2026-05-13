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

  useEffect(() => {
    // If there's a PKCE code in the URL, wait for onAuthStateChange to fire
    // rather than calling getSession() which returns null before code exchange
    const hasCode = new URLSearchParams(window.location.search).has('code')

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
      // Clean up code param from URL after session is established
      if (hasCode && session) {
        window.history.replaceState(null, '', window.location.pathname)
      }
    })

    if (!hasCode) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleSession(session)
      })
    }

    return () => subscription.unsubscribe()
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

  return { session, loading, denied, signIn, signOut }
}
