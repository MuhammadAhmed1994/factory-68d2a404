import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedUser } from '../auth/auth.guard';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { IncomingAttachmentFile } from '../attachments/attachments.service';
import { CreateTicketDto } from './ticket-creation.dto';
import { TicketCreationResult, TicketCreationService } from './ticket-creation.service';

@Controller('tickets')
@UseGuards(AuthGuard)
export class TicketCreationController {
  constructor(private readonly ticketCreationService: TicketCreationService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateTicketDto,
    @UploadedFiles() files: IncomingAttachmentFile[] | undefined,
  ): Promise<TicketCreationResult> {
    return this.ticketCreationService.create(user, input, files ?? []);
  }
}
