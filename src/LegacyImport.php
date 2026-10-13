<?php

namespace Ernestdefoe\MenuControl;

use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Carries a forum's configuration over from resofire/menu-control, so
 * switching extensions keeps the sidebar exactly as it was arranged.
 *
 * Its settings stay in the database after `composer remove`, which is what
 * makes this possible. Nothing is imported over a configuration this
 * extension already has.
 */
class LegacyImport
{
    private const PREFIX = 'resofire-menu-control.';

    public function __construct(private SettingsRepositoryInterface $settings)
    {
    }

    public function run(): bool
    {
        if (MenuConfig::parse($this->settings->get(MenuConfig::ITEMS)) !== []) {
            return false;
        }

        $order = $this->json('order', []);
        $icons = $this->json('custom-icons', []);
        $highlighted = $this->json('highlighted', []);
        $removed = $this->json('removed-keys', []);
        $links = $this->json('custom-links', []);

        $items = [];
        $index = [];

        $add = function (string $key) use (&$items, &$index, $icons, $highlighted, $removed, $links) {
            if (isset($index[$key]) || $key === 'separator' || $key === 'moreTags' || preg_match('/^tag\d+$/', $key)) {
                return;
            }

            $item = ['key' => $key];

            if (preg_match('/^custom-link-(\d+)$/', $key, $m)) {
                $link = $links[(int) $m[1]] ?? null;

                if (! is_array($link) || empty($link['url'])) {
                    return;
                }

                // The old extension numbered links by position, which shifts
                // whenever one is deleted. Give each a key of its own.
                $item = [
                    'key' => 'link-'.$m[1],
                    'label' => $link['label'] ?? null,
                    'icon' => $link['icon'] ?? null,
                    'url' => $link['url'],
                ];
            } elseif (is_string($icons[$key] ?? null) && $icons[$key] !== '') {
                $item['icon'] = $icons[$key];
            }

            if (in_array($key, $highlighted, true)) {
                $item['highlight'] = true;
            }

            // "Removed" only ever took an item out of the old admin list — it
            // stayed on the forum. Hiding it is what those admins asked for.
            if (in_array($key, $removed, true)) {
                $item['hidden'] = true;
            }

            $index[$key] = true;
            $items[] = $item;
        };

        foreach ([$order, array_keys($icons), $highlighted, $removed] as $keys) {
            foreach ($keys as $key) {
                if (is_string($key)) {
                    $add($key);
                }
            }
        }

        foreach (array_keys($links) as $i) {
            $add('custom-link-'.$i);
        }

        $imported = MenuConfig::parse(json_encode($items));
        $flip = $this->settings->get(self::PREFIX.'flip');
        $sticky = $this->settings->get(self::PREFIX.'sticky');
        $color = $this->settings->get(self::PREFIX.'highlight-color');

        if ($imported === [] && ! $flip && ! $sticky) {
            return false;
        }

        $this->settings->set(MenuConfig::ITEMS, json_encode($imported));
        $this->settings->set(MenuConfig::FLIP, $flip ? '1' : '0');
        $this->settings->set(MenuConfig::STICKY, $sticky ? '1' : '0');

        if (is_string($color) && $color !== '') {
            $this->settings->set(MenuConfig::HIGHLIGHT_COLOR, $color);
        }

        return true;
    }

    /**
     * @return array<mixed>
     */
    private function json(string $key, array $default): array
    {
        $value = json_decode((string) $this->settings->get(self::PREFIX.$key), true);

        return is_array($value) ? $value : $default;
    }
}
