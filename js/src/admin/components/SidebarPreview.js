import app from 'flarum/admin/app';
import Component from 'flarum/common/Component';
import Icon from 'flarum/common/components/Icon';
import Select from 'flarum/common/components/Select';
import Group from 'flarum/common/models/Group';
import classList from 'flarum/common/utils/classList';

const t = (key, params) => app.translator.trans(`ernestdefoe-menu-control.admin.${key}`, params);

/**
 * The sidebar as a chosen group will see it, drawn from the unsaved list, so
 * every drag, hide or rename shows here before anything is saved. It applies
 * the same rules the server does: hidden items and items restricted to other
 * groups are left out.
 */
export default class SidebarPreview extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.viewer = Group.MEMBER_ID;
  }

  viewerGroups() {
    if (this.viewer === Group.GUEST_ID) return [Number(Group.GUEST_ID)];
    if (this.viewer === Group.MEMBER_ID) return [Number(Group.MEMBER_ID)];
    return [Number(Group.MEMBER_ID), Number(this.viewer)];
  }

  view() {
    const { items, found, flip, color, valid } = this.attrs;
    const groups = this.viewerGroups();

    const visible = items.filter((item) => {
      if (item.hidden) return false;
      if ('url' in item ? !valid(item.url) : found && !found[item.key]) return false;
      // An item that renders nothing right now (a "live now" badge, say) is
      // empty on the forum too.
      if (!('url' in item) && found && !item.label && !found[item.key].label && !found[item.key].icon) return false;
      return !(item.groups || []).length || item.groups.some((id) => groups.includes(Number(id)));
    });

    const tags = app.store
      .all('tags')
      .filter((tag) => tag.position() !== null && !tag.isChild())
      .sort((a, b) => a.position() - b.position())
      .slice(0, 4);

    const tagList = tags.length
      ? [
          <li className="MenuControl-previewSeparator" />,
          ...tags.map((tag) => (
            <li className="MenuControl-previewTag">
              <span className="MenuControl-previewSwatch" style={{ background: tag.color() || 'var(--control-bg)' }} />
              {tag.name()}
            </li>
          )),
        ]
      : [];

    const options = { [Group.GUEST_ID]: t('preview_guests'), [Group.MEMBER_ID]: t('preview_members') };
    app.store
      .all('groups')
      .filter((group) => ![Group.GUEST_ID, Group.MEMBER_ID].includes(group.id()))
      .forEach((group) => (options[group.id()] = group.namePlural()));

    const menu = visible.map((item) => {
      const info = found?.[item.key];
      const label = item.label || ('url' in item ? item.url : info?.label || item.name || item.key);
      const icon = item.icon || ('url' in item ? 'fas fa-link' : info?.icon);

      return (
        <li className={classList('MenuControl-previewItem', { 'is-highlight': item.highlight })}>
          {icon ? <Icon name={icon} className="MenuControl-previewIcon" /> : <span className="MenuControl-previewIcon" />}
          <span>{label}</span>
        </li>
      );
    });

    return (
      <aside className="MenuControl-preview" style={color ? { '--menu-control-highlight': color } : undefined}>
        <div className="MenuControl-previewHead">
          <span className="MenuControl-previewTitle">{t('preview_title')}</span>
          <label className="MenuControl-previewViewer">
            {t('preview_view_as')}
            <Select value={this.viewer} options={options} onchange={(value) => (this.viewer = value)} />
          </label>
        </div>
        <div className="MenuControl-previewStart">
          <Icon name="fas fa-edit" /> {t('preview_start')}
        </div>
        <ul className="MenuControl-previewList">
          {flip ? [...tagList.slice(1), <li className="MenuControl-previewSeparator" />, ...menu] : [...menu, ...tagList]}
        </ul>
        {!visible.length ? <div className="MenuControl-previewEmpty">{t('preview_empty')}</div> : null}
      </aside>
    );
  }
}
