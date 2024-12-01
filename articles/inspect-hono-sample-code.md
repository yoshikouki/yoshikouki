---
title: "Hono のサンプルコードの内側を覗く"
emoji: "🔥"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Hono", "JavaScript", "TypeScript"]
published: false
---

この記事は、「[🎅GMOペパボ エンジニア Advent Calendar 2024](https://adventar.org/calendars/10036)」の2日目の記事です。

昨日の記事は、[@n01e0](https://feneshi.co/) さんの「[proc_macroによる錆びつかない実装とGitHub Actionsにおけるsecret](https://feneshi.co/robust_implementation_with_proc_macro/)」でした。OpenAI のモデルアップデートを自動化する手法に留まらず、GitHub Actions の secret が漏洩する危険性を指摘した記事でした。怖い。

# はじめに

最近注目を集めている Web アプリケーションフレームワーク **Hono**。そのシンプルさと高速性、そして Web Standards に準拠した設計が多くの開発者から支持を得ています。

本記事では、[Hono 公式ドキュメント](https://hono.dev/docs/) に記載されている以下のサンプルコードを題材に、アプリケーション実行とリクエスト時に内部で何が起こっているのか、リポジトリ [`honojs/hono`](https://github.com/honojs/hono) のコードを読み解いていきます。

```typescript
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

export default app
```

コードのバージョンは、2024/11/25 時点で最新の [v4.6.12](https://github.com/honojs/hono/tree/v4.6.12) を使用しています。

# Hono とは

Hono は JavaScript の Web アプリケーションフレームワークです。APIサーバーだけでなく、Web ページや Web アプリケーションも開発・組み込みができます。
組み込みとは、例えば [Next.js App Router の Route Handlers のリクエストを Hono で捌く](https://hono.dev/docs/getting-started/vercel#_2-hello-world)ようにすることも可能です。

公式ドキュメントでは以下のように説明されています。

> Hono
> Web application framework
>
> Fast, lightweight, built on Web Standards. Support for any JavaScript runtime.

[Hono - Web framework built on Web Standards](https://hono.dev/)

> Hono - means flame 🔥 in Japanese - is a small, simple, and ultrafast web framework built on Web Standards. It works on any JavaScript runtime: Cloudflare Workers, Fastly Compute, Deno, Bun, Vercel, Netlify, AWS Lambda, Lambda@Edge, and Node.js.
>
> Hono（日本語で「炎🔥」を意味します）は、Web 標準に基づいて構築された、小さく、シンプルで、超高速なウェブフレームワークです。Cloudflare Workers、Fastly Compute、Deno、Bun、Vercel、Netlify、AWS Lambda、Lambda@Edge、Node.js など、あらゆる JavaScript ランタイムで動作します。

[Hono - Web framework built on Web Standards](https://hono.dev/docs/)

より詳細な説明は公式ドキュメントに譲りますが、作者の @yusukebe さんが語られた以下のスライドは、とても熱い内容 🔥 なのでぜひご覧ください。

@[speakerdeck](ba737f6fa2a44036875b3d96078fac67)


# サンプルコードの挙動

```typescript:src/index.ts
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

export default app
```

このサンプルコードを `$ bun src/index.ts` で起動した状態でリクエストすると、

```bash
$ curl -i localhost:3000/
HTTP/1.1 200 OK
content-type: text/plain;charset=utf-8
Date: Mon, 25 Nov 2024 13:55:23 GMT
Content-Length: 5

Hono!
$
```

レスポンスが返ってきましたね。たった4行のコードでAPIサーバーを作ることができました。


# サンプルコードの内側

早速内側を見ていきましょう。

## `class Hono`

```typescript:src/index.ts
import { Hono } from 'hono'
const app = new Hono()
```

まず `class Hono` のインスタンスを生成している部分。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/index.ts#L48-L51

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/index.ts#L17

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono.ts#L8-L34

`class Hono<中略> extends HonoBase<中略>` と、`HonoBase` というクラスを継承しています。また、型情報も引き継いでいることがわかります。

```typescript:src/hono.ts
export class Hono<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  BasePath extends string = '/'
> extends HonoBase<E, S, BasePath> {
```


この constructor では、`HonoBase` の constructor の呼び出しの他にも、プロパティ `router` を初期化しています。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono.ts#L21-L33

ルーターのデフォルト値は `SmartRouter` です。[公式ドキュメント Routers](https://hono.dev/docs/concepts/routers) では、SmartRouter を含め合計5つのルーターが紹介されています。

なお、このルーターに関しては、[先に紹介した @yusukebe さんのスライド](https://speakerdeck.com/yusukebe/hononolai-tadao-tokorekara?slide=29)にも出てくる熱い話題の一つです。Hono の早さを実現している一つであり、その誕生のきっかけともなった部分でもあるみたいなので、是非ドキュメントと一緒にスライドもご覧ください。

![image](/images/inspect-hono-sample-code/hononolai-tadao-tokorekara-slide-29.png)
*[Honoの来た道とこれから - Speaker Deck](https://speakerdeck.com/yusukebe/hononolai-tadao-tokorekara?slide=29)*


## `class HonoBase`

次に `super(options)` で呼び出されているクラス `HonoBase` を見ていきましょう。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono.ts#L1

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L520


https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L102-L123
(長いため序盤のみをリンク)

103 行目にインスタンスメソッドとして `get!: HandlerInterface<E, 'get', S, BasePath>` が宣言されています。`get!` の `!` は、definite assignment assertion というもので、メソッド `get()` が constructor で必ず初期化されることを示しています。

https://typescriptbook.jp/reference/values-types-variables/definite-assignment-assertion

プロパティ `router` も definite assignment assertion で宣言されています。コメントで HonoBase が抽象されたクラスであること、継承先で必ず router を初期化することが示されていますね。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L113-L117

型 `H` は Handler または MiddlewareHandler です。サンプルコード `app.get('/', (c) => c.text('Hono!'))` の `(c) => c.text('Hono!')` の箇所がハンドラーです。
https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/types.ts#L85-L90

123 行目で `routes: RouterRoute[] = []` と、ルート (エンドポイント) が空の配列として初期化されています。後ほど登場します。

`HonoBase` の constructor を見ると、次の箇所で `app.get()` のような HTTP メソッドに対応するインスタンスメソッドが定義されています。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L125-L140

配列 `allMethods` は、HTTP メソッドに対応する文字列と `all` の配列 `['get', 'post', 'put', 'delete', 'options', 'patch', 'all']` となります。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/router.ts#L10-L17

この配列の各要素毎に関数を代入しているため、結果として以下のインスタンスメソッドを初期化しています。

```typescript:src/hono-base.ts
class Hono<E extends Env = Env, S extends Schema = {}, BasePath extends string = '/'> {
  get!: HandlerInterface<E, 'get', S, BasePath>
  post!: HandlerInterface<E, 'post', S, BasePath>
  put!: HandlerInterface<E, 'put', S, BasePath>
  delete!: HandlerInterface<E, 'delete', S, BasePath>
  options!: HandlerInterface<E, 'options', S, BasePath>
  patch!: HandlerInterface<E, 'patch', S, BasePath>
  all!: HandlerInterface<E, 'all', S, BasePath>
```

## `class HonoBase get()`

各 HTTP メソッドに対応するインスタンスメソッド (e.g. `app.get(path, ...handlers[])`) は、以下のように定義されていました。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L129-L139

ここまで来ると、サンプルコードの次の段階に進むことができます。

```typescript:src/index.ts
app.get('/', (c) => c.text('Hono!'))
```

このコードを実行すると次の処理を行います。

1. Hono インスタンスのプライベートプロパティ `#path` へ第一引数 `path` が代入される

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L130-L131
https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L121

2. 第二引数以降のハンドラー毎に、プライベートメソッド `#addRoute()` が呼び出される

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L135-L137
https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L376-L382

3. `#addRoute()` 内で、Hono インスタンスのプロパティ `router` (SmartRouter など) と `routes` (配列) にハンドラー等が追加される

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L123

4. `this.router` が SmartRouter の場合: SmartRouter インスタンスのプライベートプロパティ `#routes` にハンドラー等が追加される

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/router/smart-router/router.ts#L4-L19


ここまででサンプルコードの Hono インスタンスを生成してエンドポイントとそのハンドラーを追加する処理を見てきました。具体的には、Hono インスタンスの this.router (SmartRouter など) に登録する処理であることがわかります。


## `export default app` を紐解く

サンプルコードの最後の一行である `export default app` について見ていきましょう。この部分は、[公式ドキュメント Getting Started](https://hono.dev/docs/getting-started/basic#hello-world) でランタイムに依って異なる可能性が示されています。

> The import and the final export default parts may vary from runtime to runtime, but all of the application code will run the same code everywhere.


実際に `export default app` 以外のパターンをいくつか見ていきましょう


### [Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers#using-hono-with-other-event-handlers)

> ```typescript:src/index.ts
> const app = new Hono()
>
> export default {
>   fetch: app.fetch,
>   scheduled: async (batch, env) => {},
> }
> ```

Cloudflare Workers では `export default app` でも動くのですが、Module Worker 形式で他のイベントを見たい場合などには、上のコードのようにハンドラーを定義します。
Hono からは `app.fetch()` を export していることがわかります。

Cloudflare Workers Module Worker について: [Migrate from Service Workers to ES Modules | Cloudflare Workers docs](https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/)

### [Bun](https://hono.dev/docs/getting-started/bun#change-port-number)

> ```diff typescript:src/index.ts
> - export default app
> + export default {
> +   port: 3000,
> +   fetch: app.fetch,
> + }
> ```

Bun では fetch ハンドラーを含む `default` が export されているとそれを Bun.serve に渡す挙動を取るため、上のコードを `bun src/index.ts` するとサーバーが立ち上がります。
ここでも `app.fetch()` を export しています。

> Thus far, the examples on this page have used the explicit Bun.serve API. Bun also supports an alternate syntax.

[HTTP server – API | Bun Docs](https://bun.sh/docs/api/http#export-default-syntax)


### [Node.js](https://hono.dev/docs/getting-started/nodejs)

> ```typescript:src/index.ts
> import { serve } from '@hono/node-server'
> // (中略)
> serve(app)
> ```

> ```diff typescript:src/index.ts
> - serve(app)
> + serve({
> +   fetch: app.fetch,
> +   port: 8787,
> + })
> ```

Node.js 用のアダプターを実行しています。やはり `app.fetch()` をアダプターに渡しています。

[honojs/node-server: Node.js Server for Hono](https://github.com/honojs/node-server)


### [Deno](https://hono.dev/docs/getting-started/deno)

> ```typescript:src/index.ts
> Deno.serve(app.fetch)
> ```

> ```diff typescript:src/index.ts
> - Deno.serve(app.fetch)
> + Deno.serve({ port: 8787 }, app.fetch)
> ```

Bun と同じく Deno 由来のサーバーを立ち上げていますが、インターフェイスが異なるため明示的に渡しています

[Deno.serve - Deno - Deno Docs](https://docs.deno.com/api/deno/~/Deno.serve)


### [Fastly Compute](https://hono.dev/docs/getting-started/fastly)

> ```typescript:src/index.ts
> app.fire()
> ```

`fire()` はグローバルに対する `fetch` イベントを監視して Hono で処理します

[App - Hono - Hono](https://hono.dev/docs/api/hono#fire)

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L504-L517


### [Vercel](https://hono.dev/docs/getting-started/vercel)

> ```typescript:src/index.ts
> import { handle } from 'hono/vercel'
> // (中略)
> export default handle(app)
> ```


### [AWS Lambda](https://hono.dev/docs/getting-started/aws-lambda)

> ```typescript:src/index.ts
> import { handle } from 'hono/aws-lambda'
> // (中略)
> export const handler = handle(app)
> ```

Vercel と AWS Lambda でも、Node.js と同じくアダプターを使っています。

各ランタイムに依る違いを見ていく中で、`export default app` としないケースでは Hono インスタンスの `app.fetch()` が重要な役割を担っていることが見えてきました。

## `class HonoBase fetch()`

`app.fetch()` は、HonoBase のインスタンスメソッドとして定義されています。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L453-L470

コメントに「`.fetch()` will be entry point of your app」と書かれていること、そして引数に Request を取り Response を返すことで、このメソッドが [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) に近い実装になっていることがわかります。

[公式ドキュメント Web Standards](https://hono.dev/docs/concepts/web-standard) には以下のように書かれています。

> Hono uses only Web Standards like Fetch. They were originally used in the fetch function and consist of basic objects that handle HTTP requests and responses. In addition to Requests and Responses, there are URL, URLSearchParam, Headers and others.
> (中略)
> Hono uses only Web Standards, which means that Hono can run on any runtime that supports them. In addition, we have a Node.js adapter. Hono runs on these runtimes:

> Hono は Fetch のような Web 標準 のみを使用しています。これらはもともと fetch 関数で使用されており、HTTP リクエストとレスポンスを処理する基本的なオブジェクトで構成されています。リクエストとレスポンスに加えて、URL、URLSearchParams、Headers などがあります。
> （中略）
> Hono は Web 標準のみを使用しているため、それらをサポートするあらゆるランタイムで動作できます。さらに、Node.js 用のアダプターも用意しています。Hono は以下のランタイムで動作します：

Hono の謳い文句である「Support for any JavaScript runtime」は、HonoBase の`fetch()` の実装によって裏付けられているようにも思えます。

さて、ここまでを改めて整理すると、見てきたのはサンプルコードによって Hono アプリケーションが起動するところまでです。すでに肉厚な内容になっているようにも思えますが、まだ起動したサーバーがリクエストを処理する部分が残っています。

ここからは `$ curl localhost:3000/` などでアクセスした際のサーバーの処理を見ていきましょう。


# リクエスト処理の内側

リクエストを処理する HonoBase のインスタンスメソッド `fetch()` は、プライベートメソッド `#dispatch()` を呼び出すだけのシンプルな実装になっています。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L464-L470
(余談ですが、 `#dispatch()` は Fastly Compute のサンプルコードで登場した `app.fire()` の内部でも使用されています)

## `class HonoBase #dispatch()`

`fetch()` に対して `#dispatch()` は60行あるメソッドであり、HonoBase の中でもっとも行数が多い実装になっています。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L391-L451


しかし矛盾するようですが、このメソッドだけで見るとそれほど複雑ではありません。複雑な処理はカプセル化されおり、見通し良くなっています。設計が見事です。

`#dispatch()` の流れは大きく次の通りです。

1. HTTP メソッドが "HEAD" の場合は、空 body のレスポンスを返す
     - このレスポンスの `ResponseInit` (headers, status など) は、GET リクエストだった場合の値を設定する (`#dispatch()` の再帰的実行)
2. `this.router.match()` で、HTTP メソッドとパスが合致したハンドラー (ミドルウェアのハンドラーも含む) を取得する
3. [Context インスタンス](https://hono.dev/docs/api/context#context)を生成する
4. 段階 2 で取得したハンドラーの数で分岐
   1. 1つの場合は、そのハンドラーを実行してレスポンスを返す
   2. 複数の場合は、ハンドラーを順番に実行できるようにまとめて、その実行結果のレスポンスを返す

この4つの段階を経て、リクエスト `$ curl localhost:3000/` のレスポンス `"Hono!"` が返されます。

### `this.router.match()`

個人的に注目したいのは、段階 2 の `this.router.match()` です。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L402-L405

繰り返しになりますが、[Hono のルーターには 5 つの種類](https://hono.dev/docs/concepts/routers#routers)があります。当然、それぞれのルーターで `match()` の実装は異なります。

初期値となっている `SimpleRouter` は、初期化で渡された他 4 種のルーターの `match()` を「最適に実行」している——私の理解できた範囲ではとてもワイルドに感じました——ので、コアとなる処理は 4 種類と考える事ができそうです。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono.ts#L28-L32

とても面白そうなのでそれぞれを深掘りしてみたいところなのですが、ここでは割愛します。

### ハンドラーの実行

さて、サンプルコードで登録している `GET "/"` に合致するハンドラーは一つだけなので、処理は段階 4.1 に進みます。

> 4. 段階 2 で取得したハンドラーの数で分岐
>    1. 1つの場合は、そのハンドラーを実行してレスポンスを返す
>    2. 複数の場合は、ハンドラーを順番に実行できるようにまとめて、その実行結果のレスポンスを返す

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L414-L433

例外処理を挟みつつ、取得したハンドラーを実行してレスポンスを返しています。

それほど複雑な処理ではなさそうに見えますが、私には Context インスタンス `c` が上手に緩衝しているおかげのように感じました。この記事では追いませんが、
`resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
` という処理や[段階4.2 (複数ハンドラーが存在した場合) のハンドラーの compose とその実行の処理](https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/compose.ts#L20-L95)を見ていただけると、同じように感じるかもしれません。

この Context インスタンス `c` は、[サンプルコード中の `app.get('/', (c) => c.text('Hono!'))` の `c` と同じもの](https://hono.dev/docs/api/context#context)です。Hono の利用者視点として Context は重要な存在ですが、開発においても同様でありそうなことがわかりました。

(段階 4.1 のコードの理解を助けるための補足: `this.router.match()` の返値 `matchResult` は以下のようなハンドラーとパラメーターの多次元配列となっています)

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/router.ts#L66-L98


# おわりに

最近話題のサーバーはどのように実装されているのか、という好奇心を出発点とした内容にしましたがいかがでしたか？
個人的には、コードリーディングを通じて、フレームワークをより深く理解するだけでなく、「そんな実装ありなの！？」という発見がいくつもあってとても楽しかったです。

今回紹介できた Hono のコードは限られた箇所になりましたが、Hono の魅力は伝わったでしょうか。少しでも興味が沸いたのであれば、ご自身でもコードを読んでいただければ嬉しいです。
また、この記事が少しでもコントリビュートのハードルを下げるきっかけになればと思います。

最後までお読みいただき、ありがとうございました。

明日の [🎅 GMOペパボ エンジニア Advent Calendar 2024](https://adventar.org/calendars/10036) の担当は[あいうち](https://x.com/hkt100rtkn) さんです。お楽しみに！

# おまけ: 個人的に驚いた実装

`match()` メソッドを実行すると、matchers をビルドしてから自身のメソッド `match()` に新しいメソッドを上書き代入することで、matchers をキャッシュするような実装になっていました (と理解しました)。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/router/reg-exp-router/router.ts#L208-L231
