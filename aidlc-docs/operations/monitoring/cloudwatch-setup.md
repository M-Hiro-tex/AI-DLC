# CloudWatch Monitoring Setup - Portfolio System

**Version**: 1.0  
**Last Updated**: 2026-02-03

---

## 📋 Overview

This guide provides comprehensive CloudWatch monitoring configuration for the Portfolio System, including logs, metrics, alarms, and dashboards.

---

## 📊 Monitoring Architecture

```
CloudWatch Monitoring
├── Logs
│   ├── Lambda Function Logs
│   ├── API Gateway Access Logs
│   └── Application Logs
├── Metrics
│   ├── Lambda Metrics
│   ├── API Gateway Metrics
│   ├── DynamoDB Metrics
│   └── Custom Metrics
├── Alarms
│   ├── Error Rate Alarms
│   ├── Latency Alarms
│   ├── Throttle Alarms
│   └── Resource Alarms
└── Dashboards
    ├── System Overview
    ├── Service Health
    └── Performance Metrics
```

---

## 📝 CloudWatch Logs

### Lambda Function Logs

**Log Groups Created Automatically**:
- `/aws/lambda/Portfolio-Authentication-{Env}`
- `/aws/lambda/Portfolio-Project-{Env}`

**Log Retention Settings**:
```bash
# Set log retention to 30 days for production
aws logs put-retention-policy \
  --log-group-name /aws/lambda/Portfolio-Authentication-Prod \
  --retention-in-days 30

aws logs put-retention-policy \
  --log-group-name /aws/lambda/Portfolio-Project-Prod \
  --retention-in-days 30
```

**Development**: 7 days  
**Staging**: 14 days  
**Production**: 30 days

### Structured Logging Format

All application logs use JSON format for easy parsing:

```json
{
  "timestamp": "2026-02-03T18:45:00.000Z",
  "level": "info",
  "service": "authentication",
  "requestId": "abc-123-def",
  "userId": "user-456",
  "message": "User authenticated successfully",
  "duration": 150,
  "metadata": {
    "provider": "github",
    "ip": "192.168.1.1"
  }
}
```

### Log Insights Queries

**Error Analysis**:
```sql
fields @timestamp, level, message, error
| filter level = "error"
| sort @timestamp desc
| limit 100
```

**Performance Analysis**:
```sql
fields @timestamp, message, duration
| filter duration > 1000
| stats avg(duration), max(duration), min(duration) by bin(5m)
```

**User Activity**:
```sql
fields @timestamp, userId, message
| filter userId != ""
| stats count() by userId
| sort count desc
```

---

## 📈 CloudWatch Metrics

### Lambda Metrics

**Standard Metrics** (Automatically Collected):
- `Invocations` - Number of function invocations
- `Errors` - Number of function errors
- `Duration` - Execution time in milliseconds
- `Throttles` - Number of throttled invocations
- `ConcurrentExecutions` - Number of concurrent executions
- `DeadLetterErrors` - DLQ errors

**Custom Metrics** (Application-Defined):
```typescript
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({ region: 'us-east-1' });

async function publishMetric(name: string, value: number, unit: string) {
  await cloudwatch.putMetricData({
    Namespace: 'Portfolio/Application',
    MetricData: [{
      MetricName: name,
      Value: value,
      Unit: unit,
      Timestamp: new Date()
    }]
  });
}

// Usage
await publishMetric('AuthenticationSuccess', 1, 'Count');
await publishMetric('ProjectCreationTime', 250, 'Milliseconds');
```

### API Gateway Metrics

**Standard Metrics**:
- `Count` - Total number of API requests
- `4XXError` - Client-side errors
- `5XXError` - Server-side errors
- `Latency` - Time between request and response
- `IntegrationLatency` - Backend processing time

### DynamoDB Metrics

**Standard Metrics**:
- `ConsumedReadCapacityUnits`
- `ConsumedWriteCapacityUnits`
- `UserErrors` - 4xx errors
- `SystemErrors` - 5xx errors
- `ThrottledRequests`

---

## 🚨 CloudWatch Alarms

### Critical Alarms (Production)

#### 1. High Error Rate Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name Portfolio-Auth-HighErrorRate-Prod \
  --alarm-description "Alert when error rate exceeds 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=Portfolio-Authentication-Prod \
  --treat-missing-data notBreaching \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT:portfolio-alerts
```

#### 2. High Latency Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name Portfolio-API-HighLatency-Prod \
  --alarm-description "Alert when API latency exceeds 2000ms" \
  --metric-name Latency \
  --namespace AWS/ApiGateway \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 2000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ApiName,Value=Portfolio-API-Prod \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT:portfolio-alerts
```

#### 3. Lambda Throttle Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name Portfolio-Lambda-Throttles-Prod \
  --alarm-description "Alert on Lambda throttling" \
  --metric-name Throttles \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=FunctionName,Value=Portfolio-Authentication-Prod \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT:portfolio-alerts
```

#### 4. DynamoDB Throttle Alarm

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name Portfolio-DynamoDB-Throttles-Prod \
  --alarm-description "Alert on DynamoDB throttling" \
  --metric-name UserErrors \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=TableName,Value=Portfolio-Users-Prod \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT:portfolio-alerts
```

### Warning Alarms

#### 5. Increased Error Rate (Warning)

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name Portfolio-Auth-IncreasedErrors-Prod-Warning \
  --alarm-description "Warning when error rate exceeds 2%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 2 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=Portfolio-Authentication-Prod \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT:portfolio-warnings
