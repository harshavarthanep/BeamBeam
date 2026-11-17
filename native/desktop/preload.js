// Beam Beam desktop — tells the page it is running as the installed app.
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('beamDesktop', { platform: process.platform });
