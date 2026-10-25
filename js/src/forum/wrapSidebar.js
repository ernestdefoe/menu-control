import app from 'flarum/forum/app';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import follow from './follow';

// Kept in view, the whole sidebar column moves as one: the nav and whatever
// other extensions place beside it (FoF Forum Widgets' start sections). A
// sticky nav on its own would be drawn over the siblings below it, which stay
// where they are. A stacked page (Page--vertical) has no room to stick, so it
// is left as it is.
export default function wrapSidebar(items) {
  const config = app.forum.attribute('menuControl');
  const tag = items.has('sidebar') && items.get('sidebar')?.tag;
  if (!config?.sticky || !tag || !(tag === IndexSidebar || tag.prototype instanceof IndexSidebar)) return;
  if ((this.attrs.className || '').split(' ').includes('Page--vertical')) return;

  const children = items.toArray();
  Object.keys(items.toObject()).forEach((key) => items.remove(key));

  const attrs = { className: 'MenuControl-sidebar MenuControl--sticky' };
  if (config.stickyFollow) {
    attrs.className += ' MenuControl--follow';
    attrs.oncreate = ({ dom }) => (dom.menuControlFollow = follow(dom));
    attrs.onremove = ({ dom }) => dom.menuControlFollow?.();
  }

  items.add('menuControlSidebar', <div {...attrs}>{children}</div>, 100);
}
