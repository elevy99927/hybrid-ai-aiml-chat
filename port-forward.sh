# fast port-forward script.
# for kind/minikube installation

#lite-llm
kubectl port-forward -n lite-llm  svc/lite-helm-litellm  8080:4000 &

# chatbot

kubectl port-forward -n default  svc/my-chatbot-frontend  3010:3010 &
kubectl port-forward -n default  svc/my-chatbot-backend  3011:3011 &

