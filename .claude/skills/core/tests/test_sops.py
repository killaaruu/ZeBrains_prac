import unittest
from unittest import mock

from core import sops


class SetValue(unittest.TestCase):
    def test_builds_sops_set_expression(self):
        self.assertEqual(
            sops.set_expr(section="stringData", key="OPENAI_API_KEY", value="sk-1"),
            '["stringData"]["OPENAI_API_KEY"] "sk-1"',
        )

    def test_value_with_quotes_is_json_escaped(self):
        # a value containing a double-quote must not break the expression
        expr = sops.set_expr(section="stringData", key="K", value='a"b')
        self.assertEqual(expr, '["stringData"]["K"] "a\\"b"')

    @mock.patch("core.sops.run")
    def test_set_value_invokes_sops_set(self, run):
        sops.set_value(file="secrets.enc.yaml", section="stringData", key="K", value="v")
        argv = run.call_args.args[0]
        self.assertEqual(argv[0], "sops")
        self.assertEqual(argv[1], "--set")
        self.assertEqual(argv[2], '["stringData"]["K"] "v"')
        self.assertEqual(argv[3], "secrets.enc.yaml")


if __name__ == "__main__":
    unittest.main()
