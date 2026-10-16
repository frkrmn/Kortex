export interface ApprovedTestimonial {
  id: string;
  quote: string;
  name: string;
  role?: string;
  image?: string;
  imageAlt?: string;
  approved: true;
}

// Add only testimonials with documented publication approval. The landing
// component stays absent when this list is empty.
export const approvedTestimonials: ApprovedTestimonial[] = [];

