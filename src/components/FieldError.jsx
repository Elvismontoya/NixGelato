// Muestra el mensaje de error de validación de un campo (ver useFormValidation).
export default function FieldError({ errores, campo }) {
  if (!errores?.[campo]) return null
  return (
    <div className="invalid-feedback d-block mt-1">
      {errores[campo]}
    </div>
  )
}
