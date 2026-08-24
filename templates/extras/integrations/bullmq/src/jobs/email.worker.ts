import { Worker, type Job } from "bullmq";
import { getEnv } from "../core/env-validation.js";
import { logger } from "../core/logger.js";
import { sendEmail } from "../integrations/email/email.js";
import type { EmailJobData } from "../queues/email.queue.js";

const env = getEnv();
const redisUrl = (env as Record<string, unknown>).REDIS_URL as string | undefined;

const connection = redisUrl
  ? { url: redisUrl }
  : { host: "localhost", port: 6379 };

export const emailWorker = new Worker<EmailJobData>(
  "email-queue",
  async (job: Job<EmailJobData>) => {
    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts || 5;
    logger.info(`[Email Worker] (Attempt ${attempt}/${maxAttempts}) Processing email job ${job.id} for: ${job.data.to}`);

    const res = await sendEmail({
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
      text: job.data.text,
    });

    return { success: true, messageId: res.id };
  },
  {
    connection,
    concurrency: 5,
  }
);

emailWorker.on("completed", (job) => {
  logger.info(`[Email Worker] Job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, err) => {
  const attempt = (job?.attemptsMade ?? 0) + 1;
  const maxAttempts = job?.opts.attempts ?? 5;
  logger.error(`[Email Worker] Job ${job?.id} failed on attempt ${attempt}/${maxAttempts} with error:`, err);
});

logger.info("BullMQ Email Worker started and waiting for jobs (concurrency: 5, retries: 5 with exponential backoff)...");
