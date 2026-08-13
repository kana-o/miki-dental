# 工程 4 補足: SCSS チェック

## ⚠️ 詳細は `scss-check` Skill に集約済み

このファイルは **Skill 一覧の参照リンク用**として残しています。実際のチェック手順は `~/.claude/skills/scss-check/SKILL.md` を参照してください。

## このファイルに残す情報

- Skill 側に書ききれない、プロジェクト固有のSCSSルールがある場合のみここに追記
- 例: 案件特有のBEMルール、特殊な命名規則、独自ミックスインの使い方 等

## 概要（要点のみ）

実装済みSCSSが規約に従っているか検証する。`scss-check` Skill 内のチェックリストに従い、違反箇所を修正する。

主なチェック観点（詳細はSkill参照）:
- BEM記法 / ネスト禁止 / `rem()` 関数 / `letter-spacing` em単位
- `@use` の使用 / メディアクエリの記述位置（クラスブロック内最下部）
- 中間幅（PC〜SP間）の破綻防止
- Figma値の厳守（カラーは完全一致時のみ変数化）
- `position: absolute` 禁止 / 共通クラスは見た目のみ
- 論理プロパティ（`margin-block` / `margin-inline`）で記述量削減

**呼び出し方**: 「SCSS規約チェック」「CSSの規約確認」などの指示で `scss-check` Skill が自動発動する（プロジェクトの `CLAUDE.md` 参照）。
