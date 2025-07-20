# Sharma & Associates - Family Law Firm Website

A complete, production-ready website for a family law firm based in India, built with vanilla HTML, CSS, and JavaScript for deployment on Cloudflare Pages.

## 🌟 Features

- **Professional Design**: Modern, responsive design optimized for legal services
- **Complete Website**: Homepage, About, Team, Services, and Contact pages
- **Mobile-First Responsive**: Fully responsive design that works on all devices
- **Contact Forms**: Functional contact form with validation and notification system
- **SEO Optimized**: Proper meta tags, semantic HTML, and structured content
- **Performance Focused**: Optimized for fast loading and great user experience
- **Accessibility**: WCAG compliant with proper accessibility features

## 📁 Project Structure

```
lawfirm-site/
├── public/                    # Deployment directory (Cloudflare Pages)
│   ├── index.html            # Homepage
│   ├── about.html            # About Us page
│   ├── team.html             # Our Team page
│   ├── services.html         # Legal Services page
│   ├── contact.html          # Contact page
│   └── assets/
│       ├── css/
│       │   └── styles.css    # Main stylesheet
│       └── js/
│           └── main.js       # JavaScript functionality
├── wrangler.toml             # Cloudflare Pages configuration
├── package.json              # Project dependencies and scripts
└── README.md                 # This file
```

## 🚀 Deployment with Cloudflare Pages

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Cloudflare account

### Quick Deploy

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Create Pages Project**:
   ```bash
   wrangler pages project create lawfirm-site
   ```

4. **Deploy the Site**:
   ```bash
   wrangler pages deploy public
   ```

### Alternative Deployment Methods

#### Method 1: Direct Deployment (Recommended)
```bash
# Clone/download the project
cd lawfirm-site

# Install dependencies
npm install

# Deploy to Cloudflare Pages
npm run deploy
```

#### Method 2: Git Integration
1. Push this repository to GitHub/GitLab
2. Connect your repository in the Cloudflare Pages dashboard
3. Set build configuration:
   - Build command: (leave empty)
   - Build output directory: `public`

## 🔧 Development

### Local Development
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# The site will be available at http://localhost:8788
```

### Project Scripts
- `npm run deploy` - Deploy to Cloudflare Pages
- `npm run dev` - Start local development server

## 🎨 Customization

### Branding
- Update firm name in navigation and footer
- Modify contact information in `contact.html` and footer
- Adjust color scheme in `assets/css/styles.css`
- Replace placeholder content with actual firm information

### Backend Infrastructure
The website includes a complete backend system with:

#### 🗄️ Database System
- **Cloudflare D1 Database** (SQLite) for storing inquiries, appointments, and cases
- Complete schema with tables for inquiries, follow-ups, appointments, cases, and attorneys
- Automated email notifications and confirmations

#### 🔗 API Endpoints
- **Contact Form API** (`/api/contact`) - Handles form submissions with validation and email
- **Appointment API** (`/api/appointments`) - Booking system with availability checking
- **Admin APIs** (`/admin/*`) - Protected admin panel for managing inquiries

#### 📧 Email Integration  
- **Resend API** integration for professional email sending
- Automated client confirmations and firm notifications
- Professional HTML email templates
- Emergency contact handling

#### 👥 Admin Dashboard
- Full-featured admin panel at `/admin`
- Inquiry management and follow-up tracking
- Appointment scheduling and calendar view
- Case management system
- Attorney assignment and workload tracking

#### 🛠️ Setup Instructions
```bash
# Quick setup with automated script
chmod +x deploy.sh
./deploy.sh

# Manual setup
npm run db:create
npm run db:schema
npm run deploy
```

See `BACKEND_SETUP.md` for detailed configuration instructions.

### Content Updates

#### Homepage (`public/index.html`)
- Update hero section tagline
- Modify service overview cards
- Adjust call-to-action buttons

#### About Page (`public/about.html`)
- Update firm history and founding details
- Modify mission and values
- Update professional credentials

#### Team Page (`public/team.html`)
- Replace placeholder lawyer profiles
- Add real headshot images
- Update qualifications and specializations

#### Services Page (`public/services.html`)
- Customize practice areas
- Update legal processes
- Modify fee structure information

#### Contact Page (`public/contact.html`)
- Update contact information
- Modify office locations
- Adjust consultation details

## 🔒 Security Considerations

- All form submissions should be validated server-side
- Implement CAPTCHA for form spam protection
- Use HTTPS (automatically provided by Cloudflare Pages)
- Regular security updates and monitoring

## 📱 Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 SEO Features

- Semantic HTML structure
- Proper heading hierarchy (H1-H6)
- Meta descriptions and keywords
- Open Graph tags ready for implementation
- Schema markup ready for implementation
- Fast loading times
- Mobile-friendly design

## 🔧 Technical Features

- **CSS Grid & Flexbox**: Modern layout techniques
- **Custom Properties**: CSS variables for easy theming
- **Responsive Images**: Optimized for different screen sizes
- **Progressive Enhancement**: Works without JavaScript
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance**: Optimized CSS and JavaScript

## 📞 Form Integration Examples

### Integrate with EmailJS
```javascript
// Add to main.js
emailjs.send('service_id', 'template_id', formObject)
  .then(() => {
    showNotification('Message sent successfully!', 'success');
  })
  .catch(() => {
    showNotification('Error sending message. Please try again.', 'error');
  });
```

### Integrate with Formspree
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
  <!-- form fields -->
</form>
```

## 🚀 Performance Optimization

- Minified CSS and JavaScript
- Optimized images (use WebP format when possible)
- Lazy loading for images
- Efficient CSS Grid and Flexbox layouts
- Minimal external dependencies

## 📝 License

This project is licensed under the MIT License. Feel free to use it for your law firm or client projects.

## 🤝 Support

For technical support or customization requests:
- Review the code documentation
- Check browser developer console for errors
- Ensure all files are properly uploaded to the `public` directory
- Verify Cloudflare Pages configuration

## 🔄 Updates and Maintenance

- Regularly update contact information
- Review and update legal content
- Monitor form submissions and responses
- Update team member information as needed
- Keep content fresh and current

---

**Note**: This is a template website. Please customize all content, contact information, and legal disclaimers according to your specific law firm's requirements and local regulations.

For questions about legal website requirements, consult with your local bar association or legal marketing compliance guidelines. 