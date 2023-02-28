<div align="center">

🔗 junction
===

*Short-URL service built for Cloudflare Workers, Pages, and KV.*

</div>

## Getting Started

As of right now, junction is best used with ShareX. A user panel will be added in the future.

```bash
git clone https://github.com/tycrek/junction.git && cd junction
npm i
```

### Bindings

First, create a KV namespace and bind it to the worker. You can do this in the [Workers dashboard](https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces).

junction expects the namespace to be called `junction`. For publishing, ensure your project is also called `junction`.

### Environment Variables

For local dev, put these variables in a file called `.dev.vars` (formatted the same as a typical `.env`).

For production, set these values on the dashboard.

- **`TOKEN`** is used for requests to junction's KV API. Set to a random string.

## Usage

To run **locally**, run `npm run dev`. This will launch the Wrangler dev server (press `B` to open the browser).

To **publish**, run `npm run publish`. This will build the project and publish it to Cloudflare Workers, under the project name `junction`.

## API

### `GET /api/shorten/:url`

Requires a `Authorization` header with a `Bearer` token. This token must match the `TOKEN` environment variable.

### `GET /:key`

Redirects to the URL associated with the key, if it exists.

## ShareX setup

1. Download and install [ShareX](https://tycrek.link/b4d55).
2. Open ShareX and click `Destinations` in the left sidebar, then click `URL Shortener`, then select **`Custom URL shortener`**.
3. Click `Destinations` again, then click `Custom uploader settings...`.
4. Create a new uploader with the following settings:

   | Setting | Value |
   | ------- | ----- |
   | Name | `junction` |
   | Destination type | `URL shortener` |
   | Method | `GET` |
   | Request URL | `https://YOUR.DOMAIN.HERE/api/shorten/{input}` |
   | Body | `No body` |
   | URL | `https://YOUR.DOMAIN.HERE/{json:key}` |   

   Add an `Authorization` header with the value `Bearer YOUR-TOKEN-FROM-ABOVE`.

5. In the bottom left of the **Custom uploader settings** window, choose **`junction`** as your URL shortener.

To shorten links with ShareX, either set a keybind or right-click the tray icon and select `Upload` > `Shorten URL...`. The link will be copied to your clipboard automatically.

## Stack

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - serverless hosting
- [Hono.js](https://hono.dev/) - backend
- [Pagery](https://github.com/tycrek/pagery) - frontend (landing page)
