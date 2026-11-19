// Browser glue for sound. Uses HTML Audio (not fetch or p5.sound) so it works from file://.
// Browsers block autoplay, so playMusic() is called from the first key press and any
// blocked play() is ignored.
let musicAudio = null;
let musicRequested = false; // playMusic() has been called at least once
let musicPaused = false; // the game is paused, so the loop should stay quiet

function startAudio(audio) {
  try {
    const result = audio.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => {}); // blocked by the browser, nothing to do
    }
  } catch (error) {
    // play() can throw in some browsers, and a missing sound is not worth a crash
  }
}

function getMusicAudio() {
  if (musicAudio === null) {
    musicAudio = new Audio(MUSIC_FILE);
    musicAudio.loop = true;
  }
  return musicAudio;
}

function playSfx(name) {
  const file = fileFor(name);
  if (file === null) {
    return;
  }
  const volume = volumeFor("sfx", loadSettings());
  if (volume <= 0) {
    return;
  }
  try {
    const audio = new Audio(file);
    audio.volume = volume;
    startAudio(audio);
  } catch (error) {
    // no audio support, so the game stays silent
  }
}

function applyMusicVolume(audio) {
  audio.volume = volumeFor("music", loadSettings());
}

// Settings changes reach music that is already playing.
function refreshMusicVolume() {
  if (musicAudio !== null) {
    applyMusicVolume(musicAudio);
  }
}

// Starts the loop if it is not already playing. Safe to call on every key press.
function playMusic() {
  musicRequested = true;
  if (musicPaused) {
    return;
  }
  try {
    const audio = getMusicAudio();
    if (!audio.paused) {
      return;
    }
    applyMusicVolume(audio);
    startAudio(audio);
  } catch (error) {
    // no audio support, so the game stays silent
  }
}

function pauseMusic() {
  musicPaused = true;
  try {
    if (musicAudio !== null) {
      musicAudio.pause();
    }
  } catch (error) {
    // nothing playing, nothing to stop
  }
}

// Only resumes music that a key press started, so a pause never starts sound early.
function resumeMusic() {
  musicPaused = false;
  if (!musicRequested) {
    return;
  }
  playMusic();
}
