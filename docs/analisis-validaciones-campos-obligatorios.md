# Análisis de Validaciones y Campos Obligatorios

## RESUMEN EJECUTIVO

**Estado actual de validaciones:**
- ✅ **Paso 2 (Empresa)**: COMPLETO - Todas las validaciones implementadas
- ✅ **Paso 3 (Administradores)**: COMPLETO - Validación de al menos 1 admin
- ⚠️ **Paso 5 (Trabajadores)**: PARCIAL - Validación en carga masiva pero no individual
- ⚠️ **Paso 7 (Turnos)**: BÁSICO - Solo valida nombre, faltan validaciones de horarios
- ⚠️ **Paso 8 (Planificaciones)**: BÁSICO - Solo valida nombre y completitud
- ⚠️ **Paso 9 (Asignaciones)**: PARCIAL - Valida campos completos pero faltan reglas de negocio

---

## PASO 2: EMPRESA (✅ COMPLETO)

### Validaciones Implementadas:
```typescript
const validateEmpresaFields = (empresa: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!empresa.razonSocial?.trim()) errors.push("Razón Social")
  if (!empresa.nombreFantasia?.trim()) errors.push("Nombre de fantasía")
  if (!empresa.rut?.trim()) errors.push("RUT")
  if (!empresa.giro?.trim()) errors.push("Giro")
  if (!empresa.direccion?.trim()) errors.push("Dirección")
  if (!empresa.comuna?.trim()) errors.push("Comuna")
  if (!empresa.emailFacturacion?.trim()) errors.push("Email de facturación")
  if (!empresa.telefonoContacto?.trim()) errors.push("Teléfono de contacto")
  if (!empresa.rubro?.trim()) errors.push("Rubro")
  if (!empresa.sistema || empresa.sistema.length === 0) errors.push("Sistema")
  
  // Validación de formato email
  if (empresa.emailFacturacion?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(empresa.emailFacturacion)) {
      errors.push("Email de facturación (formato inválido)")
    }
  }
  
  return { isValid: errors.length === 0, errors }
}
```

### Estado: ✅ NO REQUIERE CAMBIOS
- Todos los campos obligatorios validados
- Validación de formato de email
- Mensajes de error claros

---

## PASO 3: ADMINISTRADORES (✅ COMPLETO)

### Validaciones Implementadas:
```typescript
const validateAdminsFields = (admins: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!admins || admins.length === 0) {
    errors.push("Debe agregar al menos un administrador")
    return { isValid: false, errors }
  }
  
  admins.forEach((admin, index) => {
    const adminNum = index + 1
    if (!admin.nombre?.trim()) errors.push(`Administrador ${adminNum}: Nombre`)
    if (!admin.email?.trim()) errors.push(`Administrador ${adminNum}: Email`)
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(admin.email)) {
        errors.push(`Administrador ${adminNum}: Email (formato inválido)`)
      }
    }
    if (!admin.telefono?.trim()) errors.push(`Administrador ${adminNum}: Teléfono`)
  })
  
  return { isValid: errors.length === 0, errors }
}
```

### Campos validados:
- Mínimo 1 administrador
- Nombre (obligatorio)
- Email (obligatorio + formato válido)
- Teléfono (obligatorio)

### Estado: ✅ TIENE MENSAJE DE "AGREGAR AL MENOS 1"
Ya implementado en `handleNext` paso 3.

---

## PASO 5: TRABAJADORES (⚠️ REQUIERE MEJORAS)

### Validaciones Actuales:
**En carga masiva:** ✅ Parsea y valida formato
**En formulario individual:** ❌ NO HAY VALIDACIONES

### Problema Identificado:
```typescript
// TrabajadoresStep - NO HAY VALIDACIÓN antes de agregar
const updateTrabajador = (id, field, value) => {
  const updated = trabajadores.map((t) => (t.id === id ? { ...t, [field]: value } : t))
  setTrabajadores(updated)
}
```

