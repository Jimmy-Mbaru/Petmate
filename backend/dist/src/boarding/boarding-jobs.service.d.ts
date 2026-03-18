import { PrismaService } from '../prisma/prisma.service';
export declare class BoardingJobsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    autoCompleteEndedBookings(): Promise<void>;
    sendUpcomingBookingReminders(): Promise<void>;
}
