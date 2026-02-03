# U3: Project Domain - Infrastructure Design Plan

## Overview

本計画では、U3: Project Domainの論理コンポーネントを実際のAWSインフラストラクチャサービスにマッピングします。

**Unit**: U3 - Project Domain  
**Focus**: 論理設計から物理インフラへのマッピング

**Prerequisites**:
- Functional Design完了
- NFR Requirements完了
- NFR Design完了

---

## Infrastructure Design Steps

### Step 1: Compute Infrastructure
**Status**: [x]  
**Description**: Lambda関数設計とAPI Gateway設定

**Actions**:
- [ ] Lambda関数の設計（Runtime、Memory、Timeout）
- [ ] API Gateway REST API設計
- [ ] Lambda-API Gateway統合設計

**Questions**:

**Q1: Lambda関数の構成方式は？**

Lambda関数をどのように構成しますか？

A) Single Lambda（1つのLambda関数ですべてのエンドポイント処理）
B) Multiple Lambdas（エンドポイントごとに個別Lambda）
C) その他（[Answer]タグの後に記述してください）

[Answer]: C. ドメイン単位のLambda構成

---

**Q2: Lambda関数のメモリ設定は？**

Lambda関数のメモリ割り当ては？

A) 256 MB（最小限、低コスト）
B) 512 MB（標準的、バランス重視）
C) 1024 MB（高パフォーマンス）
D) その他（[Answer]タグの後に記述してください）

[Answer]: D. ドメインごとに可変設定

---

### Step 2: Database Infrastructure
**Status**: [x]  
**Description**: DynamoDB テーブル設計と設定

**Actions**:
- [ ] DynamoDBテーブル定義
- [ ] GSI設計
- [ ] 課金モード選択

**Questions**:

**Q3: DynamoDB課金モードは？**

DynamoDBの課金モデルは？

A) On-Demand（使用量に応じて課金、予測不要）
B) Provisioned（固定キャパシティ予約、コスト予測可能）
C) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

**Q4: DynamoDBバックアップ戦略は？**

データ保護のためのバックアップ戦略は？

A) なし（開発環境のみ、本番は別途検討）
B) PITR（Point-In-Time Recovery、35日間）のみ
C) PITR + 定期スナップショット（長期保存）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

### Step 3: API Gateway Configuration
**Status**: [x]  
**Description**: API Gateway詳細設定

**Actions**:
- [ ] API Gateway REST API設定
- [ ] CORS設定
- [ ] レート制限設定

**Questions**:

**Q5: API Gatewayのデプロイステージは？**

API Gatewayのステージ戦略は？

A) 単一ステージ（prod のみ）
B) 2ステージ（dev, prod）
C) 3ステージ（dev, staging, prod）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

**Q6: API Gatewayレート制限は？**

DoS攻撃防止のためのレート制限設定は？

A) AWS デフォルト（10,000 req/sec, burst 5,000）
B) 控えめ（100 req/sec, burst 200）
C) 中程度（1,000 req/sec, burst 2,000）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

### Step 4: Monitoring & Observability
**Status**: [x]  
**Description**: CloudWatch、X-Rayの設定

**Actions**:
- [ ] CloudWatch Logs設定
- [ ] CloudWatch Metrics設定
- [ ] CloudWatch Alarms設定
- [ ] X-Ray設定

**Questions**:

**Q7: CloudWatch Logsの保持期間は？**

ログの保持期間は？

A) 1週間（短期、コスト最小）
B) 30日（標準的）
C) 90日（長期）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

**Q8: アラーム設定の範囲は？**

CloudWatch Alarmsで監視する項目は？

A) 最小限（Lambda Errors のみ）
B) 標準（Errors + High Latency）
C) 包括的（Errors + Latency + Throttles + Custom Metrics）
D) その他（[Answer]タグの後に記述してください）

[Answer]: C

---

### Step 5: Security Infrastructure
**Status**: [x]  
**Description**: IAM、Secrets Manager、セキュリティ設定

**Actions**:
- [ ] IAM Role設計（Lambda実行ロール）
- [ ] Secrets Manager設定（JWT Secret等）
- [ ] セキュリティグループ設定（必要に応じて）

**Questions**:

**Q9: Secrets Managerの使用範囲は？**

機密情報の管理にSecrets Managerを使用する範囲は？

A) JWT_SECRET のみ
B) JWT_SECRET + API Keys（将来の拡張）
C) すべての環境変数（包括的）
D) その他（[Answer]タグの後に記述してください）