### Campos del trabajador:
```typescript
{
  id: number
  nombre: string          // ⚠️ Sin validación
  rut: string            // ⚠️ Sin validación de formato
  correo: string         // ⚠️ Sin validación de formato
  grupoId: string        // ⚠️ Sin validación
  telefono1: string      // ⚠️ Sin validación
  telefono2: string      // Opcional
  telefono3: string      // Opcional
  tipo: "usuario" | "administrador"
}
```

### Validaciones Recomendadas:
1. **Nombre completo**: Obligatorio, mínimo 3 caracteres
2. **RUT**: Obligatorio, formato válido chileno (usar `isValidRut`)
3. **Correo**: Obligatorio, formato email válido
4. **Grupo**: Obligatorio
5. **Teléfono1**: Obligatorio, mínimo 8 dígitos

### Implementación Sugerida:
```typescript
const validateTrabajadorFields = (trabajador: any): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  
  if (!trabajador.nombre?.trim() || trabajador.nombre.trim().length < 3) {
    errors.nombre = "Nombre completo es obligatorio (mínimo 3 caracteres)"
  }
  
  if (!trabajador.rut?.trim()) {
    errors.rut = "RUT es obligatorio"
  } else if (!isValidRut(trabajador.rut)) {
    errors.rut = "RUT inválido"
  }
  
  if (!trabajador.correo?.trim()) {
    errors.correo = "Correo es obligatorio"
  } else if (!isValidEmail(trabajador.correo)) {
    errors.correo = "Formato de correo inválido"
  }
  
  if (!trabajador.grupoId) {
    errors.grupoId = "Grupo es obligatorio"
  }
  
  if (!trabajador.telefono1?.trim() || trabajador.telefono1.trim().length < 8) {
    errors.telefono1 = "Teléfono es obligatorio (mínimo 8 dígitos)"
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
```

### Validación en handleNext:
```typescript
else if (currentStep === 5) {
  // Validar que todos los trabajadores tengan campos completos
  const incompletos = formData.trabajadores.filter(t => {
    const validation = validateTrabajadorFields(t)
    return !validation.isValid
  })
  
  if (incompletos.length > 0) {
    toast({
      title: "Trabajadores incompletos",
      description: `Hay ${incompletos.length} trabajador(es) con campos incompletos o inválidos`,
      variant: "destructive"
    })
    return
  }
}
```

### Estado: ⚠️ REQUIERE IMPLEMENTACIÓN
El paso puede ser saltado (opción "En capacitación"), pero si el usuario decide completarlo, debe tener validaciones.

---

## PASO 7: TURNOS (⚠️ REQUIERE MEJORAS)

### Validaciones Actuales:
```typescript
const handleAddTurno = () => {
  // Solo valida nombre
  if (!formTurno.nombre.trim()) {
    alert("Por favor ingresa el nombre del turno")
    return
  }
  
  // Agrega sin validar otros campos
  setTurnos([...turnos, { id: Date.now(), ...formTurno }])
}
```

### Campos del turno:
```typescript
{
  id: number
  nombre: string               // ✅ Validado
  horaInicio: string          // ⚠️ Sin validación
  horaFin: string             // ⚠️ Sin validación
  tipoColacion: "sin" | "libre" | "fija"
  colacionMinutos: number     // ⚠️ Sin validación
  colacionInicio: string      // ⚠️ Sin validación (si tipoColacion = "fija")
  colacionFin: string         // ⚠️ Sin validación (si tipoColacion = "fija")
  tooltip: string             // Opcional
}
```

### Problemas Identificados:
1. **No valida horaInicio y horaFin**: Pueden estar vacíos
2. **No valida orden temporal**: horaFin puede ser antes que horaInicio
3. **No valida colación**: Si es "fija", debe tener horarios y minutos
4. **No valida minutos de colación**: Puede ser negativo o excesivo

