import base64
import json
import unittest
from unittest import mock

from core import kubectl


class DeployExists(unittest.TestCase):
    @mock.patch("core.kubectl.run")
    def test_true_when_get_succeeds(self, run):
        run.return_value = ""
        self.assertTrue(kubectl.deploy_exists(ns="mad-os", name="mad-os-api"))

    @mock.patch("core.kubectl.run", side_effect=__import__("core").CommandError(["kubectl"], 1, "", "x"))
    def test_false_when_get_fails(self, run):
        self.assertFalse(kubectl.deploy_exists(ns="mad-os", name="missing"))


class DeployEnvNames(unittest.TestCase):
    @mock.patch("core.kubectl.run")
    def test_splits_space_separated_names(self, run):
        run.return_value = "FOO BAR BAZ"
        self.assertEqual(
            kubectl.deploy_env_names(ns="mad-os", name="api", context="mb-office"),
            ["FOO", "BAR", "BAZ"],
        )
        argv = run.call_args.args[0]
        self.assertIn("jsonpath={.spec.template.spec.containers[0].env[*].name}", argv)

    @mock.patch("core.kubectl.run", return_value="")
    def test_empty_yields_empty_list(self, run):
        self.assertEqual(kubectl.deploy_env_names(ns="x", name="y"), [])


class DeployEnvFromSecretNames(unittest.TestCase):
    @mock.patch("core.kubectl.run")
    def test_splits_secret_ref_names(self, run):
        run.return_value = "api-secrets shared-secrets"
        self.assertEqual(
            kubectl.deploy_envfrom_secret_names(ns="mad-os", name="api"),
            ["api-secrets", "shared-secrets"],
        )
        self.assertIn(
            "jsonpath={.spec.template.spec.containers[0].envFrom[*].secretRef.name}",
            run.call_args.args[0],
        )


class SecretDataKeys(unittest.TestCase):
    @mock.patch("core.kubectl.run")
    def test_returns_data_keys(self, run):
        run.return_value = json.dumps({"data": {"TOKEN": "x", "URL": "y"}})
        self.assertEqual(
            sorted(kubectl.secret_data_keys(ns="mad-os", name="api-secrets")),
            ["TOKEN", "URL"],
        )

    @mock.patch("core.kubectl.run")
    def test_missing_data_yields_empty(self, run):
        run.return_value = json.dumps({})
        self.assertEqual(kubectl.secret_data_keys(ns="x", name="y"), [])


class Secret(unittest.TestCase):
    @mock.patch("core.kubectl.run")
    def test_decodes_base64_value(self, run):
        run.return_value = base64.b64encode(b"sk-master").decode()
        out = kubectl.secret(ns="litellm", name="litellm-secrets", key="LITELLM_MASTER_KEY")
        self.assertEqual(out, "sk-master")
        argv = run.call_args.args[0]
        self.assertEqual(argv[:2], ["kubectl", "-n"])  # no --context when omitted
        self.assertIn("jsonpath={.data.LITELLM_MASTER_KEY}", argv)

    @mock.patch("core.kubectl.run")
    def test_context_is_passed_through(self, run):
        run.return_value = base64.b64encode(b"x").decode()
        kubectl.secret(ns="litellm", name="s", key="k", context="k3s-mad")
        argv = run.call_args.args[0]
        self.assertEqual(argv[1:3], ["--context", "k3s-mad"])


if __name__ == "__main__":
    unittest.main()
