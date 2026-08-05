# Prompt para Claude: Implementación del Backend de Live Matches (Solo Horario, Equipos y Resultado)

Quiero que actúes como un **Software Architect Senior** y un **Backend Engineer Senior**.

Tu objetivo es implementar **completamente el backend del módulo de Live Matches** de mi proyecto.

## Contexto

Antes de escribir cualquier código debes:

- Analizar completamente la arquitectura actual del proyecto.
- Entender cómo está organizado el backend.
- Respetar los patrones existentes.
- Reutilizar servicios y componentes ya implementados.
- No modificar código innecesariamente.

Quiero una implementación lista para producción.

## Investigación de APIs

Antes de programar, investiga cuál es la mejor API para obtener información de la **Liga BetPlay Dimayor (Colombia)**.

Compara como mínimo:

- API-Football
- Football-Data.org
- TheSportsDB
- SportMonks
- APIs disponibles en RapidAPI
- Cualquier otra alternativa gratuita que siga funcionando.

Para cada API indica:

- ¿Tiene cobertura de la Liga Colombiana?
- ¿Permite consultar partidos programados?
- ¿Permite consultar resultados?
- ¿Cuál es el límite gratuito?
- ¿Qué tan actualizados están los datos?
- ¿Tiene buena documentación?
- ¿Es recomendable para un proyecto real?

Después crea una tabla comparativa.

Finalmente selecciona **la mejor opción gratuita**.

Si no existe una API completamente gratuita con buena cobertura de la Liga Colombiana, indícalo claramente y recomienda la mejor alternativa gratuita explicando sus limitaciones.

## Información que necesito de cada partido

**No necesito estadísticas ni información avanzada.**

Únicamente necesito guardar y exponer:

- Fecha del partido
- Hora del partido
- Equipo local
- Equipo visitante
- Resultado final (cuando exista)

No necesito estadísticas, eventos, goles, tarjetas, cambios, árbitro, estadio, alineaciones, formaciones, jugadores, posesión, córners, tiros, minuto en vivo ni ningún otro dato adicional.

La implementación debe centrarse únicamente en esos campos.

## Implementación

Implementa completamente:

- Cliente HTTP
- Configuración
- Variables de entorno
- Servicio
- DTOs
- Interfaces
- Controladores
- Manejo de errores
- Validaciones
- Cache (si es conveniente)
- Logs
- Documentación

No uses pseudocódigo. Todo debe quedar listo para ejecutar.

## Endpoints

Implementa únicamente los endpoints necesarios para:

- Obtener próximos partidos.
- Obtener partidos de una fecha específica.
- Obtener resultados de partidos finalizados.
- Obtener partidos de la Liga Colombiana.

Cada respuesta debe devolver únicamente:

```json
{
  "date": "...",
  "time": "...",
  "homeTeam": "...",
  "awayTeam": "...",
  "result": "..."
}
```

Si el partido aún no ha terminado, el resultado puede ser `null`.

## Explicación paso a paso

1. Cómo crear la cuenta.
2. Cómo obtener la API Key.
3. Cómo configurar las variables de entorno.
4. Qué endpoints de la API utilizar.
5. Cómo integrarlos al backend.
6. Cómo probarlos con Postman y Curl.
7. Cómo desplegar la solución.
8. Cómo proteger la API Key.

## Calidad esperada

- No quiero respuestas resumidas.
- No quiero ejemplos incompletos.
- No quiero pseudocódigo.
- No quiero código parcialmente implementado.
- Quiero una implementación completa, profesional, mantenible y lista para producción.
- Cada decisión técnica debe estar justificada.
