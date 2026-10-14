<?php

namespace Ernestdefoe\MenuControl\Api;

use Flarum\Api\Client;
use Flarum\Group\Group;
use Flarum\Http\RequestUtil;
use Flarum\User\Guest;
use Flarum\User\User;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Throwable;

/**
 * The forum's own attributes as someone in one group would receive them, so
 * the admin preview can read the sidebar the way that group really sees it:
 * whether each extension shows its item is that extension's decision, made
 * from these attributes.
 *
 * The stand-in member is built in memory and never saved.
 */
class ViewAsController implements RequestHandlerInterface
{
    public function __construct(private Client $api)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $groupId = (int) Arr::get($request->getQueryParams(), 'group');

        if ($groupId === Group::GUEST_ID) {
            $actor = new Guest();
        } else {
            $group = Group::query()->find($groupId);

            if (! $group) {
                return new JsonResponse(['errors' => [['status' => '404', 'code' => 'not_found']]], 404);
            }

            $actor = new User();
            $actor->id = 0;
            $actor->username = 'menu-control-preview';
            $actor->is_email_confirmed = true;
            $actor->exists = false;
            // An Eloquent collection: core's isAdmin() matches groups by id.
            $actor->setRelation('groups', $group->newCollection($groupId === Group::MEMBER_ID ? [] : [$group]));
        }

        try {
            $response = $this->api->withActor($actor)->withParentRequest($request)->get('/');
            $body = json_decode((string) $response->getBody(), true);
        } catch (Throwable) {
            $body = null;
        }

        $attributes = $body['data']['attributes'] ?? null;

        if (! is_array($attributes)) {
            return new JsonResponse(['errors' => [['status' => '500', 'code' => 'preview_unavailable']]], 500);
        }

        return new JsonResponse(['attributes' => $attributes, 'guest' => $actor->isGuest()]);
    }
}
