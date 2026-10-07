import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedUser } from '../auth/auth.guard';
import {
  AttachmentMetadata,
  AttachmentsService,
  UploadedAttachmentFile,
} from './attachments.service';

@Controller('tickets/:id/attachments')
@UseGuards(AuthGuard, RolesGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('id') ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadedAttachmentFile | undefined,
  ): Promise<AttachmentMetadata> {
    return this.attachmentsService.upload(ticketId, user, file);
  }

  @Get(':attachmentId')
  async download(
    @Param('id') ticketId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    const attachment = await this.attachmentsService.download(ticketId, attachmentId, user);
    response.setHeader('Content-Type', attachment.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
    );
    response.send(attachment.bytes);
  }
}
