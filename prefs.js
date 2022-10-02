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
  Adw,
  Gtk,
  Gdk,
  Gio
} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const poConfigSchema = 'org.gnome.shell.extensions.pushover';

// Import preferences pages
function init() {
  ExtensionUtils.initTranslations(Me.metadata['gettext-domain']);
}

function fillPreferencesWindow(window) {
  let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());

  const GeneralPrefs = Me.imports.preferences.generalPage;
  const AboutPrefs = Me.imports.preferences.aboutPage;

  const settings = ExtensionUtils.getSettings(poConfigSchema);
  const generalPage = new GeneralPrefs.GeneralPage(settings, window);
  const aboutPage = new AboutPrefs.AboutPage();

  let prefsWidth = 600;
  let prefsHeight = 700;

  window.set_default_size(prefsWidth, prefsHeight);
  window.set_search_enabled(true);

  window.add(generalPage);
  window.add(aboutPage);

  window.connect('close-request', () => {
      window.destroy();
  });
}