import { jest } from '@jest/globals';
import bootstrapForum from '@flarum/jest-config/src/bootstrap/forum';
import m from 'mithril';
import mq from 'mithril-query';
import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import Component from 'flarum/common/Component';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import PageStructure from 'flarum/forum/components/PageStructure';
import '../../src/forum';

/** Stands in for another extension's sidebar sections, such as FoF Forum Widgets' start sections. */
const Section = (className) => ({ view: () => m('div', { className }) });

/** A theme's own index sidebar. */
class ThemeSidebar extends IndexSidebar {
  view() {
    return m('nav.IndexPage-nav.ThemeSidebar');
  }
}

class OtherSidebar extends Component {
  view() {
    return m('nav.OtherSidebar');
  }
}

const config = (attrs) =>
  app.forum.pushAttributes({ menuControl: { items: [], hide: [], flip: false, sticky: false, stickyFollow: false, highlightColor: null, ...attrs } });

const page = (sidebar = IndexSidebar, className = 'IndexPage') => mq(PageStructure, { className, sidebar: () => m(sidebar) }, m('p', 'list'));

/** Draws the page into jsdom, which (unlike mithril-query's DOM) handles CSS custom properties. */
const mount = () => {
  const root = document.createElement('div');
  m.mount(root, { view: () => m(PageStructure, { className: 'IndexPage', sidebar: () => m(IndexSidebar) }) });

  return root;
};

let dropSidebar = false;

const classes = (els) => Array.from(els).map((el) => el.className);

beforeAll(() => {
  bootstrapForum();

  // Registered in an initializer, as FoF Forum Widgets does, so before ours.
  extend(PageStructure.prototype, 'sidebarItems', function (items) {
    items.add('startTop', m(Section('StartTop')), 110);
    items.add('startBottom', m(Section('StartBottom')), 90);
    if (dropSidebar) items.remove('sidebar');
  });

  app.initializers.get('ernestdefoe-menu-control')(app);
  app.boot();
});

describe('a sidebar kept in view', () => {
  it('leaves the sidebar alone when it is not kept in view', () => {
    config({ sticky: false });

    expect(classes(page().first('.Page-sidebar').children)).toEqual(['StartTop', expect.stringContaining('IndexPage-nav'), 'StartBottom']);
    expect(page()).not.toHaveElement('.MenuControl-sidebar');
  });

  it('keeps the whole column in view as one, so nothing beside the nav is drawn over', () => {
    config({ sticky: true });

    const column = page().first('.Page-sidebar');

    expect(classes(column.children)).toEqual(['MenuControl-sidebar MenuControl--sticky']);
    expect(classes(column.firstElementChild.children)).toEqual(['StartTop', expect.stringContaining('IndexPage-nav'), 'StartBottom']);
    expect(page()).not.toHaveElement('.IndexPage-nav.MenuControl--sticky');
  });

  it('marks the column for following the page when the sidebar scrolls with it', () => {
    config({ sticky: true, stickyFollow: true });

    const root = mount();

    expect(root.querySelector('.Page-sidebar > .MenuControl-sidebar.MenuControl--sticky.MenuControl--follow')).not.toBeNull();
    m.mount(root, null);
  });

  it("wraps a theme's own index sidebar", () => {
    config({ sticky: true });

    expect(page(ThemeSidebar)).toHaveElement('.MenuControl-sidebar > .ThemeSidebar');
  });

  it('leaves other sidebars, and stacked pages, alone', () => {
    config({ sticky: true });

    expect(page(OtherSidebar)).not.toHaveElement('.MenuControl-sidebar');
    expect(page(IndexSidebar, 'TagsPage Page--vertical')).not.toHaveElement('.MenuControl-sidebar');
  });

  it('copes with a page whose sidebar item another extension removed', () => {
    config({ sticky: true });

    dropSidebar = true;

    expect(() => page()).not.toThrow();
    expect(page()).not.toHaveElement('.MenuControl-sidebar');

    dropSidebar = false;
  });

  it('keeps the highlight colour on the nav', () => {
    config({ sticky: true, highlightColor: '#ff0000' });

    const root = mount();
    const nav = root.querySelector('.IndexPage-nav');

    expect(nav.style.getPropertyValue('--menu-control-highlight')).toBe('#ff0000');
    expect(nav.className).not.toContain('MenuControl--sticky');
    expect(root.querySelector('.MenuControl-sidebar').style.getPropertyValue('--menu-control-highlight')).toBe('');
    m.mount(root, null);
  });

  it('starts following the page when the column is drawn, and stops when it goes', () => {
    config({ sticky: true, stickyFollow: true });

    const remove = jest.spyOn(window, 'removeEventListener');
    const root = mount();

    expect(typeof root.querySelector('.MenuControl-sidebar').menuControlFollow).toBe('function');

    m.mount(root, null);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
