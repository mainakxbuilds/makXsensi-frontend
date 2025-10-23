// API Configuration
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'  // Local development
    : 'https://makxsensi-api.onrender.com';  // Production backend URL on Render

// Mobile Navigation Toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle?.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
});

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Close mobile menu if open
            navMenu?.classList.remove('active');
        }
    });
});

// Counter Animation
const counters = document.querySelectorAll('.stat-number');
const speed = 200;

const startCounting = (counter) => {
    const target = +counter.getAttribute('data-count');
    const count = +counter.innerText;
    const increment = target / speed;
    
    if (count < target) {
        counter.innerText = Math.ceil(count + increment);
        setTimeout(() => startCounting(counter), 10);
    } else {
        counter.innerText = target;
    }
};

// Intersection Observer for counter animation
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
};

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            startCounting(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

counters.forEach(counter => {
    counterObserver.observe(counter);
});

// Scroll Effects for Navbar
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll <= 0) {
        navbar.classList.remove('scroll-up');
        return;
    }
    
    if (currentScroll > lastScroll && !navbar.classList.contains('scroll-down')) {
        navbar.classList.remove('scroll-up');
        navbar.classList.add('scroll-down');
    } else if (currentScroll < lastScroll && navbar.classList.contains('scroll-down')) {
        navbar.classList.remove('scroll-down');
        navbar.classList.add('scroll-up');
    }
    
    lastScroll = currentScroll;
});

// Add styles for navbar scroll
const style = document.createElement('style');
style.textContent = `
    .navbar.scroll-down {
        transform: translateY(-100%);
    }
    .navbar.scroll-up {
        transform: translateY(0);
        background: rgba(10, 14, 39, 0.98);
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
    }
`;
document.head.appendChild(style);

// Particle Animation
function createParticle() {
    const particleContainer = document.querySelector('.particle-container');
    if (!particleContainer) return;
    
    const particle = document.createElement('div');
    particle.className = 'floating-particle';
    particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: ${Math.random() > 0.5 ? '#ff6b35' : '#4cc9f0'};
        border-radius: 50%;
        pointer-events: none;
        opacity: 0.6;
        animation: floatUp 4s linear;
        left: ${Math.random() * window.innerWidth}px;
        top: ${window.innerHeight}px;
    `;
    
    particleContainer.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
    }, 4000);
}

// Create particles periodically
setInterval(createParticle, 300);

// Add floating animation
const particleStyle = document.createElement('style');
particleStyle.textContent = `
    @keyframes floatUp {
        to {
            transform: translateY(-${window.innerHeight + 100}px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(particleStyle);

// Buy Pack Function - Main payment handler
async function buyPack(packName, amount) {
    try {
        // Get the button that was clicked
        const button = event.currentTarget || event.target;
        const originalContent = button.innerHTML;
        
        // Show loading state
        button.innerHTML = '<span class="loading"></span> Processing...';
        button.disabled = true;

        console.log('Creating order for:', packName, 'Amount:', amount);

        // Create order on backend
        const response = await fetch(`${API_URL}/api/payment/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                packName: packName
            })
        });

        // Check if response is ok
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const order = await response.json();
        console.log('Order created:', order);

        if (!order.success) {
            throw new Error(order.message || 'Failed to create order');
        }

        // Razorpay options
        const options = {
            key: order.key, // Key now comes from backend
            amount: order.amount,
            currency: order.currency,
            name: 'MakXsensi',
            description: packName,
            image: '/assets/images/logo.png', // Add your logo path
            order_id: order.id,
            handler: async function (response) {
                console.log('Payment successful, verifying...', response);
                
                try {
                    // Verify payment on backend
                    const verifyResponse = await fetch(`${API_URL}/api/payment/verify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            packName: packName,
                            amount: amount,
                            customerEmail: response.email || '',
                            customerPhone: response.contact || '',
                            customerName: response.name || ''
                        })
                    });

                    const verifyResult = await verifyResponse.json();
                    console.log('Verification result:', verifyResult);

                    if (verifyResult.success) {
                        showSuccessModal(packName, amount, verifyResult.orderId);
                    } else {
                        showErrorModal('Payment verification failed. Please contact support.');
                    }
                } catch (error) {
                    console.error('Verification error:', error);
                    showErrorModal('Payment verification failed. Please contact support with your payment ID.');
                } finally {
                    // Reset button state
                    button.innerHTML = originalContent;
                    button.disabled = false;
                }
            },
            prefill: {
                name: '',
                email: '',
                contact: ''
            },
            notes: {
                packName: packName
            },
            theme: {
                color: '#ff6b35',
                backdrop_color: 'rgba(255, 107, 53, 0.1)'
            },
            modal: {
                ondismiss: function() {
                    console.log('Payment cancelled by user');
                    button.innerHTML = originalContent;
                    button.disabled = false;
                },
                confirm_close: true,
                escape: false,
                animation: true,
                backdropclose: false
            },
            retry: {
                enabled: true,
                max_count: 3
            },
            timeout: 300, // 5 minutes
            remember_customer: true
        };

        // Check if Razorpay is loaded
        if (typeof Razorpay === 'undefined') {
            throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.');
        }

        const rzp = new Razorpay(options);
        
        // Handle payment failures
        rzp.on('payment.failed', function (response) {
            console.error('Payment failed:', response.error);
            
            let errorMessage = 'Payment failed. ';
            if (response.error.code === 'BAD_REQUEST_ERROR') {
                errorMessage += response.error.description || 'Please try again.';
            } else if (response.error.code === 'GATEWAY_ERROR') {
                errorMessage += 'Bank gateway error. Please try again later.';
            } else {
                errorMessage += response.error.description || 'Please try again or contact support.';
            }
            
            showErrorModal(errorMessage);
            button.innerHTML = originalContent;
            button.disabled = false;
        });

        // Open Razorpay checkout
        rzp.open();

    } catch (error) {
        console.error('Error in buyPack:', error);
        
        let errorMessage = 'Something went wrong. ';
        if (error.message.includes('fetch')) {
            errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
        } else if (error.message.includes('Razorpay')) {
            errorMessage = error.message;
        } else {
            errorMessage += error.message || 'Please try again later.';
        }
        
        showErrorModal(errorMessage);
        
        // Reset button state
        if (event.currentTarget || event.target) {
            const btn = event.currentTarget || event.target;
            btn.innerHTML = '<span>Buy Now</span><i class="fas fa-arrow-right"></i>';
            btn.disabled = false;
        }
    }
}