[Answer]: C

---

**Q10: Lambda実行ロールの粒度は？**

IAM Role の設計粒度は？

A) 単一ロール（すべてのLambda関数で共有）
B) 機能別ロール（Read用、Write用など）
C) その他（[Answer]タグの後に記述してください）

[Answer]: C. ドメイン単位の専用ロール

---

### Step 6: Networking
**Status**: [x]  
**Description**: VPC、セキュリティグループ設計

**Actions**:
- [ ] VPC要否の判断
- [ ] セキュリティグループ設計（VPC使用時）

**Questions**:

**Q11: VPCの使用要否は？**

Lambda関数をVPC内に配置しますか？

A) VPC不要（DynamoDB公開エンドポイント使用、シンプル）
B) VPC使用（Private Subnet配置、セキュリティ強化）
C) その他（[Answer]タグの後に記述してください）

[Answer]: A.　(開発用)

---

### Step 7: CDK Stack Design
**Status**: [x]  
**Description**: AWS CDK Stackの設計

**Actions**:
- [ ] Stack分割戦略の決定
- [ ] Stack間依存関係の設計
- [ ] 環境別設定の設計

**Questions**:

**Q12: CDK Stackの分割戦略は？**

インフラストラクチャをどのようにStackに分割しますか？

A) 単一Stack（すべてのリソースを1つのStackに）
B) 2 Stacks（Database Stack + Application Stack）
C) 3 Stacks（Database + Application + Monitoring）
D) その他（[Answer]タグの後に記述してください）

[Answer]: D. 環境・ライフサイクル別の Stack 分割

---

**Q13: 環境別設定の管理方法は？**

dev/prod環境の設定をどのように管理しますか？

A) CDK Context（cdk.json）
B) 環境変数
C) 別ファイル（config/dev.ts, config/prod.ts）
D) その他（[Answer]タグの後に記述してください）

[Answer]: C

---

### Step 8: Deployment Strategy
**Status**: [x]  
**Description**: デプロイ戦略の設計

**Actions**:
- [ ] デプロイ手法の選択
- [ ] CI/CD パイプライン設計
- [ ] ロールバック戦略の設計

**Questions**:

**Q14: デプロイ手法は？**

Lambda関数のデプロイ手法は？

A) Blue-Green Deployment（安全、ゼロダウンタイム）
B) Canary Deployment（段階的、リスク最小）
C) All-at-Once（シンプル、短時間）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

**Q15: CI/CDパイプラインの構築は？**

CI/CDパイプラインを構築しますか？

A) 今は不要（手動デプロイ）
B) 基本的なCI/CD（GitHub Actions等）
C) フルCI/CD（テスト自動化、承認フロー含む）
D) その他（[Answer]タグの後に記述してください）

[Answer]: B

---

### Step 9: Cost Optimization
**Status**: [x]  
**Description**: コスト最適化戦略

**Actions**:
- [ ] コスト見積もり
- [ ] コスト削減施策の検討

**Questions**:

**Q16: Lambda Reserved Concurrency設定は？**

Lambda関数のReserved Concurrency設定は？

A) なし（デフォルト、アカウント全体の共有プール）
B) あり（専用キャパシティ確保、コスト増）
C) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

### Step 10: Disaster Recovery
**Status**: [x]  
**Description**: 災害復旧戦略

**Actions**:
- [ ] バックアップ戦略の確認
- [ ] 復旧手順の設計

**Questions**:

**Q17: 災害復旧目標（RTO/RPO）は？**

災害時の復旧目標は？

A) RTO: 24時間, RPO: 24時間（緩い）
B) RTO: 4時間, RPO: 1時間（標準的）
C) RTO: 1時間, RPO: 15分（厳格）
D) その他（[Answer]タグの後に記述してください）

[Answer]: A

---

## Execution Summary

**Total Steps**: 10  
**Required Artifacts**:
- `infrastructure-design.md` - インフラストラクチャ詳細設計
- `deployment-architecture.md` - デプロイメントアーキテクチャ図

**Infrastructure Mapping**:
- Compute: Lambda + API Gateway
- Database: DynamoDB (Single Table)
- Monitoring: CloudWatch + X-Ray
- Security: IAM + Secrets Manager
- IaC: AWS CDK (TypeScript)

---

**Plan Version**: 1.0  
**Created**: 2026-02-01  
**Status**: Ready for User Input