```

---

## 📊 CloudWatch Dashboards

### System Overview Dashboard

```bash
# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name Portfolio-System-Overview-Prod \
  --dashboard-body file://dashboard-system-overview.json
```

**dashboard-system-overview.json**:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/Lambda", "Invocations", { "stat": "Sum" } ],
          [ ".", "Errors", { "stat": "Sum" } ],
          [ ".", "Duration", { "stat": "Average" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Lambda Overview",
        "yAxis": { "left": { "min": 0 } }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/ApiGateway", "Count", { "stat": "Sum" } ],
          [ ".", "4XXError", { "stat": "Sum" } ],
          [ ".", "5XXError", { "stat": "Sum" } ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "API Gateway Metrics"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '/aws/lambda/Portfolio-Authentication-Prod'\n| fields @timestamp, level, message\n| filter level = 'error'\n| sort @timestamp desc\n| limit 20",
        "region": "us-east-1",
        "title": "Recent Errors"
      }
    }
  ]
}
```

### Service Health Dashboard

**Key Widgets**:
1. **Request Rate** - API requests per minute
2. **Error Rate** - Percentage of failed requests
3. **Latency** - p50, p95, p99 latencies
4. **Availability** - Uptime percentage
5. **Resource Utilization** - Lambda memory/duration

---

## 🔔 SNS Topic for Alerts

### Create Alert Topic

```bash
# Create SNS topic for critical alerts
aws sns create-topic --name portfolio-alerts

# Subscribe email to topic
aws sns subscribe \
  --topic-arn arn:aws:sns:REGION:ACCOUNT:portfolio-alerts \
  --protocol email \
  --notification-endpoint team@example.com

# Create topic for warnings
aws sns create-topic --name portfolio-warnings

aws sns subscribe \
  --topic-arn arn:aws:sns:REGION:ACCOUNT:portfolio-warnings \
  --protocol email \
  --notification-endpoint team@example.com
```

### Alert Routing

**Critical Alerts** → `portfolio-alerts`
- Production errors
- Service outages
- Security incidents
- Resource exhaustion

**Warnings** → `portfolio-warnings`
- Performance degradation
- Increased error rates
- Resource warnings
- Capacity planning alerts

---

## 🎯 Monitoring Best Practices

### 1. Alert Fatigue Prevention

- Set appropriate thresholds
- Use evaluation periods to avoid flapping
- Separate critical vs warning alerts
- Review and adjust thresholds quarterly

### 2. Log Management

- Use structured logging (JSON)
- Include request IDs for tracing
- Set appropriate retention periods
- Archive logs to S3 for long-term storage

### 3. Cost Optimization

**Log Retention**:
- Development: 7 days
- Staging: 14 days
- Production: 30 days (then archive to S3)

**Metrics Resolution**:
- Use standard resolution (1-minute) for most metrics
- Reserve high-resolution (1-second) for critical metrics only

### 4. Dashboard Organization

- **Executive Dashboard**: High-level business metrics
- **Operations Dashboard**: System health and performance
- **Developer Dashboard**: Detailed technical metrics
- **Security Dashboard**: Security events and anomalies

---

## 📋 Monitoring Checklist

### Initial Setup
- [ ] Log groups created for all Lambda functions
- [ ] Log retention policies configured
- [ ] SNS topics created for alerts
- [ ] Team subscribed to alert topics
- [ ] Critical alarms configured
- [ ] Dashboards created
- [ ] X-Ray tracing enabled (production)

### Regular Maintenance
- [ ] Review alarm thresholds monthly
- [ ] Check for alarm flapping
- [ ] Review log insights queries
- [ ] Optimize log retention costs
- [ ] Update dashboards as needed
- [ ] Train team on monitoring tools

### Incident Response
- [ ] Document alarm response procedures
- [ ] Test alert notifications
- [ ] Verify escalation paths
- [ ] Practice incident response
- [ ] Review past incidents quarterly

---

## 🔍 Advanced Monitoring

### X-Ray Tracing (Production)

**Enable X-Ray**:
```typescript
// In Lambda handler
import AWSXRay from 'aws-xray-sdk-core';
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// Trace custom subsegments
const segment = AWSXRay.getSegment();
const subsegment = segment.addNewSubsegment('authentication');
try {
  // Your code here
  subsegment.close();
} catch (error) {
  subsegment.addError(error);
  subsegment.close();
  throw error;
}
```

### CloudWatch Insights Saved Queries

**Top Errors by Type**:
```sql
fields @timestamp, error.type, error.message
| filter level = "error"
| stats count() by error.type
| sort count desc
```

**Slowest Requests**:
```sql
fields @timestamp, requestId, duration, url
| sort duration desc
| limit 50
```

---

## 📞 Support and Escalation

### Alarm Response Matrix

| Alarm | Severity | Response Time | Escalation |
|-------|----------|---------------|------------|
| High Error Rate | Critical | Immediate | On-call engineer |
| Lambda Throttle | Critical | Immediate | On-call engineer |
| API Latency | High | 15 minutes | Team lead |
| Increased Errors | Medium | 1 hour | Team channel |

---

## 📚 Related Documentation

- [Deployment Guide](../deployment/deployment-guide.md)
- [Troubleshooting Guide](../operations/troubleshooting.md)
- [Incident Response](../operations/incident-response.md)
- [Daily Operations](../operations/daily-operations.md)