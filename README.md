# RaitCol 

Plataforma web de viajes compartidos, exclusiva para la comunidad de la Universidad de Colima. Diseñada para conectar a estudiantes y trabajadores con asientos vacíos en sus vehículos con pasajeros que realizan rutas similares a los campus de la universidad.

---

## 🛠️ Tecnologías Utilizadas

- **Backend:** Python + Django (v4.2)
- **Base de Datos:** MySQL (v8.0)
- **Contenedores:** Docker + Docker Compose

---

## 📋 Requisitos Previos

Asegúrate de tener instalado en tu sistema:
- **Docker**
- **Docker Compose**

*(Si usas Windows, instala **Docker Desktop** que incluye ambos de manera gráfica. Si usas Linux, instala `docker.io` y `docker-compose-v2` mediante tu gestor de paquetes).*

---

## 🚀 Guía de Configuración e Inicio Rápido

Sigue estos pasos para levantar el entorno de desarrollo local:

### 1. Clonar el repositorio e ingresar a la carpeta
```bash
git clone <url-del-repositorio>
cd RaitCol
```

### 2. Levantar los contenedores de Docker
Este comando descargará MySQL, compilará el entorno de Python/Django y pondrá en marcha los servicios:
```bash
docker compose up --build
```
> **Nota para usuarios de Linux:** Si no tienes tu usuario en el grupo de docker, es posible que debas anteponer `sudo` (`sudo docker compose up --build`).

- El backend de Django estará disponible en: **`http://localhost:8080`**
- La base de datos MySQL estará mapeada en tu máquina local en el puerto: **`3307`** (con credenciales definidas en `docker-compose.yml`).

### 3. Aplicar las migraciones de Base de Datos
En otra terminal (dentro de la carpeta del proyecto), ejecuta las migraciones para crear la estructura de tablas de la base de datos en MySQL:
```bash
docker compose exec web python manage.py migrate
```

### 4. Crear un Administrador (Superusuario)
Para poder ingresar al panel de administración de Django y cargar datos de prueba:
```bash
docker compose exec web python manage.py createsuperuser
```
Sigue los pasos en la terminal (te pedirá correo institucional de `@ucol.mx`, nombre de usuario y contraseña). Una vez creado, ingresa a **`http://localhost:8080/admin`**.

---

## 📂 Estructura del Proyecto

- `raitcol/`: Configuración global del proyecto Django (`settings.py`, `urls.py`).
- `users/`: Gestión de usuarios, autenticación y perfiles con validación de correos institucionales de la Universidad de Colima (`@ucol.mx`).
- `rides/`: Motor principal. Modelos para la gestión de Direcciones, Vehículos, Rutas, Viajes operativos, Reservaciones y Calificaciones.

---

## 💡 Lógica de Asientos en Viajes

El sistema implementa un comportamiento automatizado integrado en el modelo `Reservation`:
- **Crear una Reserva:** Al registrarse una reservación activa, se descuenta automáticamente un asiento disponible (`available_seats_i`) del viaje (`Journey`).
- **Cancelar una Reserva:** Al cambiar la reservación a inactiva (`is_active_b = False`), el asiento se reintegra al viaje de inmediato.
- **Eliminar una Reserva:** Si se elimina el registro de reservación y este estaba activo, el asiento se devuelve al viaje.
