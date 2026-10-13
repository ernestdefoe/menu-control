<?php

use Ernestdefoe\MenuControl\MenuConfig;
use Flarum\Api\Context;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Schema;
use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/less/admin.less'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Settings())
        ->default(MenuConfig::ITEMS, '[]')
        ->default(MenuConfig::FLIP, false)
        ->default(MenuConfig::STICKY, false)
        ->default(MenuConfig::HIGHLIGHT_COLOR, ''),

    // One attribute, already resolved for the person asking: items they may
    // not see are absent, so a staff-only link never reaches a guest's page.
    (new Extend\ApiResource(ForumResource::class))
        ->fields(fn () => [
            Schema\Attribute::make('menuControl')
                ->get(fn (object $forum, Context $context) => resolve(MenuConfig::class)->forActor($context->getActor())),
        ]),
];
