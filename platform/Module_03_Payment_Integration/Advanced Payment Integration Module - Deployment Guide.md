# Advanced Payment Integration Module - Deployment Guide

This guide provides instructions for deploying the Advanced Payment Integration Module as part of the Smart Invoice Receivables Management Platform. The module is designed to be self-hosted in your own environment or cloud provider of choice, maintaining consistency with the deployment approach used in Phases 1 and 2.

## Prerequisites

- Node.js 16.x or higher
- PostgreSQL 13.x or higher
- Docker and Docker Compose (optional, for containerized deployment)
- SSL certificate for secure payment processing
- Access to payment gateway accounts (Razorpay, Stripe, PayU, etc.)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=smart_invoice_db

# JWT Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24h

# Payment Security
PAYMENT_ENCRYPTION_KEY=32_byte_hex_encryption_key
PAYMENT_WEBHOOK_BASE_URL=https://your-domain.com/api/payment/webhooks

# Payment Gateway Credentials (examples)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
STRIPE_API_KEY=sk_test_your_api_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
PAYU_MERCHANT_KEY=your_merchant_key
PAYU_MERCHANT_SALT=your_merchant_salt

# Payment Return URLs
PAYMENT_RETURN_URL=https://your-domain.com/payment/return
PAYMENT_CALLBACK_URL=https://your-domain.com/api/payment/callback
```

## Standard Deployment

1. **Clone the repository**

```bash
git clone https://github.com/your-org/smart-invoice-module.git
cd smart-invoice-module/invoice_agent_nestjs
```

2. **Install dependencies**

```bash
npm install
```

3. **Build the application**

```bash
npm run build
```

4. **Run database migrations**

```bash
npm run migration:run
```

5. **Start the application**

```bash
npm run start:prod
```

## Docker Deployment

1. **Build the Docker image**

```bash
docker build -t smart-invoice-platform:latest .
```

2. **Run with Docker Compose**

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  app:
    image: smart-invoice-platform:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=postgres
      - DB_PASSWORD=your_password
      - DB_DATABASE=smart_invoice_db
      - JWT_SECRET=your_jwt_secret
      - JWT_EXPIRATION=24h
      - PAYMENT_ENCRYPTION_KEY=32_byte_hex_encryption_key
      - PAYMENT_WEBHOOK_BASE_URL=https://your-domain.com/api/payment/webhooks
      - RAZORPAY_KEY_ID=rzp_test_your_key_id
      - RAZORPAY_KEY_SECRET=your_key_secret
      - STRIPE_API_KEY=sk_test_your_api_key
      - STRIPE_WEBHOOK_SECRET=your_webhook_secret
      - PAYU_MERCHANT_KEY=your_merchant_key
      - PAYU_MERCHANT_SALT=your_merchant_salt
      - PAYMENT_RETURN_URL=https://your-domain.com/payment/return
      - PAYMENT_CALLBACK_URL=https://your-domain.com/api/payment/callback
    depends_on:
      - postgres
      - redis
      - rabbitmq

  postgres:
    image: postgres:13
    restart: always
    environment:
      - POSTGRES_PASSWORD=your_password
      - POSTGRES_DB=smart_invoice_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6
    restart: always
    volumes:
      - redis_data:/data

  rabbitmq:
    image: rabbitmq:3-management
    restart: always
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
```

3. **Start the services**

```bash
docker-compose up -d
```

## Payment Gateway Configuration

### Razorpay

1. Log in to your Razorpay Dashboard
2. Navigate to Settings > API Keys
3. Generate API keys and add them to your environment variables
4. Configure webhook URL: `https://your-domain.com/api/payment/webhooks/razorpay`
5. Enable the following webhook events:
   - payment.authorized
   - payment.failed
   - payment.captured
   - refund.created
   - refund.processed

### Stripe

1. Log in to your Stripe Dashboard
2. Navigate to Developers > API Keys
3. Get your API keys and add them to your environment variables
4. Configure webhook URL: `https://your-domain.com/api/payment/webhooks/stripe`
5. Enable the following webhook events:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.succeeded
   - charge.failed
   - refund.created
   - refund.updated

### PayU

1. Log in to your PayU Merchant Dashboard
2. Navigate to Settings > API Keys
3. Get your Merchant Key and Salt
4. Configure webhook URL: `https://your-domain.com/api/payment/webhooks/payu`

## Security Considerations

1. **PCI-DSS Compliance**
   - The module is designed to minimize PCI scope by using payment gateway redirects and tokenization
   - Never log or store full card details
   - Ensure your hosting environment follows security best practices

2. **Encryption**
   - Generate a secure 32-byte encryption key for `PAYMENT_ENCRYPTION_KEY`
   - Store this key securely, not in your codebase
   - Consider using a key management service for production

3. **SSL/TLS**
   - Always use HTTPS for all payment-related endpoints
   - Configure your web server with modern TLS settings
   - Regularly update your SSL certificates

4. **Firewall Configuration**
   - Allow inbound connections only on necessary ports (80, 443)
   - Allow outbound connections to payment gateway IPs
   - Configure rate limiting to prevent abuse

## Monitoring and Maintenance

1. **Health Checks**
   - Monitor the `/health` endpoint for system status
   - Set up alerts for payment gateway connectivity issues
   - Regularly check payment gateway health status via the admin dashboard

2. **Logging**
   - Payment-related logs are stored in `/logs/payment`
   - Monitor for unusual patterns or errors
   - Set up log rotation to manage disk space

3. **Backup Strategy**
   - Regularly backup the database
   - Ensure encryption keys are securely backed up
   - Test restoration procedures periodically

## Troubleshooting

### Common Issues

1. **Payment Gateway Connection Errors**
   - Check API credentials in environment variables
   - Verify network connectivity to gateway endpoints
   - Check if gateway service is operational

2. **Webhook Processing Failures**
   - Verify webhook URL is accessible from the internet
   - Check webhook secret keys
   - Review webhook logs for payload issues

3. **Database Connection Issues**
   - Verify database credentials and connectivity
   - Check database server status
   - Ensure sufficient connection pool size

## Scaling Considerations

1. **Horizontal Scaling**
   - The application is stateless and can be scaled horizontally
   - Use a load balancer for multiple application instances
   - Ensure session persistence for payment flows

2. **Database Scaling**
   - Consider read replicas for high-volume deployments
   - Implement database sharding for multi-tenant deployments
   - Monitor database performance and optimize queries

3. **Queue Management**
   - Scale RabbitMQ nodes for high-volume payment processing
   - Configure appropriate queue TTL and persistence settings
   - Monitor queue depths and consumer health

## Upgrading

1. **Backup before upgrading**
   - Always backup your database before upgrading
   - Take a snapshot of your environment configuration

2. **Follow the upgrade path**
   - Check release notes for breaking changes
   - Run database migrations after upgrading
   - Test payment flows after each upgrade

3. **Rollback plan**
   - Keep previous version deployments available
   - Document rollback procedures
   - Test rollback procedures periodically

## Support

For issues or questions regarding deployment, please contact:
- Email: support@smart-invoice-platform.com
- Documentation: https://docs.smart-invoice-platform.com
