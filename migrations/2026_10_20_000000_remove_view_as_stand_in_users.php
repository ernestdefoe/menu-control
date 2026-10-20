<?php

use Ernestdefoe\MenuControl\Api\PreviewUser;
use Illuminate\Database\Schema\Builder;
use Psr\Log\LoggerInterface;

// 1.1.1 and 1.1.2 could save View as's stand-in member as a real account,
// one per preview. Remove those rows. One that somehow has posts or
// discussions is left alone and logged, so nothing anyone wrote is lost.
return [
    'up' => function (Builder $schema) {
        $db = $schema->getConnection();

        foreach ($db->table('users')->where('username', PreviewUser::USERNAME)->pluck('id') as $id) {
            $hasContent = $db->table('posts')->where('user_id', $id)->exists()
                || $db->table('discussions')->where('user_id', $id)->exists();

            if ($hasContent) {
                try {
                    resolve(LoggerInterface::class)->warning("[menu-control] Kept user #$id (".PreviewUser::USERNAME.'): it has posts or discussions.');
                } catch (Throwable) {
                }

                continue;
            }

            $db->table('users')->where('id', $id)->delete();
        }
    },
    'down' => function (Builder $schema) {
        // Nothing to restore.
    },
];
