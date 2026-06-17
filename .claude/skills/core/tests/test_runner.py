import unittest
from unittest import mock

from core import run, turbo, CommandError
from core.runner import _argv


class ArgvParsing(unittest.TestCase):
    def test_string_is_split_like_a_shell(self):
        self.assertEqual(_argv("gh pr view 178"), ["gh", "pr", "view", "178"])

    def test_list_is_passed_through(self):
        self.assertEqual(_argv(["gh", "pr", "edit", "a b"]), ["gh", "pr", "edit", "a b"])


class Run(unittest.TestCase):
    def _proc(self, returncode=0, stdout="out", stderr=""):
        return mock.Mock(returncode=returncode, stdout=stdout, stderr=stderr)

    @mock.patch("core.runner.shutil.which", return_value="/usr/bin/gh")
    @mock.patch("core.runner.subprocess.run")
    def test_capture_returns_stdout(self, sub, _which):
        sub.return_value = self._proc(stdout="hello")
        self.assertEqual(run("gh whoami", capture=True), "hello")
        argv = sub.call_args.args[0]
        self.assertEqual(argv[0], "/usr/bin/gh")  # resolved via which
        self.assertFalse(sub.call_args.kwargs.get("shell", False))  # never shell=True

    @mock.patch("core.runner.shutil.which", return_value=None)
    @mock.patch("core.runner.subprocess.run")
    def test_unresolved_exe_falls_back_to_name(self, sub, _which):
        sub.return_value = self._proc()
        run("madeupbin x")
        self.assertEqual(sub.call_args.args[0][0], "madeupbin")

    @mock.patch("core.runner.shutil.which", return_value="/bin/false")
    @mock.patch("core.runner.subprocess.run")
    def test_nonzero_raises_command_error(self, sub, _which):
        sub.return_value = self._proc(returncode=2, stdout="", stderr="boom")
        with self.assertRaises(CommandError) as ctx:
            run("false")
        self.assertEqual(ctx.exception.returncode, 2)
        self.assertEqual(ctx.exception.stderr, "boom")

    @mock.patch("core.runner.shutil.which", return_value="/bin/false")
    @mock.patch("core.runner.subprocess.run")
    def test_check_false_swallows_nonzero(self, sub, _which):
        sub.return_value = self._proc(returncode=1)
        run("false", check=False)  # must NOT raise

    @mock.patch("core.runner.shutil.which", return_value="/usr/bin/pnpm")
    @mock.patch("core.runner.subprocess.run")
    def test_turbo_builds_pnpm_exec_turbo(self, sub, _which):
        sub.return_value = self._proc()
        turbo("typecheck")
        self.assertEqual(sub.call_args.args[0][1:], ["exec", "turbo", "typecheck"])


if __name__ == "__main__":
    unittest.main()
