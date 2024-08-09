---
marp: true
theme: default
# invert-0 は TailwindCSS の invert を無効にする
class: invert invert-0
paginate: true
footer: "お産ハッカソン"
---

<style>
  :root {
    --primary: #ec6d71;
  }
  section {
    border: 0.5px solid var(--primary);
    border-radius: 0.2rem;
    padding: 4rem;
    justify-content: start;
    padding-top: 4rem;
  }
  h1 {
    color: var(--primary);
  }
  s { opacity: 33%; }
  strong, h1 strong, h2 strong, h3 strong, h4 strong, h5 strong, h6 strong { color: var(--primary); }
  ul, ol { padding-left: 1.2rem; }
  li { line-height: 1.8; text-indent: 0.3rem; }

  /* Styling header and footer */
  header,
  footer {
    position: absolute;
    left: 4rem;
    right: 4rem;
  }
  header {
    top: 2rem;
  }
  footer {
    bottom: 1rem;
  }

  /* Styling page number */
  section::after {
    bottom: 1rem;
    font-weight: 100;
    font-size: 1rem;
    content: attr(data-marpit-pagination) ' / ' attr(data-marpit-pagination-total);
  }
</style>

<!-- TailwindCSS を使うための設定 -->
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config = { corePlugins: { preflight: false } }</script>

# <!--fit--> お産ハッカソン

オープニング
![bg blur brightness:.6](image.png)

---

# 目次

1. 運営挨拶
2. 審査員紹介
3. ルール
4. 審査基準
5. 会場説明
6. 「ハッカソン手引き」へ

---

# 運営挨拶


---

# 審査員紹介

<div style="display: flex; justify-content: space-between;">
  <img src="image-2.png" alt="image-2" style="width: 50%;">
  <img src="image-3.png" alt="image-3" style="width: 25%;">
  <img src="image-4.png" alt="image-4" style="width: 25%;">
</div>

---

# ルール
### 1. 開発入る前の事前準備

- Discord チャンネルへのご参加をお願いします。
- GitHub アカウントの作成お願いします

### 2. **開発ルール**

- **制作物のテーマ・制約**：制作物のテーマ、制約はありません。プログラミングを用いた作品であればOK。
- **開発時間**：DAY1・DAY2ともに自由に休憩を取りつつ、開発を行いましょう！
- **メンタリング**：エンジニアのサポートメンバーがいますので困ったことがあれば相談してください！

---

# ルール
### 3. **成果発表**

- **発表形式**：プレゼン資料、動作デモ
- **発表時間**：1チーム5分。質疑応答合わせて10分です。

### 4. **賞金**

- **最優秀賞**：50,000円
- **優秀賞**：20,000円
- **入選**：10,000円

---

# 審査基準
### サービスとしての「おもしろさ」
  - 独創性・有用性などの観点でおもしろいものになっているか
### サービスの「完成度」
  - サービスとしての完成度、機能の実装度、UI/UXのデザイン
### 技術的チャレンジ
  - 新しい技術や難しい技術にチャレンジしているか
---

# 会場説明
- トイレ
- ゴミ箱

---
# 「ハッカソン手引き」へ
