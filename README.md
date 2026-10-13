# Menu Control

![License](https://img.shields.io/badge/license-MIT-blue.svg) [![Latest Stable Version](https://img.shields.io/packagist/v/ernestdefoe/menu-control.svg)](https://packagist.org/packages/ernestdefoe/menu-control) [![Total Downloads](https://img.shields.io/packagist/dt/ernestdefoe/menu-control.svg)](https://packagist.org/packages/ernestdefoe/menu-control)

A [Flarum 2](https://flarum.org) extension that gives you full control of the forum sidebar: All Discussions, Tags, Following and every item another extension adds.

![The forum sidebar, rearranged](https://raw.githubusercontent.com/ernestdefoe/menu-control/main/.github/screenshots/forum-sidebar.png)

## Features

- **Drag to reorder.** Every sidebar item is listed in the admin panel. Drag one into place and save.
- **Hide without deleting.** The eye icon hides an item and shows it again later. Nothing is lost.
- **Rename any item.** Give "All Discussions" or any extension's link your own label, with no language pack needed.
- **Change any icon.** Use any Font Awesome class, and see a live preview as you type.
- **Highlight items.** Make an item stand out in a colour you choose. It defaults to your forum's primary colour.
- **Custom links.** Add links to pages on your forum or to other sites. You can reorder, rename, highlight and restrict them like any other item. External links open in a new tab by default, and you can change that for each link.
- **Choose who sees each item.** Show an item only to certain groups: guests, members, staff, or any group you've made. Restricted links are never sent to people who can't see them.
- **Tags first.** You can put the tag list above the menu items.
- **Sticky sidebar.** The sidebar, including the Start a Discussion button, can stay in view as people scroll. Desktop only.
- **Works wherever the sidebar is shown,** including the tags page and other extensions' pages that reuse it.
- **Picks up new items by itself.** The admin page reads your real sidebar, so items from extensions you install later appear without any setup.

![The admin panel](https://raw.githubusercontent.com/ernestdefoe/menu-control/main/.github/screenshots/admin-editor.png)

## Installation

```sh
composer require ernestdefoe/menu-control
```

Then enable **Menu Control** in your admin panel.

## Updating

```sh
composer update ernestdefoe/menu-control
php flarum migrate
php flarum cache:clear
```

## Switching from resofire/menu-control

Your existing setup comes across automatically: the order, custom icons, highlights, highlight colour, custom links, and the flip and sticky options. Items you had **removed** in the old extension come across as **hidden**. That is what removing was meant to do, but the old extension never actually took them off the forum.

1. Swap the packages. Don't use the old extension's **Uninstall** button in the admin panel first: it deletes the settings that are about to be imported.

   ```sh
   composer remove resofire/menu-control
   composer require ernestdefoe/menu-control
   ```

2. Enable **Menu Control** in your admin panel. The import runs once, the moment it's enabled.
3. Open its settings page to check the result. Clear your forum's cache if the old sidebar is still showing.

The two extensions can't be installed together, because both would rearrange the same list.

## Good to know

- The admin page reads the sidebar as **you** see it, as an admin. An item that some other extension shows only to guests won't be listed until it's been seen at least once. Items you've already arranged stay in the list even while the extension that adds them is switched off.
- Hiding an item or restricting it to some groups only controls the **menu**. It doesn't lock the page the item links to. Use permissions for that.
- The forum script is about 1.2 KB gzipped. The drag-and-drop library is loaded only on the admin page, and it's the copy Flarum's core already ships. The extension adds no database queries, even when items are limited to certain groups.

## Links

- [Packagist](https://packagist.org/packages/ernestdefoe/menu-control)
- [Discuss thread](https://discuss.flarum.org/d/40063-menu-control-arrange-hide-rename-and-restrict-every-sidebar-item)
- [GitHub](https://github.com/ernestdefoe/menu-control)
- [Report an issue](https://github.com/ernestdefoe/menu-control/issues)

☕ If you like the things I have built, consider [buying me a coffee](https://buymeacoffee.com/ernestdefoe).
