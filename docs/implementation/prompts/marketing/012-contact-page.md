# Prompt 012 — Contact & Demo Request Page

**Agent**: `@frontend`  
**Phase**: 3 — Inner Pages  
**Dependencies**: 001, 002, 003  
**Estimated Effort**: Medium  

---

## 🎯 Objective

Build a contact page with a demo request form, office/contact information, and multiple engagement options. This is the primary conversion endpoint for enterprise prospects.

---

## 📁 Files to Create

```
frontend/src/pages/marketing/ContactPage.tsx
frontend/src/components/marketing/sections/ContactForm.tsx
frontend/src/components/marketing/sections/ContactInfo.tsx
```

---

## 📐 Page Structure

```
1. Hero Banner (compact)
   "Let's Talk Data"
   "Book a demo, ask a question, or just say hello."

2. Contact Section (two-column)
   Left: Contact form
   Right: Contact info + engagement options

3. Map / Locations (optional, decorative)

4. FAQ Quick Links
   "Looking for answers? Check our resources"
```

---

## 📐 Detailed Specifications

### ContactForm.tsx

#### Form Fields
```tsx
interface ContactFormData {
  firstName: string;       // required
  lastName: string;        // required
  email: string;           // required, email validation
  company: string;         // required
  jobTitle: string;        // optional
  companySize: string;     // select: 1-10, 11-50, 51-200, 201-1000, 1000+
  interest: string;        // select: Book a Demo, Technical Question, Pricing, Partnership, Other
  message: string;         // textarea, optional
  newsletter: boolean;     // opt-in checkbox
}
```

#### Validation (Zod + react-hook-form)
```typescript
const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  company: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().optional(),
  companySize: z.string().min(1, 'Please select your company size'),
  interest: z.string().min(1, 'Please select your interest'),
  message: z.string().optional(),
  newsletter: z.boolean().optional(),
});
```

#### Visual Design
- Glass card wrapper with padding
- Two-column layout for first/last name (side by side)
- Inputs: Glass-style with `bg-bg-tertiary/50 border-border focus:border-accent-purple`
- Select dropdowns: Use Radix `<Select>` with glass styling
- Textarea: Auto-growing, max 500 characters with counter
- Submit button: `<MagneticButton variant="gradient" size="lg">` — "Send Message →"
- Loading state: Button shows spinner
- Success state: Form replaced with success message + confetti animation
  - "Thanks! We'll get back to you within 24 hours."
  - Calendar scheduling link: "Or book a time now →"
- Error state: Inline field errors with shake animation

#### Form Layout
```
┌─────────────────────────────────────────────┐
│  Get in Touch                               │
│                                             │
│  ┌───────────────┐  ┌───────────────┐      │
│  │ First Name *  │  │ Last Name *   │      │
│  └───────────────┘  └───────────────┘      │
│                                             │
│  ┌──────────────────────────────────┐      │
│  │ Work Email *                     │      │
│  └──────────────────────────────────┘      │
│                                             │
│  ┌──────────────────────────────────┐      │
│  │ Company *                        │      │
│  └──────────────────────────────────┘      │
│                                             │
│  ┌───────────────┐  ┌───────────────┐      │
│  │ Job Title     │  │ Company Size ▾│      │
│  └───────────────┘  └───────────────┘      │
│                                             │
│  ┌──────────────────────────────────┐      │
│  │ What are you interested in? ▾   │      │
│  └──────────────────────────────────┘      │
│                                             │
│  ┌──────────────────────────────────┐      │
│  │ Message (optional)               │      │
│  │                                  │      │
│  │                            0/500 │      │
│  └──────────────────────────────────┘      │
│                                             │
│  ☐ Subscribe to product updates             │
│                                             │
│  [         Send Message →          ]        │
│                                             │
└─────────────────────────────────────────────┘
```

### ContactInfo.tsx

#### Layout
```
┌─────────────────────────────────────────────┐
│                                             │
│  Or reach us directly                       │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📧  Email                           │   │
│  │     hello@novasight.io              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 💬  Live Chat                       │   │
│  │     Available Mon-Fri, 9am-6pm EST  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📅  Book a Demo                     │   │
│  │     30-min personalized walkthrough │   │
│  │     [Schedule Now →]                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📖  Documentation                   │   │
│  │     Self-serve answers              │   │
│  │     [Browse Docs →]                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Connect with us                            │
│  [Twitter] [GitHub] [LinkedIn] [Discord]    │
│                                             │
└─────────────────────────────────────────────┘
```

- Each contact option: `<GlassCard>` with icon, title, detail
- Hover: Card lifts with glow
- Social icons: Same as footer, with hover effects
- "Book a Demo" card: Has a special gradient accent border to draw attention

### Resource Quick Links

Below the contact section, a row of resource cards:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 📖 Docs      │  │ ❓ FAQ       │  │ 📊 Status    │  │ 📝 Blog      │
│ Technical    │  │ Common       │  │ System       │  │ Latest       │
│ docs & API   │  │ questions    │  │ uptime       │  │ updates      │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔌 Backend Integration Note

The contact form should:
1. **For now**: Store submissions in `localStorage` and show success message
2. **Future**: POST to `/api/v1/contact` endpoint (to be built by `@backend` agent)
3. Provide a `useContactForm` hook that encapsulates submission logic:
```tsx
// hooks/useContactForm.ts
export function useContactForm() {
  const submit = async (data: ContactFormData) => {
    // TODO: Replace with API call when backend endpoint is ready
    // POST /api/v1/contact
    console.log('Contact form submitted:', data);
    await new Promise(resolve => setTimeout(resolve, 1000)); // simulate
    localStorage.setItem('lastContact', JSON.stringify({ ...data, timestamp: Date.now() }));
    return { success: true };
  };
  return { submit };
}
```

---

## ♿ Accessibility

- Form: Proper `<label>` for every input, `aria-required` for required fields
- Error messages: `aria-invalid`, `aria-describedby` linking error to field
- Focus management: Focus first error field on failed submission
- Select: Radix Select handles keyboard navigation
- Success message: `role="alert"` for screen reader announcement
- All interactive elements: Focus rings from design system

---

## 📱 Responsive

| Breakpoint | Layout |
|------------|--------|
| Mobile | Stacked: form on top, contact info below |
| Tablet | Side by side: 60/40 split |
| Desktop | Side by side: 55/45 split, max-w-6xl centered |

---

## 🧪 Acceptance Criteria

- [ ] Contact form renders all fields with proper labels
- [ ] Form validation shows inline errors with shake animation
- [ ] Successful submission shows success state with animation
- [ ] Contact info cards render with correct information
- [ ] Social links work correctly
- [ ] "Book a Demo" card is visually prominent
- [ ] Resource quick links render
- [ ] Form is fully keyboard accessible
- [ ] Responsive at all breakpoints
- [ ] `useContactForm` hook encapsulates submission logic

---

*Prompt 012 — Contact Page v1.0*
