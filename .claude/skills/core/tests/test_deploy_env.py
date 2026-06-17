import unittest

from core import deploy_env


class SetEnvVar(unittest.TestCase):
    def test_updates_existing_key_in_env_block(self):
        text = "image:\n  tag: v1\nenv:\n  FOO: old\n  BAR: keep\n"
        out = deploy_env.set_env_var(text, "FOO", "new")
        self.assertIn("  FOO: new\n", out)
        self.assertNotIn("FOO: old", out)
        self.assertIn("  BAR: keep\n", out)  # siblings untouched

    def test_inserts_new_key_into_existing_block(self):
        text = "env:\n  FOO: a\nservice:\n  port: 80\n"
        out = deploy_env.set_env_var(text, "BAR", "b")
        # new key lands inside the env block, before the next top-level section
        self.assertEqual(
            out, "env:\n  FOO: a\n  BAR: b\nservice:\n  port: 80\n"
        )

    def test_inserts_new_key_when_env_block_runs_to_eof(self):
        text = "image:\n  tag: v1\nenv:\n  FOO: a\n"
        out = deploy_env.set_env_var(text, "BAR", "b")
        self.assertEqual(out, "image:\n  tag: v1\nenv:\n  FOO: a\n  BAR: b\n")

    def test_creates_env_block_when_absent(self):
        text = "image:\n  tag: v1\n"
        out = deploy_env.set_env_var(text, "FOO", "a")
        self.assertEqual(out, "image:\n  tag: v1\nenv:\n  FOO: a\n")

    def test_result_always_ends_with_single_newline(self):
        out = deploy_env.set_env_var("env:\n  FOO: a", "BAR", "b")
        self.assertTrue(out.endswith("\n"))
        self.assertFalse(out.endswith("\n\n"))


class EnvPresence(unittest.TestCase):
    def test_found_as_explicit_env_entry(self):
        found, msg = deploy_env.env_presence(
            "FOO", env_names=["FOO", "BAR"], envfrom_secrets=[], secret_keys_map={}
        )
        self.assertTrue(found)
        self.assertIn("<set>", msg)
        self.assertIn("explicit env", msg)

    def test_found_via_envfrom_secret(self):
        found, msg = deploy_env.env_presence(
            "TOKEN",
            env_names=["OTHER"],
            envfrom_secrets=["api-secrets"],
            secret_keys_map={"api-secrets": ["TOKEN", "X"]},
        )
        self.assertTrue(found)
        self.assertIn("<set>", msg)
        self.assertIn("api-secrets", msg)

    def test_missing_lists_searched_envfrom_sources(self):
        found, msg = deploy_env.env_presence(
            "TOKEN",
            env_names=["OTHER"],
            envfrom_secrets=["api-secrets"],
            secret_keys_map={"api-secrets": ["NOPE"]},
        )
        self.assertFalse(found)
        self.assertIn("<missing>", msg)
        self.assertIn("api-secrets", msg)

    def test_missing_with_no_envfrom(self):
        found, msg = deploy_env.env_presence(
            "TOKEN", env_names=["OTHER"], envfrom_secrets=[], secret_keys_map={}
        )
        self.assertFalse(found)
        self.assertIn("<missing>", msg)


if __name__ == "__main__":
    unittest.main()
