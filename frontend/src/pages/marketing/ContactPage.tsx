/**
 * Marketing ContactPage
 * 
 * Contact us page for NovaSight marketing site.
 * Placeholder to be expanded in Phase 2.
 */

import { SEOHead } from '@/components/marketing/shared';
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone } from 'lucide-react';
import { seoConfig, getCanonicalUrl } from '@/data/seo-config';

export function ContactPage() {
  return (
    <div className="relative">
      {/* SEO */}
      <SEOHead
        {...seoConfig.contact}
        canonical={getCanonicalUrl('/contact')}
      />

      {/* Hero Section */}
      <section className="px-4 pb-16 pt-32">
        <div className="mx-auto max-w-4xl">
          <PageHeader
            accentTitle
            eyebrow="Contact"
            title="Get in touch with our team"
            description="Have questions? We'd love to hear from you."
          />
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-2xl font-semibold text-foreground">
                  Let&apos;s start a conversation
                </h3>
                <p className="mt-4 text-muted-foreground">
                  Whether you have a question about features, pricing, or anything else,
                  our team is ready to answer all your questions.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple/10">
                    <Mail className="h-5 w-5 text-accent-purple" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-foreground">hello@novasight.io</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple/10">
                    <Phone className="h-5 w-5 text-accent-purple" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-foreground">+1 (555) 123-4567</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-purple/10">
                    <MapPin className="h-5 w-5 text-accent-purple" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="text-foreground">San Francisco, CA</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-xl border border-border bg-bg-secondary/50 p-6"
            >
              <form className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="mb-2 block text-sm font-medium text-foreground"
                    >
                      First name
                    </label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="mb-2 block text-sm font-medium text-foreground"
                    >
                      Last name
                    </label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Email
                  </label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="mb-2 block text-sm font-medium text-foreground"
                  >
                    Message
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Tell us how we can help..."
                    rows={5}
                  />
                </div>

                <Button variant="gradient" className="w-full shadow-glow-sm">
                  Send Message
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ContactPage;
