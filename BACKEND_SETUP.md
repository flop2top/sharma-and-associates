# Backend Setup Guide - Sharma & Associates Law Firm

This guide walks you through setting up the complete backend infrastructure for the law firm website using Cloudflare Pages, D1 Database, and Workers.

## 🏗️ Architecture Overview

```
Frontend (Static Files) → Cloudflare Pages
      ↓
Backend APIs → Cloudflare Pages Functions
      ↓
Database → Cloudflare D1 (SQLite)
      ↓
Email Service → Resend API
      ↓
Admin Panel → Protected Routes
```

## 📋 Prerequisites

- Cloudflare account (free tier works)
- Node.js 16+ installed
- Wrangler CLI installed globally
- Email service account (Resend recommended)

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
# Install Wrangler CLI globally
npm install -g wrangler

# Install project dependencies
npm install

# Login to Cloudflare
wrangler login
```

### 2. Run Deployment Script

```bash
# Make script executable
chmod +x deploy.sh

# Run automated setup
./deploy.sh
```

## 📝 Manual Setup (Alternative)

### Step 1: Create D1 Database

```bash
# Create database
wrangler d1 create lawfirm-db

# Copy the database_id from output and update wrangler.toml
```

### Step 2: Initialize Database Schema

```bash
# Run schema setup
wrangler d1 execute lawfirm-db --file=./database/schema.sql

# Verify tables were created
wrangler d1 execute lawfirm-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### Step 3: Create Pages Project

```bash
# Create project
wrangler pages project create lawfirm-site

# Deploy to Cloudflare
wrangler pages deploy public
```

## 🔧 Environment Variables

Set these in your Cloudflare Pages dashboard under **Settings > Environment Variables**:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend API key for emails | `re_xxxxxxxxx` |
| `FIRM_EMAIL` | Law firm email address | `info@sharmaassociates.co.in` |
| `ADMIN_USERNAME` | Admin panel username | `admin` |
| `ADMIN_PASSWORD` | Admin panel password | `secure_password_123` |
| `ADMIN_TOKEN` | API authentication token | `lawfirm_token_xyz` |
| `ADMIN_SESSION_TOKEN` | Session authentication | `session_token_abc` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBHOOK_SECRET` | Webhook verification secret | - |
| `MAX_APPOINTMENTS_PER_DAY` | Daily appointment limit | `20` |
| `EMAIL_FROM_NAME` | Sender name for emails | `Sharma & Associates` |

## 📧 Email Service Setup

### Option 1: Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Create API key
4. Add `RESEND_API_KEY` to environment variables

### Option 2: Alternative Email Services

Update the email function in `functions/api/contact.js` to use:
- **SendGrid**: Replace Resend API calls
- **Mailgun**: Update authentication headers
- **SMTP**: Use nodemailer or similar

## 🛡️ Security Configuration

### Admin Panel Security

The admin panel is protected with:
- Username/password authentication
- Session tokens
- Bearer token API authentication

**Default credentials** (CHANGE IMMEDIATELY):
- Username: `admin`
- Password: Set in environment variables

### API Security

- CORS headers configured for your domain
- Input validation on all endpoints
- SQL injection prevention
- Rate limiting (implement as needed)

## 🗄️ Database Schema

The database includes these main tables:

- `inquiries` - Contact form submissions
- `follow_ups` - Communication tracking
- `appointments` - Consultation scheduling
- `cases` - Case management
- `attorneys` - Staff information
- `email_templates` - Email template management

## 🔗 API Endpoints

### Public APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contact` | POST | Submit contact form |
| `/api/appointments` | POST | Schedule appointment |
| `/api/appointments?action=availability` | GET | Check availability |

### Admin APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/dashboard` | GET | Admin dashboard |
| `/admin/inquiries` | GET | List inquiries |
| `/admin/inquiry/update` | POST | Update inquiry |
| `/admin/follow-up/create` | POST | Create follow-up |

