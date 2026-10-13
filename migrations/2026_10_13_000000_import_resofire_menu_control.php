<?php

use Ernestdefoe\MenuControl\LegacyImport;
use Flarum\Settings\DatabaseSettingsRepository;
use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        // Through the app's settings service where there is one, so a forum that
        // caches settings (fof/redis) sees the change straight away.
        try {
            $settings = resolve(SettingsRepositoryInterface::class);
        } catch (Throwable) {
            $settings = new DatabaseSettingsRepository($schema->getConnection());
        }

        (new LegacyImport($settings))->run();
    },
    'down' => function (Builder $schema) {
        // Nothing to undo: the old extension's settings are never modified.
    },
];
