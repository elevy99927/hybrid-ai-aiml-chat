echo user: admin
echo password: $(kubectl get secret -n lite-llm lite-helm-litellm-masterkey -o jsonpath='{.data.masterkey}')

