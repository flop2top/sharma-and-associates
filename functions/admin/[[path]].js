// Admin dashboard for Sharma & Associates
// Handles all admin routes: /admin/*

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const path = params.path ? params.path.join('/') : '';
  
  // Simple authentication check
  if (!await isAuthenticated(request, env)) {
    return handleLogin(request, env);
  }
  
  // Route handling
  switch (request.method) {
    case 'GET':
      return handleGetRequest(path, request, env);
    case 'POST':
      return handlePostRequest(path, request, env);
    case 'PUT':
      return handlePutRequest(path, request, env);
    case 'DELETE':
      return handleDeleteRequest(path, request, env);
    default:
      return new Response('Method not allowed', { status: 405 });
  }
}

// Authentication check
async function isAuthenticated(request, env) {
  const authHeader = request.headers.get('Authorization');
  const cookieHeader = request.headers.get('Cookie');
  
  // Check for Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return token === env.ADMIN_TOKEN;
  }
  
  // Check for session cookie (simple implementation)
  if (cookieHeader && cookieHeader.includes('admin_session=')) {
    const sessionMatch = cookieHeader.match(/admin_session=([^;]+)/);
    if (sessionMatch) {
      const sessionToken = sessionMatch[1];
      return sessionToken === env.ADMIN_SESSION_TOKEN;
    }
  }
  
  return false;
}

