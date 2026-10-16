import React from 'react';
import { Quote } from 'lucide-react';
import type { ApprovedTestimonial } from '../content/testimonials';

type Props = {
  testimonials: ApprovedTestimonial[];
  preview?: boolean;
};

export const SocialProofSection: React.FC<Props> = ({ testimonials, preview = false }) => {
  if (!testimonials.length && !preview) return null;

  const cards = preview
    ? Array.from({ length: 3 }, (_, index) => ({
        id: `preview-${index}`,
        quote: 'Approved customer quote appears here after publication consent is recorded.',
        name: 'Verified customer',
        role: 'Preview only',
        approved: true as const,
      }))
    : testimonials;

  return (
    <section className="mi-section mi-social-proof" aria-labelledby="social-proof-title" data-preview={preview || undefined}>
      <div className="mi-container">
        <div className="mi-section-heading mi-section-heading--center">
          <p className="mi-eyebrow">BUILT FOR CURIOUS MINDS</p>
          <h2 id="social-proof-title">A better way to work with ideas.</h2>
          {preview && <p className="mi-preview-disclosure">Local layout preview — no testimonial content is published.</p>}
        </div>
        <div className="mi-testimonial-grid">
          {cards.map(item => (
            <article key={item.id}>
              <Quote aria-hidden="true" />
              <p>{item.quote}</p>
              <footer>
                {'image' in item && item.image ? <img src={item.image} alt={item.imageAlt || ''} loading="lazy" /> : <span aria-hidden="true">{item.name.slice(0, 1)}</span>}
                <div><strong>{item.name}</strong>{item.role && <small>{item.role}</small>}</div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

