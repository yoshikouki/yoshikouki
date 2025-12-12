---
title: "Chromiumのリポジトリを探訪する"
emoji: "🔦"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Chromium", "Chrome", "Browser", "Rendering", "Web"]
published: false
---


## はじめに
この記事は、「[🎅GMOペパボ エンジニア Advent Calendar 2025](https://adventar.org/calendars/11929)」の17日目の記事です。

もう一年以上前になりますが、Chromium を題材にレンダリングに対する理解を深めようとする記事「[🖼️ レンダリングを探訪する](https://zenn.dev/yoshikouki/explore-rendering)」を投稿しました。この記事では、その内容からもう少し踏み込み、「Chromium を題材にブラウザがどのように開発されているのか」への理解を深めようと、Chromium のリポジトリとソースコードの触りをざっくりと理解していきます。


## Chromium リポジトリの概要
<!-- TODO: 概要とリポジトリのリンクを貼る -->
Chromium は
https://chromium.googlesource.com/

<!-- TODO: chromium/src の紹介を行う -->

<!-- TODO: 手元のPCにコードを落とす場合は git clone ではなく公式が案内している方法があることとそのリンクを紹介する -->


## Chromium のリポジトリを理解するうえで必要な前提知識
<!--
TODO: マルチプロセス (最低限 BroeserProcess, RendererProcess のある程度の説明と GpuProcess, UtilityProcess の存在を紹介)
[Multi-process Architecture](https://www.chromium.org/developers/design-documents/multi-process-architecture/) の紹介
-->

Chromium はマルチプロセス・マルチスレッドで動作します。

複数のプロセスが起動する様子は、macOS におけるアクティビティモニターなどで確認できます。

![アクティビティモニター](/images/explore-rendering/activity-monitor.webp)


プロセスのうち、Renderer Process, Browser Process, GPU Process (Viz Process) が [RenderingNG architecture](https://developer.chrome.com/docs/chromium/renderingng-architecture) で紹介されています。

![プロセスとスレッド](/images/explore-rendering/process-and-thread.webp)
*[引用: RenderingNG architecture  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng-architecture)*

> - Renderer Process:
>   - 単一のサイトとタブの組み合わせに対して、レンダリング、アニメーション、スクロール、入力ルーティングを行う
>   - 複数プロセスが起動する
> - Browser Process:
>   - ブラウザの UI (アドレスバー、タブタイトル、アイコンを含む) に対して、レンダリング、アニメーション、入力のルーティングを行い、残りのすべての入力を適切な Renderer Process にルーティングする
>   - プロセスは1つだけ存在する
> - Viz Process:
>   - 複数の Renderer Process および Browser Process からの合成 (コンポジターフレーム) を集約する
>   - 集約後、GPU を使用してラスタライズと描画を行う
>   - プロセスは1つだけ存在する
>
> ブラウザウィンドウを例にすると、以下のようになります。
>
> ![ブラウザウィンドウ](/images/explore-rendering/browser-window.webp)
> *Viz Process が GPU Process を担う*
> *[Inside look at modern web browser (part 1)  |  Blog  |  Chrome for Developers](https://developer.chrome.com/blog/inside-browser-part1)*

<!--
TODO: Sandboxing について簡単に解説する
chromium/src/docs/design/sandbox.md を紹介する
-->

各プロセスはマルチスレッドで動き、RendererProcess では Main Thread や Compositor Thread などのスレッドが動いています。聞き覚えのある方もいるのではないでしょうか？


![各プロセス内のスレッド](/images/explore-rendering/process-and-thread-detail.webp)
*[RenderingNG architecture  |  Chromium  |  Chrome for Developers](https://developer.chrome.com/docs/chromium/renderingng-architecture) の画像を筆者が加工したもの*

より詳細な図が、Chromium 公式ドキュメントの [Multi-process Architecture](https://www.chromium.org/developers/design-documents/multi-process-architecture/#architectural-overview) で紹介されています。

![](/images/explore-chromium/architectural-overview.png)
*引用: [Multi-process Architecture](https://www.chromium.org/developers/design-documents/multi-process-architecture/#architectural-overview)*

Main Thread と Compositor Thread は、それぞれ以下の処理を行います。

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


![レンダリングパイプラインの実行場所](/images/explore-rendering/rendering-pipeline-chromium-execution-location.webp)
*左図のステージは、実行される場所が色によって示されています*

<!-- TODO: [🖼️ レンダリングを探訪する](https://zenn.dev/yoshikouki/explore-rendering) も理解に約に立つよということを伝える -->


## Chromium リポジトリの構造
言うまでもありませんが Chromium/src のリポジトリは巨大です。

![](/images/explore-chromium/chromium-modules-diagram.png)
*[引用: Getting Around the Chromium Source Code Directory Structure](https://www.chromium.org/developers/how-tos/getting-around-the-chrome-source-code/#application-startup)（※図中の WebKit は現在 Blink に置き換わっています）*

公式ドキュメント [Getting Around the Chromium Source Code Directory Structure](https://www.chromium.org/developers/how-tos/getting-around-the-chrome-source-code/) がリポジトリの全体像を掴むのに役立ちます（少なくとも2017年以降更新されていないので、古い情報として読む必要はあります）。

### 主要ディレクトリとプロセスの対応

前のセクションで紹介したマルチプロセスアーキテクチャは、リポジトリ構造にも反映されています。

| プロセス | 主要ディレクトリ |
|---------|-----------------|
| Browser Process | `./content/browser` |
| Renderer Process | `./content/renderer`, `./third_party/blink/renderer` |
| GPU Process | `./content/gpu`, `./cc` |

主要なディレクトリの役割を以下に示します。

- **./chrome**: Chrome ブラウザ固有の機能（拡張機能、オートフィル、ブックマークなど）
- **./content**: マルチプロセス・サンドボックス化ブラウザのコアコード。[Content Module](https://www.chromium.org/developers/content-module) として、Chrome 固有機能と分離されています
  - **./content/browser**: Browser Process のバックエンド。I/O と子プロセスとの通信を担当
  - **./content/renderer**: Renderer Process のコード。Blink を埋め込み、Browser Process と通信
  - **./content/gpu**: GPU Process のコード。3D 合成と 3D API に使用
- **./cc**: Chromium Compositor の実装。Compositor Thread で動作し、レイヤーの合成を担当
- **./v8**: JavaScript エンジン V8

### Web エンジン Blink

Blink は `./third_party/blink/renderer` に配置されており、HTML、CSS、JavaScript を解析してレンダリング命令に変換する役割を担います。

```
./third_party/blink/renderer/
├── core/       # DOM、HTML、CSS など Web Platform の核心機能
├── modules/    # WebGL、WebCrypto など自己完結した Web API
├── platform/   # 低レベル機能（タスクスケジューラ、グラフィックス等）
└── bindings/   # V8 との連携（JavaScript バインディング）
```

これらのディレクトリには厳密な依存関係のルールがあり、`modules/` → `core/` → `platform/` の方向にのみ依存できます（DEPS ファイルで強制）。

#### レンダリングパイプラインとの対応

前作「[レンダリングを探訪する](https://zenn.dev/yoshikouki/articles/explore-rendering)」で紹介したレンダリングパイプラインの各ステージは、Blink の以下のディレクトリで実装されています。

| ステージ | ディレクトリ |
|---------|-------------|
| Parse | `core/html/parser/`, `core/css/parser/` |
| Style | `core/css/`, `core/style/` |
| Layout | `core/layout/` |
| Paint | `core/paint/` |
| Composite | `./cc`（Blink 外） |

![レンダリングパイプラインの実行場所](/images/explore-rendering/rendering-pipeline-chromium-execution-location.webp)

Blink（Main Thread）で Parse から Paint までを処理し、その後 Compositor Thread（`./cc`）でレイヤーの合成が行われ、最終的に GPU Process（Viz）で画面に描画されます。


## ブラウザの起動
Chromium ではなく Chrome の話になりますが、各プラットフォーム毎のエントリーポイントが `./chrome/app/chrome_exe_main*` にあります。

```bash
$ ls -lh ./chrome/app/chrome_exe_main*
-rw-r--r--@ 1 yoshikouki  staff   582B Oct 28 22:52 chrome/app/chrome_exe_main_aura.cc
-rw-r--r--@ 1 yoshikouki  staff   9.3K Oct 28 22:52 chrome/app/chrome_exe_main_mac.cc
-rw-r--r--@ 1 yoshikouki  staff    14K Nov 29 15:10 chrome/app/chrome_exe_main_win.cc
-rw-r--r--@ 1 yoshikouki  staff   707B Oct 28 22:52 chrome/app/chrome_exe_main_win.h
```

これらは、[`ChromeMain()` (`./chrome/app/chrome_main.cc`)](https://source.chromium.org/chromium/chromium/src/+/main:chrome/app/chrome_main.cc) を呼び出し、クロスプラットフォームに対応して初期化などの Chrome プロセスの起動処理を行います。各プラットフォームの処理実体は、 `./chrome/app/chrome_main_*` に存在します。

```bash
$ ls -lh ./chrome/app/chrome_main*
-rw-r--r--@ 1 yoshikouki  staff   6.9K Dec  4 22:13 chrome/app/chrome_main.cc
-rw-r--r--@ 1 yoshikouki  staff    66K Nov 29 15:10 chrome/app/chrome_main_delegate.cc
-rw-r--r--@ 1 yoshikouki  staff   4.0K Oct 28 22:52 chrome/app/chrome_main_delegate.h
-rw-r--r--@ 1 yoshikouki  staff   3.7K Oct 28 22:52 chrome/app/chrome_main_delegate_browsertest.cc
-rw-r--r--@ 1 yoshikouki  staff   3.3K Nov 29 15:10 chrome/app/chrome_main_linux.cc
-rw-r--r--@ 1 yoshikouki  staff   890B Oct 28 22:52 chrome/app/chrome_main_linux.h
-rw-r--r--@ 1 yoshikouki  staff   1.0K Oct 28 22:52 chrome/app/chrome_main_mac.h
-rw-r--r--@ 1 yoshikouki  staff   4.9K Oct 28 22:52 chrome/app/chrome_main_mac.mm
```

`ChromeMain()` の中で Chromium の抽象層である [`content::ContentMain()` (`./content/app/content_main.cc`)](https://source.chromium.org/chromium/chromium/src/+/main:content/app/content_main.cc;l=355-360) が呼ばれ、
```c:content/app/content_main.cc
// This function must be marked with NO_STACK_PROTECTOR or it may crash on
// return, see the --change-stack-guard-on-fork command line flag.
NO_STACK_PROTECTOR int ContentMain(ContentMainParams params) {
  auto runner = ContentMainRunner::Create();
  return RunContentProcess(std::move(params), runner.get());
}
```

[`./content/app/content_main_runner_impl.cc`](https://source.chromium.org/chromium/chromium/src/+/main:content/app/content_main_runner_impl.cc;l=1128-1132) の中で以下の各プロセスを起動します。

- [`BrowserMain()` `./content/browser/browser_main.cc`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/browser_main.cc)
- [`RendererMain()` `./content/renderer/renderer_main.cc`](https://source.chromium.org/chromium/chromium/src/+/main:content/renderer/renderer_main.cc)
- [`GpuMain()` `./content/gpu/gpu_main.cc`](https://source.chromium.org/chromium/chromium/src/+/main:content/gpu/gpu_main.cc)
- [`UtilityMain()` `./content/utility/utility_main.cc`](https://source.chromium.org/chromium/chromium/src/+/main:content/utility/utility_main.cc)

```c:content/app/content_main_runner_impl.cc:1126-1133
  RegisterMainThreadFactories();

  if (process_type.empty())
    return RunBrowser(std::move(main_params), start_minimal_browser);

  return RunOtherNamedProcessTypeMain(process_type, std::move(main_params),
                                      delegate_);
}
```

```c:content/app/content_main_runner_impl.cc:721-768
  static const auto kMainFunctions = std::to_array<MainFunction>({
      {switches::kUtilityProcess, UtilityMain},
      {switches::kRendererProcess, RendererMain},
      {switches::kGpuProcess, GpuMain},
  });

  // ...省略

  for (const MainFunction& main_function : kMainFunctions) {
    if (process_type == main_function.name) {
      auto exit_code =
          delegate->RunProcess(process_type, std::move(main_function_params));
      if (std::holds_alternative<int>(exit_code)) {
        DCHECK_GE(std::get<int>(exit_code), 0);
        return std::get<int>(exit_code);
      }
      return main_function.function(
          std::move(std::get<MainFunctionParams>(exit_code)));
    }
  }
```

これらの流れをシーケンス図にまとめると以下のようになります。


```mermaid
flowchart TD
    Entry[chrome_exe_main_*.cc] --> ChromeMain[ChromeMain]
    ChromeMain --> ContentMain[content::ContentMain]
    ContentMain --> Runner[ContentMainRunnerImpl::Run]

    Runner --> Check{process_type Check}

    Check -- Empty --> BrowserMain[RunBrowser<br>BrowserMain]
    Check -- Not Empty --> ChildMain[RunOtherNamedProcessTypeMain<br>RendererMain, GpuMain, etc.]
```




### Renderer Process の起動

Renderer Process 関連の主要ファイルは以下の通りです：

```bash
$ ls -lh ./content/renderer/renderer_main.cc ./content/renderer/render_thread_impl.cc ./content/renderer/render_thread_impl.h ./content/renderer/render_process_impl.cc
-rw-r--r--@ 1 yoshikouki  staff   8.3K Oct 28 22:52 ./content/renderer/render_process_impl.cc
-rw-r--r--@ 1 yoshikouki  staff    63K Nov 29 15:10 ./content/renderer/render_thread_impl.cc
-rw-r--r--@ 1 yoshikouki  staff    23K Nov 29 15:10 ./content/renderer/render_thread_impl.h
-rw-r--r--@ 1 yoshikouki  staff    14K Nov 29 15:10 ./content/renderer/renderer_main.cc
```

Renderer Process のエントリーポイントは [`content::RendererMain()` (`./content/renderer/renderer_main.cc`)](https://source.chromium.org/chromium/chromium/src/+/main:content/renderer/renderer_main.cc) です。

ここでは、Blink の初期化、スケジューラの作成、そして Renderer ごとのメインスレッドとなる `RenderThreadImpl` の生成とメッセージループの開始が行われます。

```mermaid
flowchart TD
    RendererMain[RendererMain] --> InitBlink[blink::Platform::InitializeBlink]
    InitBlink --> Scheduler[WebThreadScheduler::CreateMainThreadScheduler]
    Scheduler --> RenderProcess[RenderProcessImpl::Create]
    RenderProcess --> RenderThread[new RenderThreadImpl]
    RenderThread --> RunLoop[run_loop.Run]
```

#### 主な処理の流れ

**1. Blink の初期化とスケジューラの作成**

```cpp:content/renderer/renderer_main.cc:215-218
  blink::Platform::InitializeBlink();
  std::unique_ptr<blink::scheduler::WebThreadScheduler> main_thread_scheduler =
      blink::scheduler::WebThreadScheduler::CreateMainThreadScheduler(
          CreateMainThreadMessagePump());
```

[`blink::Platform::InitializeBlink()`](https://source.chromium.org/chromium/chromium/src/+/main:content/renderer/renderer_main.cc;l=215) が呼ばれ、Web エンジン Blink の初期化が行われます。続いて [`WebThreadScheduler::CreateMainThreadScheduler()`](https://source.chromium.org/chromium/chromium/src/+/main:content/renderer/renderer_main.cc;l=216-218) で、レンダラープロセスのメインスレッド用のスケジューラが作成されます。これは、JavaScript の実行、HTML の解析、スタイルの計算などを適切なタイミングで行うために重要です。

**2. RenderProcess と RenderThreadImpl の生成**

```cpp:content/renderer/renderer_main.cc:287-292
    std::unique_ptr<RenderProcess> render_process = RenderProcessImpl::Create();
    // It's not a memory leak since RenderThread has the same lifetime
    // as a renderer process.
    base::RunLoop run_loop;
    new RenderThreadImpl(run_loop.QuitClosure(),
                         std::move(main_thread_scheduler));
```

[`RenderProcessImpl::Create()`](https://source.chromium.org/chromium/chromium/src/+/main:content/renderer/renderer_main.cc;l=287) で RenderProcess が生成され、続いて [`new RenderThreadImpl(...)`](https://source.chromium.org/chromium/chromium/src/+/main:content/renderer/renderer_main.cc;l=291-292) でレンダラスレッドの実体である `RenderThreadImpl` オブジェクトが生成されます。

**3. GPU チャネルの確立**

`RenderThreadImpl` のコンストラクタ内では、GPU Process との通信経路が確立されます。

```cpp:content/renderer/render_thread_impl.cc:518-527
  gpu_ = viz::Gpu::Create(std::move(remote_gpu), GetIOTaskRunner());

  // Establish the GPU channel now, so its ready when needed and we don't have
  // to wait on a sync call.
  if (base::FeatureList::IsEnabled(features::kEarlyEstablishGpuChannel)) {
    gpu_->EstablishGpuChannel(
        base::BindOnce([](scoped_refptr<gpu::GpuChannelHost> host) {
          if (host)
            GetContentClient()->SetGpuInfo(host->gpu_info());
        }));
  }
```

**4. Sandbox化**

処理の途中で [`platform.EnableSandbox()`](https://source.chromium.org/chromium/chromium/src/+/main:content/renderer/renderer_main.cc;l=250) (プラットフォームにより異なる) が呼ばれ、プロセスがサンドボックス化されます。これにより、セキュリティリスクが軽減されます。

```cpp:content/renderer/renderer_main.cc:320-325
    if (need_sandbox) {
      should_run_loop = platform.EnableSandbox();
      if (client) {
        client->PostSandboxInitialized();
      }
    }
```

**5. メッセージループ (RunLoop) の開始**

```cpp:content/renderer/renderer_main.cc:356-367
    if (should_run_loop) {
#if BUILDFLAG(IS_MAC)
      if (pool)
        pool->Recycle();
#endif
      TRACE_EVENT_INSTANT0("toplevel", "RendererMain.START_MSG_LOOP",
                           TRACE_EVENT_SCOPE_THREAD);
      const base::TimeTicks run_loop_start_time = base::TimeTicks::Now();
      RenderThreadImpl::current()->set_run_loop_start_time(run_loop_start_time);
      LogTimeToStartRunLoop(command_line, run_loop_start_time);
      run_loop.Run();
    }
```

[`run_loop.Run()`](https://source.chromium.org/chromium/chromium/src/+/main:content/renderer/renderer_main.cc;l=366) によってメッセージループが開始され、プロセスはイベント待ちの状態になります。これ以降、IPC メッセージや入力イベント、タイマーイベントなどが処理されていきます。

`RenderThreadImpl` は、Renderer Process 全体の要となるクラスで、Browser Process や GPU Process とのやり取り、リソースの管理などを統括します。



## おわりに
前作の記事「[レンダリングを探訪する](https://zenn.dev/pepabo/articles/explore-rendering)」の続編として、Chromiumのリポジトリを題材に、レンダリングの仕組みを掘り下げてみました。この記事が、Chromium やブラウザ、レンダリングについて詳しく知りたいと思うきっかけとなり、案内役としてお役立ていただけたなら幸いです。

Chromium に対するコントリビュートに興味をお持ちの方は、jxck さんの記事がおすすめです
https://blog.jxck.io/entries/2024-03-26/chromium-contribution.html

最後までお読みいただき、ありがとうございました。
明日の [🎅GMOペパボ エンジニア Advent Calendar 2025](https://adventar.org/calendars/11929) は、[Kentaro Kuribayashi (あんちぽ)](https://kentarokuribayashi.com/) さんです！乞うご期待！

