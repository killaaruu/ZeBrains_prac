"""Errors raised by core."""


class CommandError(RuntimeError):
    """A subprocess exited non-zero. Carries the command + captured streams."""

    def __init__(self, cmd, returncode, stdout, stderr):
        self.cmd = list(cmd)
        self.returncode = returncode
        self.stdout = stdout or ""
        self.stderr = stderr or ""
        super().__init__(
            f"command failed ({returncode}): {' '.join(self.cmd)}\n{self.stderr}".rstrip()
        )
