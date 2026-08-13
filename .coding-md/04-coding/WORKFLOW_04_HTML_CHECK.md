# 工程 4 補足: HTML チェック

## ⚠️ 詳細は `html-check` Skill に集約済み

このファイルは **Skill 一覧の参照リンク用**として残しています。実際のチェック手順は `~/.claude/skills/html-check/SKILL.md` を参照してください。

## このファイルに残す情報

- Skill 側に書ききれない、プロジェクト固有のHTMLルールがある場合のみここに追記
- 例: 案件特有のセマンティック要件、独自のARIA運用、特殊なフォーム実装 等

## 概要（要点のみ）

HTML の構造・セマンティック・アクセシビリティをチェックする。`html-check` Skill 内のチェックリストに従い、違反箇所を修正する。

主なチェック観点（詳細はSkill参照）:
- DOCTYPE / `<html lang="ja">` / 基本metaタグ
- セマンティックタグの使用（`<header>` / `<main>` / `<section>` 等）
- 見出し階層 / リンクは `<a>` タグ使用
- 画像は `<picture>` + WebP / `width`・`height`・`loading="lazy"` 必須
- alt 属性（コンテンツ画像は30字以内、装飾画像は `alt=""`）
- BEM記法 / 共通クラスとページ固有クラスの併記

**呼び出し方**: 「HTML規約チェック」などの指示で `html-check` Skill が自動発動する（プロジェクトの `CLAUDE.md` 参照）。
