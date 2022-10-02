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
    Gtk,
    Adw,
    Soup
} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

const thisExtensionDir = Me.path;
const poConfigSchema = 'org.gnome.shell.extensions.pushover';

var GeneralPage = GObject.registerClass(    
    class PushoverMessages_GeneralPage extends Adw.PreferencesPage {                

        _init(settings, wnd) {
            super._init({
                title: _("Settings"),
                icon_name: 'preferences-system-symbolic',
                name: 'GeneralPage'
            });
            this._settings = settings;

            let _api = Me.imports.lib.api;
            let _pushoverAPI = new _api.PushoverAPI();
            _pushoverAPI.settings = ExtensionUtils.getSettings(poConfigSchema);            

            // Pushover account settings
            let pushoverGroup = new Adw.PreferencesGroup({
                title: _("Pushover account")
            });

            // Pushover email        
            let emailEntry = new Gtk.Entry({
                max_length: 500,
                width_chars: 50,
                vexpand: false,
                valign: Gtk.Align.CENTER,
                buffer: new Gtk.EntryBuffer()
            });
            let emailRow = new Adw.ActionRow({
                title: _("E-mail address"),
                activatable_widget: emailEntry
            });
            let poEmail = this._settings.get_string('email');
            if (poEmail != '') {
                emailEntry.set_text(poEmail);
            } else {
                emailEntry.set_text("");
            }
            emailRow.add_suffix(emailEntry);
            pushoverGroup.add(emailRow);

            // Pushover Password        
            let passwordEntry = new Gtk.Entry({
                max_length: 500,
                width_chars: 50,
                vexpand: false,
                valign: Gtk.Align.CENTER,
                visibility: false,
                buffer: new Gtk.EntryBuffer()
            });
            let passwordRow = new Adw.ActionRow({
                title: _("Password"),
                activatable_widget: passwordEntry
            });
            let poPassword = this._settings.get_string('password');
            if (poPassword != '') {
                passwordEntry.set_text(poPassword);
            } else {
                passwordEntry.set_text("");
            }
            passwordRow.add_suffix(passwordEntry);
            pushoverGroup.add(passwordRow)

            // Pushover device        
            let deviceEntry = new Gtk.Entry({
                max_length: 500,
                width_chars: 50,
                vexpand: false,
                valign: Gtk.Align.CENTER,
                buffer: new Gtk.EntryBuffer()
            });
            let deviceRow = new Adw.ActionRow({
                title: _("Device name"),
                activatable_widget: emailEntry
            });
            let poDeviceName = this._settings.get_string('devicename');
            if (poDeviceName != '') {
                deviceEntry.set_text(poDeviceName);
            } else {
                deviceEntry.set_text("");
            }
            deviceRow.add_suffix(deviceEntry);
            pushoverGroup.add(deviceRow);

            // Test button        
            let testRow = new Adw.ActionRow({
                title: _(""),
                margin_top: 2,
                margin_bottom: 2
            });

            // Login button
            let loginButton = new Gtk.Button({
                child: new Adw.ButtonContent({
                    icon_name: 'avatar-default-symbolic',
                    label: _("Login")
                })
            });

            // Registation button
            /*let registerButton = new Gtk.Button({
                child: new Adw.ButtonContent({
                    icon_name: 'starred-symbolic',
                    label: _("I don't have an account yet")
                })
            });*/
            let registerButton = new Gtk.LinkButton({
                icon_name: 'starred-symbolic',
                label: _("I don't have an account yet"),
                uri: "https://pushover.net/"
            });

            // Link to register on Pushover
            let registerLink = new Gtk.Label({
                label: _("%s").format("<a href='https://pushover.net/'>I don't have an account yet</a>"),
                use_markup: true,
                hexpand: false,
                vexpand: false
            });

            testRow.add_suffix(registerLink);
            testRow.add_suffix(loginButton);
            pushoverGroup.add(testRow);

            this.add(pushoverGroup);

            //bind signals
            loginButton.connect('clicked', (widget) => {
                let connectResult = this.testConnectivity(_pushoverAPI, wnd, deviceEntry, emailEntry, passwordEntry, connectedSwitch);
                connectedSwitch.set_active(connectResult);
            });

            let isConnected = _pushoverAPI.settings.get_boolean('connected');

            // Service
            let serviceGroup = new Adw.PreferencesGroup({
                title: _("Service"),
                visible: true //isConnected
            });

            let connectedSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                active: isConnected
            });
            let connectedRow = new Adw.ActionRow({
                title: _("Enabled"),
                subtitle: _("Pushover notifications"),
                activatable_widget: connectedSwitch
            });
            connectedRow.add_suffix(connectedSwitch);
            connectedSwitch.connect('notify::active', (widget) => {
                if (widget.get_active()) {
                    let test = this.testConnectivity(_pushoverAPI, wnd, deviceEntry, emailEntry, passwordEntry, connectedSwitch);
                    widget.set_active(test);

                    //TODO: enable Extension also - not sure how to do this yet
                } else {
                    //TODO: disable Extension also - not sure how to do this yet
                }
                _pushoverAPI.settings.set_boolean('connected', widget.get_active());
            });

            serviceGroup.add(connectedRow);

            let behaviorGroup = new Adw.PreferencesGroup({
                title: _("Behavior"),
                visible: true
            });

            let isDarkmode = _pushoverAPI.settings.get_boolean('darkmode');
            let darkmodeSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                active: isDarkmode
            });
            let darkmodeRow = new Adw.ActionRow({
                title: _("Dark mode"),
                subtitle: _("Show dark icons (requires extension to be restarted)"),
                activatable_widget: darkmodeSwitch
            });
            darkmodeRow.add_suffix(darkmodeSwitch);
            darkmodeSwitch.connect('notify::active', (widget) => {
                _pushoverAPI.settings.set_boolean('darkmode', widget.get_active());
            });
            
            let isDebug = _pushoverAPI.settings.get_boolean('debug');
            let debugSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
                active: isDebug
            });
            let debugRow = new Adw.ActionRow({
                title: _("Debug mode"),
                subtitle: _("Show frequent details in system log"),
                activatable_widget: debugSwitch
            });
            debugRow.add_suffix(debugSwitch);
            debugSwitch.connect('notify::active', (widget) => {
                _pushoverAPI.settings.set_boolean('debug', widget.get_active());
            });

            behaviorGroup.add(darkmodeRow);
            behaviorGroup.add(debugRow);

            this.add(serviceGroup);
            this.add(behaviorGroup);
        }
        
        testConnectivity(poAPI, wnd, deviceEntry, emailEntry, passwordEntry, connectedSwitch, forceRegistration=false) {
            let isConnected = false;

            let newDeviceName = deviceEntry.get_buffer().text;
            let newEmail = emailEntry.get_buffer().text;
            let newPassword = passwordEntry.get_buffer().text;

            let currentDeviceID = poAPI.settings.get_string("deviceid");
            let currentDeviceName = poAPI.settings.get_string("devicename");
            let isDebug = poAPI.settings.get_boolean('debug');            
            
            //do some validations first
            if (newEmail == "" || newPassword == "" || newDeviceName == "") {
                if(isDebug) {
                    log("Incomplete login attempt");
                }

                let toaster = new Adw.Toast({
                    title: _("Please specify your Pushover Account and Device Name first")
                });
                wnd.add_toast(_toaster);

                return false;
            }

            //now attempt logon
            if (poAPI.login(newEmail, newPassword)) {
                if(isDebug) {
                    log("Success!");
                }

                let secret = poAPI.poSecret;

                poAPI.settings.set_string("email", newEmail);
                poAPI.settings.set_string("password", newPassword);

                let deviceID = null;
                let createNewDevice = false;

                //check if we need to re-register device (perhaps saved DeviceID is still relevant)            
                if (currentDeviceName == newDeviceName) {
                    deviceID = currentDeviceID;
                } else {
                    createNewDevice = true;

                    //Device name is not matching, so let's create a new one
                    //now attempt device creation
                    deviceID = poAPI.createDeviceID(newDeviceName, forceRegistration);
                }

                if (typeof(deviceID) == "string") {
                    //well done, save deviceid and devicename

                    if (createNewDevice) {
                        let _toast2 = new Adw.Toast({
                            title: _("Device '" + newDeviceName + "' has been added to your account.")
                        });
                        wnd.add_toast(_toast2);
                    }

                    let _toast = new Adw.Toast({
                        title: _("Yay! Connected to Pushover. You're all set.")
                    });
                    wnd.add_toast(_toast);

                    poAPI.settings.set_string("deviceid", deviceID);
                    poAPI.settings.set_string("devicename", newDeviceName);

                    isConnected = true;
                    poAPI.settings.set_boolean('connected', isConnected);                    
                    connectedSwitch.set_active(true);

                } else {
                    let _toast = new Adw.Toast({
                        title: _("Failed to add Device Name '" + newDeviceName + "':\n" + deviceID.name)
                    });
                    wnd.add_toast(_toast);
                    
                    if(deviceID.name.toString().indexOf("already been taken") > -1) {                        
                        //device seems to already exist, ask user if he wants to overwrite.                    
                        
                        let dialog = new Gtk.MessageDialog({
                            title: 'Device with name "' + newDeviceName + '" already exists',
                            text: 'Do you want to re-register and take over this device?',
                            buttons: [Gtk.ButtonsType.NONE],
                            transient_for: wnd                           
                        })                        
                        dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);                        
                        dialog.add_button('OK', Gtk.ResponseType.OK);                        
                        
                        dialog.connect('response', (dlg, resp) => {                                                        
                            dlg.hide();

                            if(resp == Gtk.ResponseType.OK) {                                                                
                                //user is OK to overwrite, rerun.
                                return this.testConnectivity(poAPI, wnd, deviceEntry, emailEntry, passwordEntry, connectedSwitch, true);                                
                            }                                     
                        });
      
                        dialog.show();
                    }
                }
            } else {
                let _toast = new Adw.Toast({
                    title: _("Failed, wrong e-mail and/or password?")
                });
                wnd.add_toast(_toast);
            }

            return isConnected;
        }
    });