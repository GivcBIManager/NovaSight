/**
 * ContactInfo Component
 * 
 * Contact information sidebar with links, social icons, and quick resources.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Mail,
  MessageCircle,
  Calendar,
  BookOpen,
  Twitter,
  Linkedin,
  Github,
  ExternalLink,
} from 'lucide-react';
import { IconBadge } from '@/components/marketing/shared';

export interface ContactInfoProps {
  /** Additional CSS classes */
  className?: string;
}

const contactMethods = [
  {
    icon: <Mail className="h-5 w-5" />,
    title: 'Email',
    description: 'Our friendly team is here to help.',
    value: 'hello@novasight.io',
    href: 'mailto:hello@novasight.io',
    color: 'purple' as const,
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: 'Live Chat',
    description: 'Available Mon-Fri, 9am-5pm EST.',
    value: 'Start a conversation',
    href: '#',
    color: 'cyan' as const,
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: 'Book a Demo',
    description: '30-minute personalized walkthrough.',
    value: 'Schedule now',
    href: '/contact?demo=true',
    color: 'pink' as const,
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: 'Documentation',
    description: 'Find answers in our docs.',
    value: 'View docs',
    href: '/docs',
    color: 'green' as const,
  },
];

const socialLinks = [
  {
    icon: <Twitter className="h-5 w-5" />,
    name: 'Twitter',
    href: 'https://twitter.com/novasight',
  },
  {
    icon: <Linkedin className="h-5 w-5" />,
    name: 'LinkedIn',
    href: 'https://linkedin.com/company/novasight',
  },
  {
    icon: <Github className="h-5 w-5" />,
    name: 'GitHub',
    href: 'https://github.com/novasight',
  },
];

const quickLinks = [
  { label: 'Documentation', href: '/docs', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'FAQ', href: '/pricing#faq', icon: <MessageCircle className="h-4 w-4" /> },
  { label: 'System Status', href: 'https://status.novasight.io', external: true },
  { label: 'Blog', href: '/blog', icon: <ExternalLink className="h-4 w-4" /> },
];

export function ContactInfo({ className }: ContactInfoProps) {
  return (
    <div className={cn('space-y-8', className)}>
      {/* Contact methods */}
      <div className="space-y-4">
        {contactMethods.map((method, index) => (
          <motion.a
            key={method.title}
            href={method.href}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group flex gap-4 rounded-xl border border-border bg-bg-secondary/50 p-4 transition-all hover:border-accent-purple/30 hover:bg-bg-secondary"
          >
            <IconBadge icon={method.icon} color={method.color} size="lg" />
            <div>
              <h4 className="font-semibold text-foreground">{method.title}</h4>
              <p className="text-sm text-muted-foreground">{method.description}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-sm text-accent-purple group-hover:underline">
                {method.value}
                <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Social links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h4 className="mb-4 font-semibold text-foreground">Follow Us</h4>
        <div className="flex gap-3">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-secondary/50 text-muted-foreground transition-all hover:border-accent-purple/30 hover:text-foreground"
              aria-label={social.name}
            >
              {social.icon}
            </a>
          ))}
        </div>
      </motion.div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h4 className="mb-4 font-semibold text-foreground">Quick Links</h4>
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((link) => (
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {link.icon}
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {link.icon}
                {link.label}
              </Link>
            )
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default ContactInfo;
