// ==UserScript==
// @name        Redirector
// @match        *://*.reddit.com/*
// @match        *://*.quora.com/*
// @run-at      document-start
// ==/UserScript==

if (location.hostname.includes('reddit.com')) location.hostname = 'redlib.catsarch.com'
if (location.hostname.includes('quora.com')) location.hostname = 'qt.bloat.cat'
