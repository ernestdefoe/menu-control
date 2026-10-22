import { Admin } from 'flarum/common/extenders';
import app from 'flarum/admin/app';
import MenuEditor from './components/MenuEditor';

const t = (key) => app.translator.trans(`ernestdefoe-menu-control.admin.${key}`);

export default [
  new Admin()
    .customSetting(function () {
      return (
        <MenuEditor
          stream={this.setting('ernestdefoe-menu-control.items', '[]')}
          flip={this.setting('ernestdefoe-menu-control.flip')}
          color={this.setting('ernestdefoe-menu-control.highlight_color')}
        />
      );
    }, 100)
    .setting(
      () => ({
        setting: 'ernestdefoe-menu-control.flip',
        type: 'switch',
        label: t('flip_label'),
        help: t('flip_help'),
      }),
      90
    )
    .setting(
      () => ({
        setting: 'ernestdefoe-menu-control.sticky',
        type: 'switch',
        label: t('sticky_label'),
        help: t('sticky_help'),
      }),
      80
    )
    .setting(
      () => ({
        setting: 'ernestdefoe-menu-control.sticky_long',
        type: 'select',
        label: t('sticky_long_label'),
        help: t('sticky_long_help'),
        options: { scroll: t('sticky_long_scroll'), page: t('sticky_long_page') },
        default: 'scroll',
      }),
      75
    )
    .setting(
      () => ({
        setting: 'ernestdefoe-menu-control.highlight_color',
        type: 'color-preview',
        label: t('highlight_color_label'),
        help: t('highlight_color_help'),
      }),
      70
    ),
];
