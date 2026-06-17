import json
import unittest
from unittest import mock

from core import gh, CommandError


def _err():
    return CommandError(["gh"], 1, "", "not found")


class ReadIssueOrPr(unittest.TestCase):
    @mock.patch("core.gh.run")
    def test_pr_is_detected_first(self, run):
        # gh pr view succeeds → it's a PR, gh issue view must NOT be called
        run.return_value = json.dumps(
            {"number": 5, "title": "t", "state": "OPEN", "body": "b"}
        )
        got = gh.read_issue_or_pr(5)
        self.assertIsInstance(got, gh.PullRequest)
        self.assertEqual(got.kind, "pr")
        self.assertEqual(got.number, 5)
        self.assertEqual(run.call_count, 1)

    @mock.patch("core.gh.run")
    def test_issue_when_pr_view_fails(self, run):
        issue_json = json.dumps({
            "number": 7, "title": "bug", "state": "OPEN", "body": "desc",
            "labels": [{"name": "bug"}, {"name": "p1"}],
            "comments": [{"author": {"login": "alice"}, "body": "hi"}],
        })
        run.side_effect = [_err(), issue_json]  # pr view fails, issue view succeeds
        got = gh.read_issue_or_pr(7)
        self.assertIsInstance(got, gh.Issue)
        self.assertEqual(got.kind, "issue")
        self.assertEqual(got.labels, ["bug", "p1"])
        self.assertEqual(got.comments[0].author, "alice")

    @mock.patch("core.gh.run")
    def test_null_comment_author_does_not_crash(self, run):
        issue_json = json.dumps({
            "number": 7, "title": "t", "state": "OPEN", "body": "",
            "labels": [], "comments": [{"author": None, "body": "ghost"}],
        })
        run.side_effect = [_err(), issue_json]
        got = gh.read_issue_or_pr(7)
        self.assertEqual(got.comments[0].author, "")

    @mock.patch("core.gh.run")
    def test_neither_raises_lookup_error(self, run):
        run.side_effect = [_err(), _err()]
        with self.assertRaises(LookupError):
            gh.read_issue_or_pr(999)


class SetBoardStatus(unittest.TestCase):
    def _items(self, *numbers):
        return json.dumps({"items": [
            {"id": f"item-{n}", "content": {"number": n}} for n in numbers
        ]})

    @mock.patch("core.gh.run")
    def test_unknown_status_raises_before_any_call(self, run):
        with self.assertRaises(ValueError):
            gh.set_board_status(issue=1, status="Bogus")
        run.assert_not_called()

    @mock.patch("core.gh.run")
    def test_existing_item_is_edited_with_mapped_option_id(self, run):
        run.side_effect = [self._items(10, 178), ""]  # item-list, then item-edit
        gh.set_board_status(issue=178, status="In progress")
        self.assertEqual(run.call_count, 2)  # item-list, item-edit (no url/add)
        edit_argv = run.call_args_list[1].args[0]
        self.assertIn("item-178", edit_argv)
        self.assertIn("47fc9ee4", edit_argv)  # "In progress" option id

    @mock.patch("core.gh.run")
    def test_missing_item_is_added_then_edited(self, run):
        run.side_effect = [
            self._items(10),                          # item-list: 178 absent
            "https://github.com/MrtnvM/mad-os/issues/178",  # url lookup
            json.dumps({"id": "item-new"}),           # item-add
            "",                                       # item-edit
        ]
        gh.set_board_status(issue=178, status="Done")
        self.assertEqual(run.call_count, 4)
        edit_argv = run.call_args_list[3].args[0]
        self.assertIn("item-new", edit_argv)
        self.assertIn("98236657", edit_argv)  # "Done"
        url_argv = run.call_args_list[1].args[0]
        self.assertEqual(url_argv[:3], ["gh", "issue", "view"])  # issue-first URL probe
        add_argv = run.call_args_list[2].args[0]
        self.assertIn("https://github.com/MrtnvM/mad-os/issues/178", add_argv)


    @mock.patch("core.gh.run")
    def test_url_falls_back_to_pr_when_issue_view_fails(self, run):
        run.side_effect = [
            self._items(10),                       # item-list: 178 absent
            CommandError(["gh"], 1, "", "no issue"),  # gh issue view fails
            "https://github.com/MrtnvM/mad-os/pull/178",  # gh pr view url
            json.dumps({"id": "item-new"}),        # item-add
            "",                                    # item-edit
        ]
        gh.set_board_status(issue=178, status="Todo")
        self.assertEqual(run.call_count, 5)
        pr_argv = run.call_args_list[2].args[0]
        self.assertEqual(pr_argv[:3], ["gh", "pr", "view"])  # fell back to PR


class PrForBranch(unittest.TestCase):
    @mock.patch("core.gh.run")
    def test_returns_pull_request_when_present(self, run):
        run.return_value = json.dumps([
            {"number": 12, "title": "feat", "state": "OPEN", "url": "u"}
        ])
        pr = gh.pr_for_branch("feature/x")
        self.assertEqual(pr.number, 12)
        self.assertEqual(pr.url, "u")
        argv = run.call_args.args[0]
        self.assertEqual(argv[:4], ["gh", "pr", "list", "--head"])
        self.assertIn("feature/x", argv)

    @mock.patch("core.gh.run")
    def test_returns_none_when_empty(self, run):
        run.return_value = "[]"
        self.assertIsNone(gh.pr_for_branch("feature/x"))

    @mock.patch("core.gh.run")
    def test_base_filter_is_added(self, run):
        run.return_value = "[]"
        gh.pr_for_branch("b", base="dev")
        argv = run.call_args.args[0]
        idx = argv.index("--base")
        self.assertEqual(argv[idx + 1], "dev")


class CreatePr(unittest.TestCase):
    @mock.patch("core.gh.run")
    def test_returns_trimmed_url(self, run):
        run.return_value = "https://github.com/MrtnvM/mad-os/pull/9\n"
        url = gh.create_pr(base="dev", head="b", title="t", body="body")
        self.assertEqual(url, "https://github.com/MrtnvM/mad-os/pull/9")


class WatchChecks(unittest.TestCase):
    @mock.patch("core.gh.run")
    def test_uses_watch_and_fail_fast(self, run):
        gh.watch_checks(9)
        argv = run.call_args.args[0]
        self.assertEqual(argv, ["gh", "pr", "checks", "9", "--watch", "--fail-fast"])

    @mock.patch("core.gh.run", side_effect=CommandError(["gh"], 1, "", "x"))
    def test_propagates_failure(self, run):
        with self.assertRaises(CommandError):
            gh.watch_checks(9)


if __name__ == "__main__":
    unittest.main()
