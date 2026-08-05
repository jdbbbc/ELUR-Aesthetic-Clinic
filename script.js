// ====================================================
// ELURÉ Aesthetic Clinic — script.js
// Copyright © 2026 ELURÉ Aesthetic Clinic. All rights reserved.
// ====================================================
// ===== Navbar Scroll Effect =====
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ===== Mobile Menu Toggle =====
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ===== Active Navigation Link =====
const sections = document.querySelectorAll('section');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ===== Scroll Reveal Animation =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const target = document.querySelector(targetId);

        if (target) {
            e.preventDefault();
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Utility: Escape HTML to prevent XSS =====
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ===== Form Submission (Multiple Booking Methods) =====
const bookingForm = document.getElementById('booking-form');
const whatsappNumber = '639074779635';
const emailAddress = 'elureaestheticclinic@gmail.com';
const phoneNumber = '09074779635';

if (bookingForm) {
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const service = formData.get('service');
        const message = formData.get('message');
        const bookingMethod = formData.get('booking-method');

        if (!bookingMethod) {
            alert('Please select a booking method.');
            return;
        }

        const displayName = escapeHtml(name);
        const displayEmail = escapeHtml(email);
        const displayPhone = escapeHtml(phone);
        const displayService = escapeHtml(service || 'Not specified');
        const displayMessage = escapeHtml(message || '');

        // Create booking message
        let bookingMessage = `Hello ELURÉ Aesthetic Clinic!\n\n`;
        bookingMessage += `I'd like to book a consultation:\n\n`;
        bookingMessage += `Name: ${name}\n`;
        bookingMessage += `Email: ${email}\n`;
        bookingMessage += `Phone: ${phone}\n`;
        bookingMessage += `Treatment: ${displayService}\n`;

        if (message) {
            bookingMessage += `Message: ${displayMessage}\n`;
        }

        bookingMessage += `\nThank you!`;

        // Redirect based on booking method
        let redirectUrl = '';
        let methodName = '';

        switch(bookingMethod) {
            case 'whatsapp':
                redirectUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(bookingMessage)}`;
                methodName = 'WhatsApp';
                break;
            case 'email':
                const subject = encodeURIComponent(`Booking Request - ${displayService}`);
                const body = encodeURIComponent(bookingMessage);
                redirectUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${emailAddress}&su=${subject}&body=${body}`;
                methodName = 'Gmail';
                break;
            case 'sms':
                redirectUrl = `sms:${phoneNumber}?body=${encodeURIComponent(bookingMessage)}`;
                methodName = 'SMS';
                break;
            case 'facebook':
                const fbMessage = encodeURIComponent(bookingMessage);
                redirectUrl = `https://www.facebook.com/messages/t/61588292489342?text=${fbMessage}`;
                methodName = 'Messenger';
                break;
        }

        // Open redirect
        window.open(redirectUrl, '_blank');

        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';

        let iconClass = 'fas fa-check-circle';
        let iconColor = '#b8860b';

        if (bookingMethod === 'whatsapp') {
            iconClass = 'fab fa-whatsapp';
            iconColor = '#25D366';
        } else if (bookingMethod === 'facebook') {
            iconClass = 'fab fa-facebook-messenger';
            iconColor = '#0084FF';
        } else if (bookingMethod === 'email') {
            iconClass = 'fab fa-google';
            iconColor = '#EA4335';
        } else if (bookingMethod === 'sms') {
            iconClass = 'fas fa-comment-sms';
            iconColor = '#b8860b';
        }

        successMessage.innerHTML = `
            <div class="success-icon">
                <i class="${iconClass}" style="color: ${iconColor};"></i>
            </div>
            <h3>Opening ${methodName}...</h3>
            <p>You'll be redirected to ${methodName} to complete your booking. Thank you, ${displayName}!</p>
        `;

        successMessage.style.cssText = `
            text-align: center;
            padding: 40px;
            animation: fadeIn 0.5s ease;
        `;

        successMessage.querySelector('.success-icon').style.cssText = `
            font-size: 60px;
            margin-bottom: 20px;
        `;

        successMessage.querySelector('h3').style.cssText = `
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            color: #1a1a2e;
            margin-bottom: 15px;
        `;

        successMessage.querySelector('p').style.cssText = `
            color: #6b6b6b;
            font-size: 16px;
            line-height: 1.6;
        `;

        // Replace form with success message
        this.style.display = 'none';
        this.parentNode.appendChild(successMessage);

        console.log(`Booking via ${methodName}:`, { name, email, phone, service, message });
    });
}

// ===== Booking Method Auto-Info & Message =====
const bookingMethods = document.querySelectorAll('input[name="booking-method"]');
const autoInfo = document.getElementById('booking-auto-info');
const messageField = document.getElementById('message');

const bookingInfo = {
    whatsapp: `<i class="fab fa-whatsapp"></i> Book via WhatsApp: <strong>+63 907 477 9635</strong>`,
    email: `<i class="fab fa-google"></i> Book via Gmail: <strong>elureaestheticclinic@gmail.com</strong>`,
    sms: `<i class="fas fa-comment-sms"></i> Book via SMS: <strong>0907 477 9635</strong>`,
    facebook: `<i class="fab fa-facebook-messenger"></i> Book via Messenger: <strong>ELURÉ Aesthetic Clinic</strong>`
};

const autoMessages = {
    whatsapp: "Hi ELURÉ! I'm interested in booking a consultation. Please let me know your available schedule. Thank you!",
    email: "Hello ELURÉ Aesthetic Clinic,\n\nI would like to book a consultation for a treatment. Please let me know your available dates and any preparation needed.\n\nThank you!",
    sms: "Hi! I'd like to book a consultation at ELURÉ Aesthetic Clinic. Please contact me. Thank you!",
    facebook: "Hello! I'd like to book a consultation at ELURÉ Aesthetic Clinic. Please send me your available schedule. Thank you!"
};

bookingMethods.forEach(method => {
    method.addEventListener('change', function() {
        if (autoInfo && bookingInfo[this.value]) {
            autoInfo.innerHTML = bookingInfo[this.value];
            autoInfo.style.opacity = '0';
            autoInfo.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                autoInfo.style.opacity = '1';
                autoInfo.style.transform = 'translateY(0)';
            }, 50);
        }

        // Auto-fill message
        if (messageField && autoMessages[this.value]) {
            messageField.value = autoMessages[this.value];
            messageField.style.borderColor = '#b8860b';
            setTimeout(() => {
                messageField.style.borderColor = '#e0e0e0';
            }, 1000);
        }
    });
});

// Show default (WhatsApp) on load
if (autoInfo) {
    autoInfo.innerHTML = bookingInfo.whatsapp;
}
if (messageField) {
    messageField.value = autoMessages.whatsapp;
}

// ===== Scroll Reveal Animation =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.service-card, .info-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});