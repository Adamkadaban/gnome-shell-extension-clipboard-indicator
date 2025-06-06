import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
const _ = text => text; // Fallback for gettext to get preferences working
import { PrefsFields } from './constants.js';

export default class ClipboardIndicatorPreferences extends ExtensionPreferences {
    fillPreferencesWindow (window) {
        window._settings = this.getSettings();
        const settingsUI = new Settings(window._settings);
        const page = new Adw.PreferencesPage();
        page.add(settingsUI.ui);
        page.add(settingsUI.behavior);
        page.add(settingsUI.limits);
        page.add(settingsUI.exclusion); 
        page.add(settingsUI.topbar);
        page.add(settingsUI.notifications);
        page.add(settingsUI.shortcuts);
        window.add(page);
    }
}

class Settings {
    constructor (schema) {
        this.schema = schema;
        console.log("Starting prefs.js constructor");

        this.field_size = new Adw.SpinRow({
            title: _("History Size"),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 10000,
                step_increment: 1
            })
        });

        this.field_preview_size = new Adw.SpinRow({
            title: _("Preview Size (characters)"),
            adjustment: new Gtk.Adjustment({
                lower: 10,
                upper: 100,
                step_increment: 1
            })
        });

        this.field_cache_size = new Adw.SpinRow({
            title: _("Max cache file size (MB)"),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 1024,
                step_increment: 1
            })
        });

        this.field_topbar_preview_size = new Adw.SpinRow({
            title: _("Number of characters in top bar"),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 100,
                step_increment: 1
            })
        });

        this.field_display_mode = new Adw.ComboRow({
            title: _("What to show in top bar"),
            model: this.#createDisplayModeOptions()
        });

        this.field_disable_down_arrow = new Adw.SwitchRow({
            title: _("Remove down arrow in top bar")
        });

        this.field_cache_disable = new Adw.SwitchRow({
            title: _("Cache only pinned items")
        });

        this.field_clear_notification_toggle = new Adw.SwitchRow({
            title: _("Show notification on copy")
        });

        this.field_cycle_notification_toggle = new Adw.SwitchRow({
            title: _("Show notification on cycle")
        });

        this.field_confirm_clear_toggle = new Adw.SwitchRow({
            title: _("Show confirmation on Clear History")
        });

        this.field_strip_text = new Adw.SwitchRow({
            title: _("Remove whitespace around text")
        });

        this.field_move_item_first = new Adw.SwitchRow({
            title: _("Move item to the top after selection")
        });

        this.field_keep_selected_on_clear = new Adw.SwitchRow({
            title: _("Keep selected entry after Clear History")
        });

        this.field_paste_button = new Adw.SwitchRow({
            title: _("Show paste buttons"),
            subtitle: _("Adds a paste button to each entry that lets you paste it directly")
        });

        this.field_pinned_on_bottom = new Adw.SwitchRow({
            title: _("Place the pinned section on the bottom"),
            subtitle: _("Requires restarting the extension")
        });

        this.field_clear_on_boot = new Adw.SwitchRow({
            title: _("Clear clipboard history on system reboot")
        });

        this.field_paste_on_select = new Adw.SwitchRow({
            title: _("Paste on select")
        });

        this.field_cache_images = new Adw.SwitchRow({
            title: _("Cache images"),
            active: true
        });

        // Add image preview size control
        try {
            console.log("Creating image preview size field");
            this.field_image_preview_size = new Adw.SpinRow({
                title: _("Image preview size (pixels)"),
                adjustment: new Gtk.Adjustment({
                    lower: 16, 
                    upper: 512,
                    step_increment: 16
                })
            });
            console.log("Successfully created image preview size field");
        } catch (error) {
            console.error("Failed to create image preview size field:", error);
        }

        this.field_exclusion_row = new Adw.ExpanderRow({
            title: _('Excluded Apps'),
            subtitle: _('Content copied will not be saved while these apps are in focus'),
        });

        this.field_exclusion_row_add_button = new Gtk.Button({
            iconName: 'list-add-symbolic',
            cssClasses: ['flat'],
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.CENTER,
        });

        this.field_exclusion_row_add_button.connect('clicked', () => {
            this.field_exclusion_row_add_button.set_sensitive(false);
            this.excluded_row_counter++;
            this.field_exclusion_row.set_expanded(true);
            this.field_exclusion_row.add_row(this.#createExcludedAppInputRow());
        });

        this.field_exclusion_row.add_suffix(this.field_exclusion_row_add_button);

        this.ui =  new Adw.PreferencesGroup({ title: _('UI') });
        this.behavior = new Adw.PreferencesGroup({title: _('Behavior')});
        this.exclusion = new Adw.PreferencesGroup({ title: _('Exclusion') });
        this.limits =  new Adw.PreferencesGroup({ title: _('Limits') });
        this.topbar =  new Adw.PreferencesGroup({ title: _('Topbar') });
        this.notifications =  new Adw.PreferencesGroup({ title: _('Notifications') });
        this.shortcuts =  new Adw.PreferencesGroup({ title: _('Shortcuts') });

        this.ui.add(this.field_preview_size);
        this.ui.add(this.field_move_item_first);
        this.ui.add(this.field_strip_text);
        this.ui.add(this.field_keep_selected_on_clear);
        this.ui.add(this.field_paste_button);
        this.ui.add(this.field_pinned_on_bottom);

        this.behavior.add(this.field_clear_on_boot);
        this.behavior.add(this.field_paste_on_select);
        this.behavior.add(this.field_cache_images);
        
        // Add image preview size field to the UI
        try {
            console.log("Adding image preview size to behavior group");
            this.behavior.add(this.field_image_preview_size);
            console.log("Successfully added image preview size to behavior group");
        } catch (error) {
            console.error("Failed to add image preview size to behavior group:", error);
        }

        this.exclusion.add(this.field_exclusion_row);
        this.exclusion.add(this.field_exclusion_row_add_button);

        this.limits.add(this.field_size);
        this.limits.add(this.field_cache_size);
        this.limits.add(this.field_cache_disable);

        this.topbar.add(this.field_display_mode);
        this.topbar.add(this.field_topbar_preview_size);
        this.topbar.add(this.field_disable_down_arrow);

        this.notifications.add(this.field_clear_notification_toggle);
        this.notifications.add(this.field_cycle_notification_toggle)
        this.notifications.add(this.field_confirm_clear_toggle);

        this.#buildShorcuts(this.shortcuts);

        this.schema.bind(PrefsFields.HISTORY_SIZE, this.field_size, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.PREVIEW_SIZE, this.field_preview_size, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.CACHE_FILE_SIZE, this.field_cache_size, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.CACHE_ONLY_FAVORITE, this.field_cache_disable, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.NOTIFY_ON_COPY, this.field_clear_notification_toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.NOTIFY_ON_CYCLE, this.field_cycle_notification_toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.CONFIRM_ON_CLEAR, this.field_confirm_clear_toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.MOVE_ITEM_FIRST, this.field_move_item_first, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.KEEP_SELECTED_ON_CLEAR, this.field_keep_selected_on_clear, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.TOPBAR_DISPLAY_MODE_ID, this.field_display_mode, 'selected', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.DISABLE_DOWN_ARROW, this.field_disable_down_arrow, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.TOPBAR_PREVIEW_SIZE, this.field_topbar_preview_size, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.STRIP_TEXT, this.field_strip_text, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.PASTE_BUTTON, this.field_paste_button, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.PINNED_ON_BOTTOM, this.field_pinned_on_bottom, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.ENABLE_KEYBINDING, this.field_keybinding_activation, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.CLEAR_ON_BOOT, this.field_clear_on_boot, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.PASTE_ON_SELECT, this.field_paste_on_select, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.schema.bind(PrefsFields.CACHE_IMAGES, this.field_cache_images, 'active', Gio.SettingsBindFlags.DEFAULT);
        // Make sure the image preview size setting is bound to the UI
        try {
            this.schema.bind(PrefsFields.IMAGE_PREVIEW_SIZE, this.field_image_preview_size, 'value', Gio.SettingsBindFlags.DEFAULT);
            console.log("Successfully bound image preview size setting");
        } catch (error) {
            console.error("Failed to bind image preview size setting:", error);
        }

        this.#fetchExludedAppsList();
    }

    #createDisplayModeOptions () {
        let options = [
            _("Icon"),
            _("Clipboard Content"),
            _("Both"),
            _("Neither")
        ];
        let liststore = new Gtk.StringList();
        for (let option of options) {
            liststore.append(option)
        }
        return liststore;
    }

    #shortcuts = {
        [PrefsFields.BINDING_PRIVATE_MODE]: _("Private mode"),
        [PrefsFields.BINDING_TOGGLE_MENU]: _("Toggle the menu"),
        [PrefsFields.BINDING_CLEAR_HISTORY]: _("Clear history"),
        [PrefsFields.BINDING_PREV_ENTRY]: _("Previous entry"),
        [PrefsFields.BINDING_NEXT_ENTRY]: _("Next entry")
    };

    #buildShorcuts (group) {
        this.field_keybinding_activation = new Adw.SwitchRow({
            title: _("Enable shortcuts")
        });

        group.add(this.field_keybinding_activation);

        for (const [pref, title] of Object.entries(this.#shortcuts)) {
            const row = new Adw.ActionRow({
                title
            });

            row.add_suffix(this.#createShortcutButton(pref));

            group.add(row);
        }
    }

    #createShortcutButton (pref) {
        const button = new Gtk.Button({
            has_frame: false
        });

        const setLabelFromSettings = () => {
            const originalValue = this.schema.get_strv(pref)[0];

            if (!originalValue) {
                button.set_label(_('Disabled'));
            }
            else {
                button.set_label(originalValue);
            }
        };

        const startEditing = () => {
            button.isEditing = button.label;
            button.set_label(_('Enter shortcut'));
        };

        const revertEditing = () => {
            button.set_label(button.isEditing);
            button.isEditing = null;
        };

        const stopEditing = () => {
            setLabelFromSettings();
            button.isEditing = null;
        };

        setLabelFromSettings();

        button.connect('clicked', () => {
            if (button.isEditing) {
                revertEditing();
                return;
            }

            startEditing();

            const eventController = new Gtk.EventControllerKey();
            button.add_controller(eventController);

            let debounceTimeoutId = null;
            const connectId = eventController.connect('key-pressed', (_ec, keyval, keycode, mask) => {
                if (debounceTimeoutId) clearTimeout(debounceTimeoutId);

                mask = mask & Gtk.accelerator_get_default_mod_mask();

                if (mask === 0) {
                    switch (keyval) {
                        case Gdk.KEY_Escape:
                            revertEditing();
                            return Gdk.EVENT_STOP;
                        case Gdk.KEY_BackSpace:
                            this.schema.set_strv(pref, []);
                            setLabelFromSettings();
                            stopEditing();
                            eventController.disconnect(connectId);
                            return Gdk.EVENT_STOP;
                    }
                }

                const selectedShortcut = Gtk.accelerator_name_with_keycode(
                    null,
                    keyval,
                    keycode,
                    mask
                );

                debounceTimeoutId = setTimeout(() => {
                    eventController.disconnect(connectId);
                    this.schema.set_strv(pref, [selectedShortcut]);
                    stopEditing();
                }, 400);

                return Gdk.EVENT_STOP;
            });

            button.show();
        });

        return button;
    }

    #excluded_row_counter = 0;

    set excluded_row_counter(value) {
        this.#excluded_row_counter = value;
        this.#updateExcludedAppRow();
    }

    get excluded_row_counter() {
        return this.#excluded_row_counter;
    }

    #createExcludedAppInputRow() {
        const entry_row = new Adw.ActionRow();
        const entry = new Gtk.Entry({
            placeholderText: ('Window class name, e.g. "KeePassXC"'),
            halign: Gtk.Align.FILL,
            valign: Gtk.Align.CENTER,
            hexpand: true,
        });

        entry.connect('map', () => {
            entry.grab_focus();
        });

        const ok_button = new Gtk.Button({
            cssClasses: ['flat'],
            iconName: 'emblem-ok-symbolic',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.CENTER,
        });

        ok_button.connect('clicked', () => {
            const text = entry.get_text();
            if (text !== null && text.trim() !== '') {
                this.field_exclusion_row.remove(entry_row);
                this.field_exclusion_row.add_row(this.#createExludedAppRow(text.trim()));
                this.field_exclusion_row_add_button.set_sensitive(true);
                this.schema.set_strv('excluded-apps', [...this.schema.get_strv('excluded-apps'), text.trim()]);
            }
        });

        entry.connect('activate', () => {
            ok_button.emit('clicked');
        });

        const cancel_button = new Gtk.Button({
            cssClasses: ['flat'],
            iconName: 'window-close-symbolic',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.CENTER,
        });

        cancel_button.connect('clicked', () => {
            this.field_exclusion_row.remove(entry_row);
            this.field_exclusion_row_add_button.set_sensitive(true);
            this.excluded_row_counter--;
            this.field_exclusion_row_add_button.set_sensitive(true);
        });

        entry_row.add_prefix(entry);
        entry_row.add_suffix(ok_button);
        entry_row.add_suffix(cancel_button);

        return entry_row;
    }

    #createExludedAppRow(app_class_name) {
        const excluded_row = new Adw.ActionRow({
            title: app_class_name,
        });

        const remove_button = new Gtk.Button({
            cssClasses: ['destructive-action'],
            iconName: 'edit-delete-symbolic',
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.CENTER,
        });
        remove_button.connect('clicked', () => {
            this.field_exclusion_row.remove(excluded_row);
            const updated_list = this.schema.get_strv('excluded-apps').filter(app => app !== app_class_name);
            this.schema.set_strv('excluded-apps', updated_list);
            this.excluded_row_counter--;
        });
        excluded_row.add_suffix(remove_button);

        return excluded_row;
    }

    #fetchExludedAppsList() {
        const excludedApps = this.schema.get_strv('excluded-apps');
        for (const app of excludedApps) {
            this.field_exclusion_row.add_row(this.#createExludedAppRow(app));
        }
        this.excluded_row_counter = excludedApps.length;
    }

    #updateExcludedAppRow() {
        const hasExcludedApps = this.excluded_row_counter > 0;
        this.field_exclusion_row.set_enable_expansion(hasExcludedApps);
        this.field_exclusion_row.set_expanded(hasExcludedApps);
    }
}
