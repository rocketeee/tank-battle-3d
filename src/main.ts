import './styles.css';
import { Game } from './game/Game';

const app = document.getElementById('app')!;

// loading screen while modules init
const loading = document.createElement('div');
loading.className = 'loading';
loading.innerHTML = '<div class="spin"></div><div>正在加载战场……</div>';
app.appendChild(loading);

function boot() {
  try {
    new Game(app);
  } catch (err) {
    loading.innerHTML = `<div style="color:#ff8a8a;max-width:80%;text-align:center">加载失败:<br/>${(err as Error).message}</div>`;
    console.error(err);
    return;
  }
  loading.remove();
}

// give the browser one frame to paint the loader
requestAnimationFrame(() => requestAnimationFrame(boot));

// prevent context menu / pinch zoom on mobile
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
