#!/bin/bash

# Deployment script for Sharma & Associates Law Firm Website
# This script sets up the complete backend infrastructure on Cloudflare

echo "🏛️  Deploying Sharma & Associates Law Firm Website"
echo "=================================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install with: npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare first:"
    wrangler login
fi

echo "📊 Step 1: Creating Cloudflare D1 Database..."
# Create D1 database
DB_NAME="lawfirm-db"
wrangler d1 create $DB_NAME

# Extract database ID (you'll need to manually copy this to wrangler.toml)
echo "✅ Database created! Please copy the database binding info to your wrangler.toml file."

echo "🗄️  Step 2: Setting up database schema..."
# Initialize database with schema
wrangler d1 execute $DB_NAME --file=./database/schema.sql

echo "🌐 Step 3: Creating Pages project..."
# Create Pages project
wrangler pages project create lawfirm-site

echo "🔧 Step 4: Setting up environment variables..."
echo "Please set the following environment variables in your Cloudflare dashboard:"
echo ""
echo "Required Variables:"
echo "- RESEND_API_KEY: Your Resend API key for sending emails"
echo "- FIRM_EMAIL: Email address for the law firm (e.g., info@sharmaassociates.co.in)"
echo "- ADMIN_USERNAME: Username for admin panel access"
echo "- ADMIN_PASSWORD: Password for admin panel access"
echo "- ADMIN_TOKEN: API token for admin authentication"
echo "- ADMIN_SESSION_TOKEN: Session token for admin login"
echo ""
echo "Optional Variables:"
echo "- WEBHOOK_SECRET: Secret for webhook verification"
echo "- SMTP_HOST: SMTP server host (if not using Resend)"
echo "- SMTP_PORT: SMTP server port"
echo "- SMTP_USER: SMTP username"
echo "- SMTP_PASS: SMTP password"

echo ""
echo "📝 Step 5: Updating wrangler.toml configuration..."
echo "Please update your wrangler.toml file with the database binding:"
echo ""
cat << 'EOF'
name = "lawfirm-site"
compatibility_date = "2024-01-01"

[env.production]
pages_build_output_dir = "public"

[[env.production.d1_databases]]
binding = "DB"
database_name = "lawfirm-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace with actual ID from Step 1
EOF

echo ""
echo "🚀 Step 6: Deploying the website..."
read -p "Have you updated wrangler.toml with the database ID? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Deploy the site
    wrangler pages deploy public
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "🎉 Your law firm website is now live!"
    echo ""
    echo "Next steps:"
    echo "1. Set environment variables in Cloudflare dashboard"
    echo "2. Configure your custom domain"
    echo "3. Set up email DNS records for professional email addresses"
    echo "4. Access admin panel at: https://your-site.pages.dev/admin"
    echo ""
    echo "📧 Email Setup:"
    echo "- Configure MX records for @sharmaassociates.co.in domain"
    echo "- Set SPF, DKIM, and DMARC records for email deliverability"
    echo "- Create professional email addresses for team members"
    echo ""
    echo "🔒 Security Notes:"
    echo "- Change default admin credentials"
    echo "- Set up proper environment variables"
    echo "- Configure HTTPS redirects"
    echo "- Enable security headers"
else
    echo "Please update wrangler.toml first, then run: wrangler pages deploy public"
fi

echo ""
echo "📚 Documentation:"
echo "- API Documentation: See functions/api/ directory"
echo "- Admin Guide: Access /admin for client management"
echo "- Database Schema: See database/schema.sql"
echo ""
echo "💡 Pro Tips:"
echo "- Use 'wrangler pages dev public' for local development"
echo "- Monitor logs with 'wrangler pages deployment tail'"
echo "- Backup database regularly with 'wrangler d1 export'" 