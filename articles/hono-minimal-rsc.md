---
title: "Hono 上で最小構成の React Server Components を実現する"
emoji: "🔥"
type: "tech"
topics: ["react", "hono", "rsc", "vite", "cloudflare"]
published: false
---

## はじめに

個人サイト [yoshikouki.com](https://yoshikouki.com) は、以前 Next.js × Vercel で運用していましたが、最近 Hono + Cloudflare Workers に乗り換えました。理由はいくつかありますが、Next.js はいくつかの観点で過剰だと感じていたこと、単純に Hono が好きなこと、そして Hono と React の実用的な組み合わせを研究したかったという動機があったためです。

乗り換えた当初、RSC (React Server Component) は使用せずに Hono middleware の react-renderer による SSR の構成でした。しかし React の強力な機能である RSC をHono の上でも動かせないかと考えました。Next.js に戻るのは違う。Hono でやりたい。

そこで RSC そのものの仕組み — Server Component がどうレンダリングされ、ストリームとしてクライアントに届き、ハイドレーションされるのか — を理解するところから始め、**Next.js に頼らず最小限の自前実装で RSC を動かすテンプレート**を作りました。

https://github.com/yoshikouki/hono-rsc-template

この記事では、テンプレートの設計をコードとともに解説していきます。以前「[Hono のサンプルコードの内側を覗く](https://zenn.dev/pepabo/articles/inspect-hono-sample-code)」という記事で Hono の内部実装を追いましたが、今回は逆に *Hono の上に何を載せられるか*を探る試みです。

:::message
**スコープについて**

この記事で扱うのは RSC の**レンダリングとストリーミング**です。[Server Functions](https://ja.react.dev/reference/rsc/server-functions)（旧 Server Actions）は対象外です。Server Functions が必要な場合は [Waku](https://waku.gg/) や [Next.js](https://nextjs.org/) をご検討ください。
:::

## `@vitejs/plugin-rsc` — RSC のビルド基盤

今回の構成を支えているのが [`@vitejs/plugin-rsc`](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc) です。Vite 6 の [Environment API](https://vite.dev/guide/api-environment) を使い、**1つの Vite プロジェクトの中に 3つのビルド環境**を構成します。

| 環境 | 役割 | ランタイム |
|---|---|---|
| `rsc` | Server Component のレンダリング + ルーティング | サーバー |
| `ssr` | RSC ストリーム → HTML 変換 | サーバー |
| `client` | ハイドレーション | ブラウザ |

データはこの順序で流れます。

1. リクエストを受信
2. `[rsc]` 環境で `renderToReadableStream` を実行し、RSC ストリームを生成
3. `[ssr]` 環境で RSC ストリームを `renderToReadableStream` で HTML に変換
4. `[client]` 環境で `hydrateRoot` を実行し、インタラクティブな状態にする

`vite.config.ts` での設定はシンプルで、各環境のエントリーポイントを指定するだけです。`plugin-rsc` が `"use client"` ディレクティブの解析、Client Component の分離、React Flight Protocol でのシリアライズを自動で行います。

以下が設定の全体です。

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

重要なのは、**`plugin-rsc` だけで RSC は動くということです**。Hono は必須ではありません。実際、テンプレートの最初の検証では Hono なしで RSC を動かしていました。

## なぜ Hono か

`plugin-rsc` だけでも RSC ページを配信することはできます。しかし実際のアプリケーションでは、ページ以外にも API エンドポイントやヘルスチェック、認証 middleware などが必要になります。

最初の実装では、`entry.rsc.tsx` 内に `pages` オブジェクトでルーティングを書き、マッチしないリクエストだけ Hono にフォールバックさせていました。動くことは動きますが、ルーティングが2箇所に分散します。ルートが増えるほど見通しが悪くなります。

「全部 Hono に寄せればいいじゃん」と考えて、RSC のレンダリングを **Hono の middleware** として再実装しました。ページも API も同じ Hono アプリの中で定義でき、Hono の middleware・エラーハンドリング・型安全なルーティングがそのまま使えます。

なお、この構成を作る中で RSC フレームワークの [Waku](https://waku.gg/) のソースコードを調査したところ、Waku も内部で Hono middleware を使って RSC リクエストを処理していました。Hono と RSC の相性の良さを裏付ける設計だと感じています。

## RSC リクエストの判別 — なぜ `/__rsc/` パスプレフィックスか

RSC を動かすには、同じ URL に対して「HTML がほしいのか、RSC ペイロードがほしいのか」を判別する仕組みが必要です。既存のフレームワークはそれぞれ異なるアプローチを取っています。テンプレートの設計を決めるにあたって、3つの方式を検討しました。

**方式1: リクエストヘッダー（Next.js）**

クライアントナビゲーション時にブラウザが `Rsc: 1` リクエストヘッダーを付けて fetch し、サーバーがそれを見て RSC ペイロードを返す方式です。レスポンスには `Vary: Rsc` を付けて CDN キャッシュを分離しますが、外部からヘッダーを操作して[キャッシュポイズニングを引き起こせるリスク](https://github.com/vercel/next.js/security/advisories/GHSA-r2fc-ccr8-96c4)があります。

**方式2: search param（`?__rsc=1`）**

当テンプレートの初期実装で採用していた方式です。「Hono のルーティングに手を加えなくて済む」という利点がありましたが、実際に使ってみると handler でのヘッダー変換、middleware での二重判定、sanitize ロジックが必要になり — **シンプルさを守るために複雑さを増やす**矛盾に気づきました。

**方式3: パスプレフィックス（Waku → このテンプレート）**

RSC ペイロード用の専用パスを設け、完全に別の URL として扱う方式です。[Waku](https://waku.gg/) がデフォルトで `/RSC/` というプレフィックスを使っており、このアプローチを参考にしました。

このテンプレートでは `/__rsc/` を採用しています。`/__` プレフィックスが「フレームワーク内部パス」という慣習に沿うためです（`/_next/`、`/__vite_ping` など）。`GET /about` は HTML、`GET /__rsc/about` は RSC ペイロードを返します。

方式2から方式3に変えたところ、search param 方式で必要だったヘッダー変換・二重判定・sanitize ロジックが一気に消えました。この方式の利点を整理すると、次の通りです。

- **ヘッダー操作が不要** — `sanitizeRscHeader` のようなスプーフィング対策が不要。パスが異なるためキャッシュポイズニングの概念自体がない
- **CDN キャッシュが自然に分離** — URL が異なるため `Vary` ヘッダーも不要
- **handler が1行になる** — ヘッダー変換ロジックが消える
- **middleware のスコープを限定できる** — API ルートに RSC middleware を適用する必要がない

## 全体の構成

テンプレートのファイル構成と、リクエストの流れを見ていきます。

```
src/
├── framework/
│   ├── entry.rsc.tsx       # RSC 環境 — rscMiddleware, ssrMiddleware, handler
│   ├── entry.ssr.tsx       # SSR 環境 — RSC ストリーム → HTML
│   └── entry.browser.tsx   # ブラウザ — /__rsc/ fetch + hydrateRoot
├── lib/
│   ├── markdown/           # Markdown → React レンダリング
│   └── router/             # ファイルベースルーティング（resolver + runtime）
├── routes/
│   ├── about/              # /about ページ（index.tsx + layout.tsx）
│   ├── index.tsx           # / (ホームページ)
│   ├── layout.tsx          # ルートレイアウト
│   ├── hello.md            # /hello (Markdown コンテンツページ)
│   ├── healthz.ts          # /healthz ハンドラ
│   └── robots.txt.ts       # /robots.txt ハンドラ
├── components/             # Client Components ("use client")
├── render-document.tsx     # HTML ドキュメントシェル（<html>, <head>, <body>）
├── factory.ts              # アプリの型定義
└── index.ts                # Hono アプリ — createApp(), ルート登録
```

リクエストの流れは2つのケースに分かれます。

**初回アクセス（HTML）**

1. ブラウザが `GET /` をリクエスト
2. Hono ルーティングで `GET /` にマッチ
3. `ssrMiddleware` が `renderPage` を Context に注入
   - RSC → HTML 変換ありのバージョン
4. ハンドラが `renderPage(request, loader)` を呼ぶ
5. `renderPage` が `renderToReadableStream(<Page />)` で RSC ストリームを生成
6. `entry.ssr.tsx` が RSC ストリームを HTML ストリームに変換
7. `Content-Type: text/html` でレスポンスを返す

**クライアントナビゲーション（RSC ペイロード）**

1. ブラウザが `GET /__rsc/` をリクエスト
2. Hono ルーティングで `GET /__rsc/` にマッチ
3. `rscMiddleware` が `renderPage` を Context に注入
   - RSC ストリームをそのまま返すバージョン
4. ハンドラが `renderPage(request, loader)` を呼ぶ
5. `renderPage` が RSC ストリームをそのまま返す
6. `Content-Type: text/x-component` でレスポンスを返す
7. ブラウザが `createFromReadableStream(body)` → `hydrateRoot(document, root)` でハイドレーション

ブラウザはハイドレーション時に `/__rsc/` プレフィックス付きのパスにリクエストします。CDN は URL が異なるため HTML と RSC ペイロードを自然にキャッシュ分離できます。handler でのヘッダー操作は一切不要です。

## RSC middleware — Hono への統合

ここが構成の核心です。RSC のレンダリングロジックを Hono の middleware として実装し、`renderPage` 関数を Context に注入します。

テンプレートでは **`rscMiddleware` と `ssrMiddleware` の2つ**に分けています。HTML を返すルートには `ssrMiddleware`、`/__rsc/` ルートには `rscMiddleware` を適用します。どちらも `renderPage` を Context に注入しますが、内部の処理が異なります。

なお、`ssrMiddleware` も `entry.rsc.tsx`（`rsc` 環境）に定義しています。これは `renderRscStream` が `rsc` 環境でしか動作しないためです。RSC ストリームの生成は `rsc` 環境で行い、そこから `import.meta.viteRsc.import` で `ssr` 環境の `handleSsr` を呼び出して HTML に変換する — という流れになるため、両方の middleware を `rsc` 環境側に置いています。

以下が2つの middleware の実装です。

```tsx:src/framework/entry.rsc.tsx
const RSC_CONTENT_TYPE = "text/x-component;charset=utf-8";
const HTML_CONTENT_TYPE = "text/html;charset=utf-8";

// RSC ペイロードをそのまま返す middleware（/__rsc/ ルート用）
const rscMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set("renderPage", async (_request: Request, loader: PageLoader) => {
    const rscStream = await renderRscStream(loader);
    return createPageResponse(rscStream, RSC_CONTENT_TYPE);
  });
  await next();
});

// RSC ストリーム → HTML に変換する middleware（HTML ルート用）
const ssrMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set("renderPage", async (request: Request, loader: PageLoader) => {
    const rscStream = await renderRscStream(loader);
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

middleware を分けたことで、`renderPage` の呼び出し側は `isRsc` のようなフラグを渡す必要がありません。ルーティングの時点でどちらの middleware が適用されるかが決まっていて、`renderPage(request, loader)` を呼ぶだけです。

### handler — エントリーポイント

Cloudflare Workers のエントリーポイントとなる `handler` は、Hono アプリにリクエストをそのまま渡すだけです。

```tsx:src/framework/entry.rsc.tsx
export default function handler(
  request: Request
): Response | Promise<Response> {
  return app.fetch(request);
}
```

以前の `?__rsc=1` 方式では、ここでヘッダーのサニタイズと変換を行う必要がありました。パスプレフィックス方式にしたことで、handler は本来あるべき姿 — リクエストをアプリに渡すだけ — になりました。

### Hono アプリ — ページ、RSC、API の統合

ページルート・RSC ルート・API ハンドラをひとつの Hono アプリに統合している部分を見ていきます。

```ts:src/index.ts
export function createApp({
  middlewares,
  globs,
  site,
}: {
  middlewares: Middlewares;
  globs: RouteGlobs;
  site: SiteConfig;
}) {
  const app = new Hono<AppEnv>();
  const { routeMap: resolvedRouteMap } = buildRouteMap(globs);

  app.onError((err, c) => {
    console.error(err);
    return c.text("Internal Server Error", 500);
  });

  // /__rsc/ ルート — rscMiddleware（RSC ペイロード）
  app.route(
    "/",
    createPageRouter(middlewares.rsc, resolvedRouteMap, site, "/__rsc")
  );
  // HTML ルート — ssrMiddleware（RSC → HTML）
  app.route("/", createPageRouter(middlewares.ssr, resolvedRouteMap, site));
  // API ハンドラ（healthz, robots.txt など）
  app.route("/", createHandlerRouter(globs.handlers));

  return app;
}
```

テンプレートでは**ファイルベースルーティング**を採用しています。`src/routes/` 配下の `.tsx` ファイルが自動的にページとして登録され、`layout.tsx` はネストされたレイアウトとして適用されます。`.ts` ファイルは API ハンドラ、`.md` ファイルは Markdown コンテンツページとして扱われます。

`createPageRouter` は `resolvedRouteMap`（ファイルグロブから構築されたルートマップ）を受け取り、各ページに対して HTML ルートと `/__rsc/` ルートのペアを自動生成します。`rscMiddleware` と `ssrMiddleware` はそれぞれのルーターに渡され、適切な `renderPage` が注入されます。

ページを追加するときは、`src/routes/` にファイルを置くだけです。

```tsx:src/routes/about/index.tsx
import type { RouteMeta } from "@/factory";

export const meta: RouteMeta = {
  title: "About",
  description: "About this template",
};

export default function AboutPage() {
  return (
    <div>
      <h1 className="mb-4 font-bold text-3xl">About</h1>
      <p className="text-gray-600">
        This template demonstrates file-based routing with Hono + RSC.
      </p>
    </div>
  );
}
```

`meta` をエクスポートすることで、ページのタイトルや description を宣言できます。ルート登録のボイラープレートは不要です。

:::message
**ファイルベースルーティングの仕組み**

このテンプレートをベースに構築した個人サイト [yoshikouki.com](https://yoshikouki.com) の開発過程で、手動のルート登録を自動化するためにファイルベースルーティングを実装しました。`import.meta.glob` でファイルを収集し、パス変換とレイアウトチェーン解決を行う `resolver` と、Hono ルーターに登録する `runtime` の2層構成です。
:::

## SSR とブラウザエントリー

SSR 環境は RSC ストリームを HTML に変換するだけのシンプルな役割を持ちます。

RSC ストリームを受け取り、HTML ストリームを返す `handleSsr` の実装は以下の通りです。

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

次に、ブラウザエントリーを見ていきましょう。`/__rsc/` パスに fetch してハイドレーションを行います。

```tsx:src/framework/entry.browser.tsx
import { createFromReadableStream } from "@vitejs/plugin-rsc/browser";
import { hydrateRoot } from "react-dom/client";

const TRAILING_SLASHES = /\/\/+$/;

function rscUrl() {
  const pathname =
    window.location.pathname.replace(TRAILING_SLASHES, "") || "/";
  return `/__rsc${pathname === "/" ? "/" : pathname}`;
}

async function main() {
  const rscResponse = await fetch(rscUrl());
  if (!rscResponse.body) {
    return;
  }
  const root = await createFromReadableStream(rscResponse.body);
  hydrateRoot(document, root);
}

main();

// HMR: apply RSC updates without full page reload
if (import.meta.hot) {
  import.meta.hot.on("rsc:update", async () => {
    const { createFromFetch } = await import("@vitejs/plugin-rsc/browser");
    await createFromFetch(fetch(rscUrl()));
  });
}
```

## Client Component

`"use client"` ディレクティブを付けたコンポーネントは、`plugin-rsc` が自動的に分離します。手動の配線は不要です。

以下は `ClickCounter` の実装例です。

```tsx:src/components/click-counter.tsx
"use client";

import { useState } from "react";

export function ClickCounter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <button
        onClick={() => setCount((c) => c + 1)}
        style={{
          padding: "0.5rem 1.5rem",
          fontSize: "1rem",
          cursor: "pointer",
          borderRadius: "4px",
          border: "1px solid #ccc",
          background: count > 0 ? "#0070f3" : "#fff",
          color: count > 0 ? "#fff" : "#000",
          transition: "all 0.15s",
        }}
        type="button"
      >
        Click me
      </button>
      <span style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
        {count} clicks
      </span>
    </div>
  );
}
```

Server Component 内で普通に `import` するだけで動きます。

```tsx:src/routes/index.tsx
import { ClickCounter } from "@/components/click-counter";
import { ClientClock } from "@/components/client-clock";
import type { RouteMeta } from "@/factory";

export const meta: RouteMeta = {
  title: "Home",
  description: "A Hono RSC template app",
};

export default function HomePage() {
  return (
    <div>
      <h1 className="mb-4 font-bold text-3xl">Welcome</h1>
      <p className="mb-8 text-gray-600">
        This is a Hono + React Server Components template.
      </p>

      <section className="space-y-6">
        <div>
          <h2 className="mb-2 font-semibold text-xl">Client Clock</h2>
          <ClientClock />
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-xl">Click Counter</h2>
          <ClickCounter />
        </div>
      </section>
    </div>
  );
}
```

`plugin-rsc` が `"use client"` を検出すると、そのモジュールを `client` 環境に振り分け、RSC ストリーム内にはクライアントへの参照（module reference）だけを埋め込みます。ブラウザ側でハイドレーション時にそのモジュールが読み込まれ、インタラクティブになります。

## おわりに

`@vitejs/plugin-rsc` のおかげで、メタフレームワークなしでも React Server Component を Hono の環境に導入することができます。「Hono が全部ルーティングして、ページでは RSC を使う」という、シンプルですが実用的な構成です。

個人的に一番の発見は、当プラグインを使うと RSC の仕組みが思っていたより素朴に実現できたことです。Flight Protocol のストリームを `renderToReadableStream` で生成して、SSR 側で `createFromReadableStream` で HTML に変換する — この2つの関数の間は ReadableStream が流れているだけです。プラグインが抽象化してくれたインターフェースを使ってレスポンスを実測してみると、腑に落ちる瞬間がありました。

なお、このテンプレートは **Server Functions を使わない** 構成を前提としています。API は Hono で自前で書き、設計をコントロールしたい場合に向いています。また、RSC の仕組みそのものを理解したい場合にも手を動かしやすい構成です。

Server Functions が必要な場合や本番運用レベルの機能（データフェッチ統合、エラーバウンダリ、国際化など）が必要な場合は、[Waku](https://waku.gg/) または [Next.js](https://nextjs.org/) を検討した方が良いでしょう。同じ `plugin-rsc` をベースにした [Waku](https://waku.gg/) は、より完成された構成が必要なときの有力な選択肢だと感じています。

テンプレートのコードは公開しています。是非手を動かして試してみてください。

https://github.com/yoshikouki/hono-rsc-template

この記事が Hono や RSC の仕組みを探っている方の参考になれば幸いです。

