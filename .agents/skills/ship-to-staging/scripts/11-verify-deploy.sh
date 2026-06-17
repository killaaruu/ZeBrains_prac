#!/usr/bin/env bash
# 🚀 Verify staging deploy: GHA workflow → ArgoCD sync → kubectl rollout
# Expects kubectl context targeting mb-office cluster, namespace mad-os-staging.
set -euo pipefail

NS="${SHIP_STAGING_NS:-mad-os-staging}"
DEPLOY="${SHIP_STAGING_DEPLOY:-mad-os-api-mad-os-api}"
TIMEOUT="${SHIP_STAGING_TIMEOUT:-15m}"

echo "🚀 Verifying staging deploy…"
echo "   • Namespace:  $NS"
echo "   • Deployment: $DEPLOY"
echo "   • Timeout:    $TIMEOUT"

echo ""
echo "── 1) GitHub Actions (build + image push)"
if command -v gh >/dev/null 2>&1; then
  RUN_ID=$(gh run list --branch staging --limit 1 --json databaseId,status,conclusion,name --jq '.[0]')
  echo "   $RUN_ID"
  STATUS=$(echo "$RUN_ID" | jq -r '.status')
  if [[ "$STATUS" != "completed" ]]; then
    echo "   ⏳ GHA still running — waiting (Ctrl-C to skip)…"
    gh run watch "$(echo "$RUN_ID" | jq -r '.databaseId')" --exit-status || {
      echo "❌ GHA failed — abort deploy verify"
      exit 6
    }
  fi
  echo "   ✅ GHA done"
fi

echo ""
echo "── 2) ArgoCD app status"
if command -v argocd >/dev/null 2>&1; then
  argocd app get mad-os-api-staging --grpc-web || echo "   ⚠️  argocd CLI not authed — skipping"
else
  echo "   ⚠️  argocd CLI not installed — skipping"
fi

echo ""
echo "── 3) kubectl rollout status"
kubectl -n "$NS" rollout status "deploy/$DEPLOY" --timeout="$TIMEOUT"

IMAGE=$(kubectl -n "$NS" get deploy "$DEPLOY" -o jsonpath='{.spec.template.spec.containers[0].image}')
echo "   ✅ Live image: $IMAGE"

echo ""
echo "── 4) Recent pod events"
kubectl -n "$NS" get pods -l app.kubernetes.io/name=mad-os-api -o wide || true

echo ""
echo "✅ Staging deploy verified"
