<?php

use Ernestdefoe\MenuControl\Api\PreviewUser;
use Ernestdefoe\MenuControl\Api\ViewAsController;
use Ernestdefoe\MenuControl\MenuConfig;
use Flarum\Api\Context;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Schema;
use Flarum\Extend;
use Flarum\User\User;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/less/admin.less'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Routes('api'))
        ->get('/menu-control/view-as', 'menu-control.view-as', ViewAsController::class),

    // Belt and braces: whatever builds a user named like the View as stand-in,
    // it never becomes a row (1.1.1 and 1.1.2 leaked one per preview).
    (new Extend\Event())
        ->listen('eloquent.creating: '.User::class, fn (User $user) => $user->username === PreviewUser::USERNAME ? false : null),

    (new Extend\Settings())
        ->default(MenuConfig::ITEMS, '[]')
        ->default(MenuConfig::FLIP, false)
        ->default(MenuConfig::STICKY, false)
        ->default(MenuConfig::STICKY_LONG, 'scroll')
        ->default(MenuConfig::HIGHLIGHT_COLOR, ''),

    // One attribute, already resolved for the person asking: items they may
    // not see are absent, so a staff-only link never reaches a guest's page.
    (new Extend\ApiResource(ForumResource::class))
        ->fields(fn () => [
            Schema\Attribute::make('menuControl')
                ->get(fn (object $forum, Context $context) => resolve(MenuConfig::class)->forActor($context->getActor())),
        ]),
];
