<?php

namespace Ernestdefoe\MenuControl\Tests\integration\api;

use Carbon\Carbon;
use Ernestdefoe\MenuControl\Api\PreviewUser;
use Flarum\Api\Resource\UserResource;
use Flarum\Api\Schema;
use Flarum\Extend;
use Flarum\Group\Group;
use Flarum\Http\RequestUtil;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * DLBB's forum grew a "menu-control-preview" account every time View as was
 * used: something on that forum saved the stand-in actor. Here an extension
 * does every kind of write it could, and nothing may reach the database.
 */
class ViewAsNeverSavesTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->extension('ernestdefoe-menu-control');

        $this->extend(
            (new Extend\Middleware('api'))->add(SavesTheActor::class),
            (new Extend\ApiResource(UserResource::class))->fields(fn () => [
                Schema\Attribute::make('menuControlTestWrites')->get(function (User $user) {
                    if ($user->id === 0) {
                        SavesTheActor::writeEverything($user);
                    }

                    return null;
                }),
            ]),
        );

        $this->prepareDatabase([
            User::class => [$this->normalUser()],
            Group::class => [['id' => 5, 'name_singular' => 'Helper', 'name_plural' => 'Helpers', 'is_hidden' => 0]],
            'group_permission' => [['group_id' => Group::MEMBER_ID, 'permission' => 'startDiscussion']],
        ]);
    }

    private function viewAs(int $group): array
    {
        $response = $this->send($this->request('GET', '/api/menu-control/view-as', ['authenticatedAs' => 1])->withQueryParams(['group' => (string) $group]));
        $this->assertSame(200, $response->getStatusCode(), (string) $response->getBody());

        return json_decode((string) $response->getBody(), true);
    }

    #[Test]
    public function writes_from_anywhere_in_the_request_never_reach_the_users_table(): void
    {
        $snapshot = fn () => $this->database()->table('users')->orderBy('id')->get(['id', 'username', 'comment_count', 'discussion_count'])->toJson();
        $before = $snapshot();

        foreach ([Group::MEMBER_ID, 5, Group::ADMINISTRATOR_ID] as $group) {
            $attributes = $this->viewAs($group)['attributes'];
            $this->assertArrayHasKey('menuControl', $attributes);
        }

        // Same rows, and the no-WHERE increment never touched anyone's counts.
        $this->assertSame($before, $snapshot());
        $this->assertFalse($this->database()->table('users')->where('username', PreviewUser::USERNAME)->exists());
        $this->assertFalse($this->database()->table('group_user')->where('user_id', 0)->exists());
    }

    #[Test]
    public function the_attributes_are_still_the_groups_own(): void
    {
        $member = $this->viewAs(Group::MEMBER_ID)['attributes'];
        $admin = $this->viewAs(Group::ADMINISTRATOR_ID)['attributes'];

        $this->assertTrue($member['canStartDiscussion']);
        $this->assertArrayNotHasKey('adminUrl', $member);
        $this->assertArrayHasKey('adminUrl', $admin);
    }

    #[Test]
    public function no_plain_user_with_the_stand_in_name_can_be_created(): void
    {
        $this->app();
        $before = $this->database()->table('users')->count();

        $user = new User();
        $user->username = PreviewUser::USERNAME;
        $user->email = 'preview@machine.local';
        $user->password = 'unused';
        $user->joined_at = Carbon::now();

        $this->assertFalse($user->save());
        $this->assertSame($before, $this->database()->table('users')->count());
    }
}

class SavesTheActor implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);

        if (! $actor->isGuest() && $actor->id === 0) {
            self::writeEverything($actor);
        }

        return $handler->handle($request);
    }

    public static function writeEverything(User $user): void
    {
        $user->last_seen_at = Carbon::now();
        $user->save();
        $user->saveQuietly();
        $user->forceFill(['comment_count' => 99])->save();
        $user->touch();
        $user->push();
        $user->increment('comment_count');
        $user->decrement('discussion_count');
        $user->incrementEach(['comment_count' => 1]);
        $user->update();
        $user->delete();
    }
}