// Success Modal
function showSuccessModal(packName, amount, orderId) {
    // Remove existing modal if any
    const existingModal = document.getElementById('successModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create new modal
    const modalHTML = `
        <div id="successModal" class="modal" style="display: block;">
            <div class="modal-content success-modal">
                <span class="close-modal">&times;</span>
                <i class="fas fa-check-circle success-icon"></i>
                <h2>Payment Successful!</h2>
                <p class="success-message">Thank you for purchasing <strong>${packName}</strong></p>
                <p class="order-details">Order ID: <code>${orderId || 'N/A'}</code></p>
                <p class="amount-paid">Amount Paid: ₹${amount}</p>
                <p class="delivery-info">Check your email for the sensitivity settings and setup instructions.</p>
                <button class="btn-primary modal-btn" onclick="closeModal('successModal')">Awesome!</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Setup close handlers
    setupModalClosers('successModal');

    // Auto close after 10 seconds
    setTimeout(() => {
        closeModal('successModal');
    }, 10000);
}

// Error Modal
function showErrorModal(message) {
    // Remove existing modal if any
    const existingModal = document.getElementById('errorModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create new modal
    const modalHTML = `
        <div id="errorModal" class="modal" style="display: block;">
            <div class="modal-content error-modal">
                <span class="close-modal">&times;</span>
                <i class="fas fa-exclamation-circle error-icon"></i>
                <h2>Oops! Something went wrong</h2>
                <p class="error-message">${message}</p>
                <p class="support-info">Need help? Contact us at <strong>support@makxsensi.com</strong></p>
                <button class="btn-primary modal-btn" onclick="closeModal('errorModal')">Try Again</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Setup close handlers
    setupModalClosers('errorModal');
}

// Setup modal close handlers
function setupModalClosers(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Close on X click
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => closeModal(modalId);
    }

    // Close on outside click
    modal.onclick = (event) => {
        if (event.target === modal) {
            closeModal(modalId);
        }
    };

    // Close on ESC key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeModal(modalId);
            document.removeEventListener('keydown', escHandler);
        }
    });
}

// Close modal function
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        setTimeout(() => modal.remove(), 300);
    }
}

// Card Hover Effects
document.querySelectorAll('.pack-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });

    card.addEventListener('mouseleave', () => {
        card.style.setProperty('--mouse-x', '50%');
        card.style.setProperty('--mouse-y', '50%');
    });
});

