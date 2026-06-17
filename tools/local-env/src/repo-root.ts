export type RepoRootContext = {
  cwd: string;
  env: NodeJS.ProcessEnv;
};

export function resolveRepoRoot(context: RepoRootContext): string {
  return context.env.INIT_CWD || context.cwd;
}
