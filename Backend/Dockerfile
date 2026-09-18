FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install minimal build deps (removed after pip install)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential ca-certificates libpq-dev gcc libffi-dev libssl-dev python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install requirements
COPY requirements.txt ./
RUN pip install --upgrade pip setuptools wheel
RUN pip install -r requirements.txt

# Copy app code
COPY . /app

# Remove build deps to slim image
RUN apt-get purge -y build-essential gcc python3-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8000

# Run DB init then start uvicorn
CMD ["sh", "-c", "python -m app.init_db && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
