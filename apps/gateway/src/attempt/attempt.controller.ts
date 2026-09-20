import { AuthenticationGuard, RolesGuard, SelfOrStaffGuard, OwnRecordInterceptor, HideOthersContactInterceptor } from "@app/common/auth";
import { Roles } from "@app/common/decorators";
import {
    ClassroomListSubjectStudentDoRequest, CountAllByTeacherRequest, CountAllRequest, CountMeRequest, CreateRequest,
    FindAllByMeRequest, FindAllByTeacherRequest, FindOneRequest, FinishPsychoTestRequest, FinishRequest,
    GetAccuracyPercentileRequest, GetAccuracyRankRequest, GetCareerAttemptsRequest, GetLastByMeRequest,
    GetListAvgSpeedByPracticeRequest, GetListPercentCorrectByPracticeRequest, GetListSubjectsMeRequest,
    GetListSubjectsStudentRequest, GetListTopicsMeRequest, GetListTopicsStudentRequest, GetProctoringAttemptRequest,
    GetResultPracticeRequest, GetSpeedRankRequest, GetTotalQuestionBySubjectStudentRequest, GetTotalQuestionTopicMeRequest,
    GetTotalQuestionTopicStudentRequest, InvitationRequest, PartialSubmitAttemptRequest, QuestionByConfidenceRequest,
    QuestionSubmitRequest, RecordQuestionReviewRequest, ResetItemInQueueRequest, SaveCamCaptureRequest, SaveQrUploadRequest, SaveScreenRecordingRequest, StartRequest,
    SubmitToQueueRequest, SubmitToQueueRequestBody, SummaryAbondonedMeRequest, SummaryAbondonedStudentRequest, SummaryAttemptedBySubjectMeRequest,
    SummaryAttemptedBySubjectStudentRequest, SummaryAttemptedPracticeRequest, SummaryAttemptedStudentRequest,
    SummaryCorrectByDateMeRequest, SummaryDoPracticeRequest, SummaryOnePracticeSetRequest, SummaryPracticeMeRequest,
    SummaryPracticeStudentRequest, SummaryQuestionBySubjectMeRequest, SummaryQuestionBySubjectStudentRequest,
    SummaryQuestionByTopicMeRequest, SummaryQuestionByTopicStudentRequest, SummarySpeedTopicByDateMeRequest,
    SummarySpeedTopicByDateStudentRequest, SummarySubjectCorrectByDateMeRequest, SummarySubjectCorrectMeRequest,
    SummarySubjectCorrectStudentRequest, SummarySubjectSpeedByDateMeRequest, SummarySubjectSpeedByDateStudentRequest,
    SummarySubjectSpeedMeRequest, SummarySubjectSpeedStudentRequest, SummaryTopicCorrectMeRequest, SummaryTopicCorrectStudentRequest,
    SummaryTopicSpeedMeRequest, UpdateAbandonStatusRequest, UpdateSuspiciousRequest
} from "@app/common/dto/attempt.dto";
import { Body, Controller, ForbiddenException, Get, Headers, Ip, Param, Post, Put, Query, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiHeader, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AttemptService } from "./attempt.service";


@ApiTags('Attempt')
@Controller('attempt')
export class AttemptController {
    constructor(private attemptService: AttemptService) { }

    @Get('/me')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    findAllByMe(@Headers('instancekey') instancekey: string, @Query() query: FindAllByMeRequest, @Req() req) {
        return this.attemptService.findAllByMe({ instancekey, ...query, userId: req.user._id, userSubjects: req.user.subjects })
    }

    @Get('/me/first')
    @ApiHeader({ name: 'authtoken' })
    @Roles(['student'])
    @UseGuards(AuthenticationGuard, RolesGuard)
    getFirstAttempt(@Headers('instancekey') instancekey: string, @Req() req) {
        return this.attemptService.getFirstAttempt({ userId: req.user._id, instancekey })
    }

    @Get('/me/findOne/:id')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    @UseInterceptors(OwnRecordInterceptor)
    findOneByMe(@Headers('instancekey') instancekey: string, @Param('id') attemptId: string) {
        return this.attemptService.findOneByMe({ instancekey, attemptId });
    }

    @Get('/me/findQuestionFeedback/:id')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    findQuestionFeedback(@Headers('instancekey') instancekey: string, @Param('id') attemptId: string) {
        return this.attemptService.findQuestionFeedback({ instancekey, attemptId })
    }

    @Get('/me/findOneAttempt/:id')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    findOneAttemptByMe(@Headers('instancekey') instancekey: string, @Param('id') attemptId: string, @Req() req) {
        return this.attemptService.findOneAttemptByMe({ instancekey, attemptId, userId: req.user._id })
    }

    @Get('/isAllowDoTest/:practice')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    isAllowDoTest(@Headers('instancekey') instancekey: string, @Param('practice') practiceId: string, @Req() req) {
        return this.attemptService.isAllowDoTest({ instancekey, practiceId, userId: req.user._id })
    }

    @Get('/studentOfTeacher/:id')
    @ApiHeader({ name: 'authtoken' })
    @Roles(['teacher'])
    @UseGuards(AuthenticationGuard, RolesGuard)
    findAllByTeacher(@Headers('instancekey') instancekey: string, @Query() query: FindAllByTeacherRequest, @Param('id') user: string, @Req() req) {
        return this.attemptService.findAllByTeacher({ instancekey, ...query, user, userId: req.user._id, userSubjects: req.user.subjects })
    }

    @Get('/getCurrentDate')
    getCurrentDate() {
        return this.attemptService.getCurrentDate()
    }

