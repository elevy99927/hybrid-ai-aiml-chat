helm pull oci://docker.litellm.ai/berriai/litellm-helm
tar -zxvf litellm-helm-0.1.2.tgz
kubectl create ns lite-llm
helm upgrade --install lite-helm -n lite-llm ./litellm-helm