### Validaciones Recomendadas:
```typescript
const validateTurnoFields = (turno: any): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  
  // 1. Nombre
  if (!turno.nombre?.trim()) {
    errors.nombre = "Nombre del turno es obligatorio"
  }
  
  // 2. Hora de inicio
  if (!turno.horaInicio) {
    errors.horaInicio = "Hora de inicio es obligatoria"
  }
  
  // 3. Hora de fin
  if (!turno.horaFin) {
    errors.horaFin = "Hora de fin es obligatoria"
  }
  
  // 4. Validar orden temporal
  if (turno.horaInicio && turno.horaFin) {
    const [inicioH, inicioM] = turno.horaInicio.split(':').map(Number)
    const [finH, finM] = turno.horaFin.split(':').map(Number)
    const inicioMinutos = inicioH * 60 + inicioM
    const finMinutos = finH * 60 + finM
    
    if (finMinutos <= inicioMinutos) {
      errors.horaFin = "La hora de fin debe ser posterior a la hora de inicio"
    }
  }
  
  // 5. Validar colación fija
  if (turno.tipoColacion === "fija") {
    if (!turno.colacionInicio) {
      errors.colacionInicio = "Hora de inicio de colación es obligatoria"
    }
    if (!turno.colacionFin) {
      errors.colacionFin = "Hora de fin de colación es obligatoria"
    }
    if (!turno.colacionMinutos || turno.colacionMinutos <= 0) {
      errors.colacionMinutos = "Minutos de colación debe ser mayor a 0"
    }
    
    // Validar que colación esté dentro del turno
    if (turno.colacionInicio && turno.horaInicio && turno.colacionInicio < turno.horaInicio) {
      errors.colacionInicio = "Colación debe estar dentro del horario del turno"
    }
    if (turno.colacionFin && turno.horaFin && turno.colacionFin > turno.horaFin) {
      errors.colacionFin = "Colación debe estar dentro del horario del turno"
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
```

### Validación en handleNext:
```typescript
else if (currentStep === 7) {
  if (formData.turnos.length === 0) {
    toast({
      title: "Turnos requeridos",
      description: "Debes crear al menos un turno para continuar.",
      variant: "destructive"
    })
    return
  }
  
  // Validar que todos los turnos sean válidos
  const turnosInvalidos = formData.turnos.filter(t => {
    const validation = validateTurnoFields(t)
    return !validation.isValid
  })
  
  if (turnosInvalidos.length > 0) {
    toast({
      title: "Turnos incompletos",
      description: `Hay ${turnosInvalidos.length} turno(s) con campos incompletos o inválidos`,
      variant: "destructive"
    })
    return
  }
}
```

### Estado: ⚠️ REQUIERE IMPLEMENTACIÓN
Validación básica existe (nombre), pero faltan validaciones de horarios y lógica de negocio.

---

## PASO 8: PLANIFICACIONES (⚠️ REQUIERE MEJORAS)

### Validaciones Actuales:
```typescript
const addPlanificacion = () => {
  if (!formData.nombre.trim()) {
    alert("Por favor ingresa el nombre de la planificación")
    return
  }
  
  const esCompleta = formData.diasTurnos.every((turnoId) => turnoId !== null && turnoId !== "")
  if (!esCompleta) {
    alert("Por favor asigna un turno a todos los días de la semana")
    return
  }
  
  // Agrega planificación
  setPlanificaciones([...planificaciones, { id: Date.now(), ...formData }])
}
```

### Campos de planificación:
```typescript
{
  id: number
  nombre: string                        // ✅ Validado
  diasTurnos: (number | null)[]        // ✅ Validado completitud (7 días)
}
```

### Problemas Identificados:
1. **No valida turnos existentes**: Puede referenciar IDs de turnos eliminados
2. **No valida nombres duplicados**: Puede haber 2 planificaciones con mismo nombre

