// userChrome.css
user_pref('toolkit.legacyUserProfileCustomizations.stylesheets', true);

// Browser toolbox
user_pref('devtools.chrome.enabled', true);
user_pref('devtools.debugger.remote-enabled', true);

// scroll speed
user_pref('mousewheel.default.delta_multiplier_y', 1000);

user_pref('media.videocontrols.picture-in-picture.video-toggle.enabled', false);
user_pref('extensions.pocket.enabled', false);
user_pref('accessibility.force_disabled', 1);

// removes "this time search with"
user_pref('browser.urlbar.shortcuts.bookmarks', false);
user_pref('browser.urlbar.shortcuts.history', false);
user_pref('browser.urlbar.shortcuts.tabs', false);
user_pref('browser.urlbar.shortcuts.quickactions', false);

user_pref('browser.tabs.firefox-view', false);
user_pref('media.rdd-process.enabled', false);
