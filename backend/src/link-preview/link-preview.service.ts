import { Injectable, BadRequestException } from '@nestjs/common';
import ogs from 'open-graph-scraper';

export interface LinkPreviewData {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
}

@Injectable()
export class LinkPreviewService {
    private cache = new Map<string, { data: LinkPreviewData; timestamp: number }>();
    private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

    async getPreview(url: string): Promise<LinkPreviewData> {
        if (!url || !this.isValidUrl(url)) {
            throw new BadRequestException('Invalid URL');
        }

        // Check cache
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }

        try {
            const { result } = await ogs({ url, timeout: 5000 });

            const preview: LinkPreviewData = {
                url,
                title: result.ogTitle || result.twitterTitle || result.dcTitle || undefined,
                description: result.ogDescription || result.twitterDescription || result.dcDescription || undefined,
                image: this.getImageUrl(result),
                siteName: result.ogSiteName || this.extractDomain(url),
                favicon: result.favicon ? this.resolveFaviconUrl(url, result.favicon) : undefined,
            };

            // Cache the result
            this.cache.set(url, { data: preview, timestamp: Date.now() });

            return preview;
        } catch (error) {
            console.error('Failed to fetch link preview:', error);
            // Return basic preview with just URL
            return {
                url,
                siteName: this.extractDomain(url),
            };
        }
    }

    private isValidUrl(url: string): boolean {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    private getImageUrl(result: any): string | undefined {
        if (result.ogImage && result.ogImage.length > 0) {
            return result.ogImage[0].url;
        }
        if (result.twitterImage && result.twitterImage.length > 0) {
            return result.twitterImage[0].url;
        }
        return undefined;
    }

    private extractDomain(url: string): string {
        try {
            const parsed = new URL(url);
            return parsed.hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    }

    private resolveFaviconUrl(baseUrl: string, favicon: string): string {
        if (favicon.startsWith('http')) {
            return favicon;
        }
        try {
            const parsed = new URL(baseUrl);
            if (favicon.startsWith('/')) {
                return `${parsed.origin}${favicon}`;
            }
            return `${parsed.origin}/${favicon}`;
        } catch {
            return favicon;
        }
    }
}
