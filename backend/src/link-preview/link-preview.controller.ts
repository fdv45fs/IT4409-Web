import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LinkPreviewService, LinkPreviewData } from './link-preview.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('link-preview')
@Controller('link-preview')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LinkPreviewController {
    constructor(private readonly linkPreviewService: LinkPreviewService) { }

    @Get()
    @ApiOperation({
        summary: 'Get link preview',
        description: 'Fetch Open Graph metadata for a URL',
    })
    @ApiResponse({
        status: 200,
        description: 'Link preview data',
    })
    async getPreview(@Query('url') url: string): Promise<LinkPreviewData> {
        return this.linkPreviewService.getPreview(url);
    }
}
