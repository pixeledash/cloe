FROM python:3.11-slim

WORKDIR /app

# Install PostgreSQL client for healthcheck
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create entrypoint script
RUN echo '#!/bin/sh\n\
echo "Waiting for PostgreSQL..."\n\
while ! pg_isready -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME; do\n\
  sleep 1\n\
done\n\
echo "PostgreSQL is ready!"\n\
echo "Running migrations..."\n\
python manage.py migrate --noinput\n\
echo "Starting server..."\n\
python manage.py runserver 0.0.0.0:8000\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]

