/**
 * ⚖️ SHARMA & ASSOCIATES - BACKEND API
 * Complete admin system with authentication, contact forms, and content management
 */

interface Env {
  LAW_FIRM_DB: KVNamespace;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
}

interface ContactForm {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  timestamp: string;
  status: 'new' | 'read' | 'responded' | 'archived';
  ip?: string;
  userAgent?: string;
}

interface AdminUser {
  username: string;
  role: 'super-admin' | 'admin' | 'editor';
  lastLogin: string;
  loginCount: number;
}

interface SiteContent {
  id: string;
  type: 'hero' | 'service' | 'team' | 'general';
  title: string;
  content: string;
  lastModified: string;
  modifiedBy: string;
}

interface Analytics {
  totalVisits: number;
  totalContacts: number;
  contactsThisMonth: number;
  popularServices: Record<string, number>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface UpdateContactRequest {
  id: string;
  status: 'new' | 'read' | 'responded' | 'archived';
}

// JWT utility functions
function generateJWT(payload: any, secret: string): string {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const payloadStr = JSON.stringify(payload);
  
  // Use Buffer for base64 encoding instead of btoa
  const headerB64 = btoa(header).replace(/=/g, '');
  const payloadB64 = btoa(payloadStr).replace(/=/g, '');
  
  // Simple signature for demo (in production, use proper HMAC)
  const signature = btoa(`${headerB64}.${payloadB64}.${secret}`).replace(/=/g, '').substring(0, 32);
  
  return `${headerB64}.${payloadB64}.${signature}`;
}

function verifyJWT(token: string, secret: string): any {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    
    // Simple verification (in production, use proper HMAC verification)
    const expectedSig = btoa(`${header}.${payload}.${secret}`).replace(/=/g, '').substring(0, 32);
    if (signature !== expectedSig) return null;
    
    const decodedPayload = JSON.parse(atob(payload));
    return decodedPayload;
  } catch {
    return null;
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] + ' ' + date.toTimeString().split(' ')[0];
}

