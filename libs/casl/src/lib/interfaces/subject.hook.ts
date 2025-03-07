import { AuthPayload } from '../types';

export type ArgsInput<A = object> = Partial<A> & { input?: A };

export interface SubjectHook<TSubject = object, TArgs = object, TAuth = AuthPayload> {
  run(
    params: ArgsInput<TArgs>,
    auth?: AuthPayload,
  ): Promise<TSubject | undefined>;
}
