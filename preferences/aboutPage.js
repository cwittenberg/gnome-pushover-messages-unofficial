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
    Adw, Gtk, GdkPixbuf, GObject, GLib
} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;
const thisExtensionDir = Me.path;

var AboutPage = GObject.registerClass(
class PushoverMessages_AboutPage extends Adw.PreferencesPage {
    _init() {
        super._init({
            title: _("About"),
            icon_name: 'help-about-symbolic',
            name: 'AboutPage',
            margin_start: 10,
            margin_end: 10
        });

        // Extension logo and description
        let aboutGroup = new Adw.PreferencesGroup();
        let aboutBox = new Gtk.Box( {
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            vexpand: false
        });
        let logoImage = new Gtk.Image({            
            margin_bottom: 5,
            pixel_size: 100
        });
        logoImage.set_from_file(thisExtensionDir + "/img/logo-bar-dark-symbolic.svg");

        let extensionLabel = new Gtk.Label({
            label: '<span size="larger"><b>GNOME Pushover Messages</b></span>\n                    (unofficial client)',
            use_markup: true,
            margin_bottom: 15,
            vexpand: true,
            valign: Gtk.Align.FILL
        });
        let aboutDescription = new Gtk.Label({
            label: _("Shows Pushover Notifications within GNOME Shell."),
            margin_bottom: 3,
            hexpand: false,
            vexpand: false
        });

        aboutBox.append(logoImage);
        aboutBox.append(extensionLabel);
        aboutBox.append(aboutDescription);
        aboutGroup.add(aboutBox);
        this.add(aboutGroup);

        // Info group
        let infoGroup = new Adw.PreferencesGroup();
        let releaseVersion = (Me.metadata.version) ? Me.metadata.version : _("unknown");        
        let windowingLabel = (Me.metadata.isWayland) ? "Wayland" : "X11";
        
        // Extension version
        let openWeatherVersionRow = new Adw.ActionRow({
            title: _("Extension Version")
        });
        openWeatherVersionRow.add_suffix(new Gtk.Label({
            label: releaseVersion + ''
        }));
        /*// Git version for self builds
        let gitVersionRow = null;
        if (gitVersion) {
            gitVersionRow = new Adw.ActionRow({
                title: _("Git Version")
            });
            gitVersionRow.add_suffix(new Gtk.Label({
                label: gitVersion + ''
            }));
        }*/
        // shell version
        let gnomeVersionRow = new Adw.ActionRow({
            title: _("GNOME Version")
        });
        gnomeVersionRow.add_suffix(new Gtk.Label({
            label: imports.misc.config.PACKAGE_VERSION + '',
        }));
        // session type
        let sessionTypeRow = new Adw.ActionRow({
            title: _("Session Type"),
        });
        sessionTypeRow.add_suffix(new Gtk.Label({
            label: windowingLabel
        }));

        infoGroup.add(openWeatherVersionRow);
        //gitVersion && infoGroup.add(gitVersionRow);
        infoGroup.add(gnomeVersionRow);
        infoGroup.add(sessionTypeRow);
        this.add(infoGroup);

        // Maintainer
        let maintainerGroup = new Adw.PreferencesGroup();
        //let imageLinksGroup = new Adw.PreferencesGroup();

        /*let maintainerBox = new Gtk.Box( {
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            vexpand: false            
        });*/
        let maintainerAbout = new Gtk.Label({
            label: _("Maintained by: %s").format('Christian Wittenberg\n'),
            use_markup: true,
            hexpand: false,
            vexpand: false
        });                

        //maintainerBox.append(maintainerAbout);        
        //maintainerGroup.add(maintainerBox);
        
        //this.add(maintainerGroup);
        //this.add(imageLinksGroup);

        // Provider
        let providerGroup = new Adw.PreferencesGroup();
        let providerBox = new Gtk.Box( {
            orientation: Gtk.Orientation.VERTICAL,
            margin_top: 2,
            hexpand: false,
            vexpand: false
        });

        let providerAbout = new Gtk.Label({
            label: _("Powered by %s").format('<a href="https://pushover.net/">Pushover</a>\n'),
            use_markup: true,
            hexpand: false,
            vexpand: false
        });
        let codeAbout = new Gtk.Label({
            label: _("This GNOME Extension is not build by Pushover LLC but by me and it does <b>NOT</b> save\n or process any of your personal data outside of your device. See for yourself at Github %s.").format('<a href="https://github.com/cwittenberg/gnome-pushover-messages-unofficial">here</a>\n\nPushover is a trademark of Pushover LLC'),
            use_markup: true,
            hexpand: false,
            vexpand: false
        });
        providerBox.append(maintainerAbout);
        providerBox.append(providerAbout);
        providerBox.append(codeAbout);
        providerGroup.add(providerBox);
        this.add(providerGroup);

        // License
        let gnuLicense = '<span size="small">' +
            _("This program comes with ABSOLUTELY NO WARRANTY.") + '\n' +
            _("See the") + ' <a href="https://www.gnu.org/licenses/quick-guide-gplv3.html">' +
            _("GNU General Public License, version 3 or later") + '</a> ' + _("for details.") +
            '</span>\n';
        let gplGroup = new Adw.PreferencesGroup();
        let gplLabel = new Gtk.Label({
            label: gnuLicense,
            use_markup: true,
            justify: Gtk.Justification.CENTER
        });
        let gplLabelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.END,
            vexpand: true,
        });
        gplLabelBox.append(gplLabel);
        gplGroup.add(gplLabelBox);
        this.add(gplGroup);
    }
});