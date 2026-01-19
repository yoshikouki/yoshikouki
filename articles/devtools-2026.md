# 開発環境2026

自分の開発環境をまとめたもの（2026年1月時点）

## 基本環境

### OS
- **macOS 15.6.1** (Sequoia)
  - Apple Silicon (ARM64)

### エディタ
- **Cursor** - メインエディタ（AI統合IDE）
- **Visual Studio Code** - サブエディタ
- **Neovim** - ターミナル内での編集
- **Vim** - 標準搭載、基本的な編集用

### ターミナル
- **Warp** - メインターミナル（AI機能搭載）
- **Ghostty** - サブターミナル
  - フォントサイズ: 15
  - 背景透過度: 0.85
  - 背景ぼかし: 20

### シェル
- **Zsh** - デフォルトシェル
  - ロケール: ja_JP.UTF-8
  - カスタムエイリアス多数（Git, Docker等）

### ターミナルマルチプレクサ
- **tmux** - メイン
- **Zellij** - サブ
- **screen** - 標準搭載

## AIツール

### コーディングエージェント
- **Claude Code CLI** - ターミナルベースのAIコーディングアシスタント
  - パーミッション設定でセーフティネット
  - 停止時に音で通知（Ping.aiff）

### AIアシスタント（Claude Code プラグイン）
- **context7** - ドキュメント検索
- **github** - GitHub統合
- **typescript-lsp** - TypeScript言語サーバー
- **lua-lsp** - Lua言語サーバー
- **code-review** - コードレビュー支援
- **feature-dev** - 機能開発支援
- **frontend-design** - フロントエンド設計
- **code-simplifier** - コード簡素化
- **hookify** - フック管理
- **plugin-dev** - プラグイン開発
- **claude-opus-4-5-migration** - Claude Opus 4.5移行支援
- **security-guidance** - セキュリティガイダンス

### MCP設定
- 現在未設定（今後導入予定）

## 開発ツール

### ブラウザ
- **Arc** - メインブラウザ
- **Google Chrome** - 開発・テスト用
- **Google Chrome Canary** - 最新機能検証用

### ランチャー
- **Raycast** - アプリケーションランチャー・生産性ツール

### フォント
- **Hack Nerd Font** - プログラミング用フォント
- **Symbols Only Nerd Font** - アイコン表示用

### ウィンドウマネージャー
- **Rectangle** - ウィンドウ整列ツール
- **AeroSpace** - タイル型ウィンドウマネージャー

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
- macOS標準の日本語入力
  - ロケール設定: ja_JP

## ハードウェア

### キーリマッパー
- **Karabiner-Elements** - キーボードカスタマイズ

## CLIツール

### Git関連ツール
- **git-delta** - diff viewer（git pager）
- **lazygit** - TUIベースのGitクライアント
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
- **Notion** を使用（専用TODOアプリは未使用）

## プログラミング言語

### メイン言語
- **Node.js** v24.11.1
- **Bun** 1.2.18（高速JavaScriptランタイム）
- **Go** 1.25.4
- **TypeScript** / **JavaScript**

### サブ言語
- **Python** (asdf管理)
- **Ruby** (asdf管理)
- **Deno** (asdf管理)
- **Rust** (asdf管理)

## データベース・インフラ

### DBクライアント
- **psql** - PostgreSQL
- **mysql** - MySQL
- **sqlite3** - SQLite

### コンテナ
- **Docker**
- **Docker Compose**
  - カスタムエイリアス: `dc`
  - コンテナ・イメージ・ボリューム削除用エイリアス設定

### IaC・インフラツール
- **Terraform** (asdf管理)
- **Ansible**
- **Packer** (asdf管理)
- **Nomad** (asdf管理)
- **Consul** (asdf管理)
- **Vault** (asdf管理)
- **Waypoint** (asdf管理)
- **Boundary** (asdf管理)

### Kubernetes
- **kubectl** (kubectl-cluster-caution経由)
- **AWS CLI**

## パッケージマネージャー

- **Homebrew** - macOS用パッケージマネージャー
- **pnpm** - 高速Node.jsパッケージマネージャー
  - PNPM_HOME: ~/Library/pnpm

## その他の特徴

### エイリアス設定
- 安全性重視: `rm`, `cp`, `mv` に `-i` オプション
- Git操作の短縮: `gc`, `gcb`, `gpl`, `gp`, `gcm` 等
- Docker操作の効率化
- kubectl の誤操作防止ラッパー

### PATH設定
- asdf shims優先
- /opt/local/bin (MacPorts?)
- ~/.local/bin (ローカルツール)
- pnpm グローバルbin

---

**更新日**: 2026年1月19日
