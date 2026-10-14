import app from 'flarum/admin/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import Icon from 'flarum/common/components/Icon';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import classList from 'flarum/common/utils/classList';
import faIcons, { regularIcons } from '../utils/faIcons';

const t = (key, params) => app.translator.trans(`ernestdefoe-menu-control.admin.${key}`, params);

const STYLES = { solid: 'fas', regular: 'far', brands: 'fab' };
const SHOWN = 240; // enough to browse; searching narrows the rest

// Words a search can contain that name a style, not an icon.
const STYLE_WORDS = new Set(['fa', 'fas', 'far', 'fab', 'fa-solid', 'fa-regular', 'fa-brands']);

/**
 * A searchable grid of every Font Awesome icon this forum can draw. It only
 * fills the text field beside it, which still takes any class by hand.
 */
export default class IconPicker extends Component {
  oninit(vnode) {
    super.oninit(vnode);

    this.query = '';
    this.style = /^fab\b|fa-brands/.test(this.attrs.value || '') ? 'brands' : /^far\b|fa-regular/.test(this.attrs.value || '') ? 'regular' : 'solid';
    this.regular = null;
    if (this.style === 'regular') this.loadRegular();

    this.onkeydown = (e) => e.key === 'Escape' && this.attrs.onclose();
    this.onclick = (e) => !this.element.contains(e.target) && !e.target.closest('.MenuControl-pickerToggle') && this.attrs.onclose();
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    document.addEventListener('keydown', this.onkeydown);
    document.addEventListener('mousedown', this.onclick);
    this.element.querySelector('input')?.focus();
  }

  onremove() {
    document.removeEventListener('keydown', this.onkeydown);
    document.removeEventListener('mousedown', this.onclick);
  }

  loadRegular() {
    regularIcons().then((icons) => {
      this.regular = icons;
      m.redraw();
    });
  }

  icons() {
    if (this.style === 'brands') return faIcons().brands;
    if (this.style === 'regular') return this.regular;
    return faIcons().classic;
  }

  matches(icons) {
    if (!icons) return [];

    // "fas fa-house" and "fa-house" find the house as well as "house" does.
    const words = this.query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word && !STYLE_WORDS.has(word))
      .map((word) => word.replace(/^fa-/, ''));

    const found = icons.filter((icon) => words.every((w) => icon.search.includes(w)));

    // Enter picks the first result, so the closest names lead.
    const query = words.join('-');
    const rank = (icon) => (icon.name === query ? 0 : icon.name.startsWith(query) ? 1 : 2);

    return query ? found.sort((a, b) => rank(a) - rank(b)) : found;
  }

  view() {
    const all = this.icons();
    const matches = this.matches(all);
    const prefix = STYLES[this.style];

    return (
      <div className="MenuControl-picker" role="dialog" aria-label={t('picker_label')}>
        <div className="MenuControl-pickerBar">
          <input
            className="FormControl"
            type="search"
            placeholder={t('picker_search')}
            value={this.query}
            oninput={(e) => (this.query = e.target.value)}
            onkeydown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (matches[0]) this.attrs.onpick(`${prefix} fa-${matches[0].name}`);
            }}
          />
          <div className="ButtonGroup MenuControl-pickerStyles">
            {Object.keys(STYLES).map((style) => (
              <Button
                className={classList('Button', { active: this.style === style })}
                aria-pressed={this.style === style ? 'true' : 'false'}
                onclick={() => {
                  this.style = style;
                  if (style === 'regular' && !this.regular) this.loadRegular();
                }}
              >
                {t('picker_' + style)}
              </Button>
            ))}
          </div>
        </div>

        {all ? (
          <div className="MenuControl-pickerGrid">
            {matches.slice(0, SHOWN).map((icon) => {
              const value = `${prefix} fa-${icon.name}`;
              return (
                <button
                  type="button"
                  className={classList('MenuControl-pickerIcon', { active: this.attrs.value === value })}
                  title={value}
                  aria-label={value}
                  onclick={() => this.attrs.onpick(value)}
                >
                  <Icon name={value} />
                </button>
              );
            })}
          </div>
        ) : (
          <LoadingIndicator display="block" size="small" />
        )}

        <div className="MenuControl-pickerFoot">
          {all && matches.length > SHOWN
            ? t('picker_more', { shown: SHOWN, count: matches.length })
            : all && !matches.length
              ? t('picker_none')
              : t('picker_count', { count: matches.length })}
        </div>
      </div>
    );
  }
}
