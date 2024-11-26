---
title: "Hono のサンプルコードの内側を覗く"
emoji: "🔥"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Hono", "JavaScript", "TypeScript"]
published: false
---

# はじめに

最近注目を集めている Web アプリケーションフレームワーク **Hono**。そのシンプルさと高速性、そして Web Standards に準拠した設計が多くの開発者から支持を得ています。

本記事では、[Hono 公式ドキュメント](https://hono.dev/docs/) に記載されている以下のサンプルコードを題材に、リクエストしたときに内部で何が起こっているのか、リポジトリ [`honojs/hono`](https://github.com/honojs/hono) のコードを読み解いていきます。

```typescript
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

export default app
```

コードのバージョンは、2024/11/25 時点で最新の [v4.6.12](https://github.com/honojs/hono/tree/v4.6.12) を使用しています。

# Hono とは

Hono について、公式ドキュメントでは以下のように説明されています。

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

では、サンプルコードの挙動を見ていきましょう。

```typescript:src/index.ts
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

export default app
```

このサンプルコードを `$ bun src/index.ts` で起動した状態でリクエストすると、

```bash
❯ curl -i localhost:3000/
HTTP/1.1 200 OK
content-type: text/plain;charset=utf-8
Date: Mon, 25 Nov 2024 13:55:23 GMT
Content-Length: 5

Hono!
$
```

レスポンスが返ってきましたね。

# サンプルコードの内側

早速コードの中身を見ていきましょう。

## `class Hono`

まず `class Hono` のインスタンスを生成している部分。

```typescript:src/index.ts
import { Hono } from 'hono'
const app = new Hono()
```

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/index.ts#L48-L51

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/index.ts#L17

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono.ts#L8-L34

`class Hono<中略> extends HonoBase<中略>` と、`HonoBase` というクラスを継承しています。また、型情報もそのまま引き継いでいることがわかります。

```typescript:src/hono.ts
export class Hono<
  E extends Env = BlankEnv,
  S extends Schema = BlankSchema,
  BasePath extends string = '/'
> extends HonoBase<E, S, BasePath> {
```


この constructor では、`HonoBase` の constructor の呼び出しの他に、`this.router` を初期化しています。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono.ts#L21-L33

ルーターの初期値は `SmartRouter` です。[公式ドキュメント Routers](https://hono.dev/docs/concepts/routers) では、SmartRouter を含め合計5つのルーターが紹介されています。

なお、このルーターに関しては、[先に紹介した @yusukebe さんのスライド](https://speakerdeck.com/yusukebe/hononolai-tadao-tokorekara?slide=29)にも出てくる熱い話題の一つです。Hono 誕生のきっかけともなった部分みたいなので、是非ドキュメントと一緒にスライドもご覧ください。

![image](/images/inspect-hono-sample-code/hononolai-tadao-tokorekara-slide-29.png)
*[Honoの来た道とこれから - Speaker Deck](https://speakerdeck.com/yusukebe/hononolai-tadao-tokorekara?slide=29)*


## `class HonoBase`

次に `super(options)` で呼び出されている `HonoBase` クラスの中身を見ていきましょう。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L520


https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L102-L123
(長いため序盤のみをリンク)

103 行目にインスタンスメソッドとして `get!: HandlerInterface<E, 'get', S, BasePath>` が定義されています。
`get!` の `!` は、definite assignment assertion というもので、メソッド `get` が constructor で必ず初期化されることを示しています。

https://typescriptbook.jp/reference/values-types-variables/definite-assignment-assertion

プロパティ `router` も definite assignment assertion で `router!: Router<[H, RouterRoute]>` と宣言されています。コメントで、HonoBase が抽象されたクラスであること、継承先で必ず router を初期化することが示されていますね。
型 `H` は Handler か MiddlewareHandler です。
https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/types.ts#L85-L90

123 行目で `routes: RouterRoute[] = []` として、ルート (エンドポイント) が空の配列として初期化されていることにも注目してください。後ほど出てきます。

`HonoBase` の constructor の中身を見ると、次の箇所で `app.get` のような HTTP メソッドに対応するインスタンスメソッドが定義されています。

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

## `new HonoBase().get`

各 HTTP メソッドのインスタンスメソッド (e.g. `app.get(path, ...handlers[])`) は、以下のように定義されていました。

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L129-L139

ここまで来ると、サンプルコードの次の段階に進むことができます。

```typescript:src/index.ts
app.get('/', (c) => c.text('Hono!'))
```

このサンプルコードを実行すると次の処理を行います。

1. Hono インスタンスのプライベートプロパティ `#path` へ第一引数 `path` が代入される

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L121

2. 第二引数以降のハンドラー毎に、プライベートメソッド `#addRoute` が呼び出される

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L376-L382

3. `#addRoute` 内で、プロパティ `router` (SmartRouter など) と `routes` (配列) にハンドラー等が追加される

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/hono-base.ts#L123

1. `this.router` = SmartRouter の例: SmartRouter インスタンスのプライベートプロパティ `#routes` にハンドラー等が追加される

https://github.com/honojs/hono/blob/76b7109d0c15dc85a947741593630460224f7b81/src/router/smart-router/router.ts#L4-L19


