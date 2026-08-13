# 工程 2: 画像の書き出し

## ⚠️ ルールの正本

**画像書き出しルール（いつ・命名・形式・2x・圧縮・フォルダ振り分け）は
`~/.claude/skills/_shared/image-rules.md` に一本化した。ここには再掲しない。必ずそちらを Read すること。**

要点のみ:
- **Figma MCPモードの案件では画像書き出しは必須工程**（指示を待たない・ページ実装前に実施）
- 書き出しは **Figma REST API スクリプト** `figma-export-images.cjs` で行う（現行MCPは画像書き出し不可・スケール/形式も制御不能）
- jpg/png は **2x固定**、写真=jpg / 透過・ロゴ=png / アイコン=svg、命名は `{セクション}_{連番2桁}`、jpg は quality 80 で自動圧縮

---

## 手順（詳細・マッピングJSON例・コマンドは image-rules.md 参照）

1. デザインから書き出す画像を列挙 → node-id・名前・形式のマッピングJSONを作る
2. `node .coding-md/02-image-export/figma-export-images.cjs --file <fileKey> --map map.json [--page <slug>] [--dry-run]`
   - 2x書き出し・形式指定・命名保存・`common_*` の振り分け・jpg圧縮まで一発で完了（リネーム工程は不要）
   - 初回のみ `FIGMA_TOKEN` の設定が必要（未設定ならスクリプトが案内を表示）
3. image-rules.md の完了チェックリストで確認 → マッピングJSONを削除

## 注意事項

- 画像ソースの配置先は **`src/img/`** で統一（WebP変換・出力はビルドが自動実行）
- この工程は該当ページのコーディング前に完了させること

## 旧方式（廃止・非常用）

`dirForAssetWrites` によるMCP書き出し＋ハッシュ名リネーム（`auto-rename-images.cjs`）は**廃止**
（現行Figma MCPに `dirForAssetWrites` パラメータが存在しないため）。
REST API が使えない場合はユーザーに Figma からの手動エクスポート（2x指定）を依頼する。
過去案件でハッシュ名ファイルが残っている場合のみ `auto-rename-images.cjs` を整理用に使ってよい。
