# PeopleTrustPay Backend Services

Production-ready microservices for PeopleTrustPay implementing enterprise-grade authentication, payments, and ledger functionality.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │  Auth Service   │    │Payments Service │
│     (Port 3000) │◄──►│    (Port 3001)  │    │   (Port 3002)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │ Ledger Service  │
                    │   (Port 3003)   │
                    └─────────────────┘
                             ▲
                             │
                    ┌────────┴────────┐
                    │   PostgreSQL    │
                    │     Redis       │
                    │   Blockchain    │
                    └─────────────────┘
```

## Services

### Authentication Service (Port 3001)
- **OAuth2 with PKCE** - Secure authorization code flow with Proof Key for Code Exchange
- **Biometric Authentication** - WebAuthn/FIDO2 support for passwordless login
- **Multi-Factor Authentication** - TOTP (Time-based One-Time Password) via authenticator apps
- **Session Management** - Secure session handling with Redis
- **Rate Limiting** - Protection against brute force attacks
- **JWT Tokens** - Access and refresh token management

### Payments Service (Port 3002)
- **Multi-Currency Support** - USD, EUR, BTC, ETH, USDC, EURC
- **Real-Time Processing** - Queue-based transaction processing with Bull/Redis
- **Fee Calculation** - Dynamic fee calculation with priority levels
- **Transaction Validation** - Comprehensive input validation and limits
- **Payment Methods** - Bank accounts, cards, crypto wallets
- **Transaction Limits** - Daily, monthly, and per-transaction limits

### Ledger Service (Port 3003)
- **Immutable Logging** - Cryptographically secure transaction ledger
- **Blockchain Integration** - Ethereum and Bitcoin transaction recording
- **Balance Calculation** - Real-time balance computation and reconciliation
- **Audit Trail** - Complete transaction history with checksums
- **Financial Reporting** - Daily, weekly, and monthly financial reports

### API Gateway (Port 3000)
- **Request Routing** - Intelligent routing to appropriate services
- **Load Balancing** - Distribution of requests across service instances
- **Security** - Centralized authentication and authorization
- **Monitoring** - Request logging and metrics collection

## Technology Stack

- **Runtime**: Node.js 18 with TypeScript
- **Database**: PostgreSQL 15 with TypeORM
- **Cache/Queue**: Redis 7
- **Blockchain**: Web3.js, Ethers.js
- **Authentication**: JWT, WebAuthn, Speakeasy (TOTP)
- **Validation**: Zod schemas
- **Containerization**: Docker & Docker Compose
- **Monitoring**: Prometheus & Grafana

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Environment Setup
```bash
# Clone the repository
git clone <repository-url>
cd PeopleTrustPay-backend

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### Running with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Local Development
```bash
# Install dependencies for each service
cd services/auth && npm install
cd ../payments && npm install
cd ../ledger && npm install
cd ../../infra/api-gateway && npm install

# Start services individually
cd services/auth && npm run dev
cd services/payments && npm run dev
cd services/ledger && npm run dev
cd infra/api-gateway && npm run dev
```

## API Documentation

### Authentication Service
- **Base URL**: `http://localhost:3001` or `http://localhost:3000/auth`
- **OpenAPI Spec**: `/services/auth/openapi.yaml`

**Key Endpoints**:
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/2fa/setup` - Setup TOTP
- `POST /auth/biometric/setup` - Setup WebAuthn
- `GET /oauth/authorize` - OAuth2 authorization
- `POST /oauth/token` - OAuth2 token exchange

### Payments Service
- **Base URL**: `http://localhost:3002` or `http://localhost:3000/payments`
- **OpenAPI Spec**: `/services/payments/openapi.yaml`

**Key Endpoints**:
- `POST /payments/send` - Send money
- `POST /payments/receive/{transactionId}` - Receive money
- `POST /payments/request` - Request money
- `GET /payments/transactions/{userId}` - Get transactions
- `POST /payments/refund/{transactionId}` - Process refund

### Ledger Service
- **Base URL**: `http://localhost:3003` or `http://localhost:3000/ledger`
- **OpenAPI Spec**: `/services/ledger/openapi.yaml`

**Key Endpoints**:
- `POST /ledger/transactions` - Record transaction
- `GET /ledger/balances/{userId}/{currency}` - Get balance
- `GET /ledger/transactions/{userId}` - Get transaction history
- `POST /ledger/reconcile` - Run reconciliation

## Security Features

### Authentication & Authorization
- JWT with configurable expiration
- Refresh token rotation
- Session management with device tracking
- Rate limiting on authentication endpoints
- Password complexity requirements
- Account lockout after failed attempts

### Data Protection
- All sensitive data encrypted at rest
- TLS 1.3 for all communications
- API key authentication for service-to-service calls
- Input validation and sanitization
- SQL injection prevention with parameterized queries

### Compliance
- SOC 2 Type II ready
- GDPR compliant data handling
- PCI DSS compliant payment processing
- Comprehensive audit logging
- Data retention policies

## Monitoring & Observability

### Health Checks
Each service exposes a `/health` endpoint returning:
```json
{
  "status": "ok",
  "service": "auth",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Metrics
- Prometheus metrics collection
- Grafana dashboards for visualization
- Custom business metrics (transaction volume, success rates)
- Performance monitoring (response times, error rates)

### Logging
- Structured JSON logging
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation
- Log retention policies

## Database Schema

### Core Tables
- `users` - User accounts and profiles
- `sessions` - User sessions
- `oauth2_states` - OAuth2 authorization states
- `payment_methods` - User payment methods
- `transactions` - Payment transactions
- `ledger_entries` - Immutable transaction ledger
- `account_balances` - Current account balances
- `audit_trail` - Audit log entries

### Indexes
- Optimized for common query patterns
- Composite indexes for performance
- Partial indexes for active records

## Deployment

### Production Considerations
- Horizontal scaling with load balancers
- Database read replicas
- Redis cluster for high availability
- Container orchestration with Kubernetes
- CI/CD pipelines with automated testing
- Blue-green deployments

### Environment Variables
```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=PeopleTrustPay
DB_USER=PeopleTrustPay
DB_PASSWORD=secure-password

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-jwt-secret-key

# OAuth2/WebAuthn
RP_ID=your-domain.com
EXPECTED_ORIGIN=https://your-domain.com

# External APIs
STRIPE_SECRET_KEY=sk_live_...
PLAID_CLIENT_ID=your-plaid-client-id
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint configuration
- Prettier code formatting
- Husky pre-commit hooks

### Testing
- Unit tests with Jest
- Integration tests for API endpoints
- Database transaction testing
- Mock external API calls

### API Design
- RESTful API design
- JSON API specification
- OpenAPI 3.0 documentation
- Consistent error response format

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Ensure all tests pass
5. Submit a pull request

## License

Proprietary - PeopleTrustPay Inc.
