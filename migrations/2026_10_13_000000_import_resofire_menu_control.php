<?php

use Ernestdefoe\MenuControl\LegacyImport;
use Flarum\Settings\DatabaseSettingsRepository;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        (new LegacyImport(new DatabaseSettingsRepository($schema->getConnection())))->run();
    },
    'down' => function (Builder $schema) {
        // Nothing to undo: the old extension's settings are never modified.
    },
];
