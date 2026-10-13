/**
 * Speed Assignment - Public Reviews / Testimonials Renderer
 * Dynamically fetches active reviews from GET /api/reviews and renders into .testimonial-carousel
 */
(function () {
    'use strict';

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function getReviewsApiBase() {
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
        if (!url) return 'img/testimonial-1.jpg';
        if (url.startsWith('/uploads/')) {
            const apiOrigin = getReviewsApiBase().replace(/\/api\/?$/, '');
            return apiOrigin + url;
        }
        return url;
    }

    function createReviewItemHTML(review) {
        const avatarUrl = formatImageUrl(review.avatar);
        return `
            <div class="testimonial-item">
                <div class="testimonial-card">
                    <i class="bi bi-quote quote-icon"></i>
                    <p class="testimonial-text">${escapeHtml(review.review)}</p>
                    <div class="testimonial-author d-flex align-items-center pt-3 border-top">
                        <img class="img-fluid flex-shrink-0 author-img" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(review.name)}" onerror="this.src='img/testimonial-1.jpg';">
                        <div class="ps-3">
                            <h6 class="author-name mb-0">${escapeHtml(review.name)}</h6>
                            <small class="author-role">${escapeHtml(review.role)}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadPublicReviews() {
        const carouselElems = document.querySelectorAll('.testimonial-carousel');
        if (!carouselElems || carouselElems.length === 0) return;

        const API_BASE = getReviewsApiBase();

        try {
            const response = await fetch(`${API_BASE}/reviews`);
            if (!response.ok) return;

            const result = await response.json();
            if (!result.success || !Array.isArray(result.data) || result.data.length === 0) return;

            const reviewsHTML = result.data.map(createReviewItemHTML).join('');

            carouselElems.forEach(carouselElem => {
                // If jQuery & Owl Carousel are available, re-initialize carousel cleanly
                if (typeof window.jQuery !== 'undefined' && window.jQuery.fn.owlCarousel) {
                    const $carousel = window.jQuery(carouselElem);
                    if ($carousel.data('owl.carousel')) {
                        $carousel.trigger('destroy.owl.carousel');
                    }
                    $carousel.html(reviewsHTML);
                    $carousel.owlCarousel({
                        autoplay: true,
                        smartSpeed: 1000,
                        margin: 24,
                        dots: false,
                        loop: result.data.length > 1,
                        nav: true,
                        navText: [
                            '<i class="bi bi-arrow-left"></i>',
                            '<i class="bi bi-arrow-right"></i>'
                        ],
                        responsive: {
                            0: {
                                items: 1
                            },
                            992: {
                                items: 2
                            }
                        }
                    });
                } else {
                    carouselElem.innerHTML = reviewsHTML;
                }
            });

        } catch (err) {
            console.warn('Could not load dynamic reviews from API backend. Keeping static reviews.', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPublicReviews);
    } else {
        loadPublicReviews();
    }
})();
