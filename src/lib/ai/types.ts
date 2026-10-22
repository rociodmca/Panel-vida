/**
 * Contrato de la capa de IA.
 *
 * La IA es un proveedor enchufable: si no hay clave configurada, la app sigue
 * funcionando con la plantilla determinista. Nada de lo que devuelve el modelo
 * se ejecuta: se trata como texto y se valida antes de guardarlo.
 */

export type SummarySource = "ia" | "determinista";

export interface EmailSummary {
  /** Resumen en una o dos frases, en español. */
  resumen: string;
  /** Puntos clave, máximo 5. */
  puntos: string[];
  /** Si parece pedir una respuesta o una acción concreta. */
  requiere_accion: boolean;
  /** Tareas sugeridas a partir del correo. */
  tareas: string[];
  /** De dónde salió el resumen. */
  fuente: SummarySource;
}

export interface AiProvider {
  readonly name: string;
  /** Devuelve la respuesta cruda del modelo o null si no está disponible. */
  complete(prompt: string, system: string): Promise<string | null>;
}
