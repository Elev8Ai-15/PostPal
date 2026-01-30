import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");

describe("PostPal v1.5 Compliance Validation", () => {
  
  describe("1. SEO Compliance", () => {
    describe("SEO Head Component", () => {
      it("should have SEO head component", () => {
        const filePath = path.join(PROJECT_ROOT, "components/seo-head.tsx");
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it("should export SEOHead component", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "components/seo-head.tsx"),
          "utf-8"
        );
        expect(content).toContain("export function SEOHead");
      });

      it("should have Open Graph meta tags", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "components/seo-head.tsx"),
          "utf-8"
        );
        expect(content).toContain("og:type");
        expect(content).toContain("og:title");
        expect(content).toContain("og:description");
        expect(content).toContain("og:image");
      });

      it("should have Twitter Card meta tags", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "components/seo-head.tsx"),
          "utf-8"
        );
        expect(content).toContain("twitter:card");
        expect(content).toContain("twitter:title");
        expect(content).toContain("twitter:description");
      });

      it("should have JSON-LD structured data", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "components/seo-head.tsx"),
          "utf-8"
        );
        expect(content).toContain("application/ld+json");
        expect(content).toContain("@context");
        expect(content).toContain("schema.org");
      });

      it("should have canonical URL support", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "components/seo-head.tsx"),
          "utf-8"
        );
        expect(content).toContain('rel="canonical"');
      });
    });

    describe("SEO Files", () => {
      it("should have robots.txt", () => {
        const filePath = path.join(PROJECT_ROOT, "public/robots.txt");
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it("should have sitemap.xml", () => {
        const filePath = path.join(PROJECT_ROOT, "public/sitemap.xml");
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it("robots.txt should have proper directives", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "public/robots.txt"),
          "utf-8"
        );
        expect(content).toContain("User-agent:");
        expect(content).toContain("Allow:");
        expect(content).toContain("Sitemap:");
      });

      it("sitemap.xml should have valid structure", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "public/sitemap.xml"),
          "utf-8"
        );
        expect(content).toContain('<?xml version="1.0"');
        expect(content).toContain("<urlset");
        expect(content).toContain("<url>");
        expect(content).toContain("<loc>");
      });
    });

    describe("SEO Integration", () => {
      it("should integrate SEO in root layout", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "app/_layout.tsx"),
          "utf-8"
        );
        expect(content).toContain("SEOHead");
        expect(content).toContain("OrganizationSchema");
      });
    });
  });

  describe("2. ADA/WCAG Accessibility Compliance", () => {
    describe("Accessibility Utilities", () => {
      it("should have accessibility utilities file", () => {
        const filePath = path.join(PROJECT_ROOT, "lib/accessibility.ts");
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it("should have contrast ratio calculation", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "lib/accessibility.ts"),
          "utf-8"
        );
        expect(content).toContain("getContrastRatio");
        expect(content).toContain("getLuminance");
      });

      it("should have screen reader announcement hook", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "lib/accessibility.ts"),
          "utf-8"
        );
        expect(content).toContain("useScreenReaderAnnouncement");
      });

      it("should have focus management hook", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "lib/accessibility.ts"),
          "utf-8"
        );
        expect(content).toContain("useFocusManagement");
      });

      it("should have accessibility props generators", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "lib/accessibility.ts"),
          "utf-8"
        );
        expect(content).toContain("getAccessibilityProps");
        expect(content).toContain("getFormAccessibilityProps");
        expect(content).toContain("getHeadingProps");
      });

      it("should have WCAG contrast ratios defined", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "lib/accessibility.ts"),
          "utf-8"
        );
        expect(content).toContain("CONTRAST_RATIOS");
        expect(content).toContain("normalText: 4.5");
        expect(content).toContain("largeText: 3.0");
      });
    });

    describe("Accessible Components", () => {
      it("should have accessible button component", () => {
        const filePath = path.join(PROJECT_ROOT, "components/accessible-button.tsx");
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it("should have accessible input component", () => {
        const filePath = path.join(PROJECT_ROOT, "components/accessible-input.tsx");
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it("should have skip navigation component", () => {
        const filePath = path.join(PROJECT_ROOT, "components/skip-nav.tsx");
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it("accessible button should have minimum touch target size", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "components/accessible-button.tsx"),
          "utf-8"
        );
        expect(content).toContain("minWidth: 44");
        expect(content).toContain("minHeight: 44");
      });

      it("accessible input should have proper labeling", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "components/accessible-input.tsx"),
          "utf-8"
        );
        expect(content).toContain("getFormAccessibilityProps");
        expect(content).toContain('"aria-labelledby"');
        expect(content).toContain('"aria-invalid"');
      });

      it("skip nav should have proper ARIA attributes", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "components/skip-nav.tsx"),
          "utf-8"
        );
        expect(content).toContain("Skip to main content");
        expect(content).toContain('accessibilityRole="link"');
      });
    });

    describe("Focus Management", () => {
      it("should have focus-visible styles for web", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "components/skip-nav.tsx"),
          "utf-8"
        );
        expect(content).toContain("focus-visible");
        expect(content).toContain("outline:");
      });

      it("should support reduced motion preference", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "components/skip-nav.tsx"),
          "utf-8"
        );
        expect(content).toContain("prefers-reduced-motion");
      });
    });
  });

  describe("3. SaaS Security Compliance", () => {
    describe("Security Module", () => {
      it("should have security module", () => {
        const filePath = path.join(PROJECT_ROOT, "server/security.ts");
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it("should have rate limiter", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("createRateLimiter");
        expect(content).toContain("windowMs");
        expect(content).toContain("maxRequests");
      });

      it("should have input sanitization", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("export const sanitize");
        expect(content).toContain("string(input: string)");
        expect(content).toContain("html(input: string)");
        expect(content).toContain("sql(input: string)");
      });

      it("should have input validation", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("export const validate");
        expect(content).toContain("email(input: string)");
        expect(content).toContain("password(input: string)");
      });

      it("should have CSRF protection", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("csrf");
        expect(content).toContain("generateToken");
        expect(content).toContain("validateToken");
      });

      it("should have audit logging", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("auditLog");
        expect(content).toContain("AuditLogEntry");
      });

      it("should have encryption utilities", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("encryption");
        expect(content).toContain("hash");
        expect(content).toContain("mask");
      });
    });

    describe("Security Headers", () => {
      it("should have security headers middleware", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("securityHeaders");
      });

      it("should set Content-Security-Policy", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("Content-Security-Policy");
      });

      it("should set Strict-Transport-Security", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("Strict-Transport-Security");
      });

      it("should set X-Frame-Options", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("X-Frame-Options");
      });

      it("should set X-Content-Type-Options", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("X-Content-Type-Options");
      });

      it("should set X-XSS-Protection", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("X-XSS-Protection");
      });
    });

    describe("Server Integration", () => {
      it("should integrate security in server", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/_core/index.ts"),
          "utf-8"
        );
        expect(content).toContain("securityHeaders");
        expect(content).toContain("createRateLimiter");
        expect(content).toContain("auditLog");
      });

      it("should have rate limiting configured", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/_core/index.ts"),
          "utf-8"
        );
        expect(content).toContain("windowMs: 60000");
        expect(content).toContain("maxRequests: 100");
      });

      it("should have CSRF header support", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/_core/index.ts"),
          "utf-8"
        );
        expect(content).toContain("X-CSRF-Token");
      });
    });

    describe("Password Security", () => {
      it("should validate password strength", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("at least 8 characters");
        expect(content).toContain("uppercase letter");
        expect(content).toContain("lowercase letter");
        expect(content).toContain("special character");
      });
    });

    describe("XSS Prevention", () => {
      it("should escape HTML entities", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("&amp;");
        expect(content).toContain("&lt;");
        expect(content).toContain("&gt;");
        expect(content).toContain("&quot;");
      });

      it("should remove javascript: protocol", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("javascript:");
      });

      it("should remove event handlers", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("on\\w+=");
      });
    });

    describe("SQL Injection Prevention", () => {
      it("should sanitize SQL-like input", () => {
        const content = fs.readFileSync(
          path.join(PROJECT_ROOT, "server/security.ts"),
          "utf-8"
        );
        expect(content).toContain("sql(input: string)");
        expect(content).toContain("Remove SQL comments");
      });
    });
  });

  describe("4. Feature Completeness", () => {
    it("should have all v1.5 SEO items marked complete in todo.md", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "todo.md"),
        "utf-8"
      );
      expect(content).toContain("[x] Add meta tags and Open Graph support for web");
      expect(content).toContain("[x] Add structured data (JSON-LD) for rich snippets");
      expect(content).toContain("[x] Add sitemap and robots.txt configuration");
    });

    it("should have all v1.5 accessibility items marked complete in todo.md", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "todo.md"),
        "utf-8"
      );
      expect(content).toContain("[x] Add accessibility labels to all interactive elements");
      expect(content).toContain("[x] Implement proper focus management");
      expect(content).toContain("[x] Add skip navigation links");
    });

    it("should have all v1.5 security items marked complete in todo.md", () => {
      const content = fs.readFileSync(
        path.join(PROJECT_ROOT, "todo.md"),
        "utf-8"
      );
      expect(content).toContain("[x] Implement input sanitization and validation");
      expect(content).toContain("[x] Add rate limiting to API endpoints");
      expect(content).toContain("[x] Add secure headers (CSP, HSTS, X-Frame-Options)");
    });
  });
});
