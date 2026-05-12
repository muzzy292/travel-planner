// Google Identity Services (GIS) token-based Calendar OAuth helpers

export function loadGisScript() {
  return new Promise((resolve) => {
    if (document.getElementById('gis-script')) return resolve()
    const script = document.createElement('script')
    script.id = 'gis-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = resolve
    document.body.appendChild(script)
  })
}

let tokenClient = null

export async function getTokenClient(onToken) {
  await loadGisScript()
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    callback: onToken,
  })
  return tokenClient
}

export function requestCalendarToken(onToken) {
  if (!tokenClient) {
    getTokenClient(onToken).then((client) => client.requestAccessToken())
  } else {
    tokenClient.callback = onToken
    tokenClient.requestAccessToken()
  }
}
