import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import LinkButton from 'flarum/common/components/LinkButton';
import extractText from 'flarum/common/utils/extractText';
import { isTagEntry, SCAN_PARAM, SCAN_MESSAGE } from '../common/keys';

// Keys in render order. toArray() would hand back null for an empty item.
const orderedKeys = (items) =>
  Object.values(items.toObject())
    .sort((a, b) => b.priority - a.priority)
    .map((item) => item.itemName);

const scanning = window.parent !== window && new URLSearchParams(window.location.search).has(SCAN_PARAM);

// Report the sidebar exactly as every other extension left it, before any of
// our changes, so the admin page can list items it has never been told about.
function report(items) {
  if (!app.session.user?.isAdmin()) return;

  const found = orderedKeys(items)
    .filter((key) => !isTagEntry(key))
    .map((key) => {
      const vnode = items.get(key);
      return { key, label: extractText(vnode?.children ?? '').trim(), icon: vnode?.attrs?.icon || null };
    });

  window.parent.postMessage({ type: SCAN_MESSAGE, items: found }, window.location.origin);
}

function customLink(item) {
  const base = app.forum.attribute('baseUrl');
  let href = item.url;

  // A full URL to this forum is a route, so it navigates without a reload.
  if (href.startsWith(base + '/') || href === base) href = href.slice(base.length) || '/';

  const external = !href.startsWith('/') || href.startsWith('//');
  const attrs = { href, icon: item.icon || 'fas fa-link', external };

  if (item.newTab) {
    attrs.external = true;
    attrs.target = '_blank';
    attrs.rel = 'noopener noreferrer';
  }

  return <LinkButton {...attrs}>{item.label || href}</LinkButton>;
}

function apply(items) {
  if (scanning) report(items);

  const config = app.forum.attribute('menuControl');
  if (!config) return;

  config.hide.forEach((key) => items.has(key) && items.remove(key));

  // Configured items lead, in the admin's order. Anything added since keeps
  // its own priority, so it lands below them rather than vanishing.
  const top = 1000 + config.items.length;

  config.items.forEach((item, i) => {
    if (item.url) items.add(item.key, customLink(item));
    if (!items.has(item.key)) return;

    const vnode = items.get(item.key);

    if (vnode?.attrs) {
      if (item.label) vnode.children = [item.label];
      if (item.icon) vnode.attrs.icon = item.icon;
      if (item.highlight) vnode.attrs.itemClassName = ((vnode.attrs.itemClassName || '') + ' MenuControl-highlight').trim();
    }

    items.setPriority(item.key, top - i);
  });

  if (config.flip) {
    // Tags sit between -12 and -16. Put the separator under them and every
    // menu item under that, keeping the order the items are already in.
    orderedKeys(items)
      .filter((key) => !isTagEntry(key))
      .forEach((key, i) => items.setPriority(key, -100 - i));

    if (items.has('separator')) items.setPriority('separator', -50);
  }
}

// Sticky and the highlight colour ride on the sidebar element itself, so they
// follow it to every page that renders one.
function decorate(vnode) {
  const config = app.forum.attribute('menuControl');
  if (!config || !vnode?.attrs) return;

  if (config.sticky) vnode.attrs.className = (vnode.attrs.className || '') + ' MenuControl--sticky';
  if (config.highlightColor) vnode.attrs.style = { '--menu-control-highlight': config.highlightColor };
}

app.initializers.add('ernestdefoe-menu-control', () => {
  extend(IndexSidebar.prototype, 'view', decorate);

  // Registered just before the app mounts — after every extension's
  // initializer, whatever its priority — so every item already exists when
  // this runs. (The blog's initializer runs at -100000.)
  app.beforeMount(() => extend(IndexSidebar.prototype, 'navItems', apply));
});