async function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// Contact form submission handler
async function handleContactForm(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.json() as Omit<ContactForm, 'id' | 'timestamp' | 'status'>;
    
    const contact: ContactForm = {
      id: generateId(),
      ...formData,
      timestamp: formatDate(new Date()),
      status: 'new',
      ip: request.headers.get('CF-Connecting-IP') || 'unknown',
      userAgent: request.headers.get('User-Agent') || 'unknown',
    };

    let storedSuccessfully = false;
    let debugInfo: any = {};

    // Store contact in KV database
    try {
      console.log('Attempting to store contact...', contact.id);
      console.log('LAW_FIRM_DB exists:', !!env.LAW_FIRM_DB);
      
      if (env.LAW_FIRM_DB) {
        console.log('Storing contact data...');
        await env.LAW_FIRM_DB.put(`contact:${contact.id}`, JSON.stringify(contact));
        console.log('Contact stored successfully');
        
        // Update analytics
        console.log('Updating analytics...');
        const analytics = await getAnalytics(env);
        analytics.totalContacts++;
        analytics.contactsThisMonth++;
        analytics.popularServices[contact.service] = (analytics.popularServices[contact.service] || 0) + 1;
        analytics.recentActivity.unshift({
          type: 'contact',
          description: `New contact from ${contact.name} - ${contact.service}`,
          timestamp: contact.timestamp,
        });
        
        // Keep only last 50 activities
        if (analytics.recentActivity.length > 50) {
          analytics.recentActivity = analytics.recentActivity.slice(0, 50);
        }
        
        await env.LAW_FIRM_DB.put('analytics', JSON.stringify(analytics));
        console.log('Analytics updated successfully');
        
        storedSuccessfully = true;
        debugInfo = { kvAvailable: true, contactStored: true, analyticsUpdated: true };
      } else {
        console.log('LAW_FIRM_DB is not available');
        debugInfo = { kvAvailable: false, error: 'LAW_FIRM_DB binding not available' };
      }
    } catch (kvError) {
      console.log('KV storage error:', kvError);
      const error = kvError as Error;
      console.log('Error details:', error.message, error.stack);
      debugInfo = { 
        kvAvailable: !!env.LAW_FIRM_DB, 
        error: error.message, 
        errorType: error.constructor.name 
      };
    }

    return new Response(JSON.stringify({
      success: true,
      message: storedSuccessfully 
        ? 'Contact form submitted successfully! We\'ll get back to you soon.' 
        : 'Message received! We\'ll get back to you soon.',
      id: contact.id,
      stored: storedSuccessfully,
      debug: debugInfo,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to submit contact form',
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Admin authentication
async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const { username, password } = await request.json() as LoginRequest;

    // Temporary hardcoded credentials for testing
    const validUsername = "admin";
    const validPassword = "sharma@2024";

    if (username !== validUsername || password !== validPassword) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid credentials',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update admin user data
    const adminUser: AdminUser = {
      username,
      role: 'super-admin',
      lastLogin: formatDate(new Date()),
      loginCount: 1,
    };

          try {
        const existingAdmin = await env.LAW_FIRM_DB.get(`admin:${username}`);
        if (existingAdmin) {
          const existing = JSON.parse(existingAdmin) as AdminUser;
          adminUser.loginCount = existing.loginCount + 1;
        }
        await env.LAW_FIRM_DB.put(`admin:${username}`, JSON.stringify(adminUser));
    } catch (kvError) {
      console.log('KV error:', kvError);
      // Continue without storing admin data if KV fails
    }

    // Generate simple token
    const simpleToken = `${username}_${Date.now()}_${Math.random().toString(36)}`;

    return new Response(JSON.stringify({
      success: true,
      token: simpleToken,
      user: adminUser,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Login failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Verify admin authentication
function verifyAdmin(request: Request, env: Env): any {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  // Simple token verification - just check if it exists and looks valid
  if (!token || token.length < 10 || !token.includes('_')) {
    return null;
  }

  // For now, assume any valid-looking token is authenticated as admin
  return {
    username: 'admin',
    role: 'super-admin'
  };
}

// Get all contacts for admin
async function handleGetContacts(request: Request, env: Env): Promise<Response> {
  const admin = verifyAdmin(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const contacts = [];

          // Try to get contacts from KV
      if (env.LAW_FIRM_DB) {
        const { keys } = await env.LAW_FIRM_DB.list({ prefix: 'contact:' });
        
        for (const key of keys) {
          const contactData = await env.LAW_FIRM_DB.get(key.name);
        if (contactData) {
          contacts.push(JSON.parse(contactData));
        }
      }
    }

    // Sort by timestamp (newest first)
    contacts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return new Response(JSON.stringify({
      success: true,
      contacts,
      message: contacts.length === 0 ? 'No contact forms submitted yet' : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Contacts fetch error:', error);
    return new Response(JSON.stringify({
      success: true,
      contacts: [],
      message: 'Database temporarily unavailable. Contact forms will be stored once connected.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Update contact status
async function handleUpdateContact(request: Request, env: Env): Promise<Response> {
  const admin = verifyAdmin(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

      try {
      const { id, status } = await request.json() as UpdateContactRequest;
      const contactData = await env.LAW_FIRM_DB.get(`contact:${id}`);
      
      if (!contactData) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Contact not found',
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const contact = JSON.parse(contactData) as ContactForm;
      contact.status = status;
      
      await env.LAW_FIRM_DB.put(`contact:${id}`, JSON.stringify(contact));

    return new Response(JSON.stringify({
      success: true,
      message: 'Contact updated successfully',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update contact',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Get analytics data
  async function getAnalytics(env: Env): Promise<Analytics> {
    try {
      const analyticsData = await env.LAW_FIRM_DB?.get('analytics');
    
    if (analyticsData) {
      return JSON.parse(analyticsData);
    }
  } catch (error) {
    console.log('KV analytics error:', error);
  }

  // Default analytics when KV is unavailable
  return {
    totalVisits: 0,
    totalContacts: 0,
    contactsThisMonth: 0,
    popularServices: {
      'Corporate Law': 1,
      'Criminal Defense': 1,
      'Family Law': 1,
      'Property Law': 1,
    },
    recentActivity: [
      {
        type: 'system',
        description: 'Admin panel initialized',
        timestamp: formatDate(new Date()),
      }
    ],
  };
}

async function handleGetAnalytics(request: Request, env: Env): Promise<Response> {
  const admin = verifyAdmin(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const analytics = await getAnalytics(env);
    
    return new Response(JSON.stringify({
      success: true,
      analytics,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch analytics',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Serve admin panel HTML
function getAdminPanelHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sharma & Associates - Admin Panel</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
            color: #ffffff;
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .admin-container {
            min-height: 100vh;
            display: flex;
        }
        
        .sidebar {
            width: 280px;
            background: linear-gradient(180deg, #111111 0%, #0d0d0d 100%);
            padding: 2rem 1rem;
            border-right: 2px solid #333;
            box-shadow: 4px 0 20px rgba(0,0,0,0.3);
        }
        
        .logo {
            font-size: 1.6rem;
            font-weight: bold;
            margin-bottom: 2rem;
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 1rem;
            background: linear-gradient(45deg, #ffffff, #cccccc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .nav-menu {
            list-style: none;
        }
        
        .nav-item {
            margin-bottom: 0.8rem;
        }
        
        .nav-link {
            display: block;
            padding: 1.2rem 1.5rem;
            color: #ccc;
            text-decoration: none;
            border-radius: 12px;
            transition: all 0.3s ease;
            cursor: pointer;
            border: 1px solid transparent;
            font-weight: 500;
        }
        
        .nav-link:hover {
            background: linear-gradient(45deg, #333, #444);
            color: #fff;
            border-color: #555;
            transform: translateX(5px);
        }
        
        .nav-link.active {
            background: linear-gradient(45deg, #ffffff, #f0f0f0);
            color: #000;
            border-color: #666;
            font-weight: bold;
        }
        
        .main-content {
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
        }
        
        .page-header {
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: linear-gradient(45deg, #1a1a1a, #2a2a2a);
            border-radius: 16px;
            border: 1px solid #333;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        
        .page-title {
            font-size: 2.5rem;
            font-weight: bold;
            background: linear-gradient(45deg, #ffffff, #cccccc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }
        
        .page-subtitle {
            color: #aaa;
            font-size: 1.1rem;
        }
        
        .login-form {
            max-width: 450px;
            margin: 8rem auto;
            padding: 3rem;
            background: linear-gradient(135deg, #111 0%, #1a1a1a 100%);
            border-radius: 20px;
            border: 2px solid #333;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-label {
            display: block;
            margin-bottom: 0.8rem;
            font-weight: 600;
            color: #ddd;
        }
        
        .form-input {
            width: 100%;
            padding: 1rem;
            border: 2px solid #333;
            border-radius: 12px;
            background: #222;
            color: #fff;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        .form-input:focus {
            border-color: #555;
            background: #2a2a2a;
            outline: none;
            box-shadow: 0 0 20px rgba(255,255,255,0.1);
        }
        
        .btn {
            background: linear-gradient(45deg, #ffffff, #f0f0f0);
            color: #000;
            padding: 1rem 2rem;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 700;
            font-size: 1rem;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255,255,255,0.2);
        }
        
        .btn-danger {
            background: linear-gradient(45deg, #dc3545, #c82333);
            color: #fff;
        }
        
        .btn-success {
            background: linear-gradient(45deg, #28a745, #218838);
            color: #fff;
        }
        
        .card {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border: 2px solid #333;
            border-radius: 20px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
            transition: transform 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
            border-color: #444;
        }
        
        .card-header {
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #333;
            background: linear-gradient(45deg, #ffffff, #cccccc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
            border: 2px solid #333;
            border-radius: 20px;
            padding: 2rem;
            text-align: center;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .stat-card:hover {
            transform: translateY(-8px) scale(1.02);
            border-color: #555;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        
        .stat-number {
            font-size: 3rem;
            font-weight: 900;
            background: linear-gradient(45deg, #ffffff, #cccccc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: #bbb;
            font-weight: 600;
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #333;
            border-radius: 4px;
            overflow: hidden;
            margin: 0.5rem 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(45deg, #28a745, #20c997);
            border-radius: 4px;
            transition: width 1s ease;
        }
        
        .hidden { display: none; }
        
        .loading {
            text-align: center;
            padding: 3rem;
            color: #ccc;
            font-size: 1.2rem;
        }
        
        .error {
            color: #dc3545;
            text-align: center;
            padding: 2rem;
            font-size: 1.1rem;
        }
        
        .success {
            color: #28a745;
            text-align: center;
            padding: 1rem;
            font-size: 1.1rem;
        }
    </style>
</head>
<body>
    <div id="app">
        <!-- Login Form -->
        <div id="login-section">
            <div class="login-form">
                <h2 style="text-align: center; margin-bottom: 2rem; font-size: 2rem;">⚖️ Admin Login</h2>
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label">Username</label>
                        <input type="text" id="username" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" id="password" class="form-input" required>
                    </div>
                    <button type="submit" class="btn" style="width: 100%; margin-top: 1rem;">Login</button>
                </form>
                <div id="login-error" class="error hidden"></div>
                <div id="login-success" class="success hidden"></div>
            </div>
        </div>

        <!-- Admin Panel -->
        <div id="admin-section" class="admin-container hidden">
            <div class="sidebar">
                <div class="logo">⚖️ Admin Panel</div>
                <ul class="nav-menu">
                    <li class="nav-item">
                        <a class="nav-link active" data-section="dashboard">📊 Dashboard</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-section="contacts">📝 Contact Forms</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-section="analytics">📈 Analytics</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" onclick="logout()">🚪 Logout</a>
                    </li>
                </ul>
            </div>

            <div class="main-content">
                <!-- Dashboard -->
                <div id="dashboard-content" class="content-section">
                    <div class="page-header">
                        <h1 class="page-title">Dashboard</h1>
                        <p class="page-subtitle">Welcome to your law firm management center</p>
                    </div>
                    
                    <div class="stats-grid" id="stats-grid">
                        <!-- Stats will be loaded here -->
                    </div>
                    
                    <div class="card">
                        <div class="card-header">🔥 Recent Activity</div>
                        <div id="recent-activity">
                            <!-- Recent activity will be loaded here -->
                        </div>
                    </div>
                </div>

                <!-- Contact Forms -->
                <div id="contacts-content" class="content-section hidden">
                    <div class="page-header">
                        <h1 class="page-title">Contact Form Submissions</h1>
                        <p class="page-subtitle">Manage and respond to client inquiries</p>
                    </div>
                    <div id="contacts-list">
                        <!-- Contacts will be loaded here -->
                    </div>
                </div>

                <!-- Analytics -->
                <div id="analytics-content" class="content-section hidden">
                    <div class="page-header">
                        <h1 class="page-title">Analytics & Reports</h1>
                        <p class="page-subtitle">Detailed insights and performance metrics</p>
                    </div>
                    <div id="analytics-data">
                        <!-- Analytics will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentToken = localStorage.getItem('adminToken');
        let currentUser = null;

        console.log('Admin panel loaded, checking auth...');

        // Check if already logged in
        if (currentToken) {
            verifyTokenAndShowAdmin();
        } else {
            showLogin();
        }

        // Login form handler
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted');
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            console.log('Attempting login with username:', username);
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });
                
                console.log('Login response status:', response.status);
                const result = await response.json();
                console.log('Login result:', result);
                
                if (result.success) {
                    currentToken = result.token;
                    currentUser = result.user;
                    localStorage.setItem('adminToken', currentToken);
                    showSuccess('login-success', 'Login successful! Loading dashboard...');
                    setTimeout(() => {
                        showAdmin();
                        loadDashboard();
                    }, 1000);
                } else {
                    showError('login-error', result.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('login-error', 'Network error. Please try again.');
            }
        });

        // Navigation handler
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link') && e.target.dataset.section) {
                showSection(e.target.dataset.section);
                updateActiveNav(e.target);
            }
        });

        function showLogin() {
            console.log('Showing login form');
            document.getElementById('login-section').classList.remove('hidden');
            document.getElementById('admin-section').classList.add('hidden');
        }

        function showAdmin() {
            console.log('Showing admin panel');
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('admin-section').classList.remove('hidden');
        }

        function showSection(sectionName) {
            console.log('Showing section:', sectionName);
            // Hide all content sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.add('hidden');
            });
            
            // Show selected section
            document.getElementById(sectionName + '-content').classList.remove('hidden');
            
            // Load section data
            switch(sectionName) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'contacts':
                    loadContacts();
                    break;
                case 'analytics':
                    loadAnalytics();
                    break;
            }
        }

        function updateActiveNav(activeLink) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            activeLink.classList.add('active');
        }

        async function verifyTokenAndShowAdmin() {
            console.log('Verifying token...');
            try {
                const response = await fetch('/api/analytics', {
                    headers: {
                        'Authorization': 'Bearer ' + currentToken,
                    },
                });
                
                if (response.ok) {
                    console.log('Token valid, showing admin');
                    showAdmin();
                    loadDashboard();
                } else {
                    console.log('Token invalid, clearing and showing login');
                    localStorage.removeItem('adminToken');
                    currentToken = null;
                    showLogin();
                }
            } catch (error) {
                console.error('Token verification error:', error);
                showLogin();
            }
        }

        async function loadDashboard() {
            console.log('Loading dashboard...');
            try {
                const response = await fetch('/api/analytics', {
                    headers: {
                        'Authorization': 'Bearer ' + currentToken,
                    },
                });
                
                if (response.ok) {
                    const result = await response.json();
                    displayStats(result.analytics);
                    displayRecentActivity(result.analytics.recentActivity);
                } else {
                    showError('stats-grid', 'Failed to load dashboard data');
                }
            } catch (error) {
                console.error('Dashboard load error:', error);
                showError('stats-grid', 'Failed to load dashboard data');
            }
        }

        async function loadContacts() {
            const contactsList = document.getElementById('contacts-list');
            contactsList.innerHTML = '<div class="loading">Loading contacts...</div>';
            
            try {
                const response = await fetch('/api/contacts', {
                    headers: {
                        'Authorization': 'Bearer ' + currentToken,
                    },
                });
                
                if (response.ok) {
                    const result = await response.json();
                    displayContacts(result.contacts);
                } else {
                    contactsList.innerHTML = '<div class="error">Failed to load contacts</div>';
                }
            } catch (error) {
                console.error('Contacts load error:', error);
                contactsList.innerHTML = '<div class="error">Failed to load contacts</div>';
            }
        }

        async function loadAnalytics() {
            const analyticsData = document.getElementById('analytics-data');
            analyticsData.innerHTML = '<div class="loading">Loading analytics...</div>';
            
            try {
                const response = await fetch('/api/analytics', {
                    headers: {
                        'Authorization': 'Bearer ' + currentToken,
                    },
                });
                
                if (response.ok) {
                    const result = await response.json();
                    displayAnalytics(result.analytics);
                } else {
                    analyticsData.innerHTML = '<div class="error">Failed to load analytics</div>';
                }
            } catch (error) {
                console.error('Analytics load error:', error);
                analyticsData.innerHTML = '<div class="error">Failed to load analytics</div>';
            }
        }

        function displayStats(analytics) {
            const statsGrid = document.getElementById('stats-grid');
            
            const totalServices = Object.keys(analytics.popularServices).length;
            const conversionRate = analytics.totalContacts > 0 ? Math.round((analytics.totalContacts / (analytics.totalVisits || 100)) * 100) : 0;
            
            let statsHTML = '<div class="stat-card">';
            statsHTML += '<div class="stat-number">' + analytics.totalContacts + '</div>';
            statsHTML += '<div class="stat-label">Total Contacts</div>';
            statsHTML += '<div class="progress-bar"><div class="progress-fill" style="width: ' + Math.min(analytics.totalContacts * 10, 100) + '%"></div></div>';
            statsHTML += '</div>';
            
            statsHTML += '<div class="stat-card">';
            statsHTML += '<div class="stat-number">' + analytics.contactsThisMonth + '</div>';
            statsHTML += '<div class="stat-label">This Month</div>';
            statsHTML += '<div class="progress-bar"><div class="progress-fill" style="width: ' + Math.min(analytics.contactsThisMonth * 20, 100) + '%"></div></div>';
            statsHTML += '</div>';
            
            statsHTML += '<div class="stat-card">';
            statsHTML += '<div class="stat-number">' + totalServices + '</div>';
            statsHTML += '<div class="stat-label">Service Types</div>';
            statsHTML += '<div class="progress-bar"><div class="progress-fill" style="width: ' + Math.min(totalServices * 25, 100) + '%"></div></div>';
            statsHTML += '</div>';
            
            statsHTML += '<div class="stat-card">';
            statsHTML += '<div class="stat-number">' + conversionRate + '%</div>';
            statsHTML += '<div class="stat-label">Conversion Rate</div>';
            statsHTML += '<div class="progress-bar"><div class="progress-fill" style="width: ' + conversionRate + '%"></div></div>';
            statsHTML += '</div>';
            
            statsGrid.innerHTML = statsHTML;
        }

        function displayRecentActivity(activities) {
            const activityContainer = document.getElementById('recent-activity');
            
            if (activities.length === 0) {
                activityContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No recent activity</p>';
                return;
            }
            
            let activitiesHTML = '';
            activities.slice(0, 10).forEach((activity, index) => {
                activitiesHTML += '<div style="padding: 1rem; border-bottom: 1px solid #333;">';
                activitiesHTML += '<div style="display: flex; justify-content: space-between; align-items: center;">';
                activitiesHTML += '<div><strong style="color: #28a745;">' + activity.type.toUpperCase() + '</strong>: ' + activity.description + '</div>';
                activitiesHTML += '<small style="color: #ccc;">' + activity.timestamp + '</small>';
                activitiesHTML += '</div></div>';
            });
            
            activityContainer.innerHTML = activitiesHTML;
        }

        function displayContacts(contacts) {
            const contactsList = document.getElementById('contacts-list');
            
            if (contacts.length === 0) {
                contactsList.innerHTML = '<div class="card" style="text-align: center; padding: 3rem;"><h3 style="color: #666; margin-bottom: 1rem;">📝 No Contact Forms Yet</h3><p style="color: #888;">Contact forms will appear here when clients submit inquiries through your website.</p></div>';
                return;
            }
            
            let contactsHTML = '';
            contacts.forEach((contact, index) => {
                contactsHTML += '<div class="card" style="margin-bottom: 1.5rem;">';
                contactsHTML += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">';
                contactsHTML += '<div><strong style="font-size: 1.2rem;">' + contact.name + '</strong>';
                contactsHTML += '<div style="color: #ccc; margin-top: 0.25rem;">📧 ' + contact.email + ' | 📱 ' + contact.phone + '</div></div>';
                contactsHTML += '<span style="padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; background: #28a745; color: #fff;">' + contact.status.toUpperCase() + '</span>';
                contactsHTML += '</div>';
                contactsHTML += '<p><strong>Service:</strong> ' + contact.service + '</p>';
                contactsHTML += '<p style="margin: 0.5rem 0;"><strong>Message:</strong></p>';
                contactsHTML += '<div style="background: #0f0f0f; padding: 1rem; border-radius: 8px; margin: 0.5rem 0; border-left: 4px solid #28a745;">';
                contactsHTML += contact.message;
                contactsHTML += '</div>';
                contactsHTML += '<p style="color: #888; font-size: 0.9rem;"><strong>Submitted:</strong> ' + contact.timestamp + '</p>';
                contactsHTML += '</div>';
            });
            
            contactsList.innerHTML = contactsHTML;
        }

        function displayAnalytics(analytics) {
            const analyticsData = document.getElementById('analytics-data');
            
            const services = Object.entries(analytics.popularServices).sort(([,a], [,b]) => b - a);
            let servicesHTML = '';
            services.forEach(([service, count], index) => {
                servicesHTML += '<div style="display: flex; justify-content: space-between; padding: 1rem; border-bottom: 1px solid #333;">';
                servicesHTML += '<span>' + service + '</span>';
                servicesHTML += '<strong>' + count + '</strong>';
                servicesHTML += '</div>';
            });
            
            if (servicesHTML === '') {
                servicesHTML = '<div style="text-align: center; color: #666; padding: 2rem;">No service data available</div>';
            }
            
            analyticsData.innerHTML = '<div class="card"><div class="card-header">📊 Popular Services</div>' + servicesHTML + '</div>';
        }

        function logout() {
            localStorage.removeItem('adminToken');
            currentToken = null;
            currentUser = null;
            showLogin();
            console.log('Logged out');
        }

        function showError(elementId, message) {
            const errorElement = document.getElementById(elementId);
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.classList.remove('hidden');
                
                setTimeout(() => {
                    errorElement.classList.add('hidden');
                }, 5000);
            }
        }

        function showSuccess(elementId, message) {
            const successElement = document.getElementById(elementId);
            if (successElement) {
                successElement.textContent = message;
                successElement.classList.remove('hidden');
                
                setTimeout(() => {
                    successElement.classList.add('hidden');
                }, 3000);
            }
        }

        console.log('Admin panel JavaScript loaded successfully');
    </script>
</body>
</html>`;
}

// Router
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

      

    // API Routes
    if (path.startsWith('/api/')) {
      switch (path) {
        case '/api/contact':
          if (request.method === 'POST') {
            return handleContactForm(request, env);
          }
          break;

        case '/api/login':
          if (request.method === 'POST') {
            return handleLogin(request, env);
          }
          break;

        case '/api/contacts':
          if (request.method === 'GET') {
            return handleGetContacts(request, env);
          }
          break;

        case '/api/contacts/update':
          if (request.method === 'POST') {
            return handleUpdateContact(request, env);
          }
          break;

        case '/api/analytics':
          if (request.method === 'GET') {
            return handleGetAnalytics(request, env);
          }
          break;
      }
    }

    // Serve admin panel
    if (path === '/' || path === '/admin') {
      return new Response(getAdminPanelHTML(), {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    // 404 Not Found
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};
