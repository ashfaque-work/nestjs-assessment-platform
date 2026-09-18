import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { BoardInfinityService } from './boardInfinity.service';
import { AuthenticationGuard } from '@app/common/auth';

@ApiTags('BoardInfinity')
@Controller('boardInfinity')
export class BoardInfinityController {
	constructor(private boardInfinityService: BoardInfinityService) { }

	@Get('/userattemptdetails')
	@ApiHeader({ name: 'authtoken' })
	@UseGuards(AuthenticationGuard)
	ininityUserAttemptDetails(@Headers('instancekey') instancekey: string) {
		return this.boardInfinityService.ininityUserAttemptDetails({ instancekey });
	}
}
