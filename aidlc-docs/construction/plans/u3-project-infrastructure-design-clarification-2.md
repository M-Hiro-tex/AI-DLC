# U3: Project Domain - Infrastructure Design Clarification Questions (Round 2)

## 回答分析結果（第2ラウンド）

ほとんどの明確化回答は明確でしたが、**Q12-1の回答にさらなる明確化**が必要です。

---

## Q12-1のさらなる明確化（CDK Stack分割の具体的な構成）

**元の回答**: E. 環境（dev/prod）× ライフサイクル（Stateful/Stateless）× ドメイン（Auth/Project）

**問題点**: 
この回答は非常に詳細ですが、**具体的なStack数とStack名**が不明です。また、「Stateful/Stateless」という用語の意味も明確化が必要です。

---

### 追加質問 Q12-1-1: Stateful/Statelessの定義

「Stateful/Stateless」とは何を指していますか？

A) Stateful = DynamoDB、Stateless = Lambda + API Gateway
B) Stateful = 永続化リソース全般（DynamoDB, S3等）、Stateless = 計算リソース（Lambda, API Gateway等）
C) Stateful = データベースとストレージ、Stateless = アプリケーションとネットワーク
D) その他（[Answer]タグの後に具体的に記述してください）

[Answer]: B

---

### 追加質問 Q12-1-2: Stack分割の具体的な構成

「環境（dev/prod）× ライフサイクル（Stateful/Stateless）× ドメイン（Auth/Project）」という分割方法だと、Stack数はいくつになりますか？

**計算例**:
- 環境: 2（dev, prod）
- ライフサイクル: 2（Stateful, Stateless）
- ドメイン: 2（Auth, Project）
- **合計**: 2×2×2 = **8 Stacks**

**Stack名の例**:
1. dev-stateful-auth-stack
2. dev-stateful-project-stack
3. dev-stateless-auth-stack
4. dev-stateless-project-stack
5. prod-stateful-auth-stack
6. prod-stateful-project-stack
7. prod-stateless-auth-stack
8. prod-stateless-project-stack

A) はい、8 Stacksになります（上記の例の通り）
B) いいえ、もっと少ないです（[Answer]タグの後に具体的なStack数とStack名を記述してください）
C) いいえ、もっと多いです（[Answer]タグの後に具体的なStack数とStack名を記述してください）
D) その他（[Answer]タグの後に具体的に記述してください）

[Answer]: B. 5 stack
（Shared-Base-Stack: Route53, ACM, WAF, API Gateway（環境共通/基盤）
Dev-Auth-Stack: Lambda + IAM（開発用：認証）
Dev-Project-Stack: Lambda + DynamoDB（開発用：プロジェクト/データ一体型）
Prod-Auth-Stack: Lambda + IAM（本番用：認証）
Prod-Project-Stack: Lambda + DynamoDB（本番用：プロジェクト/データ一体型））

---

### 追加質問 Q12-1-3: Stack分割の簡素化の可能性

8 Stacksは非常に複雑ですが、本当にこの粒度で分割する必要がありますか？

**代替案の例**:
- **案1**: 環境別のみ（dev-stack, prod-stack）→ 2 Stacks
- **案2**: 環境×ドメイン（dev-auth, dev-project, prod-auth, prod-project）→ 4 Stacks
- **案3**: 環境×ライフサイクル（dev-stateful, dev-stateless, prod-stateful, prod-stateless）→ 4 Stacks

A) はい、8 Stacksで分割します（複雑だが、更新頻度や管理の都合で必要）
B) いいえ、簡素化します（[Answer]タグの後に選択する代替案または独自の案を記述してください）

[Answer]: B. ドメイン単位 × 環境別の 5 Stacks

---

## 次のステップ

上記の追加質問（Q12-1-1, Q12-1-2, Q12-1-3）に回答してください。

回答後、「明確化完了」とお知らせください。

---

**Clarification Version**: 2.0  
**Created**: 2026-02-01  
**Status**: Awaiting User Response