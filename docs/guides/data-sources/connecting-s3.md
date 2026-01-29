# Connecting to Amazon S3

This guide covers how to connect NovaSight to Amazon S3 for analyzing files stored in cloud storage.

## Overview

NovaSight can query data files directly from Amazon S3, including:
- CSV files
- Parquet files
- JSON files
- ORC files

---

## Prerequisites

- [ ] AWS account with S3 access
- [ ] IAM credentials (Access Key ID and Secret Access Key)
- [ ] Bucket name and region
- [ ] Appropriate IAM permissions

---

## Connection Steps

### Step 1: Navigate to Data Sources

1. Click **Data Sources** in the left sidebar
2. Click **+ Add Data Source**
3. Select **Amazon S3** from the list

### Step 2: Enter AWS Credentials

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Display name | `Data Lake - S3` |
| **Access Key ID** | AWS access key | `AKIAIOSFODNN7EXAMPLE` |
| **Secret Access Key** | AWS secret key | `********` |
| **Region** | AWS region | `us-east-1` |
| **Bucket** | S3 bucket name | `company-data-lake` |

### Step 3: Configure Path Prefix (Optional)

Limit access to specific paths:

```yaml
Path Configuration:
  Prefix: "analytics/production/"
  Exclude Patterns:
    - "*.log"
    - "_temporary/*"
```

### Step 4: File Format Settings

Configure default file parsing:

```yaml
File Formats:
  CSV:
    Delimiter: ","
    Header: true
    Quote Character: '"'
    Escape Character: "\\"
    
  Parquet:
    Compression: snappy
    
  JSON:
    Lines: true  # JSON Lines format
```

### Step 5: Test and Save

1. Click **Test Connection**
2. Verify bucket access
3. Click **Save**

---

## IAM Permissions

Create an IAM policy with minimum required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

!!! tip "Least Privilege"
    Only grant `GetObject` and `ListBucket` permissions. NovaSight doesn't need write access.

---

## Using IAM Roles (Recommended)

For EC2/ECS deployments, use IAM roles instead of access keys:

1. Enable **Use IAM Role**
2. Leave credentials blank
3. NovaSight uses the instance's attached role

---

## Schema Discovery

NovaSight infers schema from your files:

1. **Sample files** in each path
2. **Detect column types** automatically
3. **Create virtual tables** for querying

### Defining Tables

Create table definitions for consistent access:

```yaml
Table: daily_sales
  Path: "analytics/sales/daily/*.parquet"
  Format: parquet
  Partition Columns:
    - year
    - month
    - day
  Schema:
    - name: order_id, type: string
    - name: amount, type: decimal(10,2)
    - name: customer_id, type: string
    - name: order_date, type: date
```

---

## Partitioned Data

NovaSight supports Hive-style partitioning:

```
s3://bucket/sales/
├── year=2024/
│   ├── month=01/
│   │   ├── day=01/
│   │   │   └── data.parquet
│   │   └── day=02/
│   │       └── data.parquet
```

Configure partition columns:

```yaml
Partitioning:
  Style: hive  # year=2024/month=01
  Columns:
    - year: integer
    - month: integer  
    - day: integer
```

---

## Performance Tips

| Tip | Description |
|-----|-------------|
| **Use Parquet** | Column-oriented format, much faster than CSV |
| **Partition data** | Enable partition pruning for faster queries |
| **Compress files** | Use snappy or gzip compression |
| **Avoid small files** | Combine small files into larger ones |

---

## Troubleshooting

### Access Denied

```
Error: Access Denied to bucket
```

**Solutions:**
1. Verify IAM policy attached
2. Check bucket policy allows access
3. Verify region is correct

### Slow Queries

**Solutions:**
1. Convert CSV to Parquet
2. Add partitioning
3. Use column projection (select only needed columns)

---

## Next Steps

- [Sync Configuration](sync-configuration.md)
- [Connect PostgreSQL](connecting-postgresql.md)
- [Define Semantic Layer](../semantic-layer/dimensions-measures.md)