### Validaciones Recomendadas:
```typescript
const validatePlanificacionFields = (
  planificacion: any, 
  turnosDisponibles: any[], 
  planificacionesExistentes: any[]
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  
  // 1. Nombre obligatorio
  if (!planificacion.nombre?.trim()) {
    errors.nombre = "Nombre de planificación es obligatorio"
  }
  
  // 2. Validar nombre duplicado
  const duplicado = planificacionesExistentes.find(
    p => p.id !== planificacion.id && 
    p.nombre.toLowerCase() === planificacion.nombre?.toLowerCase()
  )
  if (duplicado) {
    errors.nombre = "Ya existe una planificación con este nombre"
  }
  
  // 3. Validar que todos los días tengan turno
  const diasVacios = planificacion.diasTurnos.filter(
    (turnoId: any) => turnoId === null || turnoId === ""
  )
  if (diasVacios.length > 0) {
    errors.diasTurnos = "Todos los días deben tener un turno asignado"
  }
  
  // 4. Validar que los turnos existan
  const turnosInvalidos = planificacion.diasTurnos.filter(
    (turnoId: any) => turnoId && !turnosDisponibles.find(t => t.id === turnoId)
  )
  if (turnosInvalidos.length > 0) {
    errors.diasTurnos = "Algunos turnos asignados ya no existen"
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
```

### Validación en handleNext:
```typescript
else if (currentStep === 8) {
  if (formData.planificaciones.length === 0) {
    toast({
      title: "Planificaciones requeridas",
      description: "Debes crear al menos una planificación para continuar.",
      variant: "destructive"
    })
    return
  }
  
  // Validar todas las planificaciones
  const invalidas = formData.planificaciones.filter(p => {
    const validation = validatePlanificacionFields(
      p, 
      formData.turnos, 
      formData.planificaciones
    )
    return !validation.isValid
  })
  
  if (invalidas.length > 0) {
    toast({
      title: "Planificaciones incompletas",
      description: `Hay ${invalidas.length} planificación(es) con errores`,
      variant: "destructive"
    })
    return
  }
}
```

### Estado: ⚠️ REQUIERE MEJORAS
Validación básica existe, pero falta validar referencias y duplicados.

---

## PASO 9: ASIGNACIONES (⚠️ REQUIERE MEJORAS)

### Validaciones Actuales:
```typescript
else if (currentStep === 9) {
  const incompleteAssignments = formData.asignaciones.filter(
    (a) => !a.trabajadorId || !a.planificacionId || !a.desde || 
    (a.hasta !== "permanente" && !a.hasta)
  )
  
  if (incompleteAssignments.length > 0) {
    toast({
      title: "Asignaciones incompletas",
      description: "Asegúrate de que todas las asignaciones tengan trabajador, planificación y periodo válido",
      variant: "destructive"
    })
    return
  }
}
```

### Campos de asignación:
```typescript
{
  id: number
  trabajadorId: string | number         // ✅ Validado no vacío
  planificacionId: string | number      // ✅ Validado no vacío
  desde: string                         // ✅ Validado no vacío
  hasta: string                         // ✅ Validado no vacío o "permanente"
}
```

### Problemas Identificados:
1. **No valida referencias**: trabajadorId/planificacionId pueden no existir
2. **No valida fechas**: "desde" puede ser después de "hasta"
3. **No valida duplicados**: Mismo trabajador puede tener múltiples asignaciones solapadas
4. **No valida formato de fecha**: Puede ser string inválido

