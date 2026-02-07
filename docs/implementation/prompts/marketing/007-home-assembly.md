# Prompt 007 — Homepage Assembly & Routing

**Agent**: `@frontend`  
**Phase**: 2 — Homepage  
**Dependencies**: 004, 005, 006  
**Estimated Effort**: Low-Medium  

---

## 🎯 Objective

Assemble all homepage sections into the final `HomePage.tsx`, configure routing for all marketing pages, and ensure smooth scroll behavior and section ordering.

---

## 📁 Files to Create

```
frontend/src/pages/marketing/HomePage.tsx
frontend/src/pages/marketing/index.ts
```

## 📁 Files to Modify

```
frontend/src/App.tsx  →  Add marketing routes
```

---

## 📐 Detailed Specifications

### 1. HomePage.tsx

**Purpose**: The assembled marketing homepage — compositions of all sections in order.

#### Section Order
```tsx
export function HomePage() {
  return (
    <>
      {/* 1. Hero — Cinematic first impression */}
      <HeroSection />

      {/* 2. Logo Cloud — Social proof immediately after hero */}
      {/* (already part of HeroSection, but can be separate) */}

      {/* 3. How It Works — Quick overview of the journey */}
      <SectionDivider variant="gradient" />
      <HowItWorks />

      {/* 4. Feature Showcase — Deep dive into core features */}
      <SectionDivider variant="dots" />
      <FeatureShowcase />

      {/* 5. Bento Features — Secondary capabilities grid */}
      <SectionDivider variant="gradient" />
      <BentoFeatures />

      {/* 6. Metrics — Social proof with numbers */}
      <SectionDivider variant="dots" />
      <MetricsSection />

      {/* 7. Tech Stack — Architecture credibility */}
      <TechStackVisual />

      {/* 8. Testimonials — Customer voices */}
      <SectionDivider variant="gradient" />
      <TestimonialsCarousel />

      {/* 9. Comparison — Why us vs alternatives */}
      <ComparisonTable />

      {/* 10. Final CTA — Conversion */}
      <CTASection />
    </>
  );
}
```

#### Section Spacing
- Each major section: `py-20 md:py-28 lg:py-32`
- Container: `container mx-auto px-4 sm:px-6 lg:px-8`
- SectionDividers between major transitions

#### Scroll Behavior
- Smooth scrolling: `scroll-behavior: smooth` on `<html>`
- Each section can be linked via hash: `#hero`, `#features`, `#pricing`, etc.
  - Add `id` props to section wrapper divs
- Navbar links can smooth-scroll to sections on homepage
- `ScrollRestoration` from react-router for page navigation

---

### 2. Routing Updates in App.tsx

#### New Route Structure
```tsx
import { MarketingLayout } from '@/components/marketing/layout';
import { HomePage } from '@/pages/marketing';
// Future: FeaturesPage, SolutionsPage, PricingPage, etc.

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* ===== PUBLIC MARKETING ROUTES ===== */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/features" element={<ComingSoonPage title="Features" />} />
            <Route path="/solutions" element={<ComingSoonPage title="Solutions" />} />
            <Route path="/pricing" element={<ComingSoonPage title="Pricing" />} />
            <Route path="/about" element={<ComingSoonPage title="About" />} />
            <Route path="/contact" element={<ComingSoonPage title="Contact" />} />
          </Route>

          {/* ===== AUTH ROUTES ===== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* ===== PROTECTED APP ROUTES ===== */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            {/* ... all existing protected routes, prefixed with /app */}
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
```

#### ⚠️ Important: Route Migration Strategy

The existing app routes are at `/dashboard`, `/connections`, etc. (root level). To avoid conflicts with marketing pages, we have two options:

**Option A (Recommended — Namespace)**: Move all app routes under `/app/*` prefix
- `/dashboard` → `/app/dashboard`  
- `/connections` → `/app/connections`
- Update all `<Link>` and `useNavigate` calls
- Navbar brand link goes to `/app/dashboard` for logged-in users

**Option B (Quick — Landing check)**: Keep routes as-is, but `/` checks auth:
- If authenticated → redirect to `/dashboard`
- If not authenticated → show marketing `HomePage`
- Less clean but minimal migration

**Recommendation**: Start with Option B for quick iteration, plan Option A for Phase 4.

For Option B implementation:
```tsx
function RootRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <MarketingLayout />;
}

// In routes:
<Route path="/" element={<RootRoute />}>
  <Route index element={<HomePage />} />
</Route>
```

---

### 3. ComingSoonPage.tsx (Temporary)

**Purpose**: Placeholder for inner marketing pages not yet built.

```tsx
interface ComingSoonPageProps {
  title: string;
}
```

#### Design
- Centered content with NeuralNetwork background
- Large title with gradient text
- "Coming Soon" subtitle
- Animated floating elements
- "Back to Home" button
- Newsletter signup form: "Get notified when this page launches"

---

### 4. Performance Optimizations

```tsx
// Lazy load sections below the fold
const FeatureShowcase = lazy(() => import('@/components/marketing/sections/FeatureShowcase'));
const BentoFeatures = lazy(() => import('@/components/marketing/sections/BentoFeatures'));
const MetricsSection = lazy(() => import('@/components/marketing/sections/MetricsSection'));
const TechStackVisual = lazy(() => import('@/components/marketing/sections/TechStackVisual'));
const TestimonialsCarousel = lazy(() => import('@/components/marketing/sections/TestimonialsCarousel'));
const ComparisonTable = lazy(() => import('@/components/marketing/sections/ComparisonTable'));
const CTASection = lazy(() => import('@/components/marketing/sections/CTASection'));

// Wrap in Suspense with skeleton fallbacks
<Suspense fallback={<SectionSkeleton />}>
  <FeatureShowcase />
</Suspense>
```

---

## 🧪 Acceptance Criteria

- [ ] Homepage renders all sections in correct order
- [ ] Smooth scrolling between sections works
- [ ] Marketing routes are accessible without authentication
- [ ] Authenticated users at `/` are redirected to `/dashboard`
- [ ] Unauthenticated users see the marketing homepage
- [ ] All existing app routes continue to work
- [ ] ComingSoonPage renders for unbuilt pages
- [ ] Below-fold sections are lazy loaded
- [ ] Page loads under 2 seconds on 3G simulation
- [ ] No console errors or warnings
- [ ] Favicon and document title set correctly ("NovaSight — AI-Powered BI Platform")

---

*Prompt 007 — Homepage Assembly v1.0*
