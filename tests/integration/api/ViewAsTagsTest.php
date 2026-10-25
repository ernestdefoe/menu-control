<?php

namespace Ernestdefoe\MenuControl\Tests\integration\api;

use Flarum\Group\Group;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;

/**
 * SpikeNit asked whether View as follows tag permissions too: the preview's
 * tag list must be the one that group's sidebar really holds.
 */
class ViewAsTagsTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    private function prepare(bool $tags = true): void
    {
        if ($tags) {
            $this->extension('flarum-tags');
        }

        $this->extension('ernestdefoe-menu-control');

        $this->prepareDatabase([
            User::class => [$this->normalUser()],
            Group::class => [['id' => 5, 'name_singular' => 'Insider', 'name_plural' => 'Insiders', 'is_hidden' => 0]],
            'group_permission' => [['group_id' => 5, 'permission' => 'tag2.viewForum']],
            'tags' => [
                ['id' => 1, 'name' => 'Open', 'slug' => 'open', 'position' => 0, 'parent_id' => null, 'is_restricted' => 0, 'is_hidden' => 0],
                ['id' => 2, 'name' => 'Inner circle', 'slug' => 'inner', 'position' => 1, 'parent_id' => null, 'is_restricted' => 1, 'is_hidden' => 0],
                ['id' => 3, 'name' => 'Quiet', 'slug' => 'quiet', 'position' => 2, 'parent_id' => null, 'is_restricted' => 0, 'is_hidden' => 0],
                ['id' => 4, 'name' => 'Child of inner', 'slug' => 'inner-child', 'position' => 0, 'parent_id' => 2, 'is_restricted' => 0, 'is_hidden' => 0],
            ],
        ]);
    }

    private function tagsFor(int $group): array
    {
        $response = $this->send($this->request('GET', '/api/menu-control/view-as', ['authenticatedAs' => 1])->withQueryParams(['group' => (string) $group]));
        $this->assertSame(200, $response->getStatusCode(), (string) $response->getBody());

        $tags = json_decode((string) $response->getBody(), true)['tags'];
        sort($tags);

        return $tags;
    }

    #[Test]
    public function each_group_gets_only_the_tags_its_sidebar_lists(): void
    {
        $this->prepare();

        $this->assertSame(['1', '3'], $this->tagsFor(Group::GUEST_ID));
        $this->assertSame(['1', '3'], $this->tagsFor(Group::MEMBER_ID));
        $this->assertSame(['1', '2', '3'], $this->tagsFor(5));
        $this->assertSame(['1', '2', '3'], $this->tagsFor(Group::ADMINISTRATOR_ID));
    }

    // Hidden from "All discussions", but still in the sidebar.
    #[Test]
    public function a_hidden_tag_stays_in_the_list(): void
    {
        $this->prepare();
        $this->database()->table('tags')->where('id', 3)->update(['is_hidden' => 1]);

        $this->assertSame(['1', '3'], $this->tagsFor(Group::GUEST_ID));
    }

    #[Test]
    public function without_flarum_tags_the_list_is_empty(): void
    {
        $this->prepare(false);

        $this->assertSame([], $this->tagsFor(Group::MEMBER_ID));
    }
}
