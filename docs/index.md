# NovaSight Documentation

Welcome to the NovaSight documentation! NovaSight is a modern, multi-tenant Business Intelligence platform that enables you to connect your data sources, build semantic layers, and create insightful dashboards using natural language queries.

## What is NovaSight?

NovaSight is an AI-powered BI platform that allows you to:

- **Connect** to multiple data sources (PostgreSQL, MySQL, ClickHouse, S3, and more)
- **Define** a semantic layer that translates technical schemas into business terms
- **Query** your data using natural language (powered by local LLMs)
- **Visualize** insights through interactive dashboards
- **Share** dashboards with your team with granular access controls

## Quick Navigation

<div class="grid cards" markdown>

-   :material-rocket-launch: **Getting Started**

    ---

    New to NovaSight? Start here to get up and running in minutes.

    [:octicons-arrow-right-24: Quick Start](getting-started/quick-start.md)

-   :material-database: **Data Sources**

    ---

    Learn how to connect and configure your data sources.

    [:octicons-arrow-right-24: Data Sources Guide](guides/data-sources/connecting-postgresql.md)

-   :material-layers: **Semantic Layer**

    ---

    Build a business-friendly layer on top of your data.

    [:octicons-arrow-right-24: Semantic Layer Guide](guides/semantic-layer/dimensions-measures.md)

-   :material-view-dashboard: **Dashboards**

    ---

    Create and share interactive dashboards.

    [:octicons-arrow-right-24: Dashboard Guide](guides/dashboards/building-dashboards.md)

-   :material-chat-question: **Natural Language**

    ---

    Query your data using plain English.

    [:octicons-arrow-right-24: NL Query Guide](guides/natural-language/how-it-works.md)

-   :material-shield-account: **Administration**

    ---

    Manage users, roles, and security settings.

    [:octicons-arrow-right-24: Admin Guide](guides/administration/user-management.md)

</div>

## Key Features

### 🔌 Universal Data Connectivity

Connect to any data source with our growing library of connectors. NovaSight supports relational databases, data warehouses, cloud storage, and APIs.

### 🧠 AI-Powered Queries

Ask questions in plain English and let our AI translate them into optimized SQL queries. No SQL knowledge required.

### 📊 Flexible Dashboards

Build beautiful, interactive dashboards with drag-and-drop widgets. Share with your team or embed in your applications.

### 🔒 Enterprise Security

Multi-tenant architecture with role-based access control, audit logging, and encryption at rest and in transit.

### 🚀 Scalable Architecture

Built on modern technologies (PySpark, ClickHouse, Dagster) to handle data at any scale.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      NovaSight Platform                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React     │  │   Flask     │  │      AI Engine          │  │
│  │  Frontend   │◄─┤   Backend   │◄─┤  (Ollama + NL2SQL)      │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────────┘  │
│                          │                                       │
│  ┌───────────────────────┼───────────────────────────────────┐  │
│  │                 Data Layer                                 │  │
│  │  ┌──────────┐  ┌──────┴──────┐  ┌─────────────────────┐   │  │
│  │  │ PostgreSQL│  │ ClickHouse  │  │    Data Sources     │   │  │
│  │  │ (Metadata)│  │ (Analytics) │  │ (Your Databases)    │   │  │
│  │  └──────────┘  └─────────────┘  └─────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 Processing Layer                           │  │
│  │  ┌──────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │
│  │  │ Dagster  │  │   PySpark   │  │        dbt          │   │  │
│  │  │(Orchestr)│  │  (Compute)  │  │  (Transformation)   │   │  │
│  │  └──────────┘  └─────────────┘  └─────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Getting Help

- **Documentation**: You're here! Browse the guides and reference materials.
- **FAQ**: Check the [frequently asked questions](troubleshooting/faq.md).
- **Issues**: Report bugs or request features on our GitHub repository.

## Version

This documentation is for **NovaSight v1.0**.
