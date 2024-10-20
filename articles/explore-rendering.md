---
title: "レンダリングを探訪する"
emoji: "⏬"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Chrome", "Chromium", "Rendering", "Web"]
published: false
---

この記事は、[さくらじまハウス 2024 のLT「レンダリングを探訪する」](https://www.sakurajima-house.tech/#section-3)をベースにしています。

LT資料: https://speakerdeck.com/yoshikouki/rendaringuwotan-fang-suru

## はじめに

この記事では、多くのブラウザで採用されている Chromium を題材に、ブラウザのレンダリングについて掘り下げていきます。

![ブラウザ一覧](/images/explore-rendering/browser-list.png)
*※ シェア列は、資料作成時点 2024/10/13 頃の [Mobile Browser Market Share Worldwide | Statcounter Global Stats](https://gs.statcounter.com/browser-market-share/mobile/worldwide) を記載*
*※ 「iOS 系ブラウザ」のシェアは、資料作成時点の [Operating System Market Share Worldwide | Statcounter Global Stats](https://gs.statcounter.com/os-market-share) のシェアを記載*

## ブラウザレンダリング

「レンダリングの流れ」と聞いて、どのような処理の順番を思い浮かべますか？
たとえば以下の4つのフローが示されている場合があります。

1. Parse
2. Style
3. Layout
4. Paint

[ブラウザの仕組み  |  Articles  |  web.dev](https://web.dev/articles/howbrowserswork?hl=ja) では、以下のように WebKit と Gecko のメインフローを紹介しています。

![WebKit のレンダリングメインフロー](/images/explore-rendering/rendering-main-flow-webkit.png)
*WebKit のメインフロー*

![Gecko のレンダリングメインフロー](/images/explore-rendering/rendering-main-flow-gecko.png)
*Mozilla の Gecko レンダリング エンジンのメインフロー*
*https://web.dev/articles/howbrowserswork?hl=ja#main_flow_examples*

Chromium の場合はどうでしょうか？
[RenderingNG  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng) では、Chromium のレンダリングメインフローを紹介しています。

![Chromium のレンダリングメインフロー](/images/explore-rendering/rendering-main-flow-chromium.png)
*Chromium のレンダリング*
*https://developer.chrome.com/docs/chromium/renderingng*

Chromium の図において WebKit と Gecko のメインフローに対応するのは、Main Thread のフロー (script -> style -> layout -> paint) と捉えることもできそうですが、Chromium には Rendering pipeline structure というフローが存在し、Main Thread 以外のフローも重要な役割を担っています。

![Chromium のレンダリングパイプライン](/images/explore-rendering/rendering-pipeline-chromium.png)
*Chromium のレンダリングパイプライン*
*https://developer.chrome.com/docs/chromium/renderingng*

しかし、大きく見ると、どのレンダリングエンジンでも似たフローになっていることがわかります。

メインフローについては、[aki さん @_akimuu_](https://x.com/_akimuu_) の記事「[ブラウザレンダリングの仕組み](https://zenn.dev/ak/articles/c28fa3a9ba7edb)」の図がとてもわかりやすいです。メインフローの詳細についても記事内で紹介されていますので、是非ご一読ください。

![ブラウザレンダリングの仕組み](/images/explore-rendering/rendering-main-flow-zenn.png)
*https://zenn.dev/ak/articles/c28fa3a9ba7edb*


## レンダリングパイプライン

Chromium のレンダリングパイプラインについて見ていきましょう。
ここでは [RenderingNG architecture  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng-architecture) の内容を元に、必要に応じて筆者が修正を加えています。

レンダリングパイプラインは、いくつかのステージと途中で作成される成果物 Artifact で構成されます。

![Chromium のレンダリングパイプラインの名称](/images/explore-rendering/rendering-pipeline-chromium-stage-and-artifact.png)

- Stage: レンダリング内で明確に定義された1つのタスクを実行するコード
- Artifact: ステージの入力・出力であるデータ構造

No | Stage | Description
--- | --- | ---
1 | Animate | change computed styles and mutate property trees over time based on declarative timelines.<br />宣言的なタイムラインに基づいて、計算スタイルを変更し、プロパティツリーを随時変化させます。
2 | Style | apply CSS to the DOM, and create computed styles.<br />CSS を DOM に適用し、計算スタイルを生成します。
3 | Layout | determine the size and position of DOM elements on the screen, and create the immutable fragment tree.<br />DOM 要素の画面上のサイズと位置を決定し、不変のフラグメントツリーを生成します。
4 | Pre-paint | compute property trees and invalidate any existing display lists and GPU texture tiles as appropriate.<br />プロパティツリーを計算し、既存のディスプレイリストや GPU テクスチャタイルを適宜無効化します。
5 | Scroll | update the scroll offset of documents and scrollable DOM elements, by mutating property trees.<br />プロパティツリーを変化させることで、ドキュメントやスクロール可能な DOM 要素のスクロールオフセットを更新します。
6 | Paint | compute a display list that describes how to raster GPU texture tiles from the DOM.<br />DOM から GPU テクスチャタイルをラスタライズする方法を記述するディスプレイリストを計算します。
7 | Commit | copy property trees and the display list to the compositor thread.<br />プロパティツリーとディスプレイリストをコンポジタースレッドにコピーします。
8 | Layerize | break up the display list into a composited layer list for independent rasterization and animation.<br />ディスプレイリストを分割し、独立したラスタライズとアニメーションのために合成レイヤーリストを作成します。
9 | Raster, decode and paint worklets | turn display lists, encoded images, and paint worklet code, respectively, into GPU texture tiles.<br />ディスプレイリスト、エンコードされた画像、ペイントワークレットコードをそれぞれ GPU テクスチャタイルに変換します。
10 | Activate | create a compositor frame representing how to draw and position GPU tiles to the screen, together with any visual effects.<br />GPU タイルを画面に描画・配置する方法を示すコンポジターフレームを、ビジュアルエフェクトとともに生成します。
11 | Aggregate | combine compositor frames from all the visible compositor frames into a single, global compositor frame.<br />すべての可視コンポジターフレームを1つのグローバルなコンポジターフレームに統合します。
12 | Draw | execute the aggregated compositor frame on the GPU to create pixels on-screen.<br />集約されたコンポジターフレームを GPU 上で実行し、画面上にピクセルを描画します。

*[RenderingNG architecture  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng-architecture) より引用。和訳は ChatGPT O1-preview によるもの*

## 具体例のシーケンス図

### DOM更新

### スクロール