    @Get('/countStudentOfTeacher')
    @ApiHeader({ name: 'authtoken' })
    @Roles(['teacher'])
    @UseGuards(AuthenticationGuard, RolesGuard)
    countAllByTeacher(@Headers('instancekey') instancekey: string, @Query() query: CountAllByTeacherRequest, @Req() req) {
        return this.attemptService.countAllByTeacher({ instancekey, ...query, userId: req.user._id, userSubjects: req.user.subjects })
    }

    @Get('/countMe')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    countMe(@Headers('instancekey') instancekey: string, @Query() query: CountMeRequest, @Req() req) {
        return this.attemptService.countMe({ instancekey, ...query, userId: req.user._id })
    }

    @Get('/countAll')
    countAll(@Headers('instancekey') instancekey: string, @Query() query: CountAllRequest) {
        return this.attemptService.countAll({ ...query, instancekey })
    }

    // Every student's attempts at a test, with names and emails: for the people who run it
    @Get('/results/:practicesetId')
    @ApiHeader({ name: 'authtoken' })
    @Roles(['teacher', 'mentor', 'publisher', 'admin', 'operator', 'centerHead', 'director', 'support'])
    @UseGuards(AuthenticationGuard, RolesGuard)
    findAllByPractice(@Headers('instancekey') instancekey: string, @Param('practicesetId') practicesetId: string) {
        return this.attemptService.findAllByPractice({ instancekey, practicesetId })
    }

    // Every student's attempts at a test, with names and emails: for the people who run it
    @Get('/practiceset/:practicesetId')
    @ApiHeader({ name: 'authtoken' })
    @Roles(['teacher', 'mentor', 'publisher', 'admin', 'operator', 'centerHead', 'director', 'support'])
    @UseGuards(AuthenticationGuard, RolesGuard)
    findAllByPracticeSet(@Headers('instancekey') instancekey: string, @Param('practicesetId') practicesetId: string) {
        return this.attemptService.findAllByPractice({ instancekey, practicesetId })
    }

    @Get('/getResultPractice/:id')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getResultPractice(@Headers('instancekey') instancekey: string, @Param('id') practicesetId: string, @Query() query: GetResultPracticeRequest, @Req() req) {
        return this.attemptService.getResultPractice({ instancekey, attemptId: query.attemptId, practicesetId, userId: req.user._id })
    }

    @Get('/getLastByMe')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getLastByMe(@Headers('instancekey') instancekey: string, @Query() query: GetLastByMeRequest, @Req() req) {
        return this.attemptService.getLastByMe({ instancekey, ...query, userId: req.user._id })
    }

