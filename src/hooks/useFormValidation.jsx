// Hook de validación de formularios
// Uso: const { errores, validar, limpiar } = useFormValidation(reglas)

import { useState } from 'react'

export function useFormValidation(rules) {
  const [errores, setErrores] = useState({})

  function validar(values) {
    const nuevosErrores = {}

    for (const [campo, reglas] of Object.entries(rules)) {
      const valor = values[campo]

      if (reglas.required) {
        const vacio = valor === undefined || valor === null || String(valor).trim() === ''
        if (vacio) {
          nuevosErrores[campo] = reglas.required === true
            ? 'Este campo es obligatorio'
            : reglas.required
          continue
        }
      }

      if (reglas.min !== undefined && Number(valor) < reglas.min) {
        nuevosErrores[campo] = `Mínimo ${reglas.min}`
        continue
      }

      if (reglas.max !== undefined && Number(valor) > reglas.max) {
        nuevosErrores[campo] = `Máximo ${reglas.max}`
        continue
      }

      if (reglas.minLength !== undefined && String(valor).trim().length < reglas.minLength) {
        nuevosErrores[campo] = `Mínimo ${reglas.minLength} caracteres`
        continue
      }

      if (reglas.pattern && !reglas.pattern.test(String(valor))) {
        nuevosErrores[campo] = reglas.patternMsg || 'Formato inválido'
        continue
      }

      if (typeof reglas.validate === 'function') {
        const resultado = reglas.validate(valor, values)
        if (resultado !== true) {
          nuevosErrores[campo] = resultado
          continue
        }
      }
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  function limpiarCampo(campo) {
    setErrores((prev) => {
      const next = { ...prev }
      delete next[campo]
      return next
    })
  }

  function limpiar() {
    setErrores({})
  }

  return { errores, validar, limpiar, limpiarCampo }
}

// Componente helper para mostrar el error de un campo
export function FieldError({ errores, campo }) {
  if (!errores[campo]) return null
  return (
    <div className="invalid-feedback d-block mt-1">
      {errores[campo]}
    </div>
  )
}