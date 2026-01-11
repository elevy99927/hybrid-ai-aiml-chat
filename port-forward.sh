# fast port-forward script.
# for kind/minikube installation

#lite-llm
kubectl port-forward -n lite-llm  svc/lite-helm-litellm  8080:4000 &


