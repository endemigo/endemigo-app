import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const queue = app.get('BullQueue_auction');
    const activeJobs = await queue.getActive();
    const delayedJobs = await queue.getDelayed();
    const completedJobs = await queue.getCompleted();
    const failedJobs = await queue.getFailed();

    console.log('--- BullMQ Queue Status ---');
    console.log(`Active Jobs: ${activeJobs.length}`);
    console.log(`Delayed Jobs: ${delayedJobs.length}`);
    console.log(`Completed Jobs: ${completedJobs.length}`);
    console.log(`Failed Jobs: ${failedJobs.length}`);

    if (delayedJobs.length > 0) {
      console.log('\n--- Delayed Jobs ---');
      for (const job of delayedJobs) {
        console.log(
          `Job ID: ${job.id}, Name: ${job.name}, Delay: ${job.delay}ms, Data:`,
          job.data,
        );
      }
    }
  } catch (err) {
    console.error('Error debugging queue:', err);
  } finally {
    await app.close();
  }
}

run();
