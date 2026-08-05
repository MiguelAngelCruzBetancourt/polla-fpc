# Auditoría, Consolidación y Limpieza Completa del Proyecto

Actúa como un **Software Architect Senior**, **Staff Backend Engineer**
y experto en **arquitecturas de microservicios**, **Clean
Architecture**, **DDD**, **SOLID** y **refactorización de sistemas
empresariales**.

## Contexto importante

Este proyecto contiene **dos aplicaciones**:

1.  La aplicación antigua (legacy).
2.  La aplicación nueva, desarrollada con arquitectura por capas basada
    en microservicios.

La aplicación nueva es la única que debe sobrevivir.

## Objetivo principal

Debe quedar **únicamente la aplicación nueva**, completamente funcional,
limpia y organizada. Elimina todo rastro de la aplicación legacy siempre
que no sea utilizado por la nueva arquitectura.

## Eliminación completa de `live-matches-svc`

El microservicio **`live-matches-svc`** **NO se va a implementar** y
debe eliminarse por completo.

Elimina absolutamente todo lo relacionado con él:

-   Carpeta del microservicio.
-   Controladores.
-   Casos de uso.
-   Servicios.
-   DTOs.
-   Entidades.
-   Repositorios.
-   Clientes HTTP.
-   Eventos.
-   Colas.
-   Middlewares.
-   Interceptores.
-   Validadores.
-   Configuraciones.
-   Variables de entorno.
-   Scripts.
-   Tests.
-   Mocks.
-   Documentación.
-   Docker Compose.
-   Kubernetes (si existe).
-   Railway.
-   Vercel.
-   CI/CD.
-   GitHub Actions.
-   Workflows.
-   Imports.
-   Exports.
-   Cualquier referencia directa o indirecta.

Antes de eliminar cualquier elemento verifica que ningún otro
microservicio dependa de él. Si existe una dependencia, elimínala o
reemplázala de forma segura.

Al finalizar no debe existir ninguna referencia a `live-matches-svc` en
el repositorio, salvo en el informe final.

## Auditoría y limpieza

-   Analiza completamente la estructura del proyecto.
-   Identifica claramente la aplicación legacy y la nueva.
-   Elimina la aplicación antigua.
-   Conserva únicamente la nueva arquitectura.
-   Elimina código muerto, archivos huérfanos, dependencias
    innecesarias, imports sin uso y configuraciones obsoletas.
-   Refactoriza el código restante mejorando legibilidad y
    mantenibilidad.
-   Respeta estrictamente la arquitectura por capas (Domain,
    Application, Infrastructure, Presentation/API, Shared y Common).
-   Mantén compatibilidad con APIs, contratos, autenticación y
    comunicación entre microservicios.

## Guía de limpieza de infraestructura

Genera una guía **paso a paso** indicando exactamente qué debo hacer
manualmente para eliminar cualquier rastro de `live-matches-svc`.

### Railway

Explica cómo eliminar:

-   Servicio.
-   Variables de entorno.
-   Dominios.
-   Bases de datos asociadas.
-   Volúmenes.
-   Redes.
-   Secrets.
-   Cron Jobs.
-   Pipelines.
-   Webhooks.
-   Configuraciones.
-   Recursos asociados.

### Vercel

Explica cómo eliminar:

-   Proyecto.
-   Variables de entorno.
-   Dominios.
-   Aliases.
-   Deployments.
-   Funciones.
-   Integraciones.
-   Webhooks.
-   Configuración residual.

### GitHub

Indica si debo eliminar o modificar:

-   GitHub Actions.
-   Secrets.
-   Variables.
-   Workflows.
-   Environments.
-   Deploy Keys.
-   Webhooks.
-   Dependabot.
-   Releases.
-   Tags.
-   Scripts de despliegue.

## Informe final

Incluye:

1.  Cómo identificaste la aplicación antigua y la nueva.
2.  Todo lo eliminado del proyecto legacy.
3.  Todo lo eliminado de `live-matches-svc`.
4.  Archivos eliminados y motivo.
5.  Dependencias eliminadas.
6.  Configuraciones modificadas.
7.  Riesgos encontrados.
8.  Recomendaciones.
9.  Checklist final confirmando que solo queda la nueva aplicación y que
    no existe ningún rastro de `live-matches-svc`.

## Prioridad absoluta

Conservar **únicamente** la nueva aplicación basada en microservicios,
eliminar completamente la aplicación legacy y `live-matches-svc`,
respetar la arquitectura por capas y entregar la guía detallada para
limpiar Railway, Vercel y GitHub.
