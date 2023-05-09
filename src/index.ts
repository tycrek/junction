import { Hono, Context } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { sha512 } from 'hash.js';

/**
 * Bindings introduced for Hono v3.0.0
 */
type Bindings = {
	TOKEN: string;
	ASSETS: Fetcher;
}

/**
 * Create a new Hono app
 */
const app = new Hono<{ Bindings: Bindings }>();

// 404 handler
app.notFound((ctx) => ctx.text('Not found', 404));

// Error handler
app.onError((err: any, ctx) => (console.log(err), ctx.text(`${err}`, err.res.status || 500)));

/**
 * URI decoder
 */
const uriDecoder = (url: string) => url.indexOf('%') !== -1 ? uriDecoder(decodeURIComponent(url)) : url;

/**
 * KV error handler
 */
const kvErr = (ctx: Context, err: any) => ctx.json({ error: err.message }, 500);

/**
 * Get the KV namespace binding
 */
const KV = (ctx: Context) => (ctx.env.junction as KVNamespace);

// KV routes
app
	// Bearer auth for KV
	.use('/api/kv/*', (ctx, next) => bearerAuth({ token: ctx.env.TOKEN })(ctx, next))

	// Get/Set KV value
	.get('/api/kv/:key', (ctx) => KV(ctx).get(ctx.req.param().key).then((value) => ctx.text(value)).catch((err) => kvErr(ctx, err)))
	.post('/api/kv/:key/:value', (ctx) => KV(ctx).put(ctx.req.param().key, ctx.req.param().value).catch((err) => kvErr(ctx, err)));

// Add short-URL
app
	// Bearer auth for shortener
	.use('/api/shorten/*', (ctx, next) => bearerAuth({ token: ctx.env.TOKEN })(ctx, next))
	.get('/api/shorten/*', async (ctx) => {

		// Get the decoded URL
		const url = uriDecoder(ctx.req.url.match(/(?<=api\/shorten\/)(.+)/gi)[0]);

		// Get the HTTP/S and domain
		const prefix = ctx.req.url.match(/^https?:\/\/[^/]+/g)[0];

		// Set within recursive generator if the key already exists
		let preExisting = false;

		const CHUNK_SIZE = 5;

		/**
		 * Key generator
		 * 
		 * Algorithm:
		 * 1. Hash the URL with SHA-512
		 * 2. Take the first 5 characters of the hash
		 * 2.a. If the key already exists, use the next 5 characters (this means we can have 16^5 = 1,048,576 keys)
		 * 2.b. If the key doesn't exist, use it
		 * 3. If the key doesn't exist, return it
		 */
		const keyGen = async (i = 0) => {

			// Hash the URL
			const hash = sha512().update(url).digest('hex');

			// Get the key
			const key = hash.substring(i * CHUNK_SIZE, (i * CHUNK_SIZE) + CHUNK_SIZE);

			// Check if the key exists
			const exists = await KV(ctx).get(key);

			if (exists === url) preExisting = true;

			return exists && !preExisting ? keyGen(i + 1) : key;
		};

		// Generate a key
		const key = await keyGen();

		// Set the key if it doesn't exist
		if (!preExisting) await KV(ctx).put(key, url);

		// Get the Accept header
		const accept = ctx.req.header('Accept');

		/**
		 * Mini-middleware to set the Content-Type header according to the Accept header
		 */
		const contentTypeHeader = (ctx: Context) => (ctx.header('Content-Type', ctx.req.header('Accept')), ctx);

		// Set the response formats
		const finalUrl = `${prefix}/${key}`;
		const responseFormats = {
			'application/json': (ctx: Context) => ctx.json({ key, url: finalUrl }),
			'text/plain': (ctx: Context) => ctx.text(finalUrl),
			'text/html': (ctx: Context) => ctx.html(`<a href="${finalUrl}">${finalUrl}</a>`),
			'application/x-www-form-urlencoded': (ctx: Context) => contentTypeHeader(ctx).body(`url=${finalUrl}`),
			'application/xml': (ctx: Context) => contentTypeHeader(ctx).body(`<short><key>${key}</key><url>${finalUrl}</url></short>`),
		};

		// Get the format
		const format = accept && Object.keys(responseFormats).find((f) => accept.includes(f));

		console.log(`Shortened '${url}' to '${key}' (${preExisting ? 'pre-existing' : 'new'}, returning ${format || 'defaulted application/json'})`);

		// Return the key
		return format ? responseFormats[format](ctx) : responseFormats['application/json'](ctx);
	});

// Redirect short-URL
app.get('/:needle', async (ctx) => {
	const { needle } = ctx.req.param();

	// Get the URL
	const url = await KV(ctx).get(needle);

	// If it exists, redirect
	return url ? ctx.redirect(url) : ctx.text('Not found', 404);
});

// Assets
app.get('/*', (ctx) => (ctx.env.ASSETS).fetch(ctx.req.raw));

export default app;
