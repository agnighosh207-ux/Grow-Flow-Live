import React from "react";
import { Helmet } from "react-helmet-async";

interface MetaTagsProps {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

export const MetaTags: React.FC<MetaTagsProps> = ({ 
  title = "GrowFlow AI — The #1 AI Content Generator for Indian Creators", 
  description = "Generate 30 days of viral content in minutes. Built for Indian creators to grow on Instagram, YouTube, and LinkedIn.",
  ogImage = "https://growflowai.space/og-default.png",
  canonicalUrl
}) => {
  const fullTitle = title.includes("GrowFlow") ? title : `${title} | GrowFlow AI`;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    </Helmet>
  );
};
