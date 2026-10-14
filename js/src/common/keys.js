// Entries flarum/tags adds to the same list. They are tags, not menu items:
// they follow the tags' own order and are never configured here.
export const isTagEntry = (key) => key === 'separator' || key === 'moreTags' || /^tag\d+$/.test(key);

// Opened by the admin page in a hidden frame to read the sidebar as it renders.
export const SCAN_PARAM = 'menuControlScan';
// With it, the frame reads the sidebar as a member of that group would see it.
export const AS_PARAM = 'menuControlAs';
export const SCAN_MESSAGE = 'ernestdefoe-menu-control:scan';
