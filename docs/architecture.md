# PeopleTrustPay System Architecture

## Overview

PeopleTrustPay is designed as a distributed fintech platform with microservices architecture, blockchain integration, and enterprise-grade security.

## System Components

### Frontend Applications

#### Web Application (`apps/web/`)

- **Technology**: Next.js 14 with App Router
- **Purpose**: Browser-based access for desktop users
- **Features**: Full transaction capabilities, admin dashboard access
- **Authentication**: OAuth2 + biometric when available

#### Mobile Applications (`apps/mobile/`)

- **Technology**: React Native or Flutter
- **Purpose**: Native iOS/Android experience
- **Features**: Biometric auth, push notifications, camera for document scanning
- **Offline**: Limited functionality when disconnected

#### Admin Dashboard (`apps/admin-dashboard/`)

- **Technology**: Next.js with specialized admin components
- **Purpose**: Internal compliance and monitoring tools
- **Access**: Role-based access control for staff
- **Features**: User management, transaction monitoring, KYC review

### Backend Services

#### Authentication Service (`services/auth/`)

- **OAuth2 Provider**: Custom implementation with PKCE
- **Biometric Integration**: WebAuthn for fingerprint/face recognition
- **2FA**: TOTP and SMS-based two-factor authentication
- **Session Management**: JWT with refresh tokens
- **Rate Limiting**: Brute force protection

#### Payment Service (`services/payments/`)

- **Core Functions**: Send, receive, request money
- **Transaction Types**: P2P transfers, merchant payments, bill pay
- **Currency Support**: USD, EUR, crypto assets
- **Processing**: Real-time and scheduled transactions
- **Limits**: Configurable daily/monthly limits per user tier

#### Ledger Service (`services/ledger/`)

- **Blockchain Integration**: Immutable transaction logging
- **Audit Trail**: Complete transaction history with cryptographic proofs
- **Reconciliation**: Automated matching with bank records
- **Reporting**: Real-time balance calculation and statement generation

#### Compliance Service (`services/compliance/`)

- **KYC/AML**: Identity verification and risk assessment
- **Document Processing**: AI-powered document validation
- **Risk Scoring**: ML-based fraud detection
- **Regulatory Reporting**: Automated compliance reporting
- **Sanctions Screening**: Real-time watchlist checking

### Infrastructure & Security

See README.md for complete architecture details and deployment guidelines.

