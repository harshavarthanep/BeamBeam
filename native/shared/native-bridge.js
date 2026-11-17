/* =========================================================================
   BEAM BEAM — NATIVE BRIDGE                         built by H24 Creationz
   Added to index.html at build time, before the app code. In a normal browser
   it does nothing. Inside the desktop app (Electron) or the phone app
   (Capacitor) it:
     1. switches to app mode and points share links at the public website
     2. turns off the service worker (the app already holds every file)
     3. checks GitHub Releases for a newer version
     4. phone: opens links in the phone's browser and uses the share sheet
     5. phone: saves received files to Documents/Beam Beam as they arrive
   ========================================================================= */
(function () {
  'use strict';
  var desk = window.beamDesktop, C = window.Capacitor;
  var isCap = !!(C && (typeof C.isNativePlatform === 'function' ? C.isNativePlatform() : C.isNative));
  if (!desk && !isCap) return;

  var VERSION = __BB_VERSION__, REPO = __BB_REPO__;
  var owner = REPO.split('/')[0], name = REPO.split('/')[1] || 'BeamBeam';
  var SITE = 'https://' + owner.toLowerCase() + '.github.io/' + name + '/';
  window.BEAM_CONFIG = Object.assign({}, window.BEAM_CONFIG || {}, { siteUrl: SITE });
  document.documentElement.classList.add('app');
  document.documentElement.setAttribute('data-native', desk ? desk.platform : (C.getPlatform ? C.getPlatform() : 'mobile'));
  try { Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: function () { return undefined; } }); } catch (e) {}

  /* --- update check */
  function newer(a, b) { a = a.split('.').map(Number); b = b.split('.').map(Number); for (var i = 0; i < 3; i++) { if ((a[i] || 0) > (b[i] || 0)) return true; if ((a[i] || 0) < (b[i] || 0)) return false; } return false; }
  setTimeout(function () {
    fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return; var v = String(j.tag_name || '').replace(/^v/, '');
        if (v && newer(v, VERSION) && window.BeamApp) window.BeamApp.toast('Beam Beam ' + v + ' is ready. <a href="' + SITE + '#apps" target="_blank" rel="noopener">Download it</a>', 10000);
      }).catch(function () {});
  }, 5000);

  if (!isCap) return;
  var P = C.Plugins || {}, FS = P.Filesystem, SH = P.Share, BR = P.Browser;

  /* --- links open outside the app */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/^https?:/i.test(h) && h.indexOf(location.origin) !== 0) { e.preventDefault(); if (BR) BR.open({ url: h }); else window.open(h, '_system'); }
    else if (/^(mailto:|tel:)/i.test(h)) { e.preventDefault(); window.open(h, '_system'); }
  }, true);

  function b64(u8) { var s = '', CH = 0x8000; for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); }
  function clean(n) { return (String(n).split(/[\\/]/).pop() || 'file').replace(/[\u0000-\u001f<>:"|?*]/g, '_').slice(0, 180); }

  window.BeamNative = {
    shareText: function (d) { return SH ? SH.share({ title: d.title, text: d.text, url: d.url, dialogTitle: 'Share your Beam Beam link' }).catch(function () {}) : null; },
    open: function (r) { if (SH && r && r.uri) SH.share({ title: r.name, files: [r.uri], dialogTitle: 'Open or share' }).catch(function () {}); },
    makeSink: async function (fileName) {
      var dir = 'Beam Beam', base = clean(fileName), dot = base.lastIndexOf('.'), n = 1, p = dir + '/' + base;
      try { await FS.mkdir({ path: dir, directory: 'DOCUMENTS', recursive: true }); } catch (e) {}
      for (;;) { try { await FS.stat({ path: p, directory: 'DOCUMENTS' }); p = dir + '/' + (dot > 0 ? base.slice(0, dot) + ' (' + n + ')' + base.slice(dot) : base + ' (' + n + ')'); n++; } catch (e) { break; } }
      await FS.writeFile({ path: p, directory: 'DOCUMENTS', data: '', recursive: true });
      var parts = [], held = 0;
      async function flush() {
        if (!held) return;
        var all = new Uint8Array(held), o = 0;
        parts.forEach(function (b) { all.set(b, o); o += b.length; }); parts = []; held = 0;
        await FS.appendFile({ path: p, directory: 'DOCUMENTS', data: b64(all) });
      }
      return {
        write: async function (b) { var u = b instanceof Uint8Array ? b : new Uint8Array(b); parts.push(u); held += u.length; if (held >= 1048576) await flush(); },
        close: async function () { await flush(); var u = await FS.getUri({ path: p, directory: 'DOCUMENTS' }); return { saved: true, name: fileName, where: 'Documents › Beam Beam', uri: u.uri }; },
        abort: async function () { parts = []; held = 0; try { await FS.deleteFile({ path: p, directory: 'DOCUMENTS' }); } catch (e) {} }
      };
    }
  };
})();
