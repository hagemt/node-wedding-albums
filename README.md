# wedding-albums

Favorites-enabled (single) photo album system using `react`, `redis`, and not much else.

React application is in `src`, separate from `api` (server code) and `scripts`, etc.

To develop: `npm run server` in one terminal, `npm run client` in another.

The `images` are hueg (10+ GBs in 1170 files) so those are .gitignore'd.

Check out the album(s) at: leah-and-tor.love/wedding-albums

## REST API (server code in /api)

A fully-tested interface is available via HTTP on: `/api/v0/$RESOURCE`

(where `$RESOURCE` is `favorites` when `NODE_ENV` is `load` or `test`)

When `NODE_ENV` is `development` or `production`, resources are different.

Each resource (e.g. `laughs` and `loves`) has a distinct "key space" in Redis.

RE: Redis, it's not really a DB, but for storing state like this, it's fine.

### Basic Usage

The HTTP verbs `GET`, `POST` and `DELETE` are supported operations.

These list, increment and decrement favorites counts for ID'd photos.

To restrict your action to specific (sets of) images, use `?id=1,2,...`.

## React (web application in /src)

Boilerplate is from `create-react-app`, which is awesome BTW.

Theme is (rather minimally) derived from `bootstrap`, of course.

Where possible, the `reactstrap` components are used; KISS.

Run `react-scripts build` to merge /public and /src into /build.

Move that directory of static files into /served for production.

The static file server expects a symlink to /images in /served.

## TODO (in no particular order)

figure out where to put error boundaries
figure out how to use the service worker
figure out how to center the damn buttons
figure out how to make the buttons stateful
figure out which emoji are best to use, where
figure out why photo roulette (random) is broken
