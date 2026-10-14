import app from 'flarum/admin/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import Icon from 'flarum/common/components/Icon';
import Switch from 'flarum/common/components/Switch';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import classList from 'flarum/common/utils/classList';
import { SCAN_PARAM, SCAN_MESSAGE } from '../../common/keys';
import IconPicker from './IconPicker';
import SidebarPreview from './SidebarPreview';

const t = (key, params) => app.translator.trans(`ernestdefoe-menu-control.admin.${key}`, params);

// The same rules the server applies before anything reaches the forum.
const KEY = /^[A-Za-z0-9_.-]{1,64}$/;

export function normalizeUrl(value) {
  let url = String(value || '')
    .trim()
    .replace(/\s+/g, '%20');

  if (/^\/\/[^/\\]/.test(url)) url = 'https:' + url;
  else if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(:\d+)?([/?#]\S*)?$/i.test(url)) url = 'https://' + url;

  return url.length <= 2000 && /^(https?:\/\/\S+|(mailto|tel):\S+|\/(?![/\\])\S*)$/i.test(url) ? url : null;
}

function parse(json) {
  try {
    const value = JSON.parse(json || '[]');
    return Array.isArray(value) ? value.filter((item) => item && KEY.test(item.key)) : [];
  } catch (e) {
    return [];
  }
}

const newKey = () => 'link-' + Math.random().toString(36).slice(2, 10);

/**
 * The sidebar, as a list to drag into order. Every built-in item comes from
 * a scan of the real forum sidebar in a hidden frame, so items added by any
 * extension appear here without this one knowing about them.
 */
export default class MenuEditor extends Component {
  oninit(vnode) {
    super.oninit(vnode);

    this.items = parse(this.attrs.stream());
    this.found = null; // key → { label, icon } once the scan reports
    this.open = null;

    this.onmessage = this.onmessage.bind(this);
    window.addEventListener('message', this.onmessage);
    this.scanTimeout = setTimeout(() => this.finishScan({}, true), 15000);

    import('flarum/admin/utils/loadSortable').then(({ default: sortable }) => {
      this.sortable = sortable;
      this.makeSortable();
    });
  }

  onremove() {
    window.removeEventListener('message', this.onmessage);
    clearTimeout(this.scanTimeout);
    this.sortableInstance?.destroy();
  }

  onmessage(event) {
    if (event.origin !== window.location.origin || event.source !== this.frame?.contentWindow || event.data?.type !== SCAN_MESSAGE) return;

    const found = {};
    (event.data.items || []).forEach((item) => (found[item.key] = item));
    this.finishScan(found);
  }

  finishScan(found, failed = false) {
    if (this.found) return;

    clearTimeout(this.scanTimeout);
    this.found = found;
    this.scanFailed = failed;

    // Note each item's real name for when its extension is switched off, and
    // list items the sidebar has gained since the last save at the end. Both
    // are only stored with the admin's next real change, so opening the page
    // never lights up the Save button by itself.
    Object.values(found).forEach((entry) => {
      const item = this.items.find((other) => other.key === entry.key);

      if (item) item.name = entry.label;
      else this.items.push({ key: entry.key, name: entry.label });
    });

    m.redraw();
  }

  save() {
    this.attrs.stream(JSON.stringify(this.items));
  }

  view() {
    const scanUrl = app.forum.attribute('baseUrl') + '/?' + SCAN_PARAM + '=1';

    return (
      <div className="Form-group MenuControl">
        <label>{t('items_label')}</label>
        <div className="helpText">{t('items_help')}</div>

        {this.found ? null : (
          <iframe
            className="MenuControl-frame"
            src={scanUrl}
            title=""
            aria-hidden="true"
            tabindex="-1"
            oncreate={(vnode) => (this.frame = vnode.dom)}
          />
        )}

        {this.found ? null : (
          <div className="MenuControl-scanning">
            <LoadingIndicator display="inline" size="small" /> {t('scanning')}
          </div>
        )}

        {this.scanFailed ? <div className="MenuControl-scanning">{t('scan_failed')}</div> : null}

        <div className="MenuControl-layout">
          <div className="MenuControl-main">
            <ul className="MenuControl-list" oncreate={(vnode) => ((this.list = vnode.dom), this.makeSortable())}>
              {this.items.map((item, index) => this.row(item, index))}
            </ul>

            <Button className="Button MenuControl-add" icon="fas fa-plus" onclick={() => this.addLink()}>
              {t('add_link')}
            </Button>
          </div>

          <SidebarPreview
            items={this.items}
            found={this.scanFailed ? null : this.found}
            flip={[true, '1', 1].includes(this.attrs.flip?.())}
            color={/^#[0-9a-f]{3,8}$/i.test(this.attrs.color?.() || '') ? this.attrs.color() : null}
            valid={normalizeUrl}
          />
        </div>
      </div>
    );
  }

  row(item, index) {
    const found = this.found?.[item.key];
    const isLink = 'url' in item;
    const missing = this.found && !this.scanFailed && !found && !isLink;
    const name = isLink ? item.label || item.url || t('new_link') : found?.label || item.name || item.key;
    const icon = item.icon || (isLink ? 'fas fa-link' : found?.icon);
    const restricted = (item.groups || []).length > 0;
    const expanded = this.open === item.key;

    return (
      <li
        key={item.key}
        data-key={item.key}
        className={classList('MenuControl-item', { 'is-hidden': item.hidden, 'is-missing': missing, 'is-open': expanded })}
      >
        <div className="MenuControl-row">
          <span
            className="MenuControl-handle"
            tabindex="0"
            role="button"
            aria-label={t('drag_label', { name })}
            title={t('drag_label', { name })}
            onkeydown={(e) => this.keyMove(e, index)}
          >
            <Icon name="fas fa-grip-vertical" />
          </span>
          <span className="MenuControl-icon">{icon ? <Icon name={icon} /> : null}</span>
          <span className="MenuControl-name">
            {item.label && !isLink ? (
              <>
                {item.label} <span className="MenuControl-original">{name}</span>
              </>
            ) : (
              name
            )}
          </span>
          <span className="MenuControl-badges">
            {isLink ? <span className="MenuControl-badge">{t('badge_link')}</span> : null}
            {restricted ? (
              <span className="MenuControl-badge" title={this.groupNames(item.groups)}>
                <Icon name="fas fa-user-lock" /> {t('badge_groups', { count: item.groups.length })}
              </span>
            ) : null}
            {isLink && !normalizeUrl(item.url) ? (
              <span className="MenuControl-badge MenuControl-badge--warning">{t('badge_invalid_url')}</span>
            ) : null}
            {missing ? <span className="MenuControl-badge MenuControl-badge--muted">{t('badge_missing')}</span> : null}
          </span>
          <Button
            className={classList('Button Button--icon Button--flat MenuControl-toggle', { active: item.highlight })}
            icon={item.highlight ? 'fas fa-star' : 'far fa-star'}
            aria-label={t(item.highlight ? 'unhighlight' : 'highlight')}
            title={t(item.highlight ? 'unhighlight' : 'highlight')}
            onclick={() => this.update(item, { highlight: !item.highlight })}
          />
          <Button
            className="Button Button--icon Button--flat MenuControl-toggle"
            icon={item.hidden ? 'fas fa-eye-slash' : 'fas fa-eye'}
            aria-label={t(item.hidden ? 'show' : 'hide')}
            title={t(item.hidden ? 'show' : 'hide')}
            onclick={() => this.update(item, { hidden: !item.hidden })}
          />
          <Button
            className="Button Button--icon Button--flat MenuControl-toggle"
            icon={expanded ? 'fas fa-chevron-up' : 'fas fa-pen'}
            aria-label={t('edit')}
            aria-expanded={expanded ? 'true' : 'false'}
            title={t('edit')}
            onclick={() => (this.open = expanded ? null : item.key)}
          />
        </div>

        {expanded ? this.details(item, isLink, found) : null}
      </li>
    );
  }

  details(item, isLink, found) {
    const groups = app.store.all('groups');
    const selected = item.groups || [];
    const toggleGroup = (id) => this.update(item, { groups: selected.includes(id) ? selected.filter((g) => g !== id) : [...selected, id] });

    return (
      <div className="MenuControl-details">
        {isLink ? (
          <div className="MenuControl-field">
            <label>{t('url_label')}</label>
            <input
              className="FormControl"
              type="text"
              placeholder="https://… or /p/1-about"
              value={item.url}
              oninput={(e) => this.update(item, { url: e.target.value })}
            />
            <div className="helpText">
              {normalizeUrl(item.url) && normalizeUrl(item.url) !== (item.url || '').trim()
                ? t('url_normalized', { url: normalizeUrl(item.url) })
                : t('url_help')}
            </div>
          </div>
        ) : null}

        <div className="MenuControl-field">
          <label>{t(isLink ? 'link_label' : 'rename_label')}</label>
          <input
            className="FormControl"
            type="text"
            maxlength="80"
            placeholder={isLink ? '' : found?.label || item.name || item.key}
            value={item.label || ''}
            oninput={(e) => this.update(item, { label: e.target.value })}
          />
          {isLink ? null : <div className="helpText">{t('rename_help')}</div>}
        </div>

        <div className="MenuControl-field">
          <label>{t('icon_label')}</label>
          <div className="MenuControl-iconInput">
            <Button
              className="Button Button--icon MenuControl-pickerToggle"
              icon={item.icon || (isLink ? 'fas fa-link' : found?.icon) || 'fas fa-icons'}
              aria-label={t('picker_open')}
              title={t('picker_open')}
              aria-expanded={this.picking === item.key ? 'true' : 'false'}
              onclick={() => (this.picking = this.picking === item.key ? null : item.key)}
            />
            <input
              className="FormControl"
              type="text"
              placeholder={isLink ? 'fas fa-link' : found?.icon || 'fas fa-fire'}
              value={item.icon || ''}
              oninput={(e) => this.update(item, { icon: e.target.value })}
            />
          </div>
          {this.picking === item.key ? (
            <IconPicker
              value={item.icon}
              onpick={(icon) => {
                this.update(item, { icon });
                this.picking = null;
              }}
              onclose={() => {
                this.picking = null;
                m.redraw();
              }}
            />
          ) : null}
          <div className="helpText">{t('icon_help')}</div>
        </div>

        {isLink ? (
          <div className="MenuControl-field">
            <Switch
              state={item.newTab ?? !/^\/(?![/\\])/.test(normalizeUrl(item.url) || '')}
              onchange={(value) => this.update(item, { newTab: value })}
            >
              {t('new_tab_label')}
            </Switch>
          </div>
        ) : null}

        <div className="MenuControl-field">
          <label>{t('groups_label')}</label>
          <div className="helpText">{t('groups_help')}</div>
          <div className="MenuControl-groups">
            {groups.map((group) => (
              <label className="checkbox">
                <input type="checkbox" checked={selected.includes(Number(group.id()))} onchange={() => toggleGroup(Number(group.id()))} />
                {group.namePlural()}
              </label>
            ))}
          </div>
        </div>

        {isLink ? (
          <Button className="Button Button--danger MenuControl-delete" icon="fas fa-trash" onclick={() => this.remove(item)}>
            {t('delete_link')}
          </Button>
        ) : null}
      </div>
    );
  }

  groupNames(ids) {
    return ids
      .map((id) => app.store.getById('groups', String(id))?.namePlural())
      .filter(Boolean)
      .join(', ');
  }

  update(item, changes) {
    Object.assign(item, changes);

    // Keep stored entries small: drop anything that is back at its default.
    // Never trim while typing — the space in "fas fa-fire" would vanish as it
    // is typed. The server trims on the way out.
    ['label', 'icon'].forEach((field) => typeof item[field] === 'string' && !item[field].trim() && delete item[field]);
    ['hidden', 'highlight'].forEach((field) => item[field] === false && delete item[field]);
    if (item.groups && !item.groups.length) delete item.groups;

    this.save();
  }

  addLink() {
    const item = { key: newKey(), url: '', label: '' };
    this.items.push(item);
    this.open = item.key;
    this.save();
  }

  remove(item) {
    this.items = this.items.filter((other) => other !== item);
    this.save();
  }

  move(from, to) {
    if (to < 0 || to >= this.items.length || from === to) return;

    const [item] = this.items.splice(from, 1);
    this.items.splice(to, 0, item);
    this.save();
  }

  // Alt + arrow keys on a focused handle, for anyone not using a mouse.
  keyMove(e, index) {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;

    e.preventDefault();
    const to = index + (e.key === 'ArrowUp' ? -1 : 1);
    this.move(index, to);
    m.redraw.sync();
    this.list?.querySelectorAll('.MenuControl-handle')[to]?.focus();
  }

  makeSortable() {
    if (!this.sortable || !this.list?.isConnected || this.sortableInstance) return;

    this.sortableInstance = this.sortable.create(this.list, {
      handle: '.MenuControl-handle',
      animation: 150,
      delay: 50,
      delayOnTouchOnly: true,
      ghostClass: 'MenuControl-item--ghost',
      onEnd: (evt) => {
        // Put the DOM back where Mithril left it, then let the redraw move it.
        const { from, item, oldIndex, newIndex } = evt;
        from.insertBefore(item, from.children[oldIndex + (oldIndex > newIndex ? 1 : 0)] || null);
        this.move(oldIndex, newIndex);
        m.redraw();
      },
    });
  }
}
