FROM ghcr.io/mlflow/mlflow:latest

RUN pip install --no-cache-dir google-cloud-storage psycopg2-binary

ENV PORT=8080

CMD mlflow server \
    --backend-store-uri postgresql://postgres:mlflow1234@/mlflow?host=/cloudsql/mlopd-488506:asia-southeast1:mlflow-db \
    --default-artifact-root gs://mlopd-488506-mlflow/artifacts \
    --host 0.0.0.0 \
    --port $PORT \
    --allowed-hosts mlflow-server-432331860646.asia-southeast1.run.app,pet-insight-backend-432331860646.asia-southeast1.run.app,localhost \
    --cors-allowed-origins https://mlflow-server-432331860646.asia-southeast1.run.app,https://pet-insight-backend-432331860646.asia-southeast1.run.app
