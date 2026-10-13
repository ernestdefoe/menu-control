<?php

namespace Ernestdefoe\MenuControl\Tests\integration\api;

use Ernestdefoe\MenuControl\LegacyImport;
use Ernestdefoe\MenuControl\MenuConfig;
use Flarum\Group\Group;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;

class MenuControlTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    private const ITEMS = [
        ['key' => 'following', 'label' => 'Watching <b>', 'icon' => 'fas fa-heart'],
        ['key' => 'tags', 'highlight' => true],
        ['key' => 'badges', 'hidden' => true],
        ['key' => 'staffOnly', 'groups' => [Group::ADMINISTRATOR_ID]],
        ['key' => 'link-docs', 'label' => 'Docs', 'url' => 'https://flarum.org'],
        ['key' => 'link-home', 'label' => 'Home', 'url' => '/'],
        ['key' => 'link-staff', 'label' => 'Staff', 'url' => 'https://secret.example', 'groups' => [Group::ADMINISTRATOR_ID]],
        ['key' => 'link-members', 'label' => 'Members', 'url' => '/members', 'groups' => [Group::MEMBER_ID]],
        ['key' => 'link-js', 'label' => 'Bad', 'url' => 'javascript:alert(1)'],
        ['key' => 'link-data', 'label' => 'Bad', 'url' => 'data:text/html,x'],
        ['key' => 'link-slashes', 'label' => 'Bad', 'url' => '//evil.example'],
        ['key' => 'link-backslash', 'label' => 'Bad', 'url' => '/\\evil.example'],
        ['key' => 'bad"key'],
        ['key' => 'allDiscussions', 'icon' => 'fa"><script>'],
        ['key' => 'following', 'label' => 'duplicate'],
    ];

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-menu-control');

        $this->setting(MenuConfig::ITEMS, json_encode(self::ITEMS));
        $this->setting(MenuConfig::HIGHLIGHT_COLOR, 'red;background:url(x)');

        $this->prepareDatabase([
            User::class => [$this->normalUser()],
        ]);
    }

    // setting() only applies before the app boots; this works at any time.
    private function store(string $key, string $value): void
    {
        $this->app()->getContainer()->make(SettingsRepositoryInterface::class)->set($key, $value);
    }

    private function menuFor(?int $userId): array
    {
        $response = $this->send($this->request('GET', '/api', $userId ? ['authenticatedAs' => $userId] : []));

        $this->assertSame(200, $response->getStatusCode());

        return json_decode((string) $response->getBody(), true)['data']['attributes']['menuControl'];
    }

    private static function keys(array $menu): array
    {
        return array_column($menu['items'], 'key');
    }

    #[Test]
    public function a_guest_gets_only_what_they_may_see_and_nothing_unsafe(): void
    {
        $menu = $this->menuFor(null);

        $this->assertSame(['following', 'tags', 'link-docs', 'link-home', 'allDiscussions'], self::keys($menu));
        $this->assertEqualsCanonicalizing(['badges', 'staffOnly'], $menu['hide']);

        // Restricted links are never sent; refused addresses never rendered.
        $body = json_encode($menu);
        $this->assertStringNotContainsString('secret.example', $body);
        $this->assertStringNotContainsString('javascript:', $body);
        $this->assertStringNotContainsString('data:', $body);
        $this->assertStringNotContainsString('evil.example', $body);

        $this->assertNull($menu['items'][4]['icon'], 'an icon that is not a Font Awesome class is dropped');
        $this->assertSame('Watching <b>', $menu['items'][0]['label'], 'labels are text; the browser escapes them');
        $this->assertNull($menu['highlightColor']);
    }

    #[Test]
    public function new_tab_defaults_to_external_links_only(): void
    {
        $items = array_column($this->menuFor(null)['items'], null, 'key');

        $this->assertTrue($items['link-docs']['newTab']);
        $this->assertFalse($items['link-home']['newTab']);
    }

    #[Test]
    public function a_member_sees_member_items_but_not_staff_ones(): void
    {
        $menu = $this->menuFor(2);

        $this->assertContains('link-members', self::keys($menu));
        $this->assertNotContains('link-staff', self::keys($menu));
        $this->assertContains('staffOnly', $menu['hide']);
    }

    #[Test]
    public function an_admin_sees_staff_items(): void
    {
        $menu = $this->menuFor(1);

        $this->assertContains('link-staff', self::keys($menu));
        $this->assertContains('staffOnly', self::keys($menu));
        $this->assertSame(['badges'], $menu['hide']);
    }

    private function queriesFor(array $items): int
    {
        $this->store(MenuConfig::ITEMS, json_encode($items));
        $this->menuFor(2); // warm the per-process caches first

        $this->database()->flushQueryLog();
        $this->database()->enableQueryLog();
        $this->menuFor(2);
        $count = count($this->database()->getQueryLog());
        $this->database()->disableQueryLog();

        return $count;
    }

    #[Test]
    public function the_menu_adds_no_queries_restricted_or_not(): void
    {
        $restricted = fn (int $n) => array_map(fn ($i) => ['key' => "r$i", 'groups' => [Group::MODERATOR_ID]], range(1, $n));

        // Core already loads the viewer's groups, so even restrictions are free.
        $baseline = $this->queriesFor([]);

        $this->assertSame($baseline, $this->queriesFor([['key' => 'tags'], ['key' => 'link-a', 'url' => '/a']]));
        $this->assertSame($baseline, $this->queriesFor($restricted(1)));
        $this->assertSame($baseline, $this->queriesFor($restricted(20)));
    }

    #[Test]
    public function the_old_extensions_configuration_is_imported(): void
    {
        $this->store(MenuConfig::ITEMS, '[]');

        $old = [
            'order' => json_encode(['allDiscussions', 'tag5', 'separator', 'following', 'custom-link-0', 'tags', 'custom-link-1']),
            'custom-icons' => json_encode(['following' => 'fas fa-heart']),
            'highlighted' => json_encode(['tags', 'custom-link-0']),
            'removed-keys' => json_encode(['badges']),
            'custom-links' => json_encode([
                ['label' => 'Docs', 'url' => 'https://flarum.org', 'icon' => 'fas fa-book'],
                ['label' => 'Bad', 'url' => 'javascript:alert(1)'],
            ]),
            'flip' => '1',
            'sticky' => '1',
            'highlight-color' => '#e11d48',
        ];

        foreach ($old as $key => $value) {
            $this->store("resofire-menu-control.$key", $value);
        }

        $settings = $this->app()->getContainer()->make(SettingsRepositoryInterface::class);
        $this->assertTrue((new LegacyImport($settings))->run());

        $items = MenuConfig::parse($settings->get(MenuConfig::ITEMS));

        $this->assertSame(['allDiscussions', 'following', 'link-0', 'tags', 'badges'], array_column($items, 'key'));
        $this->assertSame('fas fa-heart', $items[1]['icon']);
        $this->assertTrue($items[2]['highlight']);
        $this->assertSame('https://flarum.org', $items[2]['url']);
        $this->assertTrue($items[3]['highlight']);
        $this->assertTrue($items[4]['hidden'], 'what the old extension called removed is hidden');
        $this->assertSame('1', $settings->get(MenuConfig::FLIP));
        $this->assertSame('1', $settings->get(MenuConfig::STICKY));
        $this->assertSame('#e11d48', $settings->get(MenuConfig::HIGHLIGHT_COLOR));

        // It never overwrites a configuration this extension already has.
        $this->assertFalse((new LegacyImport($settings))->run());
    }
}
