import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Scheduled jobs for boarding: auto-complete ended bookings, send reminders.
 */
@Injectable()
export class BoardingJobsService {
  private readonly logger = new Logger(BoardingJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-set bookings to COMPLETED after endDate if still ACCEPTED.
   * Runs every hour to keep things reasonably up to date.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoCompleteEndedBookings() {
    const now = new Date();
    const result = await this.prisma.booking.updateMany({
      where: {
        status: BookingStatus.ACCEPTED,
        endDate: { lt: now },
      },
      data: { status: BookingStatus.COMPLETED },
    });

    if (result.count > 0) {
      this.logger.log(`Auto-completed ${result.count} bookings that have ended.`);
    }
  }

  /**
   * Send upcoming booking reminders to owners/hosts.
   * Runs every day at 09:00 server time for bookings starting "tomorrow".
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendUpcomingBookingReminders() {
    const now = new Date();

    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const dayAfterStart = new Date(tomorrowStart);
    dayAfterStart.setDate(tomorrowStart.getDate() + 1);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.ACCEPTED,
        startDate: {
          gte: tomorrowStart,
          lt: dayAfterStart,
        },
      },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        boardingProfile: {
          include: {
            host: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!bookings.length) {
      this.logger.debug('No upcoming bookings for reminder window.');
      return;
    }

    for (const booking of bookings) {
      this.logger.log(
        `Would send reminder for booking #${booking.id} to owner ${booking.owner.email} and host ${booking.boardingProfile.host.email}`,
      );
      // TODO: Plug in real notification channel (email, push, in-app, BullMQ worker, etc.)
    }
  }
}

