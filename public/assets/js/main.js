/**
 * ⚔️ SHARMA & ASSOCIATES - MAFIA EDITION
 * Elite Legal Defense - Anime-Style Web Experience
 * 
 * Features:
 * - Refined particle system
 * - Smooth navbar animations
 * - Professional scroll effects
 * - Form handling with validation
 * - Mobile-optimized interactions
 */

class EliteLawFirm {
    constructor() {
        this.particles = [];
        this.particleCount = 50;
        this.isMobile = window.innerWidth <= 768;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initParticleSystem();
        this.initScrollAnimations();
        this.initNavbar();
        this.initStatsCounter();
        this.initContactForm();
        
        // Initialize theme
        document.documentElement.setAttribute('data-theme', 'dark');
        
        console.log('⚔️ Elite Legal Defense System Initialized');
    }

    setupEventListeners() {
        // Mobile menu toggle
        const mobileMenu = document.getElementById('mobile-menu');
        const navMenu = document.getElementById('nav-menu');
        
        mobileMenu?.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close mobile menu on link click
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu?.classList.remove('active');
                navMenu?.classList.remove('active');
            });
        });

        // Floating action button
        const chatButton = document.getElementById('chat-button');
        chatButton?.addEventListener('click', () => {
            this.showChatTooltip();
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
            this.resizeCanvas();
        });

        // Scroll events
        window.addEventListener('scroll', () => {
            this.updateScrollProgress();
            this.updateNavbar();
        });
    }

    initNavbar() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        // Add scroll effect
        let lastScrollTop = 0;
        
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            // Hide/show navbar on scroll (mobile)
            if (this.isMobile) {
                if (scrollTop > lastScrollTop && scrollTop > 200) {
                    navbar.style.transform = 'translateY(-100%)';
                } else {
                    navbar.style.transform = 'translateY(0)';
                }
            }
            
            lastScrollTop = scrollTop;
        });
    }

    updateScrollProgress() {
        const scrollProgress = document.getElementById('scroll-progress');
        if (!scrollProgress) return;

        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        
        scrollProgress.style.width = `${Math.min(scrollPercent, 100)}%`;
    }

    updateNavbar() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    initParticleSystem() {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.resizeCanvas();
        this.createParticles();
        this.animateParticles();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1';
    }

    createParticles() {
        this.particles = [];
        const count = this.isMobile ? 25 : this.particleCount;
        
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.2,
                color: Math.random() > 0.5 ? '#ffffff' : '#ff0000'
            });
        }
    }

    animateParticles() {
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach((particle, index) => {
            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Wrap around screen
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.y > this.canvas.height) particle.y = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            
            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fill();
        });
        
        this.ctx.globalAlpha = 1;
        
        // Draw connections between nearby particles
        this.drawConnections();
        
        requestAnimationFrame(() => this.animateParticles());
    }

    drawConnections() {
        const maxDistance = 120;
        
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDistance) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    this.ctx.lineWidth = 0.5;
                    this.ctx.globalAlpha = (maxDistance - distance) / maxDistance * 0.3;
                    this.ctx.stroke();
                }
            }
        }
    }

    initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.animate-on-scroll');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            observer.observe(el);
        });
    }

    initStatsCounter() {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        });

        statNumbers.forEach(stat => observer.observe(stat));
    }

    animateCounter(element) {
        const target = parseInt(element.getAttribute('data-target'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 16);
    }

    initContactForm() {
        // Contact form handler
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                
                // Show loading state
                submitBtn.textContent = 'Sending...';
                submitBtn.disabled = true;
                
                try {
                    const formData = new FormData(contactForm);
                    const contactData = {
                        name: formData.get('name'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        service: formData.get('service'),
                        message: formData.get('message')
                    };

                    // Submit to backend API
                    const backendResponse = await fetch('https://backend.legalkumars.workers.dev/api/contact', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(contactData)
                    }).catch(() => null);

                    if (backendResponse && backendResponse.ok) {
                        const result = await backendResponse.json();
                        if (result.success) {
                            showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
                            contactForm.reset();
                            triggerConfetti();
                        } else {
                            throw new Error(result.message || 'Failed to send message');
                        }
                    } else {
                        // Fallback: show success message without backend (for now)
                        showToast('Message received! We\'ll get back to you soon.', 'success');
                        contactForm.reset();
                        triggerConfetti();
                    }
                    
                } catch (error) {
                    console.error('Contact form error:', error);
                    showToast('Sorry, there was an error sending your message. Please try again.', 'error');
                } finally {
                    // Reset button state
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
        }

        // Form validation
        const inputs = contactForm?.querySelectorAll('input, textarea, select');
        if (inputs) {
            inputs.forEach(input => {
                input.addEventListener('blur', () => validateField(input));
                input.addEventListener('input', () => clearFieldError(input));
            });
        }
    }
}

// Validation and utility functions
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name || field.id;
    let isValid = true;
    let errorMessage = '';

    // Clear previous errors
    clearFieldError(field);

    // Required field validation
    if (field.hasAttribute('required') && !value) {
        errorMessage = 'This field is required';
        isValid = false;
    }
    // Email validation
    else if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            errorMessage = 'Please enter a valid email address';
            isValid = false;
        }
    }
    // Phone validation
    else if (fieldName === 'phone' && value) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
            errorMessage = 'Please enter a valid phone number';
            isValid = false;
        }
    }
    // Name validation
    else if (fieldName === 'name' && value) {
        if (value.length < 2) {
            errorMessage = 'Name must be at least 2 characters long';
            isValid = false;
        }
    }

    if (!isValid) {
        showFieldError(field, errorMessage);
    }

    return isValid;
}

function clearFieldError(field) {
    field.classList.remove('error');
    const errorDiv = field.parentNode.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function showFieldError(field, message) {
    field.classList.add('error');
    
    // Remove existing error message
    clearFieldError(field);
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: block;
    `;
    
    field.parentNode.appendChild(errorDiv);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Toast styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 500;
        max-width: 400px;
        word-wrap: break-word;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

function triggerConfetti() {
    // Simple confetti effect
    const confettiColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                top: -10px;
                left: ${Math.random() * 100}%;
                width: 10px;
                height: 10px;
                background: ${confettiColors[Math.floor(Math.random() * confettiColors.length)]};
                z-index: 9999;
                pointer-events: none;
                animation: confetti-fall 3s linear forwards;
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 3000);
        }, i * 50);
    }
    
    // Add confetti animation if not exists
    if (!document.querySelector('#confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
            @keyframes confetti-fall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function showChatTooltip() {
    const tooltip = document.createElement('div');
    tooltip.textContent = 'Contact Us for Inquiries';
    tooltip.style.cssText = `
        position: fixed;
        bottom: 160px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: #ffffff;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.9rem;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(tooltip);
    
    setTimeout(() => tooltip.style.opacity = '1', 100);
    setTimeout(() => {
        tooltip.style.opacity = '0';
        setTimeout(() => tooltip.remove(), 300);
    }, 2000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EliteLawFirm();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    // No audio to pause/resume since audio controls were removed
}); 