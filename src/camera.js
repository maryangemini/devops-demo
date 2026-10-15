export function stopCamera(video) {
  const stream = video.srcObject;
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
  }
    video.srcObject = null; 
}

export function createCameraController({ video, getUserMedia, onState = () => {} }) {
  let state = 'idle';
  let request = 0;
  let removeListeners = () => {};

  function update(next, error = null) {
    state = next;
    onState({ state, error });
  }

  function release() {
    removeListeners();
    removeListeners = () => {};
    stopCamera(video);
  }

  function stop() {
    request += 1;
    release();
    update('idle');
  }

  async function start() {
    if (state === 'requesting' || state === 'running') return;
    const currentRequest = ++request;
    update('requesting');
    try {
      const stream = await getUserMedia({ video: true, audio: false });
      // Stop may happen while the permission prompt is open.
      if (currentRequest !== request) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      video.srcObject = stream;
      const tracks = stream.getVideoTracks();
      const onEnded = () => {
        if (tracks.every(track => track.readyState === 'ended')) stop();
      };
      for (const track of tracks) track.addEventListener('ended', onEnded);
      removeListeners = () => {
        for (const track of tracks) track.removeEventListener('ended', onEnded);
      };
      await video.play();
      if (currentRequest === request) update('running');
    } catch (error) {
      if (currentRequest !== request) return;
      release();
      update('error', error);
    }
  }

  return { start, stop, get state() { return state; } };
}
