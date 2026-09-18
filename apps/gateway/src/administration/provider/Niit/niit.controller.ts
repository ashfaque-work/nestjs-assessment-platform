import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiHeader } from '@nestjs/swagger';
import { NiitService } from './niit.service';
import { AuthenticationGuard } from '@app/common/auth';

@ApiTags('Niit')
@Controller('niit')
export class NiitController {
	constructor(private niitService: NiitService) { }

	@Get('/userattemptdetails')
	@ApiHeader({ name: 'authtoken' })
	@UseGuards(AuthenticationGuard)
	niitUserAttemptDetails(@Headers('instancekey') instancekey: string) {
		return this.niitService.niitUserAttemptDetails({ instancekey });
	}
}
