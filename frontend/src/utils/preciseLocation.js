// Always require a real, accurate GPS fix for check-in/checkout.
// (The previous office-network bypass has been removed - there is
// no server-side verification endpoint anymore, so we go straight
// to requesting GPS from the browser.)
export async function getPrecisePosition(onSuccess, onError) {
  getGpsPosition(onSuccess, onError);
}

// Keep listening for an accurate fix, with a deadline covering the entire wait.
function getGpsPosition(onSuccess, onError) {
  let watchId;
  let finished = false;
  let bestAccuracy = Infinity;
  const finish = (callback, value) => {
    if (finished) return;
    finished = true;
    clearTimeout(deadline);
    if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    callback(value);
  };
  const deadline = setTimeout(() => {
    const message = Number.isFinite(bestAccuracy)
      ? `Location accuracy is about ${Math.ceil(bestAccuracy)} metres; check-in requires 50 metres or better. Try near a window or use a phone with precise location enabled, then retry.`
      : "Unable to obtain a location within 30 seconds. Check location permissions and retry.";
    finish(onError, new Error(message));
  }, 30000);

  try {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        if (!Number.isFinite(accuracy)) return;
        bestAccuracy = Math.min(bestAccuracy, accuracy);
        if (accuracy <= 50) finish(onSuccess, position);
      },
      (error) => {
        if (error.code === 1) {
          finish(onError, new Error("Please allow location access for this website and browser, then retry."));
        }
        // Unavailable/timeout errors can recover on a subsequent reading.
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );
    if (finished) navigator.geolocation.clearWatch(watchId);
  } catch (error) {
    finish(onError, error);
  }
}