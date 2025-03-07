import { JwtAccessTokenPayload } from '@actimeety/common';

export type ArgsInput<A = object> = Partial<A> & { input?: A };

export interface SubjectHook<TSubject = object, TArgs = object> {
  run(
    args: ArgsInput<TArgs>,
    auth?: JwtAccessTokenPayload,
  ): Promise<TSubject | undefined>;
}
