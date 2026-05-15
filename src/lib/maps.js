// Shared Google Maps script loader — safe to call from multiple components
export async function loadMaps(apiKey) {
  if (window.google?.maps?.importLibrary) return
  return new Promise((resolve, reject) => {
    if (document.getElementById('maps-script')) {
      const check = setInterval(() => {
        if (window.google?.maps?.importLibrary) { clearInterval(check); resolve() }
      }, 50)
      return
    }
    const script = document.createElement('script')
    script.id = 'maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
}
