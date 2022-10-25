/*
 * Copyright (c) 2022 Christian Wittenberg
 *
 * GNOME Pushover Messages shell extension is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 3 of the License, or (at your
 * option) any later version. This extension is not owned or developed by Pushover itself. 
 * Pushover, its name and logo are registered trademarks of Pushover LLC.
 *
 * GNOME Pushover Messages shell extension is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details. 
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome Documents; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author:
 * Christian Wittenberg <dev@iwont.cyou>
 *
 */

const {
    GObject,
    GLib,
    Gio,
    Clutter,
    St,
    Gtk
} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;
const Soup = imports.gi.Soup;

const Util = imports.misc.util;
const thisExtensionDir = Me.path;
const poConfigSchema = 'org.gnome.shell.extensions.pushover';

const extensionUtils = imports.misc.extensionUtils;
const _ = extensionUtils.gettext;

let api = null;
let pushoverAPI = null;

function lg(s) {
    if (pushoverAPI == null || ExtensionUtils.getSettings(poConfigSchema).get_boolean("debug")) log("===" + Me.metadata['gettext-domain'] + "===>" + s);
}

let darkmode = true;

let panelButton = null;
let panelButtonText = null;
let sourceLoopID = null;
let messageTray = null;
let settings = null;

let disabled = false; // stop processing if extension is disabled
let timeout = 7 * 1; // be friendly, refresh every 7 secs

function getLogo(asPNG = false, file = "logo-bar") {
    return thisExtensionDir + "/img/" + file + ((darkmode) ? "-dark" : "") + ((asPNG) ? ".png" : "-symbolic.svg")
}

// Download application specific icons from Pushover and cache locally
// This to prevent unwanted load on Pushover.net
function getCachedIcon(iconName) {
    let iconFileDestination = thisExtensionDir + '/icons/' + iconName + '.png';

    const cwd = Gio.File.new_for_path(thisExtensionDir + "/icons/");
    const newFile = cwd.get_child(iconName + ".png");

    // detects if icon is cached (exists)
    const fileExists = newFile.query_exists(null);

    if (!fileExists) {
        // download and save in cache folder
        // do this synchronously to ensure notifications always get a logo
        let _httpSession = new Soup.SessionSync();

        let url = "https://api.pushover.net/icons/" + iconName + ".png";
        let message = Soup.Message.new('GET', url);
        let responseCode = _httpSession.send_message(message);
        let out = null;
        let resp = null;
        if (responseCode == 200) {
            try {
                let bytes = message['response-body'].flatten().get_data();
                const file = Gio.File.new_for_path(iconFileDestination);
                const [, etag] = file.replace_contents(bytes, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            } catch (e) {
                lg("Error in cached icon");
                lg(e);
            }
        }

    } else {
        // icon is readily cached, return from icons folder locally
        //const file = Gio.File.new_for_path(iconFileDestination);
        //const [, contents, etag] = file.load_contents(null);        
    }

    return iconFileDestination;
}


// Create GNOME Notification
// inspired by: https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/a3c84ca7463ed92b5be6f013a12bce927223f7c5/js/ui/main.js#L509
// modified: 
// - added icon specifics. 
// - added global messagetray destination.
// - added save (cache) feature for remote Pushover icons
function notify(title, msg, iconName = null) {
    let file = null;
    if (iconName == null) {
        //use default extension's logo if no Pushover icon specified
        let logoFile = getLogo(true);
        lg(logoFile);
        file = Gio.File.new_for_path(logoFile);
    } else {
        let cachedIcon = getCachedIcon(iconName);
        file = Gio.File.new_for_path(cachedIcon);
    }

    const icon = new Gio.FileIcon({
        file
    });

    let source = new MessageTray.Source(title);

    //ensure notification is added to GNOME message tray
    Main.messageTray.add(source);
    messageTray.add(source);

    let notification = new MessageTray.Notification(source, title, msg, {
        gicon: icon,
        bannerMarkup: true
    });
    notification.setTransient(false);
    source.showNotification(notification);
}


// Wait until time elapsed before polling Pushover API again, do this async.
function timer() {
    if (!disabled) {
        sourceLoopID = Mainloop.timeout_add_seconds(timeout, function() {
            messagePromise().then(result => {
                //reinvoke itself                    
                timer();

            }).catch(e => {
                lg('Error occured in Timer');
                lg(e);

                timer();
            });
        });
    }
}

let previousEnablementStatus = false;

// Run polling procedure completely async 
function messagePromise() {
    return new Promise((resolve, reject) => {
        pushoverAPI.settings = ExtensionUtils.getSettings(poConfigSchema);

        //if in Prefs the loop is disabled - dont engage Pushover processing
        let isEnabled = pushoverAPI.settings.get_boolean('connected');

        if (previousEnablementStatus != isEnabled) {
            if (previousEnablementStatus) {
                notify("Pushover notifications", "Disabled");
            } else {
                notify("Pushover notifications", "Enabled");
            }

            previousEnablementStatus = isEnabled;
        }

        if (!isEnabled) {
            resolve('success');

        } else {
            let msgs = pushoverAPI.poll();

            if (msgs != null) {
                msgs.forEach(function(msg) {
                    //show notifications for each
                    notify(msg.title, msg.message, msg.icon);
                });

                resolve('success');
            } else {
                reject('Promise failure, login failed?');
            }
        }

        return GLib.SOURCE_REMOVE;
    });
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            var that = this;
            super._init(0.0, _(Me.metadata['name']));
            
            let file = Gio.File.new_for_path(getLogo(true));            
        
            let logoIconClass = (darkmode) ? "gnome-pushover-messages-extension-icon-dark" : "gnome-pushover-messages-extension-icon-light";
            let logoIcon = new St.Icon({
                style_class: logoIconClass,
                gicon: new Gio.FileIcon({file})
            });
            this.add_child(logoIcon);

            this.connect('button-press-event', this._onButtonClicked);

            const menu = this.menu;

            const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                extensionUtils.openPrefs();
            });
            menu.addMenuItem(settingsItem);

            lg('GLib version used: ' + GLib.MAJOR_VERSION + "." + GLib.MINOR_VERSION);
        }

        _onButtonClicked(obj, e) {
            lg('Extension clicked');             
        }
    }
);

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations();
    }

    enable() {
        api = Me.imports.lib.api;
        pushoverAPI = new api.PushoverAPI();

        // Retrieve settings from schema
        settings = ExtensionUtils.getSettings(poConfigSchema);
        darkmode = settings.get_boolean('darkmode');

        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);

        messageTray = new MessageTray.MessageTray();


        disabled = false;

        lg("Started");

        // Start
        timer();
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;

        disabled = true;

        pushoverAPI.disable()
        pushoverAPI = null;
        api = null;

        messageTray = null;

        // Remove timer loop altogether
        if (sourceLoopID) {
            GLib.Source.remove(sourceLoopID);
            sourceLoopID = null;
        }

        lg("Stopped");
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