// Handle login
async function handleLogin(request, env) {
  const url = new URL(request.url);
  
  if (request.method === 'POST') {
    const formData = await request.formData();
    const username = formData.get('username');
    const password = formData.get('password');
    
    // Simple authentication (in production, use proper hashing)
    if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
      const sessionToken = env.ADMIN_SESSION_TOKEN || 'admin_authenticated';
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/admin/dashboard',
          'Set-Cookie': `admin_session=${sessionToken}; HttpOnly; Secure; Path=/admin; Max-Age=86400`
        }
      });
    } else {
      return new Response(generateLoginPage('Invalid credentials'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
  }
  
  return new Response(generateLoginPage(), {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Handle GET requests
async function handleGetRequest(path, request, env) {
  const url = new URL(request.url);
  
  switch (path) {
    case '':
    case 'dashboard':
      return generateDashboard(env);
    
    case 'inquiries':
      return getInquiries(url.searchParams, env);
    
    case 'inquiry':
      const inquiryId = url.searchParams.get('id');
      return getInquiry(inquiryId, env);
    
    case 'appointments':
      return getAppointments(url.searchParams, env);
    
    case 'cases':
      return getCases(url.searchParams, env);
    
    case 'attorneys':
      return getAttorneys(env);
    
    default:
      return new Response('Not found', { status: 404 });
  }
}

// Handle POST requests
async function handlePostRequest(path, request, env) {
  const data = await request.json();
  
  switch (path) {
    case 'inquiry/update':
      return updateInquiry(data, env);
    
    case 'follow-up/create':
      return createFollowUp(data, env);
    
    case 'appointment/create':
      return createAppointment(data, env);
    
    case 'case/create':
      return createCase(data, env);
    
    default:
      return new Response('Not found', { status: 404 });
  }
}

// Generate login page
function generateLoginPage(error = '') {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Login - Sharma & Associates</title>
        <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
            .form-group { margin-bottom: 1rem; }
            label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
            input { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
            button { width: 100%; padding: 0.75rem; background: #1a365d; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; }
            button:hover { background: #2d5986; }
            .error { color: #dc2626; margin-bottom: 1rem; text-align: center; }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h2>Admin Login</h2>
            ${error ? `<div class="error">${error}</div>` : ''}
            <form method="POST">
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit">Login</button>
            </form>
        </div>
    </body>
    </html>
  `;
}

// Generate dashboard
async function generateDashboard(env) {
  const stats = await getDashboardStats(env);
  
  return new Response(generateDashboardHTML(stats), {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Get dashboard statistics
async function getDashboardStats(env) {
  try {
    const stats = {};
    
    // Count total inquiries
    const totalInquiries = await env.DB.prepare('SELECT COUNT(*) as count FROM inquiries').first();
    stats.totalInquiries = totalInquiries?.count || 0;
    
    // Count new inquiries (today)
    const today = new Date().toISOString().split('T')[0];
    const newToday = await env.DB.prepare('SELECT COUNT(*) as count FROM inquiries WHERE date(createdAt) = ?').bind(today).first();
    stats.newToday = newToday?.count || 0;
    
    // Count by status
    const statusCounts = await env.DB.prepare('SELECT status, COUNT(*) as count FROM inquiries GROUP BY status').all();
    stats.byStatus = statusCounts.results || [];
    
    // Count by urgency
    const urgencyCounts = await env.DB.prepare('SELECT urgency, COUNT(*) as count FROM inquiries GROUP BY urgency').all();
    stats.byUrgency = urgencyCounts.results || [];
    
    // Upcoming appointments
    const upcomingAppts = await env.DB.prepare('SELECT COUNT(*) as count FROM appointments WHERE scheduledDate >= date("now") AND status = "scheduled"').first();
    stats.upcomingAppointments = upcomingAppts?.count || 0;
    
    return stats;
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { totalInquiries: 0, newToday: 0, byStatus: [], byUrgency: [], upcomingAppointments: 0 };
  }
}

// Generate dashboard HTML
function generateDashboardHTML(stats) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Dashboard - Sharma & Associates</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: #f5f5f5; }
            .header { background: #1a365d; color: white; padding: 1rem 2rem; }
            .nav { display: flex; gap: 1rem; margin-top: 1rem; }
            .nav a { color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 4px; }
            .nav a:hover { background: #2d5986; }
            .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
            .stat-card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .stat-number { font-size: 2rem; font-weight: bold; color: #1a365d; }
            .stat-label { color: #666; margin-top: 0.5rem; }
            .section { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem; }
            .section h3 { margin-bottom: 1rem; color: #1a365d; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f8f9fa; font-weight: 600; }
            .status-new { color: #dc2626; }
            .status-contacted { color: #f59e0b; }
            .status-scheduled { color: #3b82f6; }
            .status-closed { color: #10b981; }
            .urgency-emergency { color: #dc2626; font-weight: bold; }
            .urgency-urgent { color: #f59e0b; }
            .urgency-soon { color: #3b82f6; }
            .urgency-flexible { color: #10b981; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Sharma & Associates - Admin Dashboard</h1>
            <div class="nav">
                <a href="/admin/dashboard">Dashboard</a>
                <a href="/admin/inquiries">Inquiries</a>
                <a href="/admin/appointments">Appointments</a>
                <a href="/admin/cases">Cases</a>
                <a href="/admin/attorneys">Attorneys</a>
            </div>
        </div>
        
        <div class="container">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${stats.totalInquiries}</div>
                    <div class="stat-label">Total Inquiries</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.newToday}</div>
                    <div class="stat-label">New Today</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.upcomingAppointments}</div>
                    <div class="stat-label">Upcoming Appointments</div>
                </div>
            </div>
            
            <div class="section">
                <h3>Inquiries by Status</h3>
                <table>
                    <thead>
                        <tr><th>Status</th><th>Count</th></tr>
                    </thead>
                    <tbody>
                        ${stats.byStatus.map(item => `
                            <tr>
                                <td class="status-${item.status}">${item.status}</td>
                                <td>${item.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h3>Inquiries by Urgency</h3>
                <table>
                    <thead>
                        <tr><th>Urgency</th><th>Count</th></tr>
                    </thead>
                    <tbody>
                        ${stats.byUrgency.map(item => `
                            <tr>
                                <td class="urgency-${item.urgency}">${item.urgency}</td>
                                <td>${item.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <script>
            // Auto-refresh dashboard every 30 seconds
            setTimeout(() => location.reload(), 30000);
        </script>
    </body>
    </html>
  `;
}

// Get inquiries with filtering
async function getInquiries(searchParams, env) {
  const status = searchParams.get('status') || 'all';
  const urgency = searchParams.get('urgency') || 'all';
  const limit = parseInt(searchParams.get('limit')) || 50;
  const offset = parseInt(searchParams.get('offset')) || 0;
  
  let query = 'SELECT * FROM inquiries';
  let conditions = [];
  let params = [];
  
  if (status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }
  
  if (urgency !== 'all') {
    conditions.push('urgency = ?');
    params.push(urgency);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  try {
    const result = await env.DB.prepare(query).bind(...params).all();
    return new Response(JSON.stringify({
      success: true,
      data: result.results || [],
      meta: {
        limit,
        offset,
        count: result.results?.length || 0
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

// Get single inquiry
async function getInquiry(inquiryId, env) {
  if (!inquiryId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Inquiry ID required'
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  
  try {
    const inquiry = await env.DB.prepare('SELECT * FROM inquiries WHERE id = ?').bind(inquiryId).first();
    const followUps = await env.DB.prepare('SELECT * FROM follow_ups WHERE inquiryId = ? ORDER BY createdAt DESC').bind(inquiryId).all();
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        inquiry,
        followUps: followUps.results || []
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

// Update inquiry
async function updateInquiry(data, env) {
  const { id, status, assignedTo, notes, consultationDate, caseValue } = data;
  
  if (!id) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Inquiry ID required'
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  
  try {
    const updateFields = [];
    const params = [];
    
    if (status) {
      updateFields.push('status = ?');
      params.push(status);
    }
    
    if (assignedTo) {
      updateFields.push('assignedTo = ?');
      params.push(assignedTo);
    }
    
    if (notes) {
      updateFields.push('notes = ?');
      params.push(notes);
    }
    
    if (consultationDate) {
      updateFields.push('consultationDate = ?');
      params.push(consultationDate);
    }
    
    if (caseValue) {
      updateFields.push('caseValue = ?');
      params.push(caseValue);
    }
    
    updateFields.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(id);
    
    const query = `UPDATE inquiries SET ${updateFields.join(', ')} WHERE id = ?`;
    await env.DB.prepare(query).bind(...params).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Inquiry updated successfully'
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

// Create follow-up
async function createFollowUp(data, env) {
  const { inquiryId, type, method, subject, content, scheduledFor, priority, createdBy } = data;
  
  if (!inquiryId || !type || !content) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Required fields: inquiryId, type, content'
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  
  try {
    await env.DB.prepare(`
      INSERT INTO follow_ups (inquiryId, type, method, subject, content, scheduledFor, priority, createdBy, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      inquiryId, type, method, subject, content, scheduledFor, priority || 'normal', createdBy, new Date().toISOString()
    ).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Follow-up created successfully'
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

// Get attorneys
async function getAttorneys(env) {
  try {
    const result = await env.DB.prepare('SELECT * FROM attorneys WHERE isActive = TRUE ORDER BY name').all();
    return new Response(JSON.stringify({
      success: true,
      data: result.results || []
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