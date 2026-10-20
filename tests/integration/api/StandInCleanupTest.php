<?php

namespace Ernestdefoe\MenuControl\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Testing\integration\TestCase;
use Flarum\User\User;
use PHPUnit\Framework\Attributes\Test;

class StandInCleanupTest extends TestCase
{
    private function stray(int $id): array
    {
        return ['id' => $id, 'username' => 'menu-control-preview', 'email' => "stray$id@machine.local", 'is_email_confirmed' => 1, 'joined_at' => Carbon::now()];
    }

    private function migrate(): void
    {
        $migration = require __DIR__.'/../../../migrations/2026_10_20_000000_remove_view_as_stand_in_users.php';
        $migration['up']($this->database()->getSchemaBuilder());
    }

    #[Test]
    public function a_stray_stand_in_is_removed_and_real_people_are_not(): void
    {
        $this->extension('ernestdefoe-menu-control');
        $this->prepareDatabase([User::class => [$this->stray(7), ['id' => 8, 'username' => 'menu-control-preview2', 'email' => 'b@machine.local', 'is_email_confirmed' => 1, 'joined_at' => Carbon::now()]]]);
        $this->app();

        $this->migrate();

        $this->assertFalse($this->database()->table('users')->where('id', 7)->exists());
        $this->assertTrue($this->database()->table('users')->where('id', 8)->exists());
        $this->assertTrue($this->database()->table('users')->where('id', 1)->exists());
    }

    #[Test]
    public function a_stand_in_with_content_is_kept(): void
    {
        $this->extension('ernestdefoe-menu-control');
        $this->prepareDatabase([
            User::class => [$this->stray(7)],
            Discussion::class => [['id' => 1, 'title' => 'x', 'user_id' => 7, 'created_at' => Carbon::now(), 'comment_count' => 0, 'participant_count' => 1]],
        ]);
        $this->app();

        $this->migrate();

        $this->assertTrue($this->database()->table('users')->where('id', 7)->exists());
    }
}
