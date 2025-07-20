// Appointment scheduling API for Sharma & Associates

export async function onRequestPost({ request, env }) {
  try {
    const appointmentData = await request.json();
    
    // Validate required fields
    const requiredFields = ['clientName', 'clientEmail', 'clientPhone', 'appointmentType', 'preferredDate', 'preferredTime'];
    const missingFields = requiredFields.filter(field => !appointmentData[field]);
    
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
    
    // Generate appointment ID
    const appointmentId = generateAppointmentId();
    
    // Check availability
    const isAvailable = await checkAvailability(appointmentData.preferredDate, appointmentData.preferredTime, env);
    if (!isAvailable.available) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Selected time slot is not available',
        suggestedTimes: isAvailable.suggestedTimes
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create appointment record
    const appointment = {
      id: appointmentId,
      inquiryId: appointmentData.inquiryId || null,
      caseId: appointmentData.caseId || null,
      clientName: appointmentData.clientName,
      clientEmail: appointmentData.clientEmail,
      clientPhone: appointmentData.clientPhone,
      appointmentType: appointmentData.appointmentType,
      scheduledDate: appointmentData.preferredDate,
      scheduledTime: appointmentData.preferredTime,
      duration: appointmentData.duration || 30,
      attorney: appointmentData.attorney || null,
      location: appointmentData.location || 'Office',
      status: 'scheduled',
      notes: appointmentData.notes || '',
      reminderSent: false,
      createdAt: new Date().toISOString()
    };
    
    // Store in database
    try {
      await env.DB.prepare(`
        INSERT INTO appointments (
          inquiryId, caseId, clientName, clientEmail, clientPhone, 
          appointmentType, scheduledDate, scheduledTime, duration, 
          attorney, location, status, notes, reminderSent, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        appointment.inquiryId,
        appointment.caseId,
        appointment.clientName,
        appointment.clientEmail,
        appointment.clientPhone,
        appointment.appointmentType,
        appointment.scheduledDate,
        appointment.scheduledTime,
        appointment.duration,
        appointment.attorney,
        appointment.location,
        appointment.status,
        appointment.notes,
        appointment.reminderSent,
        appointment.createdAt
      ).run();
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store appointment');
    }
    
    // Send confirmation emails
    await sendAppointmentConfirmation(appointment, env);
    await sendAppointmentNotificationToFirm(appointment, env);
    
    // Schedule reminder (would typically use a queue/scheduler)
    await scheduleReminder(appointment, env);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Appointment scheduled successfully',
      appointmentId: appointmentId,
      appointment: {
        id: appointmentId,
        date: appointment.scheduledDate,
        time: appointment.scheduledTime,
        type: appointment.appointmentType,
        duration: appointment.duration
      }
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
    console.error('Appointment scheduling error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'There was an error scheduling your appointment. Please try again or contact us directly.',
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  switch (action) {
    case 'availability':
      return getAvailability(url.searchParams, env);
    case 'slots':
      return getAvailableSlots(url.searchParams, env);
    default:
      return new Response('Invalid action', { status: 400 });
  }
}

// Handle CORS
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

function generateAppointmentId() {
  return `APT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Check if time slot is available
async function checkAvailability(date, time, env) {
  try {
    // Check if there's already an appointment at this time
    const existing = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE scheduledDate = ? AND scheduledTime = ? AND status IN ('scheduled', 'confirmed')
    `).bind(date, time).first();
    
    const isAvailable = existing.count === 0;
    
    if (!isAvailable) {
      // Suggest alternative times
      const suggestedTimes = await getSuggestedTimes(date, time, env);
      return { available: false, suggestedTimes };
    }
    
    return { available: true };
  } catch (error) {
    console.error('Availability check error:', error);
    return { available: false, suggestedTimes: [] };
  }
}

// Get suggested alternative times
async function getSuggestedTimes(date, requestedTime, env) {
  const suggestions = [];
  const timeSlots = generateTimeSlots();
  
  try {
    // Get all booked slots for the date
    const bookedSlots = await env.DB.prepare(`
      SELECT scheduledTime FROM appointments 
      WHERE scheduledDate = ? AND status IN ('scheduled', 'confirmed')
    `).bind(date).all();
    
    const bookedTimes = bookedSlots.results?.map(slot => slot.scheduledTime) || [];
    
    // Find available slots
    const availableSlots = timeSlots.filter(slot => !bookedTimes.includes(slot));
    
    // Return up to 5 suggestions
    return availableSlots.slice(0, 5);
  } catch (error) {
    console.error('Error getting suggested times:', error);
    return [];
  }
}

// Generate available time slots for a day
function generateTimeSlots() {
  const slots = [];
  
  // Morning slots: 9:00 AM - 12:00 PM
  for (let hour = 9; hour < 12; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  
  // Afternoon slots: 2:00 PM - 6:00 PM
  for (let hour = 14; hour < 18; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  
  return slots;
}

// Get availability for date range
async function getAvailability(searchParams, env) {
  const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0];
  const endDate = searchParams.get('end') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  try {
    const availability = {};
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();
      
      // Skip Sundays (0)
      if (dayOfWeek === 0) {
        availability[dateStr] = { available: false, reason: 'Closed on Sundays' };
      } else {
        // Get booked appointments for this date
        const booked = await env.DB.prepare(`
          SELECT scheduledTime FROM appointments 
          WHERE scheduledDate = ? AND status IN ('scheduled', 'confirmed')
        `).bind(dateStr).all();
        
        const bookedTimes = booked.results?.map(apt => apt.scheduledTime) || [];
        const totalSlots = generateTimeSlots();
        const availableSlots = totalSlots.filter(slot => !bookedTimes.includes(slot));
        
        availability[dateStr] = {
          available: availableSlots.length > 0,
          totalSlots: totalSlots.length,
          availableSlots: availableSlots.length,
          bookedSlots: bookedTimes.length,
          slots: availableSlots
        };
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: availability
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get available slots for a specific date
async function getAvailableSlots(searchParams, env) {
  const date = searchParams.get('date');
  
  if (!date) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Date parameter required'
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  
  try {
    const allSlots = generateTimeSlots();
    const bookedSlots = await env.DB.prepare(`
      SELECT scheduledTime FROM appointments 
      WHERE scheduledDate = ? AND status IN ('scheduled', 'confirmed')
    `).bind(date).all();
    
    const bookedTimes = bookedSlots.results?.map(slot => slot.scheduledTime) || [];
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        date,
        totalSlots: allSlots.length,
        availableSlots: availableSlots.length,
        bookedSlots: bookedTimes.length,
        slots: availableSlots
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Send appointment confirmation to client
async function sendAppointmentConfirmation(appointment, env) {
  const emailData = {
    from: {
      email: 'info@sharmaassociates.co.in',
      name: 'Sharma & Associates'
    },
    to: [
      {
        email: appointment.clientEmail,
        name: appointment.clientName
      }
    ],
    subject: 'Appointment Confirmation - Sharma & Associates',
    html: generateAppointmentConfirmationHTML(appointment),
    text: generateAppointmentConfirmationText(appointment)
  };
  
  return await sendEmail(emailData, env);
}

// Send appointment notification to firm
async function sendAppointmentNotificationToFirm(appointment, env) {
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
    subject: `New Appointment Scheduled - ${appointment.appointmentType}`,
    html: generateAppointmentNotificationHTML(appointment),
    text: generateAppointmentNotificationText(appointment)
  };
  
  return await sendEmail(emailData, env);
}

// Email sending function (reuse from contact.js)
async function sendEmail(emailData, env) {
  try {
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

// Generate appointment confirmation HTML
function generateAppointmentConfirmationHTML(appointment) {
  const dateFormatted = new Date(appointment.scheduledDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const timeFormatted = new Date(`2000-01-01T${appointment.scheduledTime}:00`).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Appointment Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .appointment-details { background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #1a365d; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background: #f8f9fa; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Appointment Confirmed</h1>
            <p>Sharma & Associates</p>
        </div>
        
        <div class="content">
            <p>Dear ${appointment.clientName},</p>
            
            <p>Your appointment has been confirmed with Sharma & Associates.</p>
            
            <div class="appointment-details">
                <h3>Appointment Details:</h3>
                <div class="detail-row">
                    <span class="label">Type:</span> ${appointment.appointmentType}
                </div>
                <div class="detail-row">
                    <span class="label">Date:</span> ${dateFormatted}
                </div>
                <div class="detail-row">
                    <span class="label">Time:</span> ${timeFormatted}
                </div>
                <div class="detail-row">
                    <span class="label">Duration:</span> ${appointment.duration} minutes
                </div>
                <div class="detail-row">
                    <span class="label">Location:</span> ${appointment.location}
                </div>
                ${appointment.attorney ? `<div class="detail-row"><span class="label">Attorney:</span> ${appointment.attorney}</div>` : ''}
            </div>
            
            <h3>What to Bring:</h3>
            <ul>
                <li>Valid photo ID</li>
                <li>Any relevant documents related to your case</li>
                <li>List of questions you'd like to discuss</li>
                <li>Marriage certificate (if applicable)</li>
            </ul>
            
            <h3>Office Location:</h3>
            <p>Sharma & Associates<br/>
            123 Legal Complex, 5th Floor<br/>
            Connaught Place, New Delhi 110001<br/>
            Phone: +91 11 1234 5678</p>
            
            <p><strong>Please arrive 15 minutes early for your appointment.</strong></p>
            
            <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
            
            <p>We look forward to meeting with you.</p>
            
            <p>Best regards,<br/>
            <strong>Sharma & Associates Team</strong></p>
        </div>
        
        <div class="footer">
            <p>This email is confidential and protected by attorney-client privilege.</p>
        </div>
    </body>
    </html>
  `;
}

// Generate appointment confirmation text
function generateAppointmentConfirmationText(appointment) {
  const dateFormatted = new Date(appointment.scheduledDate).toLocaleDateString('en-IN');
  const timeFormatted = appointment.scheduledTime;
  
  return `
Dear ${appointment.clientName},

Your appointment has been confirmed with Sharma & Associates.

APPOINTMENT DETAILS:
Type: ${appointment.appointmentType}
Date: ${dateFormatted}
Time: ${timeFormatted}
Duration: ${appointment.duration} minutes
Location: ${appointment.location}
${appointment.attorney ? `Attorney: ${appointment.attorney}` : ''}

WHAT TO BRING:
- Valid photo ID
- Relevant documents related to your case
- List of questions you'd like to discuss
- Marriage certificate (if applicable)

OFFICE LOCATION:
Sharma & Associates
123 Legal Complex, 5th Floor
Connaught Place, New Delhi 110001
Phone: +91 11 1234 5678

Please arrive 15 minutes early for your appointment.

If you need to reschedule or cancel, please contact us at least 24 hours in advance.

Best regards,
Sharma & Associates Team
  `.trim();
}

// Schedule reminder (simplified - in production use a proper scheduler)
async function scheduleReminder(appointment, env) {
  // This would typically integrate with a job queue or scheduler
  // For now, we'll just log that a reminder should be sent
  console.log(`Reminder scheduled for appointment ${appointment.id} on ${appointment.scheduledDate} at ${appointment.scheduledTime}`);
  
  // You could integrate with:
  // - Cloudflare Queues
  // - External scheduling services
  // - Cron jobs
  
  return true;
} 