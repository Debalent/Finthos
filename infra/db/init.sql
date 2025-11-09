-- Finthos Database Schema
-- PostgreSQL initialization script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    kyc_level VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (kyc_level IN ('basic', 'verified', 'premium')),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    biometric_credential_id VARCHAR(255),
    biometric_public_key TEXT,
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_info JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- OAuth2 states table
CREATE TABLE oauth2_states (
    state VARCHAR(255) PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL,
    code_challenge VARCHAR(255) NOT NULL,
    code_challenge_method VARCHAR(10) NOT NULL CHECK (code_challenge_method IN ('S256', 'plain')),
    redirect_uri TEXT NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    user_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Payment methods table
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bank_account', 'card', 'crypto_wallet')),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('stripe', 'plaid', 'metamask', 'internal')),
    display_name VARCHAR(255) NOT NULL,
    last4 VARCHAR(4) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('send', 'receive', 'transfer', 'deposit', 'withdrawal')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    amount DECIMAL(36,18) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL CHECK (currency IN ('USD', 'EUR', 'BTC', 'ETH', 'USDC', 'EURC')),
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    from_method UUID REFERENCES payment_methods(id),
    to_method UUID REFERENCES payment_methods(id),
    fee DECIMAL(36,18) NOT NULL DEFAULT 0,
    exchange_rate DECIMAL(36,18),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    block_hash VARCHAR(66),
    block_number BIGINT,
    transaction_hash VARCHAR(66)
);

-- Ledger entries table (immutable)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
    amount DECIMAL(36,18) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    balance_before DECIMAL(36,18) NOT NULL,
    balance_after DECIMAL(36,18) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    block_hash VARCHAR(66),
    block_number BIGINT,
    transaction_hash VARCHAR(66),
    immutable BOOLEAN NOT NULL DEFAULT TRUE,
    checksum VARCHAR(128) NOT NULL -- Cryptographic hash for immutability
);

-- Account balances table
CREATE TABLE account_balances (
    user_id UUID NOT NULL,
    currency VARCHAR(10) NOT NULL,
    available DECIMAL(36,18) NOT NULL DEFAULT 0,
    pending DECIMAL(36,18) NOT NULL DEFAULT 0,
    frozen DECIMAL(36,18) NOT NULL DEFAULT 0,
    total DECIMAL(36,18) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, currency)
);

-- Audit trail table (immutable)
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('transaction', 'balance', 'user')),
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    user_id UUID REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    checksum VARCHAR(128) NOT NULL
);

-- Currency exchange rates table
CREATE TABLE exchange_rates (
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    rate DECIMAL(36,18) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    source VARCHAR(50) NOT NULL,
    PRIMARY KEY (from_currency, to_currency, timestamp)
);

-- Reconciliation reports table
CREATE TABLE reconciliation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_transactions BIGINT NOT NULL DEFAULT 0,
    total_volume DECIMAL(36,18) NOT NULL DEFAULT 0,
    discrepancies JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_oauth2_states_expires ON oauth2_states(expires_at);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_transactions_user_from ON transactions(from_user_id);
CREATE INDEX idx_transactions_user_to ON transactions(to_user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_ledger_entries_user_id ON ledger_entries(user_id);
CREATE INDEX idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_timestamp ON ledger_entries(timestamp);
CREATE INDEX idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX idx_exchange_rates_timestamp ON exchange_rates(timestamp);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate checksum for immutability
CREATE OR REPLACE FUNCTION generate_checksum(data JSONB)
RETURNS VARCHAR(128) AS $$
BEGIN
    RETURN encode(digest(data::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update account balances
CREATE OR REPLACE FUNCTION update_account_balance(p_user_id UUID, p_currency VARCHAR(10))
RETURNS VOID AS $$
DECLARE
    total_balance DECIMAL(36,18) := 0;
    available_balance DECIMAL(36,18) := 0;
BEGIN
    -- Calculate total balance from ledger entries
    SELECT COALESCE(SUM(
        CASE
            WHEN type = 'credit' THEN amount
            WHEN type = 'debit' THEN -amount
            ELSE 0
        END
    ), 0) INTO total_balance
    FROM ledger_entries
    WHERE user_id = p_user_id AND currency = p_currency;

    -- For now, available = total (no pending/frozen logic implemented)
    available_balance := total_balance;

    INSERT INTO account_balances (user_id, currency, available, pending, frozen, total, last_updated)
    VALUES (p_user_id, p_currency, available_balance, 0, 0, total_balance, NOW())
    ON CONFLICT (user_id, currency)
    DO UPDATE SET
        available = EXCLUDED.available,
        total = EXCLUDED.total,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for development
INSERT INTO users (email, password_hash, kyc_level) VALUES
('admin@Finthos.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8JZwHd5Jm', 'premium'), -- password: admin123
('user@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8JZwHd5Jm', 'verified'); -- password: admin123

-- Insert sample exchange rates
INSERT INTO exchange_rates (from_currency, to_currency, rate, source) VALUES
('BTC', 'USD', 45000.00, 'coinbase'),
('ETH', 'USD', 3000.00, 'coinbase'),
('EUR', 'USD', 1.08, 'ecb');
