import {
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { UploadedAttachmentFile } from '../attachments/attachments.service';
import {
  TicketCreationResult,
  TicketCreationService,
} from './ticket-creation.service';

export interface TicketCreationUploadedFiles {
  file?: UploadedAttachmentFile[];
  files?: UploadedAttachmentFile[];
  attachments?: UploadedAttachmentFile[];
}

@Controller('tickets')
@UseGuards(AuthGuard, RolesGuard)
export class TicketCreationController {
  constructor(private readonly ticketCreationService: TicketCreationService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'file' }, { name: 'files' }, { name: 'attachments' }]),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @UploadedFiles() files?: TicketCreationUploadedFiles,
  ): Promise<TicketCreationResult> {
    return this.ticketCreationService.createTicket(user, body, files);
  }
}
