import { createRoot } from 'octane';
import { App } from './App.tsx';

const target = document.getElementById('root');
if (target === null) throw new Error('MapLibre browser fixture requires #root');
createRoot(target).render(App);
