---
description: Guía de estándares de programación para NeuralDeck
---

# Guía de Desarrollo - NeuralDeck

Esta guía establece los estándares que se deben seguir siempre al programar en este proyecto.

## 1. Internacionalización (i18n)

### ✅ Siempre
- **Todos** los strings visibles al usuario deben usar `t('key')`
- Añadir keys en **ambos** archivos: `src/i18n/locales/en.ts` y `es.ts`
- Usar nomenclatura jerárquica: `componente.seccion.accion`

### ❌ Nunca
```tsx
// MAL
<p>Loading...</p>

// BIEN
<p>{t('loading.message')}</p>
```

---

## 2. Constantes y Magic Numbers

### ✅ Siempre
- Definir constantes en `shared/types.ts`
- Re-exportar desde `electron/config/types.ts` si se usa en Electron
- Usar nombres descriptivos: `TIMING.DEBOUNCE_MS`, `COLORS.DEFAULT_ACCENT`

### ❌ Nunca
```typescript
// MAL
setTimeout(fn, 500)
const color = '#6366f1'

// BIEN
import { TIMING, COLORS } from '../../shared/types'
setTimeout(fn, TIMING.DEBOUNCE)
const color = COLORS.DEFAULT_ACCENT
```

---

## 3. Tipos y Type Safety

### ✅ Siempre
- Usar tipos explícitos en estados: `useState<string>('')`
- Definir interfaces para props y objetos complejos
- Evitar `any` - usar `unknown` y type guards

### ❌ Nunca
```typescript
// MAL
const [data, setData] = useState({})
function handle(item: any) {}

// BIEN
interface Item { id: string; name: string }
const [data, setData] = useState<Item | null>(null)
function handle(item: Item) {}
```

---

## 4. Estructura de Componentes

### ✅ Siempre
- Un componente por archivo
- Hooks primero, luego handlers, luego render
- Usar `useTranslation()` al inicio del componente

```tsx
export function MyComponent() {
  // 1. Hooks
  const { t } = useTranslation()
  const [state, setState] = useState('')
  
  // 2. Handlers
  const handleClick = () => {}
  
  // 3. Early returns
  if (!data) return null
  
  // 4. Render
  return <div>...</div>
}
```

---

## 5. Imports y Exports

### ✅ Siempre
- Imports ordenados: React, librerías, locales
- Usar barrel exports (`index.ts`) para carpetas
- Paths relativos para proyecto, aliases para node_modules

```typescript
// Orden correcto
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '../i18n'
import { COLORS } from '../../shared/types'
import { Button } from './ui/button'
```

---

## 6. Testing

### ✅ Siempre
- Tests para toda lógica de negocio
- Mocks completos para dependencias de Electron
- Nombres descriptivos: `should [behavior] when [condition]`

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should return data when valid input', () => {})
    it('should throw error when invalid input', () => {})
  })
})
```

---

## 7. Error Handling

### ✅ Siempre
- Usar `try/catch` para operaciones async
- Log errors con `logger.error()` (no `console.error`)
- Mostrar feedback al usuario con `toast.error()`

---

## 8. Estilos

### ✅ Siempre
- Tailwind CSS para estilos
- Clases organizadas: layout → spacing → colors → effects
- Usar `cn()` para clases condicionales

```tsx
className={cn(
  "flex items-center gap-2",           // Layout
  "px-4 py-2",                         // Spacing
  "bg-neutral-900 text-white",         // Colors
  "rounded-lg transition-colors",       // Effects
  isActive && "ring-2 ring-neural-500" // Conditional
)}
```

---

## 9. Commits y PRs

### ✅ Siempre
- Ejecutar `npm run lint` antes de commit
- Ejecutar `npm run test` antes de push
- Mensajes descriptivos: `feat:`, `fix:`, `refactor:`

---

## 10. Checklist Pre-commit

- [ ] No hay strings hardcodeados
- [ ] No hay magic numbers
- [ ] No hay `console.log` (excepto en desarrollo)
- [ ] Lint pasa sin errores
- [ ] Tests pasan
- [ ] Tipos explícitos donde corresponde
