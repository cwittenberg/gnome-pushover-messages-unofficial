const {
    GObject,
    GLib,
    Gio,
    Gtk,
    Soup
} = imports.gi;

log("Loaded Soup version: " + Soup.MAJOR_VERSION + "." + Soup.MINOR_VERSION);

//definitions
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const poConfigSchema = 'org.gnome.shell.extensions.pushover';

var PushoverAPI = GObject.registerClass(
    class PushoverAPI extends GObject.Object {
        settings = null;

        poSecret = null;
        poUserKey = null;

        lastDeletedID = null;
        lastID = null;

        _init() {
            super._init();
        }

        disable() {
            this.settings = null;
        }        

        lg(s) {
            if (ExtensionUtils.getSettings(poConfigSchema).get_boolean("debug")) log("===" + Me.metadata['gettext-domain'] + "===>" + s);
        }

        // Login to Pushover with your credentials. Keep secret and user key for retrieving messages.
        login(email = null, password = null) {
            this.settings = ExtensionUtils.getSettings(poConfigSchema);

            if (email == null || password == null) {
                email = this.settings.get_string("email");
                password = this.settings.get_string("password");
            }

            let requestData = new Map();
            requestData.set("email", email);
            requestData.set("password", password);

            let resp = this.httpRequest("https://api.pushover.net/1/users/login.json", 'POST', this.map2string(requestData));

            if (typeof resp === 'object') {
                try {
                    if ('secret' in resp) {
                        this.poSecret = resp.secret;
                        this.poUserKey = resp.id;

                        return true;
                    }
                } catch (e) {
                    return false;
                }
            }

            return false;
        }

        createDeviceID(deviceName, forceRegistration=false) {
            let devParams = new Map();
            devParams.set("name", deviceName);
            devParams.set("secret", this.poSecret);
            devParams.set("os", "O");

            if(forceRegistration) {
                //ignores 'devicename already exists' error, 
                //overwrite and retrieve (new) deviceID
                devParams.set("force", 1);
            }                                    

            let resp = this.httpRequest("https://api.pushover.net/1/devices.json", "POST", this.map2string(devParams));

            if (resp != null) {
                if (resp.status == 1) {
                    this.lg("Yes, successfully created " + deviceName + " with device ID: " + resp.id);
                    return resp.id;
                } else {
                    this.lg("Error occured: " + resp.errors);
                    return resp.errors;
                }
            }

            return null;
        }

        // Convert Map object to string representation for HTTP Form submission
        map2string(theMap) {
            let s = "";
            theMap.forEach((v, k) => {
                s += k + "=" + v + "&";
            });

            return s;
        }

        httpRequest(url, type = 'GET', formData = "", hdrs = new Map()) {
            let soupSyncSession = new Soup.SessionAsync();
            let message;
            if (formData != "" && type == "POST") {
                if (Soup.MAJOR_VERSION == 2) {
                    //bugfix for the older Soup versions that don't support encoded formdata yet                    
                    //Time to decomm. Soup < 3.0 in Ubuntu globally (for security purposes)
                    message = Soup.Message.new(type, url + "?" + formData);
                    //TODO try this later: message = Soup.form_request_new_from_hash(type, url, formData);
                } else {
                    message = Soup.Message.new_from_encoded_form(type, url, formData);
                }
            } else {
                message = Soup.Message.new(type, url);
            }

            this.lg("sending request");
            message.request_headers.set_content_type("application/json", null);
            hdrs.forEach((value, key) => {
                message.request_headers.append(key, value);
            });

            let responseCode = soupSyncSession.send_message(message);
            let out = null;
            let resp = null;
            if (responseCode == 200) {
                try {
                    out = message['response-body'].data;
                    resp = JSON.parse(out);

                } catch (error) {
                    this.lg("Request failed")
                    this.lg(error);
                }
            } else {
                this.lg("Request failed")
                this.lg(responseCode);
                this.lg(message['response-body'].data);

                out = message['response-body'].data;
                return JSON.parse(out);
            }
            return resp;
        }

        poll() {
            if (this.login()) {
                let result = [];

                let msgs = null;
                let deviceID = this.settings.get_string("deviceid");
                let resp = this.httpRequest("https://api.pushover.net/1/messages.json?secret=" + this.poSecret + "&device_id=" + deviceID);

                if (resp != null) {
                    msgs = resp.messages;
                }

                if (msgs != null) {
                    this.lg(msgs.length + " Pushover Messages received");

                    msgs.forEach((msg) => {
                        let msgID = parseInt(msg.id);

                        if (this.lastID != msgID) {
                            this.lg("Message: " + msg.title + ": " + msg.message);
                            this.lg("Message ID: " + msg.id);

                            //this.notify(msg.title, msg.message, msg.icon);
                            result.push(msg);

                            if (msgID > this.lastID) {
                                this.lastID = msgID;
                            }
                        } else {
                            // Pushover has a bug where sometimes non-emergency messages with prio 0 keep being resent.
                            // ignore these repetive messages to avoid obtrusive user impact. Pushover team is notified.

                            this.lg('Duplicate message with ID:' + msgID);
                            this.lg('priority:' + msg.priority);
                            this.lg('acked:' + msg.acked);
                            this.lg('receipt:' + msg.receipt);
                        }
                    });

                    if (msgs.length > 0 && this.lastID > 0 && this.lastID != this.lastDeletedID) {
                        // Delete messages until last processed latest ID
                        let deleteParams = new Map();
                        deleteParams.set("message", this.lastID);
                        deleteParams.set("secret", this.poSecret);

                        this.lg("Delete Message ID: " + this.lastID);
                        this.httpRequest("https://api.pushover.net/1/devices/" + deviceID + "/update_highest_message.json", "POST", this.map2string(deleteParams));

                        this.lastDeletedID = this.lastID;
                    }
                }

                return result;

            } else {
                this.lg("Login did not succesfully complete")
                return null;
            }
        }
    }
);