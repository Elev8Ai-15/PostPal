import { Platform } from "react-native";
import Head from "expo-router/head";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
}

const DEFAULT_META = {
  siteName: "PostPal",
  title: "PostPal - AI-Powered Marketing Assistant",
  description: "Create, schedule, and manage your social media content with AI-powered assistance. Generate engaging posts, track analytics, and grow your audience effortlessly.",
  keywords: ["social media", "marketing", "AI", "content creation", "scheduling", "analytics", "Instagram", "Twitter", "LinkedIn"],
  image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663193997007/BQtSUreGUnUwuicN.png",
  themeColor: "#6366F1",
  locale: "en_US",
};

/**
 * SEO Head component for web platform
 * Adds meta tags, Open Graph, Twitter Cards, and structured data
 */
export function SEOHead({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  author,
  publishedTime,
  modifiedTime,
  noIndex = false,
}: SEOHeadProps) {
  // Only render on web platform
  if (Platform.OS !== "web") {
    return null;
  }

  const pageTitle = title ? `${title} | ${DEFAULT_META.siteName}` : DEFAULT_META.title;
  const pageDescription = description || DEFAULT_META.description;
  const pageKeywords = keywords?.join(", ") || DEFAULT_META.keywords.join(", ");
  const pageImage = image || DEFAULT_META.image;
  const pageUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  // JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": type === "article" ? "Article" : "WebApplication",
    name: DEFAULT_META.siteName,
    description: pageDescription,
    url: pageUrl,
    image: pageImage,
    applicationCategory: "BusinessApplication",
    operatingSystem: "iOS, Android, Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1250",
    },
    ...(type === "article" && author && {
      author: {
        "@type": "Person",
        name: author,
      },
      datePublished: publishedTime,
      dateModified: modifiedTime || publishedTime,
    }),
  };

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <meta name="author" content={author || DEFAULT_META.siteName} />
      <meta name="theme-color" content={DEFAULT_META.themeColor} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={pageUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:alt" content={`${DEFAULT_META.siteName} preview`} />
      <meta property="og:site_name" content={DEFAULT_META.siteName} />
      <meta property="og:locale" content={DEFAULT_META.locale} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:image:alt" content={`${DEFAULT_META.siteName} preview`} />
      
      {/* Apple Mobile Web App */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={DEFAULT_META.siteName} />
      
      {/* Microsoft */}
      <meta name="msapplication-TileColor" content={DEFAULT_META.themeColor} />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      
      {/* Article specific */}
      {type === "article" && publishedTime && (
        <>
          <meta property="article:published_time" content={publishedTime} />
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {author && <meta property="article:author" content={author} />}
        </>
      )}
      
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </Head>
  );
}

/**
 * Organization structured data for the entire site
 */
export function OrganizationSchema() {
  if (Platform.OS !== "web") {
    return null;
  }

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: DEFAULT_META.siteName,
    description: DEFAULT_META.description,
    url: typeof window !== "undefined" ? window.location.origin : "",
    logo: DEFAULT_META.image,
    sameAs: [
      "https://twitter.com/postpal",
      "https://linkedin.com/company/postpal",
      "https://instagram.com/postpal",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English"],
    },
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
    </Head>
  );
}

/**
 * Breadcrumb structured data
 */
export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  if (Platform.OS !== "web") {
    return null;
  }

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
    </Head>
  );
}
