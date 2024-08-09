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

---

# <!--fit--> 運営挨拶

---

# 審査員紹介

---

# ルール

---

# 審査基準

---

# 会場説明
