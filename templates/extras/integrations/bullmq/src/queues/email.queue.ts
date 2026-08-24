import { Queue } from "bullmq";
import { getEnv } from "../core/env-validation.js";

export interface EmailJobData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  otp?: string;
  type?: string;
}

let _emailQueue: Queue<EmailJobData> | undefined;

export function getEmailQueue(): Queue<EmailJobData> {
  if (_emailQueue) return _emailQueue;

  const env = getEnv();
  const redisUrl = (env as Record<string, unknown>).REDIS_URL as string | undefined;

  const connection = redisUrl
    ? { url: redisUrl }
    : { host: "localhost", port: 6379 };

  return (_emailQueue = new Queue<EmailJobData>("email-queue", {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000, // 2s, 4s, 8s, 16s, 32s
      },
      removeOnComplete: {
        count: 1000,
        age: 24 * 3600, // Keep completed jobs for 24 hours
      },
      removeOnFail: {
        count: 5000,
        age: 7 * 24 * 3600, // Keep failed dead-letter jobs for 7 days
      },
    },
  }));
}

export async function queueEmailJob(data: EmailJobData): Promise<string> {
  const queue = getEmailQueue();
  const job = await queue.add("send-email", data);
  return job.id ?? "";
}
