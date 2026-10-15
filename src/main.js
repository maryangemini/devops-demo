import './style.css';
import { createCameraController } from './camera.js';
import { createFaceOverlay } from './face-detector.js';


const VERSION = '3.2 m';

document.querySelector('#app').innerHTML = `
  <main>
    <h1>Camera Demo</h1>
    <p>Version <strong id="version"></strong></p>
    <div class="controls">
      <button id="start" type="button">Увімкнути камеру</button>
      <button id="stop" type="button" disabled>Зупинити</button>
    </div>
    <p id="status" role="status" aria-live="polite">Камера вимкнена</p>
    <div class="preview">
      <video id="video" autoplay playsinline muted aria-label="Зображення з камери"></video>
      <canvas id="boxes" aria-hidden="true"></canvas>
    </div>
  </main>
`;

const video = document.querySelector('#video');
const start = document.querySelector('#start');
const stop = document.querySelector('#stop');
const status = document.querySelector('#status');
document.querySelector('#version').textContent = VERSION;

const overlay = createFaceOverlay({
  video,
  canvas: document.querySelector('#boxes'),
  onLoading: () => { status.textContent = 'Камера працює. Завантажую детектор…'; },
  onResult: count => { status.textContent = `Камера працює. Облич: ${count}`; },
  onError: error => {
    console.error('Face detection:', error);
    status.textContent = 'Камера працює. Не вдалося запустити детекцію облич.';
    status.classList.add('error');
  },
});

function errorMessage(error) {
  const messages = {
    NotAllowedError: 'Доступ до камери заборонено. Дозволь його в налаштуваннях браузера й спробуй знову.',
    NotFoundError: 'Камеру не знайдено. Під’єднай її й спробуй знову.',
    NotReadableError: 'Не вдалося відкрити камеру. Перевір, чи не використовує її інший застосунок.',
    SecurityError: 'Браузер обмежив доступ до камери. Перевір дозволи та захищене з’єднання.',
  };
  return messages[error?.name] || 'Не вдалося запустити камеру. Перевір пристрій і дозволи браузера.';
}

const controller = createCameraController({
  video,
  getUserMedia: constraints => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera API unavailable');
    }
    return navigator.mediaDevices.getUserMedia(constraints);
  },
  onState: ({ state, error }) => {
    overlay.stop();
    const labels = { idle: 'Камера вимкнена', requesting: 'Очікуємо дозвіл на камеру…', running: 'Камера працює', error: 'Камера недоступна' };
    start.disabled = state === 'requesting' || state === 'running';
    stop.disabled = state !== 'requesting' && state !== 'running';
    status.classList.toggle('error', state === 'error');
    status.textContent = state === 'error' ? errorMessage(error) : labels[state];
    if (state === 'running') overlay.start();
  },
});

if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
  start.disabled = true;
  status.textContent = 'Для камери відкрий сайт через HTTPS або localhost у браузері з підтримкою getUserMedia.';
  status.classList.add('error');
}

start.addEventListener('click', () => controller.start());
stop.addEventListener('click', () => controller.stop());
window.addEventListener('pagehide', () => controller.stop());
