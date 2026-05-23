# ─── ステージ 1: 依存関係のインストール ───────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/deps -r requirements.txt

# ─── ステージ 2: 本番用実行環境 ───────────────────────────────
FROM python:3.12-slim AS prod
WORKDIR /app

COPY --from=builder /deps /usr/local/lib/python3.12/site-packages
COPY app.py .

RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 5000
CMD ["python", "app.py"]
