# Usar una imagen oficial de Python ligera
FROM python:3.10-slim

# Evitar que Python escriba archivos .pyc en el disco
ENV PYTHONDONTWRITEBYTECODE=1

# Evitar que Python almacene en búfer los flujos de salida (para ver logs en tiempo real)
ENV PYTHONUNBUFFERED=1

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Instalar dependencias del sistema requeridas para mysqlclient y herramientas de red básicas
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    default-libmysqlclient-dev \
    mariadb-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar el archivo de requerimientos e instalar dependencias de Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código del proyecto al contenedor
COPY . /app/

# Exponer el puerto en el que Django corre por defecto
EXPOSE 8000

# Comando por defecto para arrancar la aplicación
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
