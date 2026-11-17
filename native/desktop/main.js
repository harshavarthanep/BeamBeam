// Beam Beam for Windows, Mac and Linux — built by H24 Creationz.
// Loads the same index.html as the website from inside the app, in app mode.
// Received files are saved to Downloads/Beam Beam automatically.
const { app, BrowserWindow, Menu, shell, session, protocol, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const APP_ID = 'com.h24creationz.beambeam';
const WWW = path.join(__dirname, 'www');
const ORIGIN = 'app://beambeam';

app.setAppUserModelId(APP_ID);
app.setName('Beam Beam');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const isWebLink = (u) => /^(https?:|mailto:|tel:)/i.test(u);

function uniquePath(dir, name) {
  const ext = path.extname(name), base = path.basename(name, ext);
  let p = path.join(dir, name), n = 1;
  while (fs.existsSync(p)) p = path.join(dir, `${base} (${n++})${ext}`);
  return p;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1120, height: 860, minWidth: 360, minHeight: 560,
    title: 'Beam Beam', backgroundColor: '#121B86', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true },
  });
  if (process.platform !== 'darwin') win.removeMenu();
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { if (isWebLink(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (url.startsWith(ORIGIN)) return; e.preventDefault(); if (isWebLink(url)) shell.openExternal(url); });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta, wc = win.webContents;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); event.preventDefault(); }
    else if (ctrl && (input.key === '=' || input.key === '+')) { wc.setZoomLevel(wc.getZoomLevel() + 0.5); event.preventDefault(); }
    else if (ctrl && input.key === '-') { wc.setZoomLevel(wc.getZoomLevel() - 0.5); event.preventDefault(); }
    else if (ctrl && input.key === '0') { wc.setZoomLevel(0); event.preventDefault(); }
    else if (ctrl && input.shift && input.key.toLowerCase() === 'i') { wc.toggleDevTools(); event.preventDefault(); }
  });
  win.webContents.on('render-process-gone', (e, d) => {
    if (d.reason === 'clean-exit') return;
    const r = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Reload', 'Close'], message: 'Beam Beam stopped unexpectedly', detail: 'Files already received are in Downloads › Beam Beam. Reload to continue.' });
    if (r === 0) win.reload(); else app.quit();
  });
  // Close guard: the page asks before leaving while a transfer is running
  win.webContents.on('will-prevent-unload', (e) => {
    const r = dialog.showMessageBoxSync(win, { type: 'question', buttons: ['Keep sharing', 'Quit anyway'], defaultId: 0, cancelId: 0, message: 'A transfer is still running', detail: 'If you quit now, the people downloading from you will be cut off.' });
    if (r === 1) e.preventDefault();
  });
  win.on('closed', () => { win = null; });
  win.loadURL(ORIGIN + '/index.html?app');
}

function macMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Beam Beam', submenu: [{ label: 'About Beam Beam', click: () => app.showAboutPanel() }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'Beam Beam website', click: () => shell.openExternal('https://harshavarthanep.github.io/BeamBeam/') }] },
  ]));
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  protocol.handle('app', async (req) => {
    const u = new URL(req.url);
    let rel = decodeURIComponent(u.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(WWW, rel));
    if (!file.startsWith(WWW + path.sep) || !fs.existsSync(file)) return new Response('Not found', { status: 404 });
    const res = await net.fetch(pathToFileURL(file).toString());
    const type = MIME[path.extname(file).toLowerCase()];
    return type ? new Response(res.body, { status: 200, headers: { 'Content-Type': type, 'Cache-Control': 'no-cache' } }) : res;
  });
  // camera (scan QR codes), clipboard, notifications and keeping the screen awake
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'clipboard-read', 'clipboard-sanitized-write', 'notifications', 'screen-wake-lock', 'fullscreen'].includes(perm)));
  // received files go straight to Downloads/Beam Beam — no save dialog
  session.defaultSession.on('will-download', (e, item) => {
    const dir = path.join(app.getPath('downloads'), 'Beam Beam');
    try { fs.mkdirSync(dir, { recursive: true }); } catch (err) {}
    item.setSavePath(uniquePath(dir, item.getFilename()));
  });
  app.setAboutPanelOptions({ applicationName: 'Beam Beam', applicationVersion: app.getVersion(), copyright: 'Built by H24 Creationz', credits: 'Send big files directly to anyone.' });
  if (process.platform === 'darwin') macMenu();
  createWindow();
});
app.on('activate', () => { if (!win) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
