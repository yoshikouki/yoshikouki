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
  header, footer, blockquote {
    color: #bcc;
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

<!-- _footer: "" -->
<style scoped>section { justify-content: center; }</style>

# <!--fit--> 成果発表

![bg blur brightness:.6](osan-hackathon.png)

---

<!-- _footer: "" -->
<style scoped>
  section { justify-content: center; }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .loading::after {
    content: '';
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    top: 40%;
    left: 40%;
    width: 20%;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    border: 30px solid #ccc;
    border-top-color: transparent;
    opacity: 60%;
    animation: spin 10s linear infinite;
  }
</style>

# <!--fit--> 審議中

<div class="loading"></div>

![bg blur brightness:.6](osan-hackathon.png)

---

<!-- _footer: "" -->
<style scoped>section { justify-content: center; }</style>

# <!--fit--> 表彰式

![bg blur brightness:.6](osan-hackathon.png)

---

<!-- header: "表彰式" -->
<style scoped>section { justify-content: center; align-items: center; }</style>

# <!--fit--> ３位

---

<!-- header: "表彰式" -->
<style scoped>section { justify-content: center; align-items: center; }</style>

# <!--fit--> ２位

---

<!-- header: "表彰式" -->
<style scoped>section { justify-content: center; align-items: center; }</style>

# <!--fit--> １位

---

<!-- _footer: "" -->
<style scoped>section { justify-content: center; } h1 { text-align: center; }</style>

# <!--fit--> 総評

![bg blur brightness:.6](osan-hackathon.png)

---

<!-- _footer: "" -->
<style scoped>section { justify-content: center; } h1 { text-align: center; }</style>

# <!--fit--> 閉会の挨拶

![bg blur brightness:.6](osan-hackathon.png)

---

<!-- _footer: "" -->
<style scoped>section { justify-content: center; } h1 { text-align: center; }</style>

# <!--fit--> 写真撮影

![bg blur brightness:.6](osan-hackathon.png)
