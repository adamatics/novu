import { JobRepository, NotificationRepository, JobEntity } from '@novu/dal';
import { Injectable } from '@nestjs/common';
import {
  StepTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
} from '@novu/shared';

import { AddJob } from '../add-job';
import {
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
} from '../create-execution-details';

import { StoreSubscriberJobsCommand } from './store-subscriber-jobs.command';
import { Instrument, InstrumentUsecase } from '../../instrumentation';

@Injectable()
export class StoreSubscriberJobs {
  constructor(
    private addJob: AddJob,
    private jobRepository: JobRepository,
    private notificationRepository: NotificationRepository,
    protected createExecutionDetails: CreateExecutionDetails
  ) {}

  @InstrumentUsecase()
  async execute(command: StoreSubscriberJobsCommand) {
    const storedJobs = await this.jobRepository.storeJobs(command.jobs);

    this.createJobsExecutionDetails(storedJobs);

    const firstJob = storedJobs[0];

    const channels = storedJobs
      .map((item) => item.type as StepTypeEnum)
      .reduce<StepTypeEnum[]>((list, channel) => {
        if (list.includes(channel) || channel === StepTypeEnum.TRIGGER) {
          return list;
        }
        list.push(channel);

        return list;
      }, []);

    await Promise.all([
      this.notificationRepository.update(
        {
          _organizationId: firstJob._organizationId,
          _id: firstJob._notificationId,
        },
        {
          $set: {
            channels: channels,
          },
        }
      ),
      this.addJob.execute({
        userId: firstJob._userId,
        environmentId: firstJob._environmentId,
        organizationId: firstJob._organizationId,
        jobId: firstJob._id,
        job: firstJob,
      }),
    ]);
  }

  @Instrument()
  private createJobsExecutionDetails(storedJobs: JobEntity[]) {
    for (const job of storedJobs) {
      this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_CREATED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
        })
      );
    }
  }
}
