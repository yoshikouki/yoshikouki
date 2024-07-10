---
title: "Biome を使うときに最低限入れておきたい設定集"
emoji: "☣️"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["Biome", "JavaScript", "TypeScript", "linter"]
published: true
---

# はじめに

Biome は JavaScript や JSON 向けの強力なコード品質管理ツールですが、数多くのルールの中から適切なものを選ぶのは難しい場合があります。この記事では、私が Biome を使う際に最低限入れておくルールを紹介し、それぞれの具体的な使用例を解説します。

https://biomejs.dev/

# 基本設定

[公式ドキュメント「Getting Started」](https://biomejs.dev/guides/getting-started/)に記載されている基本設定は以下です

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "organizeImports": {
    "enabled": false
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

この設定では、Biome の推奨ルールセットを有効にしています。これだけでも十分なケースもあるでしょうが、さらにいくつかのルールを追加します。

# 最低限入れておきたいルール


### 1. インポートの順序

```json
"organizeImports": {
  "enabled": true
}
```

**目的**: インポート文を自動的に整理することで、一貫性を保ち可読性を向上させます。加えて、後述する未使用インポートの削除も併用します。

**例**:
```javascript
// 変更前
import { func3 } from './module3';
import { func1 } from './module1';
import { func2 } from './module2';

// 変更後
import { func1 } from "./module1";
import { func2 } from "./module2";
import { func3 } from "./module3";
```

https://biomejs.dev/reference/configuration/#organizeimports


### 2. 未使用インポートの検出

```json
"linter": {
  "rules": {
    "correctness": {
      "noUnusedImports": "warn"
    }
  }
}
```

**目的**: 未使用のインポートを検出し、警告することで、コードの整理を促し、バンドルサイズの無駄な増加を防ぎます。

**例**:
```javascript
// 変更前
import { usedModule, unusedModule } from './someModule';
console.log(usedModule);

// 変更後
import { usedModule } from './anotherModule';
```

https://biomejs.dev/linter/rules/no-unused-imports/

### 3. 未使用変数の検出

```json
"linter": {
  "rules": {
    "correctness": {
      "noUnusedVariables": "warn"
    }
  }
}
```

**目的**: 未使用の変数を検出し、警告することで、コードの肥大化を防ぎ、潜在的なバグや不要なメモリ使用を回避します。

**例**:
```javascript
// 変更前
// 以後使用していない場合は警告される
const unusedVar = 'This will trigger a warning';
const getAllUsers = (unused: string) => {
  const users = db.user.findMany();
  return [];
};

// 変更後
// 接頭辞に _ を使用して明示することで警告を回避できる
const _unusedVar = 'This will trigger a warning';
const getAllUsers = (_unused: string) => {
  const users = db.user.findMany();
  return users;
};
```

https://biomejs.dev/linter/rules/no-unused-variables/


### 4. CSSクラスのソート ※注意事項あり

```json
"linter": {
  "rules": {
    "nursery": { "useSortedClasses": "warn" }
  }
}
```

**目的**: CSSクラスを一貫した順序で並べることで、コードの可読性を向上させ、クラスの重複や欠落を防ぎます。TailwindCSS を使うときに活躍しています

**例**:
```jsx
// 変更前
<div className="font-bold text-ellipsis overflow-hidden absolute whitespace-nowrap">{name}</div>

// 変更後
<div className="absolute overflow-hidden text-ellipsis whitespace-nowrap font-bold">{name}</div>
```

※ このルールは [nursery グループ](https://biomejs.dev/linter/rules/#nursery)という開発中の機能です。また、自動修正コマンド `npx @biomejs/biome check --write .` に `--unsafe` オプションを付与する必要があります
e.g. `npx @biomejs/biome check --write --unsafe .`

https://biomejs.dev/linter/rules/use-sorted-classes/


### 5. バージョン管理システム (VCS) の設定

```json
"vcs": {
  "enabled": true,
  "clientKind": "git",
  "useIgnoreFile": true
}
```

**目的**: バージョン管理システム（この場合はGit）との統合を有効にし、`.gitignore` ファイルを尊重することで、Biomeの処理対象を最適化します。

**例**: たとえば、以下のような.gitignoreファイルがある場合、Biomeは自動的にこれらのファイルやディレクトリを処理対象から除外します。

```
node_modules/
dist/
.env
```

設定ファイルに `"defaultBranch"` を指定して実行時に `--changed` オプションを付与することで、指定ブランチとの差分のみを検査対象とすることも可能です。現状実行時間についてそこまで困っていないため私は設定していません。

https://biomejs.dev/guides/integrate-in-vcs/

## まとめ

最後に、[私が普段使用している biome.json](https://github.com/yoshikouki/honon/blob/main/biome.json) を掲載します。

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "indentStyle": "space",
    "ignore": []
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "nursery": { "useSortedClasses": "warn" },
      "correctness": {
        "noUnusedImports": "warn",
        "noUnusedVariables": "warn"
      }
    }
  },
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  }
}
```

上記の他にも便利なルールがありましたら、是非コメントなどで教えてください！

Happy coding with Biome!
