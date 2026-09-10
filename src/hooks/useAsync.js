// Hook genérico para el patrón "cargar datos": maneja loading / error /
// data / recarga, y evita setState tras desmontar.
import { useCallback, useEffect, useRef, useState } from "react";

export default function useAsync(
  fn,
  { immediate = true, initialData = null } = {},
) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const montado = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const run = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current(...args);
      if (montado.current) setData(result);
      return result;
    } catch (err) {
      if (montado.current) setError(err);
      throw err;
    } finally {
      if (montado.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, run, setData };
}
