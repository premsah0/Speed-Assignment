/**
 * Speed Assignment - Centralized Service Data & Dynamic Renderer
 * Shared service data renderer for index.html, property-list.html, and contact.html
 * Single source of truth: PostgreSQL Database via GET /api/services
 */

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getServicesApiBase() {
    if (window.ASSIGNMENTGHAR_API_URL) {
        return window.ASSIGNMENTGHAR_API_URL.replace(/\/+$/, '');
    }
    const isLocal = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '0.0.0.0' ||
                    window.location.protocol === 'file:';
    return isLocal ? 'http://localhost:5001/api' : '/api';
}

function formatImageUrl(url) {
    if (!url) return 'img/property-1.jpg';
    if (url.startsWith('/uploads/')) {
        const apiOrigin = getServicesApiBase().replace(/\/api\/?$/, '');
        return apiOrigin + url;
    }
    return url;
}

function getDedicatedServiceUrl(service) {
    if (!service) return null;
    if (service.slug === 'essay-writing' || service.slug === 'professional-essay-writing-service' || service.title === 'Professional Essay Writing Service') {
        return 'services/essay-writing-help.html';
    }
    if (service.slug === 'programming-coding' || service.title === 'Programming & Coding Assignment Help') {
        return 'services/programming-assignment-help.html';
    }
    if (service.slug === 'dissertation-thesis' || service.title === "Dissertation & Master's Thesis Service") {
        return 'services/dissertation-writing-services.html';
    }
    return null;
}

function createServiceCardHTML(service, index) {
    const delay = (0.1 + (index % 3) * 0.1).toFixed(1);
    const imgUrl = formatImageUrl(service.image);
    const targetUrl = getDedicatedServiceUrl(service);

    const imgWrapperHTML = targetUrl
        ? `<a href="${targetUrl}" class="service-img-wrapper overflow-hidden d-block">
                <img class="img-fluid w-100" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(service.title)}" onerror="this.src='img/property-1.jpg';">
            </a>`
        : `<div class="service-img-wrapper overflow-hidden">
                <img class="img-fluid w-100" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(service.title)}" onerror="this.src='img/property-1.jpg';">
            </div>`;

    const titleHTML = targetUrl
        ? `<a href="${targetUrl}" class="text-dark text-decoration-none">${escapeHtml(service.title)}</a>`
        : escapeHtml(service.title);

    return `
        <div class="col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="${delay}s">
            <div class="service-card h-100 d-flex flex-column justify-content-between">
                ${imgWrapperHTML}
                <div class="service-card-body p-4 d-flex flex-column justify-content-between flex-grow-1">
                    <div>
                        <h5 class="service-card-title mb-2">${titleHTML}</h5>
                        <p class="service-card-desc mb-2">${escapeHtml(service.description)}</p>
                    </div>
                    <div>
                        <a href="contact.html" class="service-cta-btn">Get Help Now &rarr;</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function renderServices() {
    const indexContainer = document.getElementById("index-services-container");
    const servicesContainer = document.getElementById("services-grid-container");
    const seeMoreWrapper = document.getElementById("index-services-see-more");
    const serviceSelect = document.getElementById("service");

    const containers = [indexContainer, servicesContainer, serviceSelect].filter(Boolean);
    if (containers.length === 0) return;

    // Loading State: Only show spinner if container has no static fallback content
    const loadingHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status" style="color: #00B98E !important;">
                <span class="visually-hidden">Loading services...</span>
            </div>
            <p class="mt-2 text-muted small mb-0">Loading available academic services...</p>
        </div>
    `;
    if (indexContainer && indexContainer.children.length === 0) indexContainer.innerHTML = loadingHTML;
    if (servicesContainer && servicesContainer.children.length === 0) servicesContainer.innerHTML = loadingHTML;

    let services = [];
    const API_BASE = getServicesApiBase();

    try {
        const response = await fetch(`${API_BASE}/services`);
        if (response.ok) {
            const result = await response.json();
            if (result.success && Array.isArray(result.data) && result.data.length > 0) {
                services = result.data;
            }
        }
    } catch (err) {
        console.warn("Could not fetch services from API backend.", err);
    }

    const emptyHTML = `
        <div class="col-12 text-center py-5">
            <p class="text-muted mb-0">No active services currently available.</p>
        </div>
    `;

    // Render for index.html (show max 6 services & toggle See More)
    if (indexContainer) {
        if (services.length > 0) {
            const indexServices = services.slice(0, 6);
            indexContainer.innerHTML = indexServices.map((service, idx) => createServiceCardHTML(service, idx)).join("");
        } else if (indexContainer.children.length === 0) {
            indexContainer.innerHTML = emptyHTML;
        }

        if (seeMoreWrapper) {
            if (services.length > 6) {
                seeMoreWrapper.classList.remove("d-none");
            } else {
                seeMoreWrapper.classList.add("d-none");
            }
        }
    }

    // Render for property-list.html (show all active services)
    if (servicesContainer) {
        if (services.length > 0) {
            servicesContainer.innerHTML = services.map((service, idx) => createServiceCardHTML(service, idx)).join("");
        } else if (servicesContainer.children.length === 0) {
            servicesContainer.innerHTML = emptyHTML;
        }
    }

    // Populate contact form dropdown if present
    if (serviceSelect) {
        const currentVal = serviceSelect.value;
        const optionsHTML = services.map(s => `<option value="${escapeHtml(s.title)}">${escapeHtml(s.title)}</option>`).join("");
        serviceSelect.innerHTML = `<option selected disabled>Select a service</option>${optionsHTML}<option value="Other Academic Requirement">Other Academic Requirement</option>`;
        if (currentVal && Array.from(serviceSelect.options).some(o => o.value === currentVal)) {
            serviceSelect.value = currentVal;
        }
    }
}

// Execute when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderServices);
} else {
    renderServices();
}

