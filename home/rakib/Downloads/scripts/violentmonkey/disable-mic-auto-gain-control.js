// ==UserScript==
// @name        Disable Mic Auto Gain Control (Google Meet)
// @match       https://meet.google.com/*
// @version     1.0
// ==/UserScript==

const original = MediaStreamTrack.prototype.applyConstraints
MediaStreamTrack.prototype.applyConstraints = function (constraints) {
  if (constraints?.audio) constraints.audio.autoGainControl = false
  return original.call(this, constraints)
}
