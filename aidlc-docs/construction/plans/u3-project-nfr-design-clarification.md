# U3: Project Domain - NFR Design Clarification Questions

## 回答分析結果

ほとんどの質問に明確な回答をいただきましたが、**1つの回答に曖昧性**が見つかりました。
以下の追加質問にお答えください。

---

## 曖昧性の詳細と追加質問

### Q5の明確化（DynamoDB一貫性レベル）

**元の回答**: C) ハイブリッド（操作によって使い分け）

**問題点**: 
「ハイブリッド」と回答されましたが、**どの操作でどちらの一貫性レベルを使用するか**が不明です。

DynamoDBでは以下の2つの一貫性レベルがあります：
- **Eventually Consistent**: デフォルト、コスト50%削減、最終的に一貫性保証
- **Strongly Consistent**: 読み取り時点で最新データ保証、コスト2倍

**追加質問 Q5-1: 一貫性レベルの使い分け基準**

ハイブリッド方式を採用する場合、以下のそれぞれの操作でどちらの一貫性レベルを使用しますか？

**操作1: プロジェクト作成直後の取得（自分が作成したプロジェクトを即座に表示）**

A) Eventually Consistent（コスト重視、数ミリ秒の遅延許容）
B) Strongly Consistent（即座に反映必須）

[Answer]: B

---

**操作2: プロジェクト一覧取得（ユーザーの全プロジェクトを表示）**

A) Eventually Consistent（コスト重視、リスト表示は少しの遅延OK）
B) Strongly Consistent（常に最新のリスト）

[Answer]: A

---

**操作3: プロジェクト詳細取得（特定プロジェクトの詳細表示）**

A) Eventually Consistent（コスト重視）
B) Strongly Consistent（常に最新の詳細）

[Answer]: A

---

**操作4: プロジェクト更新直後の取得（更新したプロジェクトを即座に表示）**

A) Eventually Consistent（コスト重視、数ミリ秒の遅延許容）
B) Strongly Consistent（即座に更新を反映）

[Answer]: B

---

**操作5: プロジェクト検索（名前やタグで検索）**

A) Eventually Consistent（コスト重視、検索結果は少しの遅延OK）
B) Strongly Consistent（常に最新の検索結果）

[Answer]: A

---

**補足説明**:
- **Strongly Consistent推奨**: CRUD直後の取得（作成直後、更新直後）
- **Eventually Consistent推奨**: 一覧表示、検索（コスト削減）
- **実装**: Repository層でメソッドごとに `ConsistentRead` フラグを制御

---

## 次のステップ

上記の追加質問（Q5-1の5つの操作）に回答してください。

回答後、「明確化完了」とお知らせください。

---

**Clarification Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Awaiting User Response