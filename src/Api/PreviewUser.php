<?php

namespace Ernestdefoe\MenuControl\Api;

use Flarum\User\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * The stand-in member "View as" reads the forum as. It lives for one request
 * and can never reach the database: every path Eloquent writes through is a
 * no-op here, whoever calls it (core, another extension, a listener).
 *
 * The increment/decrement overrides matter most. On a model that does not
 * exist, Eloquent runs them as an UPDATE with no WHERE, which would change
 * that column for every user on the forum.
 */
final class PreviewUser extends User
{
    public const USERNAME = 'menu-control-preview';

    // Behave as a User for tables, keys and morph types, not as "preview_users".
    protected $table = 'users';

    public function getForeignKey()
    {
        return 'user_id';
    }

    public function joiningTableSegment()
    {
        return 'user';
    }

    public function getMorphClass()
    {
        return (new User)->getMorphClass();
    }

    // save() covers update(), saveQuietly(), saveOrFail(), push() and forceFill()->save().
    public function save(array $options = [])
    {
        return false;
    }

    public function saveOrIgnore(array $options = [], array|string|null $uniqueBy = null)
    {
        return false;
    }

    public function push()
    {
        return false;
    }

    public function touch($attribute = null)
    {
        return false;
    }

    public function touchOwners()
    {
    }

    public function delete()
    {
        return false;
    }

    protected function incrementOrDecrement($column, $amount, $extra, $method)
    {
        return 0;
    }

    protected function incrementOrDecrementEach(array $columns, array $extra, string $method)
    {
        return 0;
    }

    // The funnels under all of the above, in case a future Eloquent adds a path.
    protected function performInsert(Builder $query)
    {
        return false;
    }

    protected function performUpdate(Builder $query)
    {
        return false;
    }

    protected function performDeleteOnModel()
    {
    }
}
