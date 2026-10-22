// A sticky sidebar taller than the window, kept in view the way long sidebars
// usually are: it scrolls with the page until its end shows, then stays; on
// the way back up it scrolls with the page again until its top shows.
//
// The browser does all the moving. Only when the scroll direction flips does
// this re-anchor the sidebar: a gap above it puts its in-flow position exactly
// where it is drawn, and one sticky edge takes over (top on the way down,
// bottom on the way up). The gap above it is a spacer in its column, not its
// own margin: a sticky box only shifts as far as its column leaves room above
// its margin, so a margin would stop it on the way up. The gap only uses
// slack the column already has, so the page never grows. Nothing moves at the
// moment of the switch, and between switches a scroll event reads one box at
// most.
export default function follow(el) {
  let mode = 'top'; // 'top' = the stylesheet's own sticky top; 'down'; 'up'
  let lastY;
  let pin = 0; // the stylesheet's top offset, read when the way up began
  // Phones and tablets get no sticky sidebar, so nothing to follow there.
  let active = false;

  const column = el.parentElement;
  const space = (px) => column.style.setProperty('--menu-control-space', px + 'px');

  const set = (next, top = '', bottom = '', gap = 0) => {
    mode = next;
    el.style.top = top;
    el.style.bottom = bottom;
    space(gap);
  };

  // The sidebar's in-flow top with no gap, the stylesheet's top offset and
  // bottom gap, and the slack at the foot of its column.
  const measure = () => {
    const saved = el.style.cssText;
    const gap = column.style.getPropertyValue('--menu-control-space');
    space(0);
    el.style.cssText = 'position:static';
    const base = el.getBoundingClientRect().top;
    const end = column.lastElementChild.getBoundingClientRect().bottom;
    el.style.cssText = '';
    const style = getComputedStyle(el);
    const top = parseFloat(style.top) || 0;
    const bottom = parseFloat(style.getPropertyValue('--menu-control-bottom')) || 20;
    el.style.cssText = saved;
    column.style.setProperty('--menu-control-space', gap);

    const room = column.getBoundingClientRect().bottom - parseFloat(getComputedStyle(column).paddingBottom) - end;

    return { base, top, bottom, height: el.offsetHeight, room: Math.max(0, room) };
  };

  const onScroll = () => {
    const y = window.scrollY;
    const step = y - lastY;
    if (!step || !active) return;
    const down = step > 0;
    lastY = y;
    const rect = el.getBoundingClientRect();

    // Scrolling the way it already follows needs nothing, except on the way
    // up, where it hands back to the plain sticky top once its top shows (so
    // the top of the page lays it out exactly as before).
    if (mode === (down ? 'down' : 'up')) {
      if (mode === 'up' && rect.top >= pin - 0.5) set('top');
      return;
    }
    // Held at the top, it only needs to follow down once its end is cut off.
    if (mode === 'top' && (!down || rect.bottom <= window.innerHeight)) return;

    // Where it would be now had it moved with the page through this step,
    // rather than being held by its old sticky edge: in flow, or that edge
    // moved by the step, whichever the old edge allowed.
    const edge = mode === 'up' ? pin : parseFloat(getComputedStyle(el).top);
    const m = measure();
    const flow = m.base + (parseFloat(column.style.getPropertyValue('--menu-control-space')) || 0);
    const at = mode === 'up' ? Math.min(flow, edge - step) : Math.max(flow, edge - step);
    const gap = Math.min(Math.max(0, at - m.base), m.room);

    if (m.height + m.top + m.bottom <= window.innerHeight) set('top');
    else if (down) set('down', window.innerHeight - m.height - m.bottom + 'px', '', gap);
    else if (at >= m.top) set('top');
    else {
      pin = m.top;
      set('up', 'auto', window.innerHeight - m.top - m.height + 'px', gap);
    }
  };

  const reset = () => {
    set('top');
    active = getComputedStyle(el).position === 'sticky';
    lastY = window.scrollY;
  };
  reset();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', reset);

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', reset);
    reset();
    column.style.removeProperty('--menu-control-space');
  };
}
