#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input

if [ -n "$DB_HOST" ]; then
  echo "Ejecutando migraciones..."
  n=0
  until [ "$n" -ge 5 ]
  do
     python manage.py migrate && break
     n=$((n+1))
     echo "Reintentando migraciones en 4 segundos... ($n/5)"
     sleep 4
  done
fi
