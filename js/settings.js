/**
 * Speed Assignment - Public Website Settings Applicator
 * Dynamically applies settings from GET /api/settings to public pages.
 */
(function () {
    'use strict';

    function cleanPhoneForWa(phoneStr) {
        if (!phoneStr) return '';
        return phoneStr.replace(/[^0-9]/g, '');
    }

    async function applyPublicSettings() {
        const API_BASE = window.ASSIGNMENTGHAR_API_URL || '/api';

        try {
            const response = await fetch(`${API_BASE}/settings`);
            if (!response.ok) return;

            const result = await response.json();
            if (!result.success || !result.data) return;

            const data = result.data;

            // 1. WHATSAPP: Update WhatsApp links and phone number display
            if (data.whatsappNumber) {
                const cleanWa = cleanPhoneForWa(data.whatsappNumber);
                const waUrl = `https://wa.me/${cleanWa}`;

                // Update all WhatsApp buttons and links across public site
                document.querySelectorAll('.side-wa-btn, .footer-whatsapp-btn, .contact-whatsapp-link, #whatsapp-action-btn, a[href*="wa.me"]').forEach(btn => {
                    btn.href = waUrl;
                });

                // Update phone number display in footer
                document.querySelectorAll('.fa-phone-alt').forEach(icon => {
                    const parent = icon.closest('p, div');
                    if (parent && !parent.closest('.contact-compact-box') && !parent.closest('.ai-chat-panel') && !parent.closest('form')) {
                        if (icon.nextSibling && icon.nextSibling.nodeType === 3) {
                            icon.nextSibling.nodeValue = ` ${data.whatsappNumber}`;
                        } else {
                            parent.innerHTML = `${icon.outerHTML} ${data.whatsappNumber}`;
                        }
                    }
                });
            }

            // 2. EMAIL: Update Contact Email links (Gmail compose) and text display
            if (data.contactEmail) {
                const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(data.contactEmail)}`;

                // Update email links to open Gmail compose in new tab
                document.querySelectorAll('.contact-email-link, #email-action-btn, a[href*="mail.google.com"]').forEach(link => {
                    link.href = gmailUrl;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                });

                document.querySelectorAll('a[href*="mailto:"]').forEach(link => {
                    link.href = `mailto:${data.contactEmail}`;
                });

                // Update email address display in footer
                document.querySelectorAll('.fa-envelope, .fa-envelope-open').forEach(icon => {
                    const parent = icon.closest('p, div');
                    if (parent && !parent.closest('.contact-compact-box') && !parent.closest('.ai-chat-panel') && !parent.closest('form')) {
                        if (icon.nextSibling && icon.nextSibling.nodeType === 3) {
                            icon.nextSibling.nodeValue = ` ${data.contactEmail}`;
                        } else {
                            parent.innerHTML = `${icon.outerHTML} ${data.contactEmail}`;
                        }
                    }
                });
            }

            // 3. LOCATION / ADDRESS: Update Contact page location display and footer address
            if (data.address) {
                const contactAddressDisplay = document.getElementById('contact-page-address-display');
                if (contactAddressDisplay) {
                    const icon = contactAddressDisplay.querySelector('i');
                    if (icon) {
                        if (icon.nextSibling && icon.nextSibling.nodeType === 3) {
                            icon.nextSibling.nodeValue = ` ${data.address}`;
                        } else {
                            contactAddressDisplay.innerHTML = `<i class="fa fa-map-marker-alt me-2" style="color: #00B98E;"></i>${data.address}`;
                        }
                    } else {
                        contactAddressDisplay.textContent = data.address;
                    }
                }

                // Update footer address
                document.querySelectorAll('.fa-map-marker-alt').forEach(icon => {
                    const parent = icon.closest('p, div');
                    if (parent && 
                        parent.id !== 'contact-page-address-display' && 
                        !parent.closest('#open-in-maps-btn') && 
                        !parent.closest('#get-directions-btn') && 
                        !parent.closest('.location-action-box') &&
                        !parent.closest('.ai-chat-panel') &&
                        !parent.closest('form')) {
                        
                        if (icon.nextSibling && icon.nextSibling.nodeType === 3) {
                            icon.nextSibling.nodeValue = ` ${data.address}`;
                        } else {
                            parent.innerHTML = `${icon.outerHTML} ${data.address}`;
                        }
                    }
                });
            }

            // 4 & 5. GOOGLE MAP & LOCATION BUTTONS: Update iframe src, Open Location Pin & Get Directions buttons
            if (data.latitude !== undefined && data.longitude !== undefined && data.latitude !== null && data.longitude !== null) {
                const lat = data.latitude;
                const lng = data.longitude;

                const mapContainer = document.getElementById('backend-map-container');
                const mapIframe = document.getElementById('backend-map-iframe');
                const openInMapsBtn = document.getElementById('open-in-maps-btn');
                const getDirectionsBtn = document.getElementById('get-directions-btn');

                if (mapContainer) {
                    mapContainer.setAttribute('data-latitude', lat);
                    mapContainer.setAttribute('data-longitude', lng);
                    if (data.address) {
                        mapContainer.setAttribute('data-address', data.address);
                    }
                }

                // Google Map Iframe
                if (mapIframe) {
                    mapIframe.src = `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=14&output=embed`;
                }

                // "Open Location Pin" button
                if (openInMapsBtn) {
                    openInMapsBtn.href = `https://www.google.com/maps?q=${lat},${lng}`;
                }

                // "Get Directions" button
                if (getDirectionsBtn) {
                    getDirectionsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                }
            }

        } catch (err) {
            console.warn("Could not load dynamic website settings:", err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyPublicSettings);
    } else {
        applyPublicSettings();
    }
})();

