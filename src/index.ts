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
app.onError((err, ctx) => (console.log(err), ctx.text(`${err}`, 500)));

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
	.use('/api/shorten/*', (ctx, next) => bearerAuth({ token: ctx.env.TOKEN })(ctx, next))
	.get('/api/shorten/*', async (ctx) => {

		const uriDecoder = (url: string) => url.indexOf('%') !== -1 ? uriDecoder(decodeURIComponent(url)) : url;

		// sample URL: http://127.0.0.1:8788/api/shorten/https://jmoore.dev
		// regex: /(?<=api\/shorten\/)(.+)/gi
		// result: https://jmoore.dev
		const url = uriDecoder(ctx.req.url.match(/(?<=api\/shorten\/)(.+)/gi)[0]);
		console.log(`Shortening URL: ${url}`);

		/**
		 * Key generator
		 * 
		 * Algorithm:
		 * 1. Hash the with SHA-512
		 * 2. Take the first 4 characters
		 * 2.a. If the key already exists, use the next 5 characters (this means we can have 16^5 = 1,048,576 keys)
		 * 2.b. If the key doesn't exist, use it
		 * 3. If the key doesn't exist, return it
		 */
		const keyGen = async (i = 0) => {

			// Hash the URL
			const hash = sha512().update(url).digest('hex');

			// Get the key
			const key = hash.substring(i * 5, (i * 5) + 5);

			// Check if the key exists
			const exists = await KV(ctx).get(key);

			return exists ? keyGen(i + 1) : key;
		};

		// Generate a key
		const key = await keyGen();

		// Set the key
		await KV(ctx).put(key, url);

		// Return the key
		return ctx.json({ key });
	});

// Redirect short-URL
app.get('/:needle', async (ctx) => {
	const { needle } = ctx.req.param();

	// Get the URL
	const url = await KV(ctx).get(needle);

	// If it exists, redirect
	return url ? ctx.redirect(url) : ctx.text('Not found', 404);
});

app.get('/*', (ctx) => (ctx.env.ASSETS).fetch(ctx.req.raw));

export default app;
