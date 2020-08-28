# deploy-with-kustomize-acton
Simple action to deploy to kubernetes with kustomize

This action is in the early development stages

Example:

```
      - name: deploy
        uses: eikc/deploy-with-kustomize@0.1.0
        with:
          registry: <-- private docker registry address
          images: |
            my-app:{{github.sha}}
          overlay: ./kubernetes/overlays/test <-- location of overlay
          monitoring: true <-- Monitor stateful, deployment or daemonsets with kubectl rollout status
```

