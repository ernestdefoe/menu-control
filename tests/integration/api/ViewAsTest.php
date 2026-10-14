<?php

namespace Ernestdefoe\MenuControl\Tests\integration\api;

use Flarum\Group\Group;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;

class ViewAsTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-menu-control');

        $this->prepareDatabase([
            User::class => [$this->normalUser()],
            Group::class => [['id' => 5, 'name_singular' => 'Helper', 'name_plural' => 'Helpers', 'is_hidden' => 0]],
            'group_permission' => [
                ['group_id' => 5, 'permission' => 'discussion.hide'],
                ['group_id' => Group::MEMBER_ID, 'permission' => 'startDiscussion'],
            ],
        ]);
    }

    private function viewAs(int $group, ?int $as = 1)
    {
        return $this->send($this->request('GET', '/api/menu-control/view-as', $as ? ['authenticatedAs' => $as] : [])->withQueryParams(['group' => (string) $group]));
    }

    #[Test]
    public function only_admins_may_ask(): void
    {
        $this->assertSame(403, $this->viewAs(Group::MEMBER_ID, 2)->getStatusCode());
        $this->assertContains($this->viewAs(Group::MEMBER_ID, null)->getStatusCode(), [401, 403]);
    }

    #[Test]
    public function each_group_gets_its_own_forum_attributes(): void
    {
        $guest = json_decode((string) $this->viewAs(Group::GUEST_ID)->getBody(), true);
        $member = json_decode((string) $this->viewAs(Group::MEMBER_ID)->getBody(), true);
        $helper = json_decode((string) $this->viewAs(5)->getBody(), true);

        $this->assertTrue($guest['guest']);
        $this->assertFalse($member['guest']);

        // A guest can't start a discussion; a member can.
        $this->assertFalse($guest['attributes']['canStartDiscussion']);
        $this->assertTrue($member['attributes']['canStartDiscussion']);

        // An admin stand-in is an admin: core's own admin-only attribute appears.
        $admin = json_decode((string) $this->viewAs(Group::ADMINISTRATOR_ID)->getBody(), true);
        $this->assertArrayHasKey('adminUrl', $admin['attributes']);
        $this->assertArrayNotHasKey('adminUrl', $member['attributes']);

        // The extension's own attribute is resolved for that viewer too.
        $this->assertArrayHasKey('menuControl', $helper['attributes']);
    }

    #[Test]
    public function the_stand_in_member_is_never_saved(): void
    {
        $users = fn () => $this->database()->table('users')->count();
        $before = $users();

        foreach ([Group::GUEST_ID, Group::MEMBER_ID, 5, Group::ADMINISTRATOR_ID] as $group) {
            $this->assertSame(200, $this->viewAs($group)->getStatusCode());
        }

        $this->assertSame($before, $users());
        $this->assertFalse($this->database()->table('users')->where('username', 'menu-control-preview')->exists());
    }

    #[Test]
    public function an_unknown_group_is_a_404(): void
    {
        $this->assertSame(404, $this->viewAs(999)->getStatusCode());
    }
}
