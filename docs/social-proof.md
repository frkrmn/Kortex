# Social proof publishing

The public section is intentionally hidden while `approvedTestimonials` is empty.

To publish a testimonial, add an entry to `src/content/testimonials.ts` only after recording the customer's exact approved quote, display name, role, and image permission. Set `approved: true`. The landing page will then render the reusable section automatically.

For layout review without publishing fictional claims, run the local development server and open `/?preview-social-proof=1`. The preview is compiled out of production.
