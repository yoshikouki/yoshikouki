# 開発環境現状確認 2026

流行っていたので定期

## 基本環境

### OS
- **macOS 15.6.1** (Sequoia)
  - Apple Silicon (ARM64)

### エディタ
- **Neovim**
  - 2026年になってから入門した
  - Coding Agent の開発が主になったのでターミナルで完結できるようになりつつあり、満足度が高い
  - ゼロからすべて設定していこうと思ったが2日で諦めて LazyVim から入門して少しずつカスタマイズしている
  - この記事も Neovim で書いている
- **VSCode** - 2023年頃からメインエディタとして活躍していた

### ターミナル
- **Warp** - メインターミナル
  - 入力欄がテキストエディタのように操作できるところが気に入っている
- **Ghostty** - サブターミナル
  - めちゃくいいと評判だったので入れてみたもの
  - Warp の操作系が心地よくてあまり活用できていない
  - タブなしの表示にしたらカッコよくなったらので tmux に入門して専用クライアントとして運用できないか思案中

### シェル
- **fish** - デフォルトシェル
  - 以前と変わらず。社内の凄腕が使っているのを見て憧れて入門したが活用しきれているかはわからない
  - Claude Code のコマンドが zsh で実行されるため相性の悪さを感じている

### ターミナルマルチプレクサ
- **tmux** - ターミナルで完結させようとするとターミナルのペインが辛くなるので入門中 

## AIツール

### コーディングエージェント
- **Claude Code** - メインで使っている Coding Agent
  - 早い。
  - 基本的に各タスクの前に Plan モードで計画を練ってもらっている
- Codex CLI - サブ
  - CCが期待通りにタスク解決できないときやデータモデリング、多方面からレビューが欲しいに使用

### AIアシスタント（Claude Code プラグイン, MCP）
- React Ink などの尖った自作スキルを作ったりしている
- Anthropic 純正と Google 提供のモノを中心に構成
- chrome-devtools-mcp - ヘッドレスモードで運用
- **github** - GitHub統合
- **code-review** - コードレビュー支援
- **code-simplifier** - コード簡素化
- **frontend-design** - フロントエンド設計
- **plugin-dev** - プラグイン開発
- **context7** - ドキュメント検索
- **typescript-lsp** - TypeScript言語サーバー
- **lua-lsp** - Lua言語サーバー
- **feature-dev** - 機能開発支援
- **hookify** - フック管理
- **claude-opus-4-5-migration** - Claude Opus 4.5移行支援
- **security-guidance** - セキュリティガイダンス

## ツール

### ブラウザ
- **Arc** - メインブラウザ
- **Google Chrome** - 開発・テスト用
- **Google Chrome Canary** - 最新機能検証用

### ランチャー
- **Raycast** - アプリケーションランチャー・生産性ツール
  - ウィンドウマネジャーの Reactangle を長年使ってきたが、最近 Raycast に移管した

### フォント
- **Hack Nerd Font** - プログラミング用フォント
- **Symbols Only Nerd Font** - アイコン表示用

## 環境構築・管理

### 環境構築ツール
- **Ansible** - インフラ自動化・環境構築

### バージョン管理ツール
- **asdf** - 複数言語・ツールのバージョン管理
  - 管理対象: Node.js, Bun, Deno, Python, Ruby, Rust, Go, Terraform, Vault, Consul, Nomad, Packer, Waypoint, Sentinel, Serf 等

### dotfiles管理
- カスタム設定ファイルを ~/.config/ 配下で管理
  - Neovim, Karabiner, Lazygit, Yazi, Fish, Git, Ghostty, AeroSpace 等

## 日本語入力

### IME / 日本語入力
- azooKey - ライブ変換の精度がすごくいい
  - iPhone で入れて感動したので macOS にも入れた
  - Claude Code との相性に若干の難があるがメリットに対して些細なものなので気にしていない

## ハードウェア

### キーリマッパー
- **Karabiner-Elements** - キーボードカスタマイズ
  - こいつのおかげで hjkl 移動に全く違和感がなくなっていたので、Neovim 入門が楽になったのだと思っている

## CLIツール

### Git関連ツール
- GitHub Desktop - GUIベースのGitクライアント。ずっと現役だったが最近TUIに移行したい気持ちがある
- **lazygit** - TUIベースのGitクライアント
  - Neovim と連携しつつ使っている。Diff が見づらく思案中
  - **git-delta** を diff viewer（git pager）で使っている
- **GitHub CLI (gh)** - GitHub操作用CLI
  - Git認証ヘルパーとして使用

### リポジトリ管理
- **ghq** - Gitリポジトリ管理

### Fuzzy Finder
- **fzf** - コマンドライン用ファジーファインダー

### ディレクトリ移動
- **zoxide** - スマートcd代替

### その他便利ツール
- **bat** - cat代替（シンタックスハイライト）
- **ripgrep (rg)** - 高速grep
- **fd** - 高速find
- **yazi** - ターミナルファイルマネージャー

## 情報管理

### メモアプリ
- **Notion** - ドキュメント管理・ナレッジベース
- **Notion Calendar** - カレンダー管理
- **Notion Mail** - メール管理

### TODO管理
- macOS 純正の **リマインダー** をRaycastで一発起動するようにして使用している
  - iPhone とシームレスに連携できて必要最低限の機能が揃っているので気に入っている 

# データベース・インフラ

### DBクライアント
- **TablePlus** - 1年分だけ買い切り感覚で課金してそのまま使用している。UIが見やすいと感じる

### コンテナ
- **colima** - あまり強い気持ちがないままランタイムは colima を継続利用。最近いろいろあるらしいので移行したい