## 📊 Admin Dashboard Features

Access at: `https://your-site.pages.dev/admin`

### Dashboard Stats
- Total inquiries
- New inquiries today
- Upcoming appointments
- Inquiries by status/urgency

### Inquiry Management
- View all client inquiries
- Update status and assign attorneys
- Add follow-up notes
- Track communication history

### Appointment Management
- View scheduled consultations
- Check availability calendar
- Send reminder emails
- Manage consultation notes

### Case Management
- Convert inquiries to cases
- Track case progress
- Manage client information
- Monitor billing and fees

## 🔄 Development Workflow

### Local Development

```bash
# Start local dev server
wrangler pages dev public

# Test database locally
wrangler d1 execute lawfirm-db --local --command="SELECT * FROM inquiries LIMIT 5;"
```

### Database Management

```bash
# Run migrations
wrangler d1 execute lawfirm-db --file=./database/migrations/001_new_feature.sql

# Backup database
wrangler d1 export lawfirm-db --output=backup.sql

# Query data
wrangler d1 execute lawfirm-db --command="SELECT COUNT(*) FROM inquiries;"
```

### Deployment

```bash
# Deploy to production
wrangler pages deploy public

# Deploy with environment
wrangler pages deploy public --env production

# Monitor deployment
wrangler pages deployment tail
```

## 📈 Monitoring & Analytics

### Built-in Monitoring
- Cloudflare Analytics (automatic)
- Error logging in Wrangler
- Performance metrics

### Custom Analytics
- Track form submissions
- Monitor appointment bookings
- Email delivery rates
- Admin panel usage

## 🚨 Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Check database binding
wrangler d1 list

# Test connection
wrangler d1 execute lawfirm-db --command="SELECT 1;"
```

**Email Sending Failures**
- Verify `RESEND_API_KEY` is set correctly
- Check domain verification in Resend
- Review email templates for errors

**Admin Panel Access Issues**
- Verify environment variables are set
- Check authentication credentials
- Clear browser cookies

### Debug Commands

```bash
# View logs
wrangler pages deployment tail

# Check environment variables
wrangler pages project list

# Test API endpoints
curl -X POST https://your-site.pages.dev/api/contact \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","phone":"+91 9876543210","legalMatter":"divorce","message":"Test inquiry"}'
```

## 🔄 Backup & Recovery

### Database Backup

```bash
# Regular backup (run daily)
wrangler d1 export lawfirm-db --output="backup-$(date +%Y%m%d).sql"

# Restore from backup
wrangler d1 execute lawfirm-db --file=backup-20240101.sql
```

### Configuration Backup
- Export environment variables
- Save wrangler.toml configuration
- Document custom domain settings

## 🎯 Performance Optimization

### Database Optimization
- Index frequently queried columns
- Archive old inquiries annually
- Optimize query patterns

### Caching Strategy
- Static assets cached by Cloudflare
- API responses cache for 5 minutes
- Database queries use prepared statements

### Email Performance
- Use email templates
- Batch sending for reminders
- Queue heavy operations

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- [ ] Weekly database backup
- [ ] Monthly inquiry archive
- [ ] Quarterly security review
- [ ] Annual dependency updates

### Monitoring Checklist
- [ ] Check email delivery rates
- [ ] Monitor form submission success
- [ ] Review admin panel access logs
- [ ] Validate appointment scheduling

---

## 🆘 Emergency Procedures

### Site Down
1. Check Cloudflare Pages status
2. Verify domain configuration
3. Check recent deployments
4. Rollback if necessary

### Database Issues
1. Check D1 service status
2. Verify database bindings
3. Test with minimal queries
4. Restore from backup if needed

### Email Failures
1. Check Resend service status
2. Verify API key validity
3. Test with simple email
4. Switch to backup provider

---

**Need Help?** Check the [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/) or [D1 database docs](https://developers.cloudflare.com/d1/). 