### Validaciones Recomendadas:
```typescript
const validateAsignacionFields = (
  asignacion: any,
  trabajadoresDisponibles: any[],
  planificacionesDisponibles: any[],
  asignacionesExistentes: any[]
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  
  // 1. Trabajador obligatorio y debe existir
  if (!asignacion.trabajadorId) {
    errors.trabajadorId = "Trabajador es obligatorio"
  } else if (!trabajadoresDisponibles.find(t => t.id === asignacion.trabajadorId)) {
    errors.trabajadorId = "El trabajador seleccionado no existe"
  }
  
  // 2. Planificación obligatoria y debe existir
  if (!asignacion.planificacionId) {
    errors.planificacionId = "Planificación es obligatoria"
  } else if (!planificacionesDisponibles.find(p => p.id === asignacion.planificacionId)) {
    errors.planificacionId = "La planificación seleccionada no existe"
  }
  
  // 3. Fecha desde obligatoria
  if (!asignacion.desde) {
    errors.desde = "Fecha desde es obligatoria"
  }
  
  // 4. Fecha hasta obligatoria (o "permanente")
  if (!asignacion.hasta) {
    errors.hasta = "Fecha hasta es obligatoria (o seleccionar Permanente)"
  }
  
  // 5. Validar orden de fechas
  if (asignacion.desde && asignacion.hasta && asignacion.hasta !== "permanente") {
    const desde = new Date(asignacion.desde)
    const hasta = new Date(asignacion.hasta)
    
    if (hasta <= desde) {
      errors.hasta = "Fecha hasta debe ser posterior a fecha desde"
    }
  }
  
  // 6. Validar solapamiento de asignaciones
  const solapadas = asignacionesExistentes.filter(a => {
    if (a.id === asignacion.id) return false
    if (a.trabajadorId !== asignacion.trabajadorId) return false
    
    // Verificar solapamiento de fechas
    const a1Desde = new Date(asignacion.desde)
    const a1Hasta = asignacion.hasta === "permanente" ? new Date(9999, 11, 31) : new Date(asignacion.hasta)
    const a2Desde = new Date(a.desde)
    const a2Hasta = a.hasta === "permanente" ? new Date(9999, 11, 31) : new Date(a.hasta)
    
    return (a1Desde <= a2Hasta && a1Hasta >= a2Desde)
  })
  
  if (solapadas.length > 0) {
    errors.hasta = "Este trabajador ya tiene una asignación en ese periodo"
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
```

### Validación en handleNext:
```typescript
else if (currentStep === 9) {
  if (formData.asignaciones.length === 0) {
    toast({
      title: "Asignaciones requeridas",
      description: "Debes crear al menos una asignación para continuar.",
      variant: "destructive"
    })
    return
  }
  
  // Validar todas las asignaciones
  const invalidas = formData.asignaciones.filter(a => {
    const validation = validateAsignacionFields(
      a,
      formData.trabajadores,
      formData.planificaciones,
      formData.asignaciones
    )
    return !validation.isValid
  })
  
  if (invalidas.length > 0) {
    toast({
      title: "Asignaciones incompletas",
      description: `Hay ${invalidas.length} asignación(es) con errores`,
      variant: "destructive"
    })
    return
  }
}
```

### Estado: ⚠️ REQUIERE MEJORAS
Validación básica de campos completos existe, pero faltan validaciones de lógica de negocio.

---

## RESUMEN DE CAMBIOS NECESARIOS

### 🔴 CRÍTICO (Bloquea progreso sin validación):
1. **Paso 5 - Trabajadores**: Agregar validación de campos obligatorios
2. **Paso 7 - Turnos**: Agregar validación de horarios

### 🟡 MEDIO (Mejora UX pero no crítico):
3. **Paso 8 - Planificaciones**: Validar referencias a turnos y duplicados
4. **Paso 9 - Asignaciones**: Validar solapamientos y orden de fechas

### COMPORTAMIENTO CON PASOS OPCIONALES:
- Si usuario elige "En capacitación": Puede saltar sin problema
- Si usuario elige "Configurar ahora": Debe completar con validaciones

---

## PRIORIDAD DE IMPLEMENTACIÓN

1. **PRIMERO**: Paso 5 (Trabajadores) - Validación de campos individuales
2. **SEGUNDO**: Paso 7 (Turnos) - Validación de horarios lógicos
3. **TERCERO**: Paso 8 (Planificaciones) - Validación de referencias
4. **CUARTO**: Paso 9 (Asignaciones) - Validación de solapamientos

¿Deseas que implemente estas validaciones?
