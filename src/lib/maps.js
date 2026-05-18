// Shared Google Maps script loader — safe to call from multiple components.
// Uses the callback= param so the promise resolves only when importLibrary
// is fully initialised, avoiding the race where onload fires before
// window.google.maps.importLibrary is registered.
export async function loadMaps(apiKey) {
  if (window.google?.maps?.importLibrary) return
  return new Promise((resolve, reject) => {
    if (document.getElementById('maps-script')) {
      // Script tag already injected by another component — poll until ready
      const check = setInterval(() => {
        if (window.google?.maps?.importLibrary) { clearInterval(check); resolve() }
      }, 50)
      return
    }
    window.__mapsLoaded = resolve
    const script = document.createElement('script')
    script.id = 'maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=__mapsLoaded`
    script.async = true
    script.onerror = reject
    document.body.appendChild(script)
  })
}