// Add dynamic card hover effect styles
const cardStyle = document.createElement('style');
cardStyle.textContent = `
    .pack-card {
        position: relative;
        overflow: hidden;
    }
    
    .pack-card::after {
        content: '';
        position: absolute;
        top: var(--mouse-y, 50%);
        left: var(--mouse-x, 50%);
        transform: translate(-50%, -50%);
        width: 0;
        height: 0;
        background: radial-gradient(circle, rgba(76, 201, 240, 0.15), transparent);
        border-radius: 50%;
        pointer-events: none;
        transition: width 0.5s ease, height 0.5s ease;
    }
    
    .pack-card:hover::after {
        width: 300px;
        height: 300px;
    }

    .modal {
        animation: fadeIn 0.3s ease;
    }
    
    .modal-content {
        animation: slideIn 0.3s ease;
    }
    
    .success-modal {
        border: 2px solid #4caf50;
    }
    
    .error-modal {
        border: 2px solid #f44336;
    }
    
    .success-icon {
        font-size: 4rem;
        color: #4caf50;
        margin-bottom: 1rem;
        animation: scaleIn 0.5s ease;
    }
    
    .error-icon {
        font-size: 4rem;
        color: #f44336;
        margin-bottom: 1rem;
        animation: shake 0.5s ease;
    }
    
    .modal-btn {
        margin-top: 1rem;
        cursor: pointer;
        border: none;
        padding: 0.8rem 2rem;
        border-radius: 25px;
        font-size: 1rem;
        transition: all 0.3s ease;
    }
    
    .modal-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(255, 107, 53, 0.3);
    }
    
    .order-details {
        margin: 1rem 0;
        padding: 0.5rem;
        background: rgba(76, 201, 240, 0.1);
        border-radius: 5px;
        font-family: monospace;
    }
    
    .amount-paid {
        font-size: 1.2rem;
        color: #4caf50;
        font-weight: bold;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideIn {
        from { 
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
        }
        to { 
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
    }
    
    @keyframes scaleIn {
        from { transform: scale(0); }
        to { transform: scale(1); }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(cardStyle);

// Initialize AOS-like animations
const animateOnScroll = () => {
    const elements = document.querySelectorAll('[data-aos]');
    
    elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;
        
        if (isVisible && !element.classList.contains('aos-animate')) {
            element.classList.add('aos-animate');
        }
    });
};

// Add AOS styles
const aosStyle = document.createElement('style');
aosStyle.textContent = `
    [data-aos] {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    [data-aos].aos-animate {
        opacity: 1;
        transform: translateY(0);
    }
    
    [data-aos-delay="100"] {
        transition-delay: 0.1s;
    }
    
    [data-aos-delay="200"] {
        transition-delay: 0.2s;
    }
    
    [data-aos-delay="300"] {
        transition-delay: 0.3s;
    }
`;
document.head.appendChild(aosStyle);

// Run animations on scroll
window.addEventListener('scroll', animateOnScroll);
window.addEventListener('load', animateOnScroll);

// Page Load Animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    
    // Check backend health
    checkBackendHealth();
});

// Check backend health
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        console.log('✅ Backend is running:', data.message);
    } catch (error) {
        console.warn('⚠️ Backend might be sleeping (Render free tier). First request may take 30-50 seconds.');
    }
}

// Warm up backend (for Render free tier)
function warmUpBackend() {
    // Ping backend every 5 minutes to keep it warm
    setInterval(async () => {
        try {
            await fetch(`${API_URL}/health`);
        } catch (error) {
            console.log('Backend ping failed:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// Start warming up backend
warmUpBackend();

// Add loading indicator for buttons
document.querySelectorAll('.btn-buy').forEach(button => {
    button.addEventListener('click', function(e) {
        // Prevent multiple clicks
        if (this.disabled) {
            e.preventDefault();
            return false;
        }
    });
});

// Handle connection errors gracefully
window.addEventListener('online', () => {
    console.log('✅ Back online');
    checkBackendHealth();
});

window.addEventListener('offline', () => {
    console.log('❌ Lost internet connection');
    showErrorModal('You are offline. Please check your internet connection.');
});

// Console Easter Eggs
console.log('%c🎮 MakXsensi - Level Up Your Game! 🎮', 'font-size: 20px; font-weight: bold; color: #4cc9f0;');
console.log('%c⚡ Premium Free Fire Sensitivity Packs ⚡', 'font-size: 16px; color: #ff6b35;');
console.log('%cInterested in our code? Contact us for collaboration!', 'font-size: 14px; color: #f72585;');
console.log(`%c🔗 Backend API: ${API_URL}`, 'font-size: 12px; color: #7209b7;');

// Export functions for global use
window.buyPack = buyPack;
window.closeModal = closeModal;
window.showSuccessModal = showSuccessModal;
window.showErrorModal = showErrorModal;