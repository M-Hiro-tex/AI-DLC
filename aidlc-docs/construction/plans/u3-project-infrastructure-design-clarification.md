# U3: Project Domain - Infrastructure Design Clarification Questions

## 回答分析結果

ほとんどの質問に明確な回答をいただきましたが、**4つの回答に曖昧性**が見つかりました。
以下の追加質問にお答えください。

---

## 曖昧性の詳細と追加質問

### Q1の明確化（Lambda関数の構成方式）

**元の回答**: C. ドメイン単位のLambda構成

**問題点**: 
「ドメイン単位のLambda構成」という表現が曖昧です。**具体的にどのようにLambdaを配置するか**が不明です。

**追加質問 Q1-1: Lambda構成の具体的な意味**

「ドメイン単位のLambda構成」とは具体的にどういう意味ですか？

A) U2: AuthenticationドメインとU3: Projectドメインで別々のLambda関数（各ドメイン1つずつ、合計2つ）
B) 各ドメイン内でさらにエンドポイント別にLambda分割（例：U3内でProjects用、Templates用など）
C) すべてのドメインで1つのLambda関数を共有（Single Lambda）
D) その他（[Answer]タグの後に具体的に記述してください）

[Answer]: A

---

### Q2の明確化（Lambda関数のメモリ設定）

**元の回答**: D. ドメインごとに可変設定

**問題点**: 
「ドメインごとに可変設定」という回答ですが、**各ドメインの具体的なメモリサイズ**が不明です。

**追加質問 Q2-1: U2: Authenticationドメインのメモリサイズ**

U2: Authentication Domainのメモリサイズは？

A) 256 MB
B) 512 MB
C) 1024 MB
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

**追加質問 Q2-2: U3: Projectドメインのメモリサイズ**

U3: Project Domainのメモリサイズは？

A) 256 MB
B) 512 MB
C) 1024 MB
D) その他（[Answer]タグの後に記述してください）

[Answer]: C

---

### Q10の明確化（Lambda実行ロールの粒度）

**元の回答**: C. ドメイン単位の専用ロール

**問題点**: 
「ドメイン単位の専用ロール」という回答ですが、**複数ドメインがある場合の具体的なロール設計**が不明です。

**追加質問 Q10-1: IAM Roleの具体的な設計**

「ドメイン単位の専用ロール」とは具体的にどういう設計ですか？

A) ドメインごとに1つのロール（U2用ロール、U3用ロール、計2つ）
B) ドメイン×環境で別ロール（U2-dev, U2-prod, U3-dev, U3-prod、計4つ）
C) ドメイン×アクセス権限で別ロール（U2-read, U2-write, U3-read, U3-write、計4つ）
D) その他（[Answer]タグの後に具体的に記述してください）

[Answer]: A

---

### Q12の明確化（CDK Stackの分割戦略）

**元の回答**: D. 環境・ライフサイクル別の Stack 分割

**問題点**: 
「環境・ライフサイクル別の Stack 分割」という回答ですが、**具体的なStack分割方法**が不明です。

**追加質問 Q12-1: Stackの具体的な分割方法**

「環境・ライフサイクル別の Stack 分割」の具体的な分割方法は？

A) 環境別（DevStack, ProdStack）
B) リソースタイプ別（DatabaseStack, ApplicationStack, MonitoringStack）
C) ドメイン別（AuthStack, ProjectStack）
D) 環境×リソースタイプ（Dev-DatabaseStack, Dev-ApplicationStack, Prod-DatabaseStack, Prod-ApplicationStack）
E) その他（[Answer]タグの後に具体的に記述してください）

[Answer]: E. 環境（dev/prod）× ライフサイクル（Stateful/Stateless）× ドメイン（Auth/Project）

---

**追加質問 Q12-2: Stackの更新頻度の違い**

「ライフサイクル別」と言及されましたが、更新頻度で分割しますか？

A) はい（例：Database Stackは更新頻度低、Application Stackは更新頻度高）
B) いいえ（環境別やリソース別のみで分割）
C) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

## 次のステップ

上記の追加質問（Q1-1, Q2-1, Q2-2, Q10-1, Q12-1, Q12-2）に回答してください。

回答後、「明確化完了」とお知らせください。

---

**Clarification Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Awaiting User Response