import { PremiumLandingPage } from '@/src/components/landing/PremiumLandingPage';
import { LandingFooter } from '@/src/components/landing/LandingFooter';
import Script from 'next/script';

export default function LandingPage() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Rekall-IQ',
    url: 'https://rekalliq.springvoxsl.com',
    logo: 'https://rekalliq.springvoxsl.com/brand/rekall-mark.jpeg',
    description: 'Enterprise AI knowledge platform that turns documents into instant answers.',
    sameAs: [
      'https://twitter.com/springvox',
      'https://linkedin.com/company/springvox',
    ],
  };

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Rekall-IQ',
    description: 'Turn your company documents into instant AI answers. Secure, source-grounded knowledge for enterprise teams.',
    url: 'https://rekalliq.springvoxsl.com',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: '0',
      priceValidUntil: '2026-12-31',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '250',
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How is Rekall-IQ different from ChatGPT or Claude?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Rekall-IQ uses ONLY your approved documents — not the public internet. Your answers stay grounded in company sources with full citations. No hallucinations, no external data leakage.',
        },
      },
      {
        '@type': 'Question',
        name: 'How long does document processing take?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Most documents process in 2-5 minutes. Large batches process in background while you continue working. You\'ll see processing status in your admin dashboard.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I control what questions get answered?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Only documents you upload are used. Staff can only ask questions — they can\'t access, download, or modify documents. Admins control everything.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is my data stored securely?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your data never leaves your private workspace. We use enterprise-grade encryption, role-based access, and SOC 2 compliance. Full details in our Security Overview.',
        },
      },
      {
        '@type': 'Question',
        name: 'What file types do you support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'PDFs, Word (DOCX), Excel (XLSX), PowerPoint (PPTX), CSV, TXT, and more via LlamaParse. No file size limits.',
        },
      },
    ],
  };

  return (
    <div className="selection:bg-[var(--accent-jade)] selection:text-[#04110e]">
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Script
        id="software-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PremiumLandingPage />
      <LandingFooter />
    </div>
  );
}
