---
title: "Chromiumのリポジトリを探訪する"
emoji: "🔦"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Chromium", "Chrome", "Browser", "Rendering", "Web"]
published: false
---


# はじめに
この記事は、「[🎅GMOペパボ エンジニア Advent Calendar 2025](https://adventar.org/calendars/11929)」の17日目の記事です。


# Chromium リポジトリの概要

https://chromium.googlesource.com/

# Chromium リポジトリの構造

公式ドキュメント [Getting Around the Chromium Source Code Directory Structure](https://www.chromium.org/developers/how-tos/getting-around-the-chrome-source-code/) がリポジトリの全体像を掴むのに役立ちます (少なくとも2017年以降更新されていないので、古い情報として扱う必要はありますが)。

また、Chromium の中で動くマルチプロセスの仕組みを理解するために、公式ドキュメント [Multi-process Architecture](https://www.chromium.org/developers/design-documents/multi-process-architecture/) も参考になります

# Renderer Process の概要


# Renderer Process のコードを追っていく



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
[`./content/app/content_main_runner_impl.cc`](https://source.chromium.org/chromium/chromium/src/+/main:content/app/content_main_runner_impl.cc;l=1128-1132) の中で以下の各プロセスを起動します。

- [`BrowserMain()` `./content/browser/browser_main.cc`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/browser_main.cc)
- [`RendererMain()` `./content/renderer/renderer_main.cc`](https://source.chromium.org/chromium/chromium/src/+/main:content/renderer/renderer_main.cc)
- [`GpuMain()` `./content/gpu/gpu_main.cc`](https://source.chromium.org/chromium/chromium/src/+/main:content/gpu/gpu_main.cc)
- [`UtilityMain()` `./content/utility/utility_main.cc`](https://source.chromium.org/chromium/chromium/src/+/main:content/utility/utility_main.cc)


### Renderer Process の起動


※ 先に紹介した [Getting Around the Chromium Source Code Directory Structure](https://www.chromium.org/developers/how-tos/getting-around-the-chrome-source-code/) にも[古い情報が記載](https://chromium.googlesource.com/playground/chromium-org-site/+/refs/heads/main/developers/how-tos/getting-around-the-chrome-source-code/index.md#application-startup)されています

# おわりに
前作の記事「[レンダリングを探訪する](https://zenn.dev/pepabo/articles/explore-rendering)」の続編として、Chromiumのリポジトリを題材に、レンダリングの仕組みを掘り下げてみました。この記事が、Chromium やブラウザ、レンダリングについて詳しく知りたいと思うきっかけとなり、案内役としてお役立ていただけたなら幸いです。

最後までお読みいただき、ありがとうございました。
明日の [🎅GMOペパボ エンジニア Advent Calendar 2025](https://adventar.org/calendars/11929) は、[Kentaro Kuribayashi (あんちぽ)](https://kentarokuribayashi.com/) さんです！乞うご期待！

