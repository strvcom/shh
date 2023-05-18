<div align="center">

# 🤫

Simple environment variables switcher/manager

[![npm version](https://badge.fury.io/js/@strv%2Fshh.svg)](https://www.npmjs.com/package/@strv/shh) [![by STRV](https://img.shields.io/badge/by-STRV-ec0d32)](https://www.strv.com/)

</div>

## Motivation

This library provides a simple CLI to prevent human mistakes while handling environment variable files.

## Install

```shell
npm add @strv/shh --dev
```

### Usage

```shell
yarn shh --help
```

```ts
// /src/lib/cache-tags.ts

import { CacheTags, RedisCacheTagsRegistry } from 'next-cache-tags'

export const cacheTags = new CacheTags({
  registry: new RedisCacheTagsRegistry({
    url: process.env.CACHE_TAGS_REDIS_URL
  })
})
```

### 3. Tag pages

On any page that implements `getStaticProps`, register the page with cache tags. Usually, those tags will be related to the page's content – such as a product page and related products:

```ts
// /src/pages/product/[id].tsx

import { cacheTags } from '../../lib/cache-tags'

type Product = {
  id: string
  name: string
  relatedProducts: string[]
}

export const getStaticProps = async (ctx) => {
  const product: Product = await loadProduct(ctx.param.id)
  const relatedProducts: Product[] = await loadProducts(product.relatedProducts)

  const ids = [product.id, ...product.relatedProducts]
  const tags = ids.map(id => `product:${id}`)

  cacheTags.register(ctx, tags)

  return { props: { product, relatedProducts } }
}
```

### 4. Create an invalidator

Upon content updates, usually through webhooks, an API Route should be executed and should process the tags to invalidate.

`next-cache-tags` provides a factory to create tag invalidation API Routes with ease:

```ts
// /src/pages/api/webhook.ts

import { cacheTags } from '../../lib/cache-tags'

export default cacheTags.invalidator({
  resolver: (req) => [req.body.product.id],
})
```

The `resolve` configuration is a function that receives the original request, and should resolve to the list of cache-tags to be invalidated.

Alternatively, you can execute such invalidations manually in any API Route:

```ts
// /src/pages/api/webhook.ts

import { cacheTags } from '../../lib/cache-tags'

const handler = (req, res) => {
  const tags = [req.body.product.id]

  // Dispatch revalidation processes.
  cacheTags.invalidate(res, tags)

  // ...do any other API Route logic
}

export default handler
```

## Example

Checkout the [./examples/redis](./examples/redis/) project for a complete, yet simple, use case. This project is deployed [here](https://next-cache-tags-redis-example.vercel.app/alphabet).

## Future vision

I expect that eventually Next.js will provide an API for tagging pages. As of data-source for the cache-tags registry, it could the same storage where it stores rendered pages (S3 bucket? Probably...). Alternatively, it could integrate with [Edge Config](https://vercel.com/docs/concepts/edge-network/edge-config) for ultimate availability and performance on writting/reading from the cache-tags registry.

I can imagine that this could become as simple as adding an extra property to the returned object from `getStaticProps`. Something on these lines:

```ts
// /src/pages/products.tsx

export const getStaticProps = async () => {
  const products = await loadProducts()
  const tags = products.map(product => product.id)

  return {
    tags,
    props: {
      products
    }
  }
}
```