    @Get('/getLastByStudent/:id')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('id'))
    getLastByStudent(@Headers('instancekey') instancekey: string, @Param('id') userId: string) {
        return this.attemptService.getLastByStudent({ instancekey, userId })
    }

    @Get('/getListavgSpeedByPractice/:practice')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getListAvgSpeedByPractice(@Headers('instancekey') instancekey: string, @Param('practice') practicesetId: string, @Query() query: GetListAvgSpeedByPracticeRequest) {
        return this.attemptService.getListAvgSpeedByPractice({ ...query, instancekey, practicesetId })
    }

    @Get('/getListPercentCorrectByPractice/:practice')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getListPercentCorrectByPractice(@Headers('instancekey') instancekey: string, @Param('practice') practicesetId: string, @Query() query: GetListPercentCorrectByPracticeRequest) {
        return this.attemptService.getListPercentCorrectByPractice({ instancekey, ...query, practicesetId })
    }

    @Get('allProviders')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getAllProviders(@Headers('instancekey') instancekey: string) {
        return this.attemptService.getAllProviders({ instancekey })
    }

    @Get('/psychoClassroom/:testId')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    @ApiParam({ name: 'testId', description: 'practicesetId', type: String })
    getPsychoClassroom(@Headers('instancekey') instancekey: string, @Param('testId') practiceset: string, @Req() req) {
        return this.attemptService.getPsychoClassroom({ instancekey, practiceset, userRole: req.user.role, userId: req.user._id, locations: req.user.locations })
    }

    @Get("/me/invitation/:id")
    @ApiHeader({ name: 'authtoken' })
    @Roles(['teacher'])
    @UseGuards(AuthenticationGuard, RolesGuard)
    invitation(@Headers('instancekey') instancekey: string, @Query() query: InvitationRequest, @Param('id') attemptId: string, @Req() req) {
        return this.attemptService.invitation({ instancekey, attemptId, ...query, userId: req.user._id })
    }

    @Get('/findAllNotCreatedBy')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    findAllNotCreatedBy(@Headers('instancekey') instancekey: string) {
        return this.attemptService.findAllNotCreatedBy({ instancekey });
    }

    @Get('/me/getListSubjects')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getListSubjectsMe(@Headers('instancekey') instancekey: string, @Query() query: GetListSubjectsMeRequest, @Req() req) {
        return this.attemptService.getListSubjectsMe({ instancekey, ...query, userId: req.user._id, userSubjects: req.user.subjects })
    }

    @Get('/me/getTotalQuestionTopic')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getTotalQuestionTopic(@Headers('instancekey') instancekey: string, @Query() query: GetTotalQuestionTopicMeRequest, @Req() req) {
        return this.attemptService.getTotalQuestionTopicMe({ instancekey, ...query, userId: req.user._id, })
    }

    @Get('/me/getTotalQuestionBySubject')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getTotalQuestionBySubjectMe(@Headers('instancekey') instancekey: string, @Req() req) {
        return this.attemptService.getTotalQuestionBySubjectMe({ instancekey, userId: req.user._id })
    }

    @Get("/me/getListTopics")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getListTopics(@Headers('instancekey') instancekey: string, @Req() req, @Query() query: GetListTopicsMeRequest) {
        return this.attemptService.getListTopicsMe({ instancekey, userId: req.user._id, ...query })
    }

    @Get("/me/summaryTopicCorrect")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summaryTopicCorrectMe(@Headers('instancekey') instancekey: string, @Query() query: SummaryTopicCorrectMeRequest, @Req() req) {
        return this.attemptService.summaryTopicCorrectMe({ instancekey, userId: req.user._id, ...query })
    }

    @Get("/me/summaryTopicSpeed")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summaryTopicSpeed(@Headers('instancekey') instancekey: string, @Query() query: SummaryTopicSpeedMeRequest, @Req() req) {
        return this.attemptService.summaryTopicSpeedMe({ instancekey, userId: req.user._id, ...query });
    }

    @Get("/me/summarySubjectCorrect")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summarySubjectCorrectMe(@Headers('instancekey') instancekey: string, @Query() query: SummarySubjectCorrectMeRequest, @Req() req) {
        return this.attemptService.summarySubjectCorrectMe({ instancekey, ...query, userId: req.user._id })
    }

    @Get("/me/summarySubjectCorrectByDate")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summarySubjectCorrectByDateMe(@Headers('instancekey') instancekey: string, @Headers('timezoneoffset') timezoneoffset: number, @Query() query: SummarySubjectCorrectByDateMeRequest, @Req() req) {
        return this.attemptService.summarySubjectCorrectByDateMe({ instancekey, ...query, userId: req.user._id, timezoneoffset, userSubjects: req.user.subjects })
    }

    @Get("/me/summaryCorrectByDate")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summaryCorrectByDateMe(@Headers('instancekey') instancekey: string, @Headers('timezoneoffset') timezoneoffset: number, @Query() query: SummaryCorrectByDateMeRequest, @Req() req) {
        return this.attemptService.summaryCorrectByDateMe({ instancekey, timezoneoffset, userId: req.user._id, ...query })
    }

    @Get("/me/summarySubjectSpeedByDate")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summarySubjectSpeedByDateMe(@Headers('instancekey') instancekey: string, @Headers('timezoneoffset') timezoneoffset: number, @Query() query: SummarySubjectSpeedByDateMeRequest, @Req() req) {
        return this.attemptService.summarySubjectSpeedByDateMe({ instancekey, ...query, userId: req.user._id, timezoneoffset })
    }

    @Get("/me/summaryAttemptedBySubject")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summaryAttemptedBySubjectMe(@Headers('instancekey') instancekey: string, @Query() query: SummaryAttemptedBySubjectMeRequest, @Req() req) {
        return this.attemptService.summaryAttemptedBySubjectMe({ instancekey, ...query, userId: req.user._id })
    }

    @Get("/me/summarySubjectSpeed")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summarySubjectSpeedMe(@Headers('instancekey') instancekey: string, @Query() query: SummarySubjectSpeedMeRequest, @Req() req) {
        return this.attemptService.summarySubjectSpeedMe({ instancekey, ...query, userId: req.user._id })
    }

    @Get("/me/summaryQuestionByTopic")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summaryQuestionByTopicMe(@Headers('instancekey') instancekey: string, @Query() query: SummaryQuestionByTopicMeRequest, @Req() req) {
        return this.attemptService.summaryQuestionByTopicMe({ instancekey, ...query, userId: req.user._id })
    }

    @Get("/me/summaryAbondoned")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summaryAbondoned(@Headers('instancekey') instancekey: string, @Query() query: SummaryAbondonedMeRequest, @Req() req) {
        return this.attemptService.summaryAbondonedMe({ instancekey, ...query, userId: req.user._id })
    }

    @Get("/me/summaryPractice")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summaryPracticeMe(@Headers('instancekey') instancekey: string, @Query() query: SummaryPracticeMeRequest, @Req() req) {
        return this.attemptService.summaryPracticeMe({ instancekey, ...query, userId: req.user._id })
    }

    @Get("/me/summaryQuestionBySubject")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summaryQuestionBySubject(@Headers('instancekey') instancekey: string, @Query() query: SummaryQuestionBySubjectMeRequest, @Req() req) {
        return this.attemptService.summaryQuestionBySubjectMe({ instancekey, ...query, userId: req.user._id })
    }

    @Get("/me/summaryDoPractice")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summaryDoPractice(@Headers('instancekey') instancekey: string, @Query() query: SummaryDoPracticeRequest, @Req() req) {
        return this.attemptService.summaryDoPractice({ instancekey, ...query, userId: req.user._id })
    }

    @Get("/me/QuestionByConfidence")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    questionByConfidence(@Headers('instancekey') instancekey: string, @Query() query: QuestionByConfidenceRequest) {
        return this.attemptService.questionByConfidence({ instancekey, ...query })
    }

    @Get("/me/summarySpeedTopicByDate")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summarySpeedTopicByDateMe(@Headers('instancekey') instancekey: string, @Headers('timezoneoffset') timezoneoffset: number, @Query() query: SummarySpeedTopicByDateMeRequest, @Req() req) {
        return this.attemptService.summarySpeedTopicByDateMe({ instancekey, timezoneoffset, userId: req.user._id, ...query })
    }

    @Get("/me/getSpeedRank/:practice")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getSpeedRank(@Headers('instancekey') instancekey: string, @Param('practice') practicesetId: string, @Query() query: GetSpeedRankRequest, @Req() req) {
        return this.attemptService.getSpeedRank({ instancekey, practicesetId, ...query, userId: req.user._id })
    }

    @Get("/me/getAccuracyRank/:practice")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getAccuracyRank(@Headers('instancekey') instancekey: string, @Param('practice') practicesetId: string, @Query() query: GetAccuracyRankRequest, @Req() req) {
        return this.attemptService.getAccuracyRank({ instancekey, practicesetId, ...query, userId: req.user._id });
    }

    @Get("/getAccuracyPercentile/:attempt")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    getAccuracyPercentile(@Headers('instancekey') instancekey: string, @Param('attempt') attemptId: string, @Query() query: GetAccuracyPercentileRequest,) {
        return this.attemptService.getAccuracyPercentile({ instancekey, ...query, attemptId });
    }

    @Get('/classroom/listTopicStudentDo')
    @ApiQuery({ name: "classroom", required: true })
    @ApiQuery({ name: "lastDay", required: false })
    @ApiQuery({ name: "subjects", required: false })
    @ApiQuery({ name: "locations", required: false })
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    classroomListTopicStudentDo(
        @Headers('instancekey') instancekey: string, @Query('lastDay') lastDay: string, @Req() req: any,
        @Query('classroom') classroom: string, @Query('subjects') subjects: string, @Query('locations') locations: string,
    ) {
        return this.attemptService.classroomListTopicStudentDo(
            { instancekey, query: { subjects, classroom, lastDay, locations }, user: req.user }
        );
    }

    @Get('/classroom/summaryQuestionBySubject')
    @ApiQuery({ name: "classroom", required: true })
    @ApiQuery({ name: "lastDay", required: false })
    @ApiQuery({ name: "subjects", required: false })
    @ApiQuery({ name: "locations", required: false })
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    classroomSummaryQuestionBySubject(
        @Headers('instancekey') instancekey: string, @Query('lastDay') lastDay: string, @Req() req: any,
        @Query('classroom') classroom: string, @Query('subjects') subjects: string, @Query('locations') locations: string
    ) {
        return this.attemptService.classroomSummaryQuestionBySubject(
            { instancekey, query: { subjects, classroom, lastDay, locations }, user: req.user }
        );
    }

    @Get('/classroom/summaryAttempted')
    @ApiQuery({ name: "classroom", required: true })
    @ApiQuery({ name: "lastDay", required: false })
    @ApiQuery({ name: "subjects", required: false })
    @ApiQuery({ name: "locations", required: false })
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    classroomSummaryAttempted(
        @Headers('instancekey') instancekey: string, @Query('lastDay') lastDay: string, @Req() req: any,
        @Query('classroom') classroom: string, @Query('subjects') subjects: string, @Query('locations') locations: string
    ) {
        return this.attemptService.classroomSummaryAttempted(
            { instancekey, query: { subjects, classroom, lastDay, locations }, user: req.user }
        );
    }

    @Get('/classroom/summaryAttemptedAllClassrooms')
    @ApiQuery({ name: "classroom", required: true })
    @ApiQuery({ name: "lastDay", required: false })
    @ApiQuery({ name: "subjects", required: false })
    @ApiQuery({ name: "locations", required: false })
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    classroomSummaryAttemptedAllClassrooms(
        @Headers('instancekey') instancekey: string, @Query('lastDay') lastDay: string, @Req() req: any,
        @Query('classroom') classroom: string, @Query('subjects') subjects: string, @Query('locations') locations: string
    ) {
        return this.attemptService.classroomSummaryAttemptedAllClassrooms(
            { instancekey, query: { subjects, classroom, lastDay, locations }, user: req.user }
        );
    }

    @Get('/classroom/summaryQuestionByTopic')
    @ApiQuery({ name: "classroom", required: true })
    @ApiQuery({ name: "lastDay", required: false })
    @ApiQuery({ name: "subjects", required: false })
    @ApiQuery({ name: "locations", required: false })
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    classroomSummaryQuestionByTopic(
        @Headers('instancekey') instancekey: string, @Query('lastDay') lastDay: string, @Req() req: any,
        @Query('classroom') classroom: string, @Query('subjects') subjects: string, @Query('locations') locations: string
    ) {
        return this.attemptService.classroomSummaryQuestionByTopic(
            { instancekey, query: { subjects, classroom, lastDay, locations }, user: req.user }
        );
    }

    @Get('/classroom/summaryCorrect')
    @ApiQuery({ name: "classroom", required: true })
    @ApiQuery({ name: "lastDay", required: false })
    @ApiQuery({ name: "subjects", required: false })
    @ApiQuery({ name: "locations", required: false })
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    classroomSummaryCorrect(
        @Headers('instancekey') instancekey: string, @Query('lastDay') lastDay: string, @Req() req: any,
        @Query('classroom') classroom: string, @Query('subjects') subjects: string, @Query('locations') locations: string
    ) {
        return this.attemptService.classroomSummaryCorrect(
            { instancekey, query: { subjects, classroom, lastDay, locations }, user: req.user }
        );
    }

    @Get('/classroom/summaryCorrectByDate')
    @ApiQuery({ name: "classroom", required: true })
    @ApiQuery({ name: "lastDay", required: false })
    @ApiQuery({ name: "subjects", required: false })
    @ApiQuery({ name: "topic", required: false })
    @ApiQuery({ name: "locations", required: false })
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    classroomSummaryCorrectByDate(
        @Headers('instancekey') instancekey: string, @Query('lastDay') lastDay: string, @Req() req: any,
        @Query('classroom') classroom: string, @Query('subjects') subjects: string,
        @Query('locations') locations: string, @Query('topic') topic: string
    ) {
        return this.attemptService.classroomSummaryCorrectByDate(
            { instancekey, query: { subjects, classroom, lastDay, locations, topic }, user: req.user }
        );
    }

    @Get("/classroom/:classroom/listSubjectStudentDo")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    classroomListSubjectStudentDo(@Headers('instancekey') instancekey: string, @Param('classroom') classroomId: string, @Query() query: ClassroomListSubjectStudentDoRequest, @Req() req) {
        return this.attemptService.classroomListSubjectStudentDo({ instancekey, ...query, classroomId, userId: req.user._id })
    }

    @Get('/classroom/:classroom/summarySpeed')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    @ApiParam({ name: 'classroom', description: "ClassroomId" })
    @ApiQuery({ name: "lastDay", required: false })
    @ApiQuery({ name: "subjects", required: false })
    classroomSummarySpeed(
        @Headers('instancekey') instancekey: string, @Param('classroom') classroom: string,
        @Query('subjects') subjects: string, @Query('lastDay') lastDay: string, @Req() req
    ) {
        return this.attemptService.classroomSummarySpeed({ instancekey, query: { subjects, lastDay }, classroom, user: req.user });
    }

    @Get('/classroom/:classroom/summarySpeedByDate')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    @ApiParam({ name: 'classroom', description: "ClassroomId" })
    @ApiQuery({ name: "lastDay", required: false })
    @ApiQuery({ name: "subjects", required: false })
    @ApiQuery({ name: "topic", required: false })
    classroomSummarySpeedByDate(
        @Headers('instancekey') instancekey: string, @Param('classroom') classroom: string,
        @Query('lastDay') lastDay: string, @Query('subjects') subjects: string,
        @Query('topic') topic: string, @Req() req
    ) {
        return this.attemptService.classroomSummarySpeedByDate({ instancekey, query: { lastDay, subjects, topic }, classroom, user: req.user });
    }

    @Get('/test')
    @ApiQuery({ name: 'classroom', required: false, description: "ClassroomId" })
    @ApiQuery({ name: "locations", required: false })
    @ApiQuery({ name: "name", required: false })
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    test(
        @Headers('instancekey') instancekey: string, @Query('classroom') classroom: string,
        @Query('locations') locations: string, @Query('name') name: string, @Req() req
    ) {
        return this.attemptService.test({ instancekey, query: { classroom, name, locations }, user: req.user });
    }

    @Get("/student/:user/getListSubjects")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    getListSubjectsStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: GetListSubjectsStudentRequest) {
        return this.attemptService.getListSubjectsStudent({ instancekey, user, ...query })
    }

    @Get("student/:user/getTotalQuestionTopic")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    getTotalQuestionTopicStudent(@Headers("instancekey") instancekey: string, @Param('user') user: string, @Query() query: GetTotalQuestionTopicStudentRequest) {
        return this.attemptService.getTotalQuestionTopicStudent({ instancekey, user, ...query })
    }

    @Get("/student/:user/getTotalQuestionBySubject")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    getTotalQuestionBySubjectStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: GetTotalQuestionBySubjectStudentRequest) {
        return this.attemptService.getTotalQuestionBySubjectStudent({ instancekey, user, ...query })
    }

    @Get("/student/:user/getListTopics")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    getListTopicsStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: GetListTopicsStudentRequest) {
        return this.attemptService.getListTopicsStudent({ instancekey, user, ...query })
    }

    @Get("/student/:user/summaryTopicSpeed")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summaryTopicSpeedStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: SummaryTopicSpeedMeRequest, @Req() req) {
        return this.attemptService.summaryTopicSpeedStudent({ instancekey, user, ...query });
    }

    @Get("/student/:user/summaryTopicCorrect")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summaryTopicCorrectStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: SummaryTopicCorrectStudentRequest) {
        return this.attemptService.summaryTopicCorrectStudent({ instancekey, user, ...query });
    }

    @Get("/student/:user/summarySubjectCorrect")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summarySubjectCorrectStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: SummarySubjectCorrectStudentRequest) {
        return this.attemptService.summarySubjectCorrectStudent({ instancekey, user, ...query });
    }

    @Get("/student/:user/summarySubjectCorrectByDate")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summarySubjectCorrectByDateStudent(@Headers('instancekey') instancekey: string, @Headers('timezoneoffset') timezoneoffset: number, @Param('user') user: string, @Query() query: SummarySubjectCorrectByDateMeRequest) {
        return this.attemptService.summarySubjectCorrectByDateStudent({ instancekey, timezoneoffset, user, ...query })
    }

    @Get("/student/:user/summarySubjectSpeedByDate")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summarySubjectSpeedByDateStudent(@Headers('instancekey') instancekey: string, @Headers('timezoneoffset') timezoneoffset: number, @Param('user') user: string, @Query() query: SummarySubjectSpeedByDateStudentRequest) {
        return this.attemptService.summarySubjectSpeedByDateStudent({ instancekey, timezoneoffset, user, ...query })
    }

    @Get("/student/:user/summaryCorrectByDate")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summarySubjectCorrect(@Headers('instancekey') instancekey: string, @Headers('timezoneoffset') timezoneoffset: number, @Query() query: SummarySubjectCorrectStudentRequest, @Param('user') user: string) {
        return this.attemptService.summaryCorrectByDateStudent({ instancekey, timezoneoffset, user, ...query })
    }

    @Get("/student/:user/summaryAttemptedBySubject")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summaryAttemptedBySubjectStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: SummaryAttemptedBySubjectStudentRequest) {
        return this.attemptService.summaryAttemptedBySubjectStudent({ instancekey, user, ...query })
    }

    @Get("/student/:user/summarySubjectSpeed")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summarySubjectSpeedStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: SummarySubjectSpeedStudentRequest) {
        return this.attemptService.summarySubjectSpeedStudent({ instancekey, user, ...query })
    }

    @Get("/student/:user/summaryAbondoned")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summaryAbondonedStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: SummaryAbondonedStudentRequest) {
        return this.attemptService.summaryAbondonedStudent({ instancekey, user, ...query })
    }

    @Get("/student/:user/summaryPractice")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summaryPracticeStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: SummaryPracticeStudentRequest) {
        return this.attemptService.summaryPracticeStudent({ instancekey, user, ...query });
    }


    @Get("/student/:user/summaryAttempted")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summaryAttemptedStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: SummaryAttemptedStudentRequest) {
        return this.attemptService.summaryAttemptedStudent({ instancekey, user, ...query });
    }

    @Get('/student/:user/summaryQuestionBySubject')
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summaryQuestionBySubjectStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: SummaryQuestionBySubjectStudentRequest) {
        return this.attemptService.summaryQuestionBySubjectStudent({ instancekey, user, ...query });
    }

    @Get('/student/:user/summarySpeedTopicByDate')
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summarySpeedTopicByDateStudent(@Headers('instancekey') instancekey: string, @Param("user") user: string, @Query() query: SummarySpeedTopicByDateStudentRequest) {
        return this.attemptService.summarySpeedTopicByDateStudent({ instancekey, user, ...query });
    }

    @Get('/student/:user/summaryQuestionByTopic')
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summaryQuestionByTopicStudent(@Headers('instancekey') instancekey: string, @Param("user") user: string, @Query() query: SummaryQuestionByTopicStudentRequest) {
        return this.attemptService.summaryQuestionByTopicStudent({ instancekey, user, ...query })
    }

    @Get("/student/:user/summaryDoPractice")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    summaryDoPracticeStudent(@Headers('instancekey') instancekey: string, @Param('user') user: string, @Query() query: SummaryDoPracticeRequest) {
        return this.attemptService.summaryDoPractice({ instancekey, user, ...query })
    }

    @Get("/student/:user/getSpeedRank/:practice")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    getSpeedRankStudent(@Headers('instancekey') instancekey: string, @Param('practice') practicesetId: string, @Query() query: GetSpeedRankRequest, @Param('user') user: string) {
        return this.attemptService.getSpeedRank({ instancekey, practicesetId, ...query, user })
    }

    @Get("/student/:user/getAccuracyRank/:practice")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('user'))
    getAccuracyRankStudent(@Headers('instancekey') instancekey: string, @Param('practice') practicesetId: string, @Query() query: GetAccuracyRankRequest, @Param('user') user: string) {
        return this.attemptService.getAccuracyRank({ instancekey, practicesetId, ...query, user });
    }

    @Get("/me/analysisByComplexity/:id")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    questionByComplexity(@Headers('instancekey') instancekey: string, @Param('id') attemptId: string) {
        return this.attemptService.questionByComplexity({ instancekey, attemptId });
    }

    @Get("/proctoring/:userId")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard, SelfOrStaffGuard('userId'))
    getProctoringAttempt(@Headers('instancekey') instancekey: string, @Param("userId") userId: string, @Query() query: GetProctoringAttemptRequest) {
        return this.attemptService.getProctoringAttempt({ instancekey, userId, ...query })
    }

    @Get("/summaryOnePracticeSet/:id")
    @ApiHeader({ name: 'authtoken' })
    @Roles(["teacher"])
    @UseGuards(AuthenticationGuard, RolesGuard)
    summaryOnePracticeSet(@Headers('instancekey') instancekey: string, @Param('id') practicesetId: string, @Query() query: SummaryOnePracticeSetRequest) {
        return this.attemptService.summaryOnePracticeSet({ instancekey, practicesetId, ...query });
    }

    @Get('/summaryAttemtedPractice/:id')
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    @UseInterceptors(HideOthersContactInterceptor)
    summaryAttemptedPractice(@Headers('instancekey') instancekey: string, @Param('id') practicesetId: string, @Query() query: SummaryAttemptedPracticeRequest) {
        return this.attemptService.summaryAttemptedPractice({ instancekey, practicesetId, ...query });
    }

    @Get("/countStudentAttmepted")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    countStudentAttempted(@Headers('instancekey') instancekey: string, @Req() req) {
        return this.attemptService.countStudentAttempted({ instancekey, userId: req.user._id })
    }

    @Get('/countSummaryAttemtedPractice/:id')
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    countSummaryAttemptedPractice(@Headers('instancekey') instancekey: string, @Param('id') practicesetId: string) {
        return this.attemptService.countSummaryAttemptedPractice({ instancekey, practicesetId });
    }

    @Get("/countByUser")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    countByUser(@Headers('instancekey') instancekey: string, @Req() req) {
        return this.attemptService.countByUser({ instancekey, userId: req.user._id })
    }

    @Get("/careerSum")
    @ApiHeader({ name: 'authtoken', required: true })
    @Roles(["admin"])
    @UseGuards(AuthenticationGuard, RolesGuard)
    getCareerSum(@Headers('instancekey') instancekey: string) {
        return this.attemptService.getCareerSum({ instancekey })
    }

    @Get('/careerAttempts')
    @ApiHeader({ name: 'authtoken', required: true })
    @Roles(["admin"])
    @UseGuards(AuthenticationGuard, RolesGuard)
    getCareerAttempts(@Headers('instancekey') instancekey: string, @Query() query: GetCareerAttemptsRequest) {
        return this.attemptService.getCareerAttempts({ instancekey, ...query })
    }

    @Get("/classroomByTest/:id")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    @ApiParam({ name: "id", description: "practicesetId" })
    getClassroomByTest(@Headers("instancekey") instancekey: string, @Param("id") practicesetId: string, @Req() req) {
        return this.attemptService.getClassroomByTest({ instancekey, practicesetId, userRole: req.user.role, userId: req.user._id, location: req.user.locations })
    }

    @Get("/findAttempt/:id")
    @ApiParam({ name: "id", description: "Attempt Id" })
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    @UseInterceptors(OwnRecordInterceptor)
    findOneAttempt(@Headers("instancekey") instancekey: string, @Param("id") attemptId: string) {
        return this.attemptService.findOneAttempt({ instancekey, attemptId })
    }

    @Get('psychoResult/:id')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    @ApiParam({ name: "id", description: "Psychoresult Id" })
    @UseInterceptors(OwnRecordInterceptor)
    getPsychoResult(@Headers("instancekey") instancekey: string, @Param('id') psychoResultId: string) {
        return this.attemptService.getPsychoResult({ instancekey, psychoResultId });
    }

    @Get('/psychoResultByTest/:testId')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    findPsychoResultByTest(@Headers("instancekey") instancekey: string, @Param('testId') practicesetId: string, @Req() req) {
        return this.attemptService.findPsychoResultByTest({ instancekey, practicesetId, userId: req.user._id })
    }

    @Get("/get-one/:id")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    @UseInterceptors(OwnRecordInterceptor)
    getAttempt(@Headers('instancekey') instancekey: string, @Param('id') attemptId: string) {
        return this.attemptService.getAttempt({ instancekey, attemptId })
    }

    @Get("/me/summaryAllSubjectCorrectByDate")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    summaryAllSubjectCorrectByDateMe(
        @Headers('instancekey') instancekey: string, @Headers('timezoneoffset') timezoneoffset: number,
        @Query() query: SummarySubjectCorrectByDateMeRequest, @Req() req
    ) {
        return this.attemptService.summaryAllSubjectCorrectByDateMe(
            { instancekey, ...query, userId: req.user._id, timezoneoffset, userSubjects: req.user.subjects }
        )
    }

    @Get("/calculateTotalSatScore/:attempt")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    calculateSatTotalScore(@Param('attempt') attempt: string, @Headers('instancekey') instancekey: string) {
        return this.attemptService.calculateSatTotalScore({ instancekey, attempt })
    }

    @Get("/getAttemptByUser")
    @ApiQuery({ name: "type", required: true, type: String })
    @ApiQuery({ name: "practicesetId", required: true, type: String })
    @ApiQuery({ name: "id", required: true, type: String })
    @ApiHeader({ name: 'authtoken', required: true, })
    @UseGuards(AuthenticationGuard)
    getAttemptByUser(
        @Headers('instancekey') instancekey: string, @Query('type') type: string,
        @Query('practicesetId') practicesetId: string, @Query('id') id: string,
    ) {
        return this.attemptService.getAttemptByUser({ instancekey, query: { type, practicesetId, id } })
    }

    @Get("/me/topperSummary/:testId")
    @ApiHeader({ name: 'authtoken', required: true, })
    @UseGuards(AuthenticationGuard)
    topperSummary(@Param('testId') testId: string, @Headers('instancekey') instancekey: string) {
        return this.attemptService.topperSummary({ instancekey, testId })
    }

    @Get("/me/accuracyBySubject")
    @ApiQuery({ name: "subjects", required: false, type: String })
    @ApiHeader({ name: 'authtoken', required: true, })
    @UseGuards(AuthenticationGuard)
    accuracyBySubject(@Headers('instancekey') instancekey: string, @Query('subjects') subjects: string, @Req() req) {
        return this.attemptService.accuracyBySubject({ instancekey, userId: req.user._id, query: { subjects } })
    }

    @Get("/getUserResponse/:attempt")
    @ApiHeader({ name: 'authtoken', required: true, })
    @UseGuards(AuthenticationGuard)
    getUserResponse(@Param('attempt') attempt: string, @Headers('instancekey') instancekey: string) {
        return this.attemptService.getUserResponse({ instancekey, attempt })
    }

    @Post("/start")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    start(@Headers('instancekey') instancekey: string, @Headers('authtoken') token: string, @Body() body: StartRequest, @Req() req) {
        return this.attemptService.start({ instancekey, userId: req.user._id, activeLocation: req.user.activeLocation, userName: req.user.name, token, userEmail: req.user.email, ...body, ip: req.ip })
    }

    @Post('/create')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    create(@Headers('instancekey') instancekey: string, @Headers('authtoken') authtoken: string, @Body() request: CreateRequest, @Req() req, @Ip() ip: string) {
        return this.attemptService.create(
            { ...request, instancekey, ip, token: authtoken, userId: req.user._id, userEmail: req.user.email }
        )
    }

    @Post("/finish")
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    finish(@Headers('instancekey') instancekey: string, @Body() body: FinishRequest) {
        return this.attemptService.finish({ instancekey, ...body })
    }

    @Post("/finishPsychoTest")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    finishPsychoTest(@Headers('instancekey') instancekey: string, @Body() body: FinishPsychoTestRequest, @Req() req) {
        return this.attemptService.finishPsychoTest({ instancekey, ...body, userId: req.user._id, activeLocation: req.user.activeLocation })
    }

    @Post("/submit/:id")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    partialSubmitAttempt(@Headers('instancekey') instancekey: string, @Body() body: PartialSubmitAttemptRequest, @Req() req) {
        return this.attemptService.partialSubmitAttempt({ instancekey, ...body, userId: req.user._id, activeLocation: req.user.activeLocation })
    }

    @Post('/submitToQueue')
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    submitToQueue(@Headers('instancekey') instancekey: string, @Headers('authtoken') token: string, @Body() body: SubmitToQueueRequestBody, @Req() req) {
        return this.attemptService.submitToQueue({ instancekey, body, userId: req.user._id, token, ip: req.ip, email: req.user.email })
    }

    @Post("/resetItemInQueue")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    resetItemInQueue(@Headers('instancekey') instancekey: string, @Body() body: ResetItemInQueueRequest) {
        return this.attemptService.resetItemInQueue({ instancekey, ...body })
    }

    @Post("/questionSubmit/:id")
    @ApiParam({ name: "id", description: "attemptId" })
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    questionSubmit(@Headers('instancekey') instancekey: string, @Body() body: QuestionSubmitRequest, @Param('id') attemptId: string, @Req() req) {
        return this.attemptService.questionSubmit({ instancekey, ...body, attemptId, userId: req.user._id })
    }

    @Put('/:id/updateCamCaptured')
    @ApiParam({ name: "id", description: "attemptId" })
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    saveCamCapture(@Headers('instancekey') instancekey: string, @Body() body: SaveCamCaptureRequest, @Param('id') attemptId: string) {
        return this.attemptService.saveCamCapture({ instancekey, ...body, attemptId });
    }

    @Put('/:id/saveQrUpload')
    @ApiParam({ name: "id", description: "attemptId" })
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    saveQrUpload(@Headers('instancekey') instancekey: string, @Body() body: SaveQrUploadRequest, @Param('id') attemptId: string) {
        return this.attemptService.saveQrUpload({ instancekey, ...body, attemptId });
    }
    @Put('/:id/saveScreenRecording')
    @ApiParam({ name: "id", description: "attemptId" })
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    saveScreenRecording(@Headers('instancekey') instancekey: string, @Body() body: SaveScreenRecordingRequest, @Param('id') attemptId: string) {
        return this.attemptService.saveScreenRecording({ instancekey, ...body, attemptId });
    }

    @Put('/:id/reviewQuestion/:questionId')
    @ApiParam({ name: "id", description: "attemptId" })
    @ApiParam({ name: "questionId", description: "QuestionId" })
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    recordQuestionReview(@Headers("instancekey") instancekey: string, @Body() body: RecordQuestionReviewRequest, @Param('id') attemptId: string, @Param('questionId') questionId: string) {
        return this.attemptService.recordQuestionReview({ instancekey, ...body, attemptId, questionId })
    }

    @Put("/updateAbandonStatus/:id")
    @ApiParam({ name: "id", description: "attemptId" })
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    updateAbandonStatus(@Headers("instancekey") instancekey: string, @Body() body: UpdateAbandonStatusRequest, @Param('id') attemptId: string, @Req() req) {
        // liveboard sets markedSuspicious, the proctor's flag on an attempt: not for students
        const staff = ['teacher', 'mentor', 'publisher', 'admin', 'operator', 'centerHead', 'director', 'support'];
        if (body.liveboard && !(req.user?.roles || []).some((role) => staff.includes(role))) {
            throw new ForbiddenException();
        }
        return this.attemptService.updateAbandonStatus({ instancekey, ...body, attemptId })
    }

    @Put("/updateSuspicious/:id")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    updateSuspicious(@Headers('instancekey') instancekey: string, @Param('id') attemptId: string, @Body() body: UpdateSuspiciousRequest) {
        return this.attemptService.updateSuspicious({ instancekey, attemptId, ...body })
    }

    @Put("/timeLimitExhaustedCount/:id")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    updateTimeLimitExhaustedCount(@Headers('instancekey') instancekey: string, @Param('id') attemptId: string) {
        return this.attemptService.updateTimeLimitExhaustedCount({ instancekey, attemptId })
    }


    @Get("/:id/careerScore")
    @ApiHeader({ name: "authtoken" })
    @UseGuards(AuthenticationGuard)
    @ApiParam({ name: "id", description: "attemptId" })
    @UseInterceptors(OwnRecordInterceptor)
    getCareerScore(@Headers("instancekey") instancekey: string, @Param("id") attemptId: string, @Req() req) {
        let request = {
            userName: req.user.name,
            userEmail: req.user.email,
            userId: req.user._id,
            userPhoneNumber: req.user.phoneNumber,
            userGender: req.user.gender,
            userInterest: req.user.interest,
            userCity: req.user.city,
            userState: req.user.state,
            userDistrict: req.user.district,
            userBirthDate: req.user.birthdate,
            userKnowAboutUs: req.user.knowAboutUs,

        }
        return this.attemptService.getCareerScore({ instancekey, attemptId, ...request })
    }

    @Get('/:id')
    @ApiHeader({ name: 'authtoken' })
    @UseGuards(AuthenticationGuard)
    @UseInterceptors(OwnRecordInterceptor)
    findOne(@Headers('instancekey') instancekey: string, @Query() query: FindOneRequest, @Param('id') attemptId: string) {
        return this.attemptService.findOne({ instancekey, ...query, attemptId })
    }
}
