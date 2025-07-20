// Cloudflare Pages Function for contact form processing
export async function onRequestPost({ request, env }) {
  try {
    // Parse form data
    const formData = await request.json();
    
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'legalMatter', 'message'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid email format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate inquiry ID
    const inquiryId = `INQ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Prepare data for database
    const inquiryData = {
      id: inquiryId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      city: formData.city || null,
      legalMatter: formData.legalMatter,
      urgency: formData.urgency || 'flexible',
      message: formData.message,
      hearAbout: formData.hearAbout || null,
      createdAt: new Date().toISOString(),
      status: 'new',
      followedUp: false
    };
    
    // Store in database
    try {
      await env.DB.prepare(`
        INSERT INTO inquiries (
          id, firstName, lastName, email, phone, city, 
          legalMatter, urgency, message, hearAbout, 
          createdAt, status, followedUp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        inquiryData.id,
        inquiryData.firstName,
        inquiryData.lastName,
        inquiryData.email,
        inquiryData.phone,
        inquiryData.city,
        inquiryData.legalMatter,
        inquiryData.urgency,
        inquiryData.message,
        inquiryData.hearAbout,
        inquiryData.createdAt,
        inquiryData.status,
        inquiryData.followedUp
      ).run();
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue with email sending even if database fails
    }
    
    // Send email notification to firm
    await sendEmailNotification(inquiryData, env);
    
    // Send confirmation email to client
    await sendConfirmationEmail(inquiryData, env);
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Thank you for your inquiry! We will get back to you within 24 hours.',
      inquiryId: inquiryId
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'There was an error processing your request. Please try again or contact us directly.',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle CORS preflight requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// Send email notification to the law firm
async function sendEmailNotification(inquiryData, env) {
  const emailData = {
    from: {
      email: 'noreply@sharmaassociates.co.in',
      name: 'Sharma & Associates Website'
    },
    to: [
      {
        email: env.FIRM_EMAIL || 'info@sharmaassociates.co.in',
        name: 'Sharma & Associates'
      }
    ],
    subject: `New Legal Inquiry - ${inquiryData.legalMatter} (${inquiryData.urgency.toUpperCase()})`,
    html: generateFirmNotificationEmail(inquiryData),
    text: generateFirmNotificationText(inquiryData)
  };
  
  return await sendEmail(emailData, env);
}

// Send confirmation email to client
async function sendConfirmationEmail(inquiryData, env) {
  const emailData = {
    from: {
      email: 'info@sharmaassociates.co.in',
      name: 'Sharma & Associates'
    },
    to: [
      {
        email: inquiryData.email,
        name: `${inquiryData.firstName} ${inquiryData.lastName}`
      }
    ],
    subject: 'Thank you for contacting Sharma & Associates - We will be in touch soon',
    html: generateClientConfirmationEmail(inquiryData),
    text: generateClientConfirmationText(inquiryData)
  };
  
  return await sendEmail(emailData, env);
}

// Generic email sending function
async function sendEmail(emailData, env) {
  try {
    // Using Resend API (you can also use SendGrid, Mailgun, etc.)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });
    
    if (!response.ok) {
      throw new Error(`Email API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

// Generate HTML email template for firm notification
function generateFirmNotificationEmail(data) {
  const urgencyColors = {
    emergency: '#dc2626',
    urgent: '#f59e0b',
    soon: '#3b82f6',
    flexible: '#10b981'
  };
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New Legal Inquiry</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .info-row { margin: 10px 0; padding: 10px; background: #f8f9fa; border-left: 4px solid #1a365d; }
            .urgency { display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; font-weight: bold; }
            .message-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>New Legal Inquiry</h1>
            <p>Inquiry ID: ${data.id}</p>
        </div>
        
        <div class="content">
            <div class="info-row">
                <strong>Client:</strong> ${data.firstName} ${data.lastName}
            </div>
            
            <div class="info-row">
                <strong>Email:</strong> ${data.email}
            </div>
            
            <div class="info-row">
                <strong>Phone:</strong> ${data.phone}
            </div>
            
            ${data.city ? `<div class="info-row"><strong>Location:</strong> ${data.city}</div>` : ''}
            
            <div class="info-row">
                <strong>Legal Matter:</strong> ${data.legalMatter}
            </div>
            
            <div class="info-row">
                <strong>Urgency:</strong> 
                <span class="urgency" style="background-color: ${urgencyColors[data.urgency]}">
                    ${data.urgency.toUpperCase()}
                </span>
            </div>
            
            ${data.hearAbout ? `<div class="info-row"><strong>Referred by:</strong> ${data.hearAbout}</div>` : ''}
            
            <div class="message-box">
                <h3>Client Message:</h3>
                <p>${data.message}</p>
            </div>
            
            <div class="info-row">
                <strong>Submitted:</strong> ${new Date(data.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            </div>
        </div>
        
        <div class="footer">
            <p>Please respond to this inquiry within 24 hours as per firm policy.</p>
            <p>This email was generated automatically from the Sharma & Associates website.</p>
        </div>
    </body>
    </html>
  `;
}

// Generate text version for firm notification
function generateFirmNotificationText(data) {
  return `
NEW LEGAL INQUIRY - ${data.id}

Client: ${data.firstName} ${data.lastName}
Email: ${data.email}
Phone: ${data.phone}
${data.city ? `Location: ${data.city}` : ''}
Legal Matter: ${data.legalMatter}
Urgency: ${data.urgency.toUpperCase()}
${data.hearAbout ? `Referred by: ${data.hearAbout}` : ''}

Message:
${data.message}

Submitted: ${new Date(data.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

Please respond within 24 hours as per firm policy.
  `.trim();
}

// Generate HTML confirmation email for client
function generateClientConfirmationEmail(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Thank you for contacting Sharma & Associates</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #1a365d; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .contact-info { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background: #f8f9fa; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Thank You for Contacting Us</h1>
            <p>Sharma & Associates - Family Law Experts</p>
        </div>
        
        <div class="content">
            <p>Dear ${data.firstName},</p>
            
            <p>Thank you for reaching out to Sharma & Associates regarding your ${data.legalMatter.toLowerCase()} matter. We have received your inquiry and will respond within 24 hours.</p>
            
            <div class="info-box">
                <h3>Your Inquiry Details:</h3>
                <p><strong>Inquiry ID:</strong> ${data.id}</p>
                <p><strong>Legal Matter:</strong> ${data.legalMatter}</p>
                <p><strong>Urgency:</strong> ${data.urgency}</p>
                <p><strong>Submitted:</strong> ${new Date(data.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            </div>
            
            <h3>What Happens Next?</h3>
            <ol>
                <li><strong>Initial Review:</strong> Our legal team will review your inquiry within 24 hours</li>
                <li><strong>Contact:</strong> We will reach out to you via phone or email to schedule your free consultation</li>
                <li><strong>Consultation:</strong> During your 30-minute consultation, we'll discuss your case and legal options</li>
                <li><strong>Next Steps:</strong> If we proceed, we'll outline our strategy and fee structure</li>
            </ol>
            
            <div class="contact-info">
                <h3>Need Immediate Assistance?</h3>
                <p><strong>Office:</strong> +91 11 1234 5678<br/>
                <strong>Emergency:</strong> +91 98765 43210 (24/7)<br/>
                <strong>Email:</strong> info@sharmaassociates.co.in</p>
                <p><em>For emergencies involving domestic violence or child safety, please contact local authorities first.</em></p>
            </div>
            
            <p>We understand that family legal matters can be stressful. Our experienced team is here to guide you through this process with compassion and expertise.</p>
            
            <p>Best regards,<br/>
            <strong>Sharma & Associates Legal Team</strong></p>
        </div>
        
        <div class="footer">
            <p>This email is confidential and protected by attorney-client privilege.</p>
            <p>Sharma & Associates | 123 Legal Complex, New Delhi 110001 | www.sharmaassociates.co.in</p>
        </div>
    </body>
    </html>
  `;
}

// Generate text confirmation for client
function generateClientConfirmationText(data) {
  return `
Dear ${data.firstName},

Thank you for contacting Sharma & Associates regarding your ${data.legalMatter.toLowerCase()} matter.

INQUIRY DETAILS:
ID: ${data.id}
Legal Matter: ${data.legalMatter}
Urgency: ${data.urgency}
Submitted: ${new Date(data.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

WHAT HAPPENS NEXT:
1. Our legal team will review your inquiry within 24 hours
2. We will contact you to schedule your free consultation
3. During consultation, we'll discuss your case and options
4. If we proceed, we'll outline our strategy and fees

CONTACT INFORMATION:
Office: +91 11 1234 5678
Emergency: +91 98765 43210 (24/7)
Email: info@sharmaassociates.co.in

For emergencies involving domestic violence or child safety, please contact local authorities first.

Best regards,
Sharma & Associates Legal Team
  `.trim();
} 