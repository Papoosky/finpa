# Finpa Backend

API para registrar y gestionar transacciones financieras personales. Construida con **FastAPI** y conectada a **Google Sheets** como almacenamiento.

## Stack

- **FastAPI** — Framework web
- **Pydantic** — Validación de datos
- **gspread** — Integración con Google Sheets
- **uv** — Gestión de dependencias
- **Docker** — Contenedorización

## Estructura

```
backend/
├── app/
│   ├── main.py              # Endpoints de la API
│   ├── models/
│   │   └── transaction.py   # Schemas Pydantic
│   └── services/
│       └── sheet_service.py  # Integración con Google Sheets
├── credentials.json          # Credenciales de servicio (no versionado)
├── Dockerfile
└── pyproject.toml
```

## Endpoints

| Método | Ruta              | Descripción                    |
|--------|--------------------|-------------------------------|
| GET    | `/`               | Health check                   |
| POST   | `/transactions/`  | Registrar una nueva transacción |

### POST /transactions/

```json
{
  "amount": 15000,
  "date": "2026-03-05",
  "category": "Comida",
  "description": "Almuerzo"
}
```

## Ejecución

```bash
# Desde la raíz del proyecto
docker compose up --build
```

La API estará disponible en `http://localhost:8000`.
Documentación interactiva en `http://localhost:8000/docs`.

## Configuración

| Variable                 | Descripción                          |
|--------------------------|--------------------------------------|
| `GOOGLE_SHEETS_ID`       | ID del spreadsheet de Google         |
| `GOOGLE_CREDENTIALS_PATH`| Ruta al JSON de credenciales         |
| `ENV`                    | Entorno (`development`/`production`) |

## TODOs

- [ ] Migrar de Google Sheets a base de datos (PostgreSQL)
- [ ] Agregar endpoint `GET /transactions/` para listar transacciones
- [ ] Agregar endpoint `DELETE /transactions/{id}` para eliminar transacciones
- [ ] Agregar endpoint `PUT /transactions/{id}` para editar transacciones
- [ ] Agregar autenticación de usuarios (JWT)
- [ ] Agregar categorías predefinidas y validación
- [ ] Agregar paginación y filtros (por fecha, categoría)
- [ ] Agregar tests unitarios e integración
- [ ] CI/CD pipeline
