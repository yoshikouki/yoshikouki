---
title: "Hono 上で最小構成の React Server Components を実現する"
emoji: "🔥"
type: "tech"
topics: ["react", "hono", "rsc", "vite", "cloudflare"]
published: false
---

## はじめに

React Server Components（RSC）は React 19 で正式にサポートされた機能です。しかし実際に RSC を使おうとすると、ほとんどの場合 Next.js のようなフルスタックフレームワークを経由することになります。

RSC そのものの仕組み — Server Component がどうレンダリングされ、ストリームとしてクライアントに届き、ハイドレーションされるのか — を理解したくて、**フレームワークに依存しない最小限の自前実装で RSC を動かすテンプレート**を作りました。

https://github.com/yoshikouki/hono-rsc-template

この記事では、テンプレートの設計をコードとともに解説します。

:::message
**スコープについて**

この記事で扱うのは RSC の**レンダリングとストリーミング**です。[Server Functions](https://ja.react.dev/reference/rsc/server-functions)（旧 Server Actions）は対象外です。Server Functions が必要な場合は [Waku](https://waku.gg/) や [Next.js](https://nextjs.org/) を検討してください。
:::

## `@vitejs/plugin-rsc` — RSC のビルド基盤

今回の構成を支えているのが [`@vitejs/plugin-rsc`](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc) です。Vite 6 の [Environment API](https://vite.dev/guide/api-environment) を使い、**1つの Vite プロジェクトの中に 3つのビルド環境**を作ります。

| 環境 | 役割 | ランタイム |
|---|---|---|
| `rsc` | Server Component のレンダリング + ルーティング | サーバー |
| `ssr` | RSC ストリーム → HTML 変換 | サーバー |
| `client` | ハイドレーション | ブラウザ |

データは次の順序で流れます。

```
リクエスト → [rsc] renderToReadableStream → RSC ストリーム
                                              ↓
                                         [ssr] renderToReadableStream → HTML
                                              ↓
                                         [client] hydrateRoot → インタラクティブ
```

`vite.config.ts` での設定はシンプルです。各環境のエントリーポイントを指定するだけで、`plugin-rsc` が `"use client"` ディレクティブの解析、Client Component の分離、React Flight Protocol でのシリアライズを自動で行ってくれます。

```ts:vite.config.ts
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [rsc()],
  environments: {
    rsc: {
      build: {
        rollupOptions: {
          input: { index: "./src/framework/entry.rsc.tsx" },
        },
      },
    },
    ssr: {
      build: {
        rollupOptions: {
          input: { index: "./src/framework/entry.ssr.tsx" },
        },
      },
    },
    client: {
      build: {
        rollupOptions: {
          input: { index: "./src/framework/entry.browser.tsx" },
        },
      },
    },
  },
});
```

**重要なのは、`plugin-rsc` だけで RSC は動くということです。** Hono は必須ではありません。ではなぜ Hono を組み合わせたのか — 次のセクションで説明します。

## なぜ Hono か

`plugin-rsc` だけでも RSC ページは配信できます。しかし実際のアプリケーションでは、ページ以外にも API エンドポイントやヘルスチェック、認証ミドルウェアなどが必要になります。

RSC のルーティングと API のルーティングを**別々に管理**すると、ルートが増えるほど見通しが悪くなります。Hono を導入して**すべてのルーティングを1箇所に統合**すれば、ページも API も同じ Hono アプリの中で定義でき、Hono のミドルウェア・エラーハンドリング・型安全なルーティングがそのまま使えます。

## 全体の構成

テンプレートのファイル構成はこうなっています。

```
src/
├── framework/
│   ├── entry.rsc.tsx     # RSC 環境 — rscMiddleware, handler
│   ├── entry.ssr.tsx     # SSR 環境 — RSC ストリーム → HTML
│   └── entry.browser.tsx # ブラウザ — ハイドレーション
├── pages/
│   └── home.tsx          # Server Component のページ
└── index.tsx             # Hono アプリ — ページルート + API ルート
```

リクエストの流れを2つのケースで見てみます。

**初回アクセス（HTML）**

```
ブラウザ → GET /
  → handler:        sanitizeRscHeader で外部ヘッダーを除去、app.fetch() へ
  → rscMiddleware:  isRsc=false、renderPage を Context に注入
  → GET / ハンドラ:  renderPage(request, loader) を呼ぶ
  → renderPage:     renderToReadableStream(<Page />) → RSC ストリーム
  → entry.ssr.tsx:  RSC ストリーム → HTML ストリーム
  → レスポンス:      Content-Type: text/html
```

**ハイドレーション（RSC ペイロード）**

```
ブラウザ → GET /?__rsc=1
  → handler:        ?__rsc=1 を検出 → X-RSC-Request: 1 ヘッダーをセット
  → rscMiddleware:  isRsc=true
  → GET / ハンドラ:  renderPage(request, loader) を呼ぶ
  → renderPage:     RSC ストリームをそのまま返す
  → レスポンス:      Content-Type: text/x-component

ブラウザ: createFromReadableStream(body) → hydrateRoot(document, root)
```

ブラウザはハイドレーション時に `?__rsc=1` パラメータを付けて同じ URL にリクエストします。CDN は URL が異なるため HTML と RSC ペイロードを自然にキャッシュ分離できます。さらにレスポンスに `Vary: X-RSC-Request` を付けて、ヘッダーベースのキャッシュ分離にも対応しています。

## RSC middleware — Hono への統合

核心部分です。RSC のレンダリングロジックを Hono の middleware として実装し、`renderPage` 関数を Context に注入します。

```tsx:src/framework/entry.rsc.tsx
const RSC_REQUEST_HEADER = "X-RSC-Request";

// RSC middleware — 全リクエストに renderPage を注入
const rscMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const isRsc =
    c.req.header(RSC_REQUEST_HEADER) === "1" ||
    c.req.query("__rsc") === "1";

  c.set("renderPage", async (request: Request, loader: PageLoader) => {
    const rscStream = await renderRscStream(loader);

    if (isRsc) {
      // RSC ペイロードをそのまま返す（React Flight Protocol）
      return createPageResponse(rscStream, RSC_CONTENT_TYPE);
    }

    // SSR: RSC ストリーム → HTML
    const ssrEntry = await import.meta.viteRsc.import<
      typeof import("./entry.ssr.tsx")
    >("./entry.ssr.tsx", { environment: "ssr" });
    const htmlStream = await ssrEntry.handleSsr(rscStream, {
      signal: request.signal,
    });
    return createPageResponse(htmlStream, HTML_CONTENT_TYPE);
  });

  await next();
});
```

`import.meta.viteRsc.import` は `plugin-rsc` が提供する API で、別の環境（ここでは `ssr`）のモジュールをインポートできます。これにより `rsc` 環境から `ssr` 環境の `handleSsr` を呼び出しています。

`isRsc` の判定はヘッダーと search param の両方に対応しています。handler が `?__rsc=1` を `X-RSC-Request: 1` ヘッダーに変換するため、middleware 内ではヘッダーだけ見れば十分ですが、フォールバックとして search param も受け付けています。

### RSC リクエストの判別方式 — なぜ `?__rsc=1` か

RSC を動かすには、同じ URL に対して「HTML がほしいのか、RSC ペイロードがほしいのか」を判別する仕組みが必要です。既存のフレームワークはそれぞれ異なるアプローチを取っています。

**Next.js — `Rsc: 1` ヘッダー**

クライアントナビゲーション時にブラウザが `Rsc: 1` リクエストヘッダーを付けて fetch し、サーバーがそれを見て RSC ペイロードを返します。レスポンスには `Vary: Rsc` を付けて CDN キャッシュを分離しますが、外部から `Rsc: 1` ヘッダーを直接送ることでキャッシュポイズニングが可能になるリスクが[指摘されています](https://zhero-web-sec.github.io/research-and-things/nextjs-and-cache-poisoning-a-quest-for-the-black-hole)。

**Waku — `/RSC/` パスプレフィックス**

RSC ペイロード用の専用パス（デフォルトは `/RSC/`）を設けて、完全に別の URL として扱います。`/RSC/about.txt` のようにエンコードされたパスで RSC ペイロードを取得します。URL が完全に別なのでキャッシュ分離もスプーフィングの心配もありません。ただし、RSC 用の URL 体系を管理する必要があります。

**このテンプレート — `?__rsc=1` search param**

同じパスに `?__rsc=1` を付けるだけなので、Hono のルーティングに手を加える必要がありません。URL が異なるため CDN キャッシュは自然に分離され、外部からのヘッダースプーフィングは `sanitizeRscHeader` で防いでいます。

### handler — エントリーポイント

Cloudflare Workers のエントリーポイントとなる `handler` では、外部からの `X-RSC-Request` ヘッダーを除去した上で、`?__rsc=1` を内部ヘッダーに変換して Hono アプリに渡します。

外部からヘッダーを直接送れると、CDN キャッシュに RSC ペイロードを HTML として保存させるキャッシュポイズニングが可能になるため、`sanitizeRscHeader` で除去しています。

```tsx:src/framework/entry.rsc.tsx
// 外部からの X-RSC-Request を除去（キャッシュポイズニング防止）
export function sanitizeRscHeader(request: Request): Request {
  if (!request.headers.has(RSC_REQUEST_HEADER)) return request;
  const headers = new Headers(request.headers);
  headers.delete(RSC_REQUEST_HEADER);
  return new Request(request, { headers });
}

export default function handler(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Response | Promise<Response> {
  const sanitized = sanitizeRscHeader(request);
  const url = new URL(sanitized.url);

  // ?__rsc=1 → X-RSC-Request: 1 ヘッダーに変換
  if (url.searchParams.get("__rsc") === "1") {
    const headers = new Headers(sanitized.headers);
    headers.set(RSC_REQUEST_HEADER, "1");
    return app.fetch(new Request(sanitized, { headers }), env, ctx);
  }

  return app.fetch(sanitized, env, ctx);
}
```

### Hono アプリ — ページと API を統合

```tsx:src/index.tsx
export function createApp(rscMiddleware: MiddlewareHandler<AppEnv>) {
  const app = new Hono<AppEnv>();

  // 全ルートに rscMiddleware を適用
  app.use("*", rscMiddleware);

  // --- ページルート ---
  app.get("/", (c) =>
    c.get("renderPage")(
      c.req.raw,
      () => import("@/pages/home").then((m) => ({ default: m.HomePage }))
    )
  );

  // --- API ルート ---
  app.get("/api/hello", (c) =>
    c.json({ message: "Hello from Hono!", timestamp: Date.now() })
  );

  return app;
}
```

ページルートでは `c.get("renderPage")` を呼ぶだけです。第2引数の `loader` は動的 import を返す関数で、ページコンポーネントの遅延読み込みを実現しています。

ページを追加するときは、Server Component を作ってルートを1行追加するだけです。

```tsx
// src/pages/about.tsx を作ったら
app.get("/about", (c) =>
  c.get("renderPage")(
    c.req.raw,
    () => import("@/pages/about").then((m) => ({ default: m.AboutPage }))
  )
);
```

## SSR とブラウザエントリー

SSR 環境は RSC ストリームを HTML に変換するだけのシンプルな役割です。

```tsx:src/framework/entry.ssr.tsx
import { createFromReadableStream } from "@vitejs/plugin-rsc/ssr";
import { renderToReadableStream } from "react-dom/server.edge";

// bootstrap スクリプトの参照をキャッシュ（全リクエスト共通）
const bootstrapScriptContentPromise =
  import.meta.viteRsc.loadBootstrapScriptContent("index");

export async function handleSsr(
  rscStream: ReadableStream,
  options: { signal?: AbortSignal } = {}
) {
  const root = await createFromReadableStream(rscStream);
  const bootstrapScriptContent = await bootstrapScriptContentPromise;
  return renderToReadableStream(root, {
    bootstrapScriptContent,
    signal: options.signal,
  });
}
```

`import.meta.viteRsc.loadBootstrapScriptContent("index")` は、`client` 環境のエントリーポイントを読み込むインラインスクリプトを生成します。これが HTML に埋め込まれることで、ブラウザ側のハイドレーションが始まります。

ブラウザエントリーは `?__rsc=1` を fetch してハイドレーションします。

```tsx:src/framework/entry.browser.tsx
import { createFromReadableStream } from "@vitejs/plugin-rsc/browser";
import { hydrateRoot } from "react-dom/client";

function rscUrl() {
  const pathname =
    window.location.pathname.replace(/\/+$/, "") || "/";
  return `${pathname}?__rsc=1`;
}

async function main() {
  const rscResponse = await fetch(rscUrl());
  if (!rscResponse.body) return;
  const root = await createFromReadableStream(rscResponse.body);
  hydrateRoot(document, root);
}

main();
```

## Client Component は自動で動く

`"use client"` ディレクティブを付けたコンポーネントは、`plugin-rsc` が自動的に分離してくれます。手動の配線は不要です。

```tsx:src/components/click-counter.tsx
"use client";

import { useState } from "react";

export function ClickCounter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)}>
      {count} clicks
    </button>
  );
}
```

Server Component 内で普通に `import` するだけで動きます。

```tsx:src/pages/home.tsx
import { ClickCounter } from "@/components/click-counter";

export function HomePage() {
  return (
    <div>
      <h1>Home</h1>
      <ClickCounter />
    </div>
  );
}
```

`plugin-rsc` が `"use client"` を検出すると、そのモジュールを `client` 環境に振り分け、RSC ストリーム内にはクライアントへの参照（module reference）だけを埋め込みます。ブラウザ側でハイドレーション時にそのモジュールが読み込まれ、インタラクティブになります。

## このテンプレートが向いている人

- **Server Functions は使わない** — API は Hono で自前で書く
- **フレームワーク的な規約より、自分で設計をコントロールしたい**
- **RSC の仕組みを理解したい** — フレームワークのブラックボックスを開けたい

## このテンプレートが向いていないケース

- **Server Functions が必要** → [Waku](https://waku.gg/) または [Next.js](https://nextjs.org/)
- **Nested layouts やファイルベースルーティングが必要** → 同上

[Waku](https://waku.gg/) は同じ `plugin-rsc` をベースに、最小構成で RSC フレームワークを実現しているプロジェクトです。Server Functions を含むより完成された構成が必要なら、有力な選択肢になります。

## おわりに

RSC は「Next.js の機能」ではなく、React の機能です。`@vitejs/plugin-rsc` のおかげで、フレームワークなしでもその仕組みに触れることができます。

Hono と組み合わせることで、RSC のレンダリングと API ルーティングを1つのアプリに統合できました。「Hono が全部ルーティングして、ページでは RSC を使う」という、シンプルだけど実用的な構成です。

https://github.com/yoshikouki/hono-rsc-template
