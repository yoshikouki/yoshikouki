---
title: "レンダリングを探訪する"
emoji: "⏬"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Chrome", "Chromium", "Rendering", "Web"]
published: false
---

※ この記事は、[さくらじまハウス 2024 のLT「レンダリングを探訪する」](https://www.sakurajima-house.tech/#section-3) の書き起こしとして作成しました。

LT資料:
https://speakerdeck.com/yoshikouki/rendaringuwotan-fang-suru

## はじめに

この記事では、多くのブラウザで採用されている Chromium を題材に、ブラウザのレンダリングについて掘り下げていきます。

![ブラウザ一覧](/images/explore-rendering/browser-list.webp)
*※ シェア列は、資料作成時点 2024/10/13 頃の [Mobile Browser Market Share Worldwide | Statcounter Global Stats](https://gs.statcounter.com/browser-market-share/mobile/worldwide) を記載*
*※ 「iOS 系ブラウザ」のシェアは、資料作成時点の [Operating System Market Share Worldwide | Statcounter Global Stats](https://gs.statcounter.com/os-market-share) のシェアを記載*

なお、記事内容は [RenderingNG architecture  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng-architecture) の内容をベースにしています。

## ブラウザレンダリング

「レンダリングの流れ」と聞いて、どのような処理の順番を思い浮かべますか？
たとえば以下の4つのフローが示されている場合があります。

1. Parse
2. Style
3. Layout
4. Paint

[ブラウザの仕組み  |  Articles  |  web.dev](https://web.dev/articles/howbrowserswork?hl=ja) では、以下のように WebKit と Gecko のメインフローを紹介しています。

![WebKit のレンダリングメインフロー](/images/explore-rendering/rendering-main-flow-webkit.webp)
*WebKit のメインフロー*

![Gecko のレンダリングメインフロー](/images/explore-rendering/rendering-main-flow-gecko.webp)
*Mozilla の Gecko レンダリング エンジンのメインフロー*
*https://web.dev/articles/howbrowserswork?hl=ja#main_flow_examples*

Chromium の場合はどうでしょうか？
[RenderingNG  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng) では、Chromium のレンダリングメインフローを紹介しています。

![Chromium のレンダリングメインフロー](/images/explore-rendering/rendering-main-flow-chromium.webp)
*Chromium のレンダリング*
*https://developer.chrome.com/docs/chromium/renderingng*

Chromium の図において WebKit と Gecko のメインフローに対応するのは、Main Thread のフロー (script -> style -> layout -> paint) と捉えることもできそうですが、Chromium には Rendering pipeline structure というフローが存在し、Main Thread 以外のフローも重要な役割を担っています。

![Chromium のレンダリングパイプライン](/images/explore-rendering/rendering-pipeline-chromium.webp)
*Chromium のレンダリングパイプライン*
*https://developer.chrome.com/docs/chromium/renderingng*

しかし、大きく見ると、どのレンダリングエンジンでも似たフローになっていることがわかります。

メインフローについては、[aki さん @_akimuu_](https://x.com/_akimuu_) の記事「[ブラウザレンダリングの仕組み](https://zenn.dev/ak/articles/c28fa3a9ba7edb)」の図がとてもわかりやすいです。メインフローの詳細についても記事内で紹介されていますので、是非ご一読ください。

![ブラウザレンダリングの仕組み](/images/explore-rendering/rendering-main-flow-zenn.webp)
*https://zenn.dev/ak/articles/c28fa3a9ba7edb*


## レンダリングパイプライン

Chromium のレンダリングパイプラインについて見ていきましょう。
ここでは [RenderingNG architecture  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng-architecture) の内容を元に、必要に応じて筆者が修正を加えています。

レンダリングパイプラインは、いくつかのステージと途中で作成される成果物 Artifact で構成されます。

- Stage: レンダリング内で明確に定義された1つのタスクを実行するコード
- Artifact: ステージの入力・出力であるデータ構造

![レンダリングパイプラインの名称](/images/explore-rendering/rendering-pipeline-chromium-stage-and-artifact.webp)

各ステージを実行するのは、Main Thread, Compositor Thread, Viz Process の3つに別れます

![レンダリングパイプラインの実行場所](/images/explore-rendering/rendering-pipeline-chromium-execution-location.webp)

上記と各ステージの概要をまとめたものが次表です。

Stage | Execute | Description
--- | --- | ---
Animate | Main Thread<br />/ Compositor Thread | change computed styles and mutate property trees over time based on declarative timelines.<br />宣言的なタイムラインに基づいて、計算スタイルを変更し、プロパティツリーを随時変化させます。
Style | Main Thread | apply CSS to the DOM, and create computed styles.<br />CSS を DOM に適用し、計算スタイルを生成します。
Layout | Main Thread | determine the size and position of DOM elements on the screen, and create the immutable fragment tree.<br />DOM 要素の画面上のサイズと位置を決定し、不変のフラグメントツリーを生成します。
Pre-paint | Main Thread | compute property trees and invalidate any existing display lists and GPU texture tiles as appropriate.<br />プロパティツリーを計算し、既存のディスプレイリストや GPU テクスチャタイルを適宜無効化します。
Scroll | Main Thread | update the scroll offset of documents and scrollable DOM elements, by mutating property trees.<br />プロパティツリーを変化させることで、ドキュメントやスクロール可能な DOM 要素のスクロールオフセットを更新します。
Paint | Main Thread | compute a display list that describes how to raster GPU texture tiles from the DOM.<br />DOM から GPU テクスチャタイルをラスタライズする方法を記述するディスプレイリストを計算します。
Commit | Main Thread | copy property trees and the display list to the compositor thread.<br />プロパティツリーとディスプレイリストをコンポジタースレッドにコピーします。
Layerize | Compositor Thread | break up the display list into a composited layer list for independent rasterization and animation.<br />ディスプレイリストを分割し、独立したラスタライズとアニメーションのために合成レイヤーリストを作成します。
Raster, decode and paint worklets | Compositor Thread<br />/ Viz Process | turn display lists, encoded images, and paint worklet code, respectively, into GPU texture tiles.<br />ディスプレイリスト、エンコードされた画像、ペイントワークレットコードをそれぞれ GPU テクスチャタイルに変換します。
Activate | Compositor Thread | create a compositor frame representing how to draw and position GPU tiles to the screen, together with any visual effects.<br />GPU タイルを画面に描画・配置する方法を示すコンポジターフレームを、ビジュアルエフェクトとともに生成します。
Aggregate | Viz Process | combine compositor frames from all the visible compositor frames into a single, global compositor frame.<br />すべての可視コンポジターフレームを1つのグローバルなコンポジターフレームに統合します。
Draw | Viz Process | execute the aggregated compositor frame on the GPU to create pixels on-screen.<br />集約されたコンポジターフレームを GPU 上で実行し、画面上にピクセルを描画します。

*[RenderingNG architecture  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng-architecture) より筆者が作表。和訳は ChatGPT O1-preview によるもの*

この説では Chromium におけるレンダリングの流れを見てきましたが、WebKit や Gecko と似たフローとはいえ、"Painting" から "Display" までの処理が分厚いことがわかります。また、それらがマルチプロセスや GPU を利用することで、処理を分散させていることもわかりました。

ここからは、説明もなく登場した Main Thread, Compositor Thread, Viz Process の役割を見ていきましょう。

## プロセスとスレッド


ブラウザはマルチプロセス・マルチスレッドで動作します。そのうち、Chromium で動作する Render Process, Browser Process, Viz Process が [RenderingNG architecture](https://developer.chrome.com/docs/chromium/renderingng-architecture) で紹介されています。

![プロセスとスレッド](/images/explore-rendering/process-and-thread.webp)
*[RenderingNG architecture  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng-architecture)*

- Render Process:
  - 単一のサイトとタブの組み合わせに対して、レンダリング、アニメーション、スクロール、入力ルーティングを行う
  - 複数プロセスが起動する
- Browser Process:
  - ブラウザの UI (アドレスバー、タブタイトル、アイコンを含む) に対して、レンダリング、アニメーション、入力のルーティングを行い、残りのすべての入力を適切な Render Process にルーティングする
  - プロセスは1つだけ存在する
- Viz Process:
  - 複数の Render Process および Browser Process からの合成 (コンポジターフレーム) を集約する
  - 集約後、GPU を使用してラスタライズと描画を行う
  - プロセスは1つだけ存在する

ブラウザウィンドウを例にすると、以下のようになります。

![ブラウザウィンドウ](/images/explore-rendering/browser-window.webp)
*[Inside look at modern web browser (part 1)  |  Blog  |  Chrome for Developers](https://developer.chrome.com/blog/inside-browser-part1)*

複数の Render Process が起動する様子は、macOS におけるアクティビティモニターなどで確認できます。

![アクティビティモニター](/images/explore-rendering/activity-monitor.webp)

レンダリングパイプラインで登場した Main Thread と Compositor Thread は、Render Process 内で動作します。もちろん、Browser Process や Viz Process にもそれぞれの役割を果たすスレッドが存在します。

Main Thread と Compositor Thread は以下の処理を行います。

- Main thread:
  - HTML、CSS、その他のデータ形式の解析
  - スクリプトの実行
  - レンダリングイベントループ
  - ドキュメントのライフサイクル
  - ヒットテスト
  - スクリプトイベントのディスパッチ
- Compositor thread:
  - 入力イベントの処理
  - ウェブコンテンツのスクロールやアニメーションの実行
  - ウェブコンテンツの最適なレイヤリングの計算
  - 画像のデコード
  - ペイントワークレット
  - ラスタタスクの調整

![各プロセス内のスレッド](/images/explore-rendering/process-and-thread-detail.webp)
*[RenderingNG architecture  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng-architecture) の画像を筆者が加工したもの*

上図においても表現されていますが、Main Thread と Compositor Thread は各プロセスに対してシングルスレッドで動作します。しかし、それぞれに Thread Helper が存在し、高価な処理を実行する場合などにはマルチスレッドで動作します。


## 具体的な処理のシーケンス図

大まかな処理の流れや役割を見てきましたが、ここからは具体的な処理の流れを見て、理解を深めていきましょう。

### DOM更新

まず一般的な DOM 更新の流れを見ていきましょう。

![DOM更新](/images/explore-rendering/sequence-diagram-dom-update.webp)


### スクロール

次にスクロールの流れを見ていきます。

![スクロール](/images/explore-rendering/sequence-diagram-scroll.webp)
