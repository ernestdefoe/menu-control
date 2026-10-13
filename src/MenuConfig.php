<?php

namespace Ernestdefoe\MenuControl;

use Flarum\Group\Group;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\User;

/**
 * Reads the admin's sidebar configuration and resolves it for one viewer.
 *
 * The stored value is written by the admin page, but it is still treated as
 * untrusted here: this is the only place it is turned into something a
 * browser renders, so every field is checked on the way out.
 */
class MenuConfig
{
    public const ITEMS = 'ernestdefoe-menu-control.items';
    public const FLIP = 'ernestdefoe-menu-control.flip';
    public const STICKY = 'ernestdefoe-menu-control.sticky';
    public const HIGHLIGHT_COLOR = 'ernestdefoe-menu-control.highlight_color';

    private const MAX_ITEMS = 100;
    private const MAX_LABEL = 80;

    public function __construct(private SettingsRepositoryInterface $settings)
    {
    }

    /**
     * @return array{items: list<array<string, mixed>>, hide: list<string>, flip: bool, sticky: bool, highlightColor: string|null}
     */
    public function forActor(User $actor): array
    {
        $items = self::parse($this->settings->get(self::ITEMS));
        $viewerGroups = null;
        $visible = [];
        $hide = [];

        foreach ($items as $item) {
            $shown = ! $item['hidden'];

            // Only a restricted item needs the viewer's groups, so a forum
            // that restricts nothing never pays for the lookup.
            if ($shown && $item['groups']) {
                $viewerGroups ??= self::groupsOf($actor);
                $shown = (bool) array_intersect($item['groups'], $viewerGroups);
            }

            if ($shown) {
                unset($item['hidden'], $item['groups']);
                $visible[] = $item;
            } elseif (! isset($item['url'])) {
                // A built-in item still has to be taken out of the list it was
                // added to. A custom link is simply never sent.
                $hide[] = $item['key'];
            }
        }

        $color = (string) $this->settings->get(self::HIGHLIGHT_COLOR);

        return [
            'items' => $visible,
            'hide' => $hide,
            'flip' => (bool) $this->settings->get(self::FLIP),
            'sticky' => (bool) $this->settings->get(self::STICKY),
            'highlightColor' => preg_match('/^#[0-9a-f]{3,8}$/i', $color) ? $color : null,
        ];
    }

    /**
     * @return list<array{key: string, label: string|null, icon: string|null, highlight: bool, hidden: bool, groups: list<int>, url?: string, newTab?: bool}>
     */
    public static function parse(mixed $raw): array
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : null;

        if (! is_array($decoded)) {
            return [];
        }

        $items = [];
        $seen = [];

        foreach (array_slice($decoded, 0, self::MAX_ITEMS) as $entry) {
            $key = is_array($entry) ? ($entry['key'] ?? null) : null;

            if (! is_string($key) || ! preg_match('/^[A-Za-z0-9_.-]{1,64}$/', $key) || isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;

            $item = [
                'key' => $key,
                'label' => self::label($entry['label'] ?? null),
                'icon' => self::icon($entry['icon'] ?? null),
                'highlight' => ! empty($entry['highlight']),
                'hidden' => ! empty($entry['hidden']),
                'groups' => self::groups($entry['groups'] ?? []),
            ];

            if (array_key_exists('url', $entry)) {
                $url = self::url($entry['url']);

                // A custom link with nowhere safe to go is dropped, not
                // rendered as a dead or dangerous link.
                if ($url === null) {
                    continue;
                }

                $item['url'] = $url;
                $item['newTab'] = isset($entry['newTab']) ? (bool) $entry['newTab'] : self::isExternal($url);
            }

            $items[] = $item;
        }

        return $items;
    }

    public static function isExternal(string $url): bool
    {
        return ! str_starts_with($url, '/');
    }

    private static function label(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');

        return $value === '' ? null : mb_substr($value, 0, self::MAX_LABEL);
    }

    private static function icon(mixed $value): ?string
    {
        // Font Awesome classes only: letters, digits, hyphens and spaces.
        return is_string($value) && preg_match('/^[a-z0-9 -]{1,64}$/', trim($value)) ? trim($value) : null;
    }

    /**
     * @return list<int>
     */
    private static function groups(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map('intval', $value), fn (int $id) => $id > 0)));
    }

    public static function url(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        // A space pasted inside an address is encoded rather than refused.
        $value = preg_replace('/\s+/u', '%20', trim($value)) ?? '';

        // Addresses pasted without a scheme ("example.com/?ref=1", or the
        // protocol-relative "//example.com") are other sites, so give them one.
        if (preg_match('~^//[^/\\\\]~', $value)) {
            $value = 'https:'.$value;
        } elseif (preg_match('~^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(:\d+)?([/?#]\S*)?$~i', $value)) {
            $value = 'https://'.$value;
        }

        // http(s), mailto, tel, or a path on this forum. Everything else — a
        // javascript: or data: URL above all — is refused, and so is a path
        // starting /\, which browsers treat as another site.
        if (strlen($value) > 2000 || ! preg_match('~^(https?://[^\s]+|(mailto|tel):[^\s]+|/(?![/\\\\])[^\s]*)$~i', $value)) {
            return null;
        }

        return $value;
    }

    /**
     * @return list<int>
     */
    private static function groupsOf(User $actor): array
    {
        if ($actor->isGuest()) {
            return [Group::GUEST_ID];
        }

        return array_merge([Group::MEMBER_ID], $actor->groups->pluck('id')->map('intval')->all());
    }
}
