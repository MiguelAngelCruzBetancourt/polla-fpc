# Actualización del backend de notificaciones

Quiero que actualices el backend del sistema de notificaciones
existente. **No quiero que reemplaces la arquitectura actual**, sino que
la extiendas y adaptes para soportar los nuevos eventos descritos a
continuación, reutilizando toda la lógica existente siempre que sea
posible.

## Objetivo

La aplicación móvil debe recibir notificaciones push automáticas
relacionadas con el ciclo de vida de cada partido.

## Requerimientos

### 1. Recordatorio para realizar el pronóstico

Enviar una notificación **1 hora antes del inicio del partido**.

Condiciones:

-   La notificación debe recordar al usuario que aún puede realizar su
    pronóstico.
-   Tener en cuenta que **el período para realizar pronósticos se cierra
    30 minutos antes del inicio del partido**.
-   Si el usuario ya realizó su pronóstico, decidir si:
    -   no enviar la notificación (preferible), o
    -   enviar un mensaje diferente indicando que aún puede modificarlo
        si esa funcionalidad existe.
-   La notificación debe programarse automáticamente para cada partido.

Ejemplo de mensaje:

> "⏰ Falta una hora para el partido. Recuerda realizar tu pronóstico
> antes de que el plazo cierre."

### 2. Notificación de pronósticos disponibles

La aplicación actualmente revela los pronósticos **10 minutos antes del
inicio del partido**.

Cuando ocurra ese evento, enviar una notificación indicando que **los
pronósticos ya están disponibles**.

Importante:

-   **NO** incluir los pronósticos dentro de la notificación.
-   Solo informar que ya pueden consultarse desde la aplicación.

Ejemplo:

> "👀 Los pronósticos de todos los participantes ya están disponibles.
> Entra a la app para verlos."

### 3. Notificación al finalizar el partido

Cuando el partido termine y el backend registre el **resultado
oficial**, enviar una notificación que incluya:

-   el resultado oficial del partido;
-   que la tabla de posiciones ya fue actualizada (o está disponible
    para consultarse).

Ejemplo:

> "⚽ Final del partido: Colombia 2 - 1 Brasil. Ya puedes ingresar a ver
> la tabla de posiciones actualizada."

Esta notificación debe enviarse únicamente cuando el resultado oficial
haya sido procesado correctamente.

## Consideraciones técnicas

1.  Analiza cómo funciona actualmente el sistema de notificaciones.
2.  Reutiliza la infraestructura existente (servicios, scheduler, colas,
    jobs, eventos, etc.) siempre que sea posible.
3.  Evita duplicar lógica.
4.  Mantén el código consistente con la arquitectura actual del
    proyecto.
5.  Si existen procesos programados (cron jobs, workers o schedulers),
    intégralos en lugar de crear mecanismos paralelos.
6.  Si es necesario modificar el modelo de datos o agregar nuevos
    estados para soportar estas notificaciones, hazlo justificadamente y
    con el menor impacto posible.
7.  Asegúrate de que una misma notificación no pueda enviarse más de una
    vez para el mismo partido.

## Entregables

1.  Analiza la implementación actual.
2.  Explica brevemente qué cambios realizarás y por qué.
3.  Implementa los cambios necesarios.
4.  Indica qué archivos fueron modificados.
5.  Señala cualquier posible efecto secundario o mejora futura que
    detectes.
