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

## Adjusting the response type

By default, the API returns a JSON response with the following format:

```json
{
  "key": "abc123",
  "url": "https://example.com/abc123"
}
```

You may request alternate response types by adding an `Accept` header to your request. The **Response** will match the format of the `Accept` type.

At this time, junction supports the following response types:

### Supported response types


<table>
<tr>
<th><code>Accept</code> type</th>
<th>
Response format
</th>
</tr>

<!-- application/json -->
<tr>
<td><code>application/json</code></td>
<td>

```json
{
  "key": "12ab0",
  "url": "https://example.com/12ab0"
}
```

</td>
</tr>

<!-- text/plain -->
<tr>
<td><code>text/plain</code></td>
<td>

```
https://example.com/12ab0
```

</td>
</tr>

<!-- text/html -->
<tr>
<td><code>text/html</code></td>
<td>

```html
<a href="https://example.com/12ab0">https://example.com/12ab0</a>
```

</td>
</tr>

<!-- application/x-www-form-urlencoded -->
<tr>
<td><code>application/x-www-form-urlencoded</code></td>
<td>

```
url=https%3A%2F%2Fexample.com%2F12ab0
```

</td>
</tr>

<!-- application/xml -->
<tr>
<td><code>application/xml</code></td>
<td>

```xml
<short>
  <key>12ab0</key>
  <url>https://example.com/12ab0</url>
</short>
```

</td>
</tr>

</table>

junction does **not** support multiple `Accept` types. If you request multiple types, it may not behave as expected. I'll fix this in the future.

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

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - serverless hosting (technically [Cloudflare Pages](https://pages.cloudflare.com/), because I prefer using the JAMstack frontend method)
- [Hono.js](https://hono.dev/) - backend
- [Pagery](https://github.com/tycrek/pagery) - frontend (landing page)

#### Why Pages, not Workers? There's only one file!

I chose Pages because I preferred Pages [Advanced Mode](https://developers.cloudflare.com/pages/platform/functions/advanced-mode/) + asset upload over Workers storing HTML contents in KV. [Cloudflare themselves recommends this](https://developers.cloudflare.com/workers/platform/sites):

> Consider using Cloudflare Pages for hosting static applications instead of Workers Sites.

I also found this way easier to incorporate my custom JAMstack framework, [Pagery](https://github.com/tycrek/pagery). So does a service like this require a Pages site? Not really. But I plan to add a user panel in the future, and Pages is a much better fit for